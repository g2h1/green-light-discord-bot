import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireServerAccess } from '../middleware/requireServerAccess.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { getOrCreateServerRow } from '../lib/serverStore.js'
import { getServerSetting } from '../lib/serverSettings.js'
import { recordModerationAction } from '../lib/moderationLog.js'
import { supabase } from '../lib/supabase.js'
import {
  assertCanModerate,
  banMember,
  deleteMessage,
  fetchRecentMessageIds,
  kickMember,
  purgeMessages,
  timeoutMember,
  unbanMember,
} from '../lib/discord.js'

export const moderationRouter = Router({ mergeParams: true })

interface WarningAutomation {
  threshold: number
  action: 'timeout' | 'ban'
  durationMinutes?: number
}

async function applyWarningAutomations(
  serverRowId: string,
  guildId: string,
  discordUserId: string,
  moderatorDiscordId: string,
) {
  const automations = await getServerSetting<WarningAutomation[]>(serverRowId, 'warning_automations', [])
  if (automations.length === 0) return null

  const { count } = await supabase
    .from('warnings')
    .select('id', { count: 'exact', head: true })
    .eq('server_id', serverRowId)
    .eq('discord_user_id', discordUserId)

  const warningCount = count ?? 0
  const triggered = automations
    .filter((a) => a.threshold <= warningCount)
    .sort((a, b) => b.threshold - a.threshold)[0]

  if (!triggered) return null

  const reason = `Automatic: reached ${triggered.threshold} warnings`
  await assertCanModerate(guildId, discordUserId)

  if (triggered.action === 'timeout') {
    await timeoutMember(guildId, discordUserId, triggered.durationMinutes ?? 1440, reason)
    await recordModerationAction(serverRowId, {
      action: 'timeout',
      targetDiscordId: discordUserId,
      moderatorDiscordId,
      reason,
      metadata: { automatic: true, warningCount },
    })
  } else {
    await banMember(guildId, discordUserId, reason)
    await recordModerationAction(serverRowId, {
      action: 'ban',
      targetDiscordId: discordUserId,
      moderatorDiscordId,
      reason,
      metadata: { automatic: true, warningCount },
    })
  }

  return triggered
}

const warnSchema = z.object({ discordUserId: z.string().min(1), reason: z.string().min(1).max(500) })

moderationRouter.post(
  '/warn',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    const body = warnSchema.parse(req.body)
    const server = await getOrCreateServerRow(req.params.serverId)

    const { data: warning, error } = await supabase
      .from('warnings')
      .insert({
        server_id: server.id,
        discord_user_id: body.discordUserId,
        reason: body.reason,
        moderator_discord_id: req.session!.discordId,
      })
      .select()
      .single()

    if (error || !warning) throw error ?? new Error('Failed to record warning')

    await recordModerationAction(server.id, {
      action: 'warn',
      targetDiscordId: body.discordUserId,
      moderatorDiscordId: req.session!.discordId,
      reason: body.reason,
    })

    const escalation = await applyWarningAutomations(
      server.id,
      req.params.serverId,
      body.discordUserId,
      req.session!.discordId,
    )

    res.status(201).json({ warning, escalation })
  }),
)

moderationRouter.get(
  '/warnings',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId)
    const discordUserId = typeof req.query.discordUserId === 'string' ? req.query.discordUserId : undefined

    let query = supabase
      .from('warnings')
      .select('*')
      .eq('server_id', server.id)
      .order('created_at', { ascending: false })

    if (discordUserId) query = query.eq('discord_user_id', discordUserId)

    const { data, error } = await query
    if (error) throw error
    res.json({ warnings: data })
  }),
)

moderationRouter.delete(
  '/warnings/:warningId',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId)
    const { error } = await supabase
      .from('warnings')
      .delete()
      .eq('id', req.params.warningId)
      .eq('server_id', server.id)

    if (error) throw error
    res.status(204).end()
  }),
)

const targetSchema = z.object({ discordUserId: z.string().min(1), reason: z.string().max(500).optional() })

moderationRouter.post(
  '/timeout',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    const body = z.object({ ...targetSchema.shape, minutes: z.number().int().positive().max(40320) }).parse(
      req.body,
    )
    await assertCanModerate(req.params.serverId, body.discordUserId)
    await timeoutMember(req.params.serverId, body.discordUserId, body.minutes, body.reason)

    const server = await getOrCreateServerRow(req.params.serverId)
    await recordModerationAction(server.id, {
      action: 'timeout',
      targetDiscordId: body.discordUserId,
      moderatorDiscordId: req.session!.discordId,
      reason: body.reason,
      metadata: { minutes: body.minutes },
    })

    res.status(204).end()
  }),
)

moderationRouter.post(
  '/kick',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    const body = targetSchema.parse(req.body)
    await assertCanModerate(req.params.serverId, body.discordUserId)
    await kickMember(req.params.serverId, body.discordUserId, body.reason)

    const server = await getOrCreateServerRow(req.params.serverId)
    await recordModerationAction(server.id, {
      action: 'kick',
      targetDiscordId: body.discordUserId,
      moderatorDiscordId: req.session!.discordId,
      reason: body.reason,
    })

    res.status(204).end()
  }),
)

moderationRouter.post(
  '/ban',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    const body = z
      .object({ ...targetSchema.shape, deleteMessageDays: z.number().int().min(0).max(7).optional() })
      .parse(req.body)
    await assertCanModerate(req.params.serverId, body.discordUserId)
    await banMember(req.params.serverId, body.discordUserId, body.reason, body.deleteMessageDays)

    const server = await getOrCreateServerRow(req.params.serverId)
    await recordModerationAction(server.id, {
      action: 'ban',
      targetDiscordId: body.discordUserId,
      moderatorDiscordId: req.session!.discordId,
      reason: body.reason,
    })

    res.status(204).end()
  }),
)

moderationRouter.post(
  '/unban',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    const body = targetSchema.parse(req.body)
    await unbanMember(req.params.serverId, body.discordUserId, body.reason)

    const server = await getOrCreateServerRow(req.params.serverId)
    await recordModerationAction(server.id, {
      action: 'unban',
      targetDiscordId: body.discordUserId,
      moderatorDiscordId: req.session!.discordId,
      reason: body.reason,
    })

    res.status(204).end()
  }),
)

const purgeSchema = z.object({ channelId: z.string().min(1), amount: z.number().int().min(1).max(100) })

moderationRouter.post(
  '/purge',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    const body = purgeSchema.parse(req.body)
    const ids = await fetchRecentMessageIds(body.channelId, body.amount)
    if (ids.length > 0) await purgeMessages(body.channelId, ids)

    const server = await getOrCreateServerRow(req.params.serverId)
    await recordModerationAction(server.id, {
      action: 'purge',
      moderatorDiscordId: req.session!.discordId,
      metadata: { channelId: body.channelId, count: ids.length },
    })

    res.json({ deleted: ids.length })
  }),
)

moderationRouter.delete(
  '/messages/:channelId/:messageId',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    await deleteMessage(req.params.channelId, req.params.messageId)

    const server = await getOrCreateServerRow(req.params.serverId)
    await recordModerationAction(server.id, {
      action: 'delete_message',
      moderatorDiscordId: req.session!.discordId,
      metadata: { channelId: req.params.channelId, messageId: req.params.messageId },
    })

    res.status(204).end()
  }),
)

moderationRouter.get(
  '/logs',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId)
    const { data, error } = await supabase
      .from('moderation_logs')
      .select('*')
      .eq('server_id', server.id)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw error
    res.json({ logs: data })
  }),
)
