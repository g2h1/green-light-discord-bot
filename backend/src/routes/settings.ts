import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireServerAccess } from '../middleware/requireServerAccess.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { getOrCreateServerRow } from '../lib/serverStore.js'
import { getServerSetting, setServerSetting } from '../lib/serverSettings.js'

export const settingsRouter = Router({ mergeParams: true })

const AUTOMOD_DEFAULTS = {
  antiSpam: false,
  antiFlood: false,
  antiRaid: false,
  linkFilter: false,
  badWordFilter: false,
  mentionSpam: false,
  duplicateMessage: false,
  capsDetection: false,
  bannedWords: [] as string[],
}

const automodSchema = z.object({
  antiSpam: z.boolean(),
  antiFlood: z.boolean(),
  antiRaid: z.boolean(),
  linkFilter: z.boolean(),
  badWordFilter: z.boolean(),
  mentionSpam: z.boolean(),
  duplicateMessage: z.boolean(),
  capsDetection: z.boolean(),
  bannedWords: z.array(z.string()).default([]),
})

settingsRouter.get(
  '/automod',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId)
    const value = await getServerSetting(server.id, 'automod', AUTOMOD_DEFAULTS)
    res.json({ automod: value })
  }),
)

settingsRouter.put(
  '/automod',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    const body = automodSchema.parse(req.body)
    const server = await getOrCreateServerRow(req.params.serverId)
    await setServerSetting(server.id, 'automod', body)
    res.json({ automod: body })
  }),
)

const LOG_CHANNEL_KEYS = [
  'member_logs',
  'moderation_logs',
  'message_logs',
  'ticket_logs',
  'role_logs',
  'channel_logs',
  'security_logs',
  'bot_logs',
] as const

const logChannelsSchema = z.object(Object.fromEntries(LOG_CHANNEL_KEYS.map((k) => [k, z.string().optional()])))

settingsRouter.get(
  '/log-channels',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId)
    const value = await getServerSetting(server.id, 'log_channels', {})
    res.json({ logChannels: value })
  }),
)

settingsRouter.put(
  '/log-channels',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    const body = logChannelsSchema.parse(req.body)
    const server = await getOrCreateServerRow(req.params.serverId)
    await setServerSetting(server.id, 'log_channels', body)
    res.json({ logChannels: body })
  }),
)

const warningAutomationSchema = z.array(
  z.object({
    threshold: z.number().int().positive(),
    action: z.enum(['timeout', 'ban']),
    durationMinutes: z.number().int().positive().optional(),
  }),
)

settingsRouter.get(
  '/warning-automations',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId)
    const value = await getServerSetting(server.id, 'warning_automations', [])
    res.json({ automations: value })
  }),
)

settingsRouter.put(
  '/warning-automations',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    const body = warningAutomationSchema.parse(req.body)
    const server = await getOrCreateServerRow(req.params.serverId)
    await setServerSetting(server.id, 'warning_automations', body)
    res.json({ automations: body })
  }),
)

const WELCOME_DEFAULTS = {
  enabled: false,
  message: 'Welcome {user} to {server}! You are member #{memberCount}.',
  useEmbed: false,
  embed: {} as Record<string, unknown>,
  imageUrl: '',
  channelId: '',
  autoRoleId: '',
  dmEnabled: false,
  dmMessage: '',
}

const welcomeSchema = z.object({
  enabled: z.boolean(),
  message: z.string().max(2000),
  useEmbed: z.boolean(),
  embed: z.record(z.string(), z.any()).optional(),
  imageUrl: z.string().optional(),
  channelId: z.string().optional(),
  autoRoleId: z.string().optional(),
  dmEnabled: z.boolean(),
  dmMessage: z.string().max(2000).optional(),
})

settingsRouter.get(
  '/welcome',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId)
    const value = await getServerSetting(server.id, 'welcome', WELCOME_DEFAULTS)
    res.json({ welcome: value })
  }),
)

settingsRouter.put(
  '/welcome',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    const body = welcomeSchema.parse(req.body)
    const server = await getOrCreateServerRow(req.params.serverId)
    await setServerSetting(server.id, 'welcome', body)
    res.json({ welcome: body })
  }),
)

// Strict Channel Protection reuses the existing `moderation_logs` channel
// (configured under /log-channels) and the existing `moderation_logs` table —
// it is not a separate logging system, just another producer into the same one.
const strictChannelSchema = z.object({
  channelId: z.string().min(1),
  enabled: z.boolean(),
  exemptRoleIds: z.array(z.string()).default([]),
})

settingsRouter.get(
  '/strict-channels',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId)
    const value = await getServerSetting(server.id, 'strict_channels', [])
    res.json({ strictChannels: value })
  }),
)

settingsRouter.put(
  '/strict-channels',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    const body = z.array(strictChannelSchema).parse(req.body)
    const server = await getOrCreateServerRow(req.params.serverId)
    await setServerSetting(server.id, 'strict_channels', body)
    res.json({ strictChannels: body })
  }),
)
