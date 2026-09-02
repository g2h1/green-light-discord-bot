import type { Guild, VoiceBasedChannel } from 'discord.js'
import { supabase } from './supabase.js'
import { getOrCreateServerRow } from './serverStore.js'
import { getServerSetting } from './serverSettings.js'
import { logEvent } from './logging.js'
import { t, type Locale } from '../i18n/index.js'

export interface SupportConfig {
  waitingChannelId?: string
  roomChannelIds: string[]
  staffRoleIds: string[]
  locale: Locale
}

const DEFAULT_CONFIG: SupportConfig = {
  roomChannelIds: [],
  staffRoleIds: [],
  locale: 'en',
}

export async function getSupportConfig(serverRowId: string): Promise<SupportConfig> {
  return getServerSetting(serverRowId, 'support_queue', DEFAULT_CONFIG)
}

interface QueueRow {
  id: string
  server_id: string
  discord_user_id: string
  waiting_channel_id: string
  status: 'waiting' | 'claimed' | 'in_session' | 'closed'
  position: number
  claimed_by_discord_id: string | null
  room_channel_id: string | null
}

/** Reassigns 1-based `position` for all still-waiting entries, in join order. */
async function renumberQueue(serverId: string, waitingChannelId: string) {
  const { data: waiting } = await supabase
    .from('support_queue')
    .select('id')
    .eq('server_id', serverId)
    .eq('waiting_channel_id', waitingChannelId)
    .eq('status', 'waiting')
    .order('joined_at', { ascending: true })

  if (!waiting) return
  await Promise.all(
    waiting.map((row, index) => supabase.from('support_queue').update({ position: index + 1 }).eq('id', row.id)),
  )
}

/** Adds a user to the waiting queue. Idempotent — a duplicate join is reported, not re-inserted. */
export async function joinQueue(guild: Guild, userId: string, waitingChannelId: string) {
  const server = await getOrCreateServerRow(guild)

  const { data: existing } = await supabase
    .from('support_queue')
    .select('id, position')
    .eq('server_id', server.id)
    .eq('discord_user_id', userId)
    .in('status', ['waiting', 'claimed', 'in_session'])
    .maybeSingle<QueueRow>()

  if (existing) return { alreadyQueued: true, position: existing.position }

  const { data: inserted, error } = await supabase
    .from('support_queue')
    .insert({ server_id: server.id, discord_user_id: userId, waiting_channel_id: waitingChannelId, status: 'waiting' })
    .select('id')
    .single()

  if (error || !inserted) throw error ?? new Error('Failed to join support queue')

  await renumberQueue(server.id, waitingChannelId)

  const { data: row } = await supabase.from('support_queue').select('position').eq('id', inserted.id).single()

  await logEvent(guild, 'bot', 'support_queue_join', `<@${userId}> joined the support queue`, { userId })

  return { alreadyQueued: false, position: row?.position ?? 1 }
}

/** Removes a user's waiting entry (e.g. they left the waiting voice channel before being claimed). */
export async function leaveQueue(guild: Guild, userId: string) {
  const server = await getOrCreateServerRow(guild)

  const { data: entry } = await supabase
    .from('support_queue')
    .select('id, waiting_channel_id, status')
    .eq('server_id', server.id)
    .eq('discord_user_id', userId)
    .eq('status', 'waiting')
    .maybeSingle<QueueRow>()

  if (!entry) return false

  await supabase.from('support_queue').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', entry.id)
  await renumberQueue(server.id, entry.waiting_channel_id)
  return true
}

export async function listWaiting(serverRowId: string) {
  const { data } = await supabase
    .from('support_queue')
    .select('*')
    .eq('server_id', serverRowId)
    .eq('status', 'waiting')
    .order('position', { ascending: true })

  return (data ?? []) as QueueRow[]
}

function findFreeRoom(guild: Guild, roomChannelIds: string[]): VoiceBasedChannel | null {
  for (const id of roomChannelIds) {
    const channel = guild.channels.cache.get(id)
    if (channel?.isVoiceBased() && channel.members.size === 0) return channel
  }
  return null
}

/** Staff claims the next (or a specific) waiting user and moves them into a free room. */
export async function claimNext(
  guild: Guild,
  staffId: string,
  config: SupportConfig,
  targetUserId?: string,
): Promise<{ ok: true; userId: string; room: VoiceBasedChannel } | { ok: false; reason: 'empty' | 'no_room' }> {
  const server = await getOrCreateServerRow(guild)

  const waiting = await listWaiting(server.id)
  const entry = targetUserId ? waiting.find((w) => w.discord_user_id === targetUserId) : waiting[0]
  if (!entry) return { ok: false, reason: 'empty' }

  const room = findFreeRoom(guild, config.roomChannelIds)
  if (!room) return { ok: false, reason: 'no_room' }

  const member = await guild.members.fetch(entry.discord_user_id).catch(() => null)
  if (member?.voice.channelId) {
    await member.voice.setChannel(room).catch(() => undefined)
  }

  await supabase
    .from('support_queue')
    .update({
      status: 'in_session',
      claimed_by_discord_id: staffId,
      room_channel_id: room.id,
      claimed_at: new Date().toISOString(),
    })
    .eq('id', entry.id)

  await supabase.from('support_sessions').insert({
    server_id: server.id,
    queue_id: entry.id,
    discord_user_id: entry.discord_user_id,
    staff_discord_id: staffId,
    room_channel_id: room.id,
  })

  await renumberQueue(server.id, entry.waiting_channel_id)
  await logEvent(guild, 'bot', 'support_claim', `<@${staffId}> claimed <@${entry.discord_user_id}> into ${room.name}`, {
    userId: entry.discord_user_id,
    staffId,
    roomChannelId: room.id,
  })

  return { ok: true, userId: entry.discord_user_id, room }
}

/** Moves an already-claimed session to a different room (staff correction). */
export async function moveSession(guild: Guild, userId: string, room: VoiceBasedChannel) {
  const member = await guild.members.fetch(userId).catch(() => null)
  if (member?.voice.channelId) await member.voice.setChannel(room).catch(() => undefined)

  await supabase
    .from('support_queue')
    .update({ room_channel_id: room.id })
    .eq('discord_user_id', userId)
    .eq('status', 'in_session')
}

/** Closes an in-session (or claimed) entry — called by staff command or on user leaving the room. */
export async function closeSession(guild: Guild, userId: string) {
  const server = await getOrCreateServerRow(guild)

  const { data: entry } = await supabase
    .from('support_queue')
    .select('id')
    .eq('server_id', server.id)
    .eq('discord_user_id', userId)
    .in('status', ['claimed', 'in_session'])
    .maybeSingle<QueueRow>()

  if (!entry) return false

  await supabase.from('support_queue').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', entry.id)
  await supabase
    .from('support_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('queue_id', entry.id)
    .is('ended_at', null)

  await logEvent(guild, 'bot', 'support_close', `Support session closed for <@${userId}>`, { userId })
  return true
}

export function announceQueuePosition(locale: Locale, position: number) {
  return t(locale, 'support.joinedQueue', { position })
}

/** Ensures the waiting channel has room-permission baseline: @everyone can join/speak, no admin perms granted. */
export async function ensureWaitingChannelPermissions(guild: Guild, channelId: string) {
  const channel = guild.channels.cache.get(channelId)
  if (!channel?.isVoiceBased()) return
  await channel.permissionOverwrites
    .edit(guild.roles.everyone.id, { Connect: true, Speak: true, ViewChannel: true })
    .catch(() => undefined)
}
