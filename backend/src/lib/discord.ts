import { env } from './env.js'

const API_BASE = 'https://discord.com/api/v10'
const MANAGE_GUILD = 0x20

export interface DiscordUser {
  id: string
  username: string
  global_name: string | null
  avatar: string | null
}

export interface DiscordGuild {
  id: string
  name: string
  icon: string | null
  owner: boolean
  permissions: string
}

export interface DiscordGuildDetail {
  id: string
  name: string
  icon: string | null
  approximate_member_count?: number
  approximate_presence_count?: number
}

export class DiscordApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function botFetch(path: string, init?: RequestInit) {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
}

export async function exchangeCodeForToken(code: string) {
  const body = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    client_secret: env.DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: env.DISCORD_REDIRECT_URI,
  })

  const res = await fetch(`${API_BASE}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) throw new Error(`Discord token exchange failed: ${res.status} ${await res.text()}`)
  return res.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number }>
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const res = await fetch(`${API_BASE}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Failed to fetch Discord user: ${res.status}`)
  return res.json() as Promise<DiscordUser>
}

export async function fetchUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
  const res = await fetch(`${API_BASE}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const message =
      res.status === 429
        ? 'Discord rate-limited this request. Please try again in a few seconds.'
        : `Failed to fetch user guilds: ${res.status}`
    throw new DiscordApiError(res.status, message)
  }
  return res.json() as Promise<DiscordGuild[]>
}

export async function fetchBotGuildIds(): Promise<Set<string>> {
  const res = await botFetch('/users/@me/guilds')
  if (!res.ok) throw new Error(`Failed to fetch bot guilds: ${res.status}`)
  const guilds = (await res.json()) as Array<{ id: string }>
  return new Set(guilds.map((g) => g.id))
}

export function canManageGuild(guild: DiscordGuild): boolean {
  return guild.owner || (BigInt(guild.permissions) & BigInt(MANAGE_GUILD)) === BigInt(MANAGE_GUILD)
}

export async function fetchGuildDetail(guildId: string): Promise<DiscordGuildDetail | null> {
  const res = await botFetch(`/guilds/${guildId}?with_counts=true`)
  if (res.status === 404 || res.status === 403) return null
  if (!res.ok) throw new Error(`Failed to fetch guild ${guildId}: ${res.status}`)
  return res.json() as Promise<DiscordGuildDetail>
}

export interface DiscordChannel {
  id: string
  name: string
  type: number
  position: number
  parent_id: string | null
}

// Text-capable channel types: text, announcement, voice-with-text, forum, thread variants.
const TEXT_CHANNEL_TYPES = new Set([0, 5, 15])

export async function fetchGuildChannels(guildId: string): Promise<DiscordChannel[]> {
  const res = await botFetch(`/guilds/${guildId}/channels`)
  if (!res.ok) return []
  const channels = (await res.json()) as DiscordChannel[]
  return channels
    .filter((c) => TEXT_CHANNEL_TYPES.has(c.type))
    .sort((a, b) => a.position - b.position)
}

export async function fetchGuildChannelCount(guildId: string): Promise<number> {
  const res = await botFetch(`/guilds/${guildId}/channels`)
  if (!res.ok) return 0
  const channels = (await res.json()) as unknown[]
  return channels.length
}

export async function fetchGuildRoleCount(guildId: string): Promise<number> {
  const res = await botFetch(`/guilds/${guildId}/roles`)
  if (!res.ok) return 0
  const roles = (await res.json()) as unknown[]
  return roles.length
}

export interface EmbedPayload {
  title?: string
  description?: string
  url?: string
  color?: number
  timestamp?: string
  footer?: { text: string; icon_url?: string }
  author?: { name: string; icon_url?: string; url?: string }
  thumbnail?: { url: string }
  image?: { url: string }
  fields?: Array<{ name: string; value: string; inline?: boolean }>
}

export interface ButtonPayload {
  label: string
  url?: string
  customId?: string
  style?: 1 | 2 | 3 | 4
  emoji?: string
}

export interface SendMessagePayload {
  content?: string
  embed?: EmbedPayload
  buttons?: ButtonPayload[]
  mentionEveryone?: boolean
  mentionRoleIds?: string[]
  mentionUserIds?: string[]
}

export function buildDiscordMessageBody(payload: SendMessagePayload) {
  const allowed_mentions = {
    parse: payload.mentionEveryone ? ['everyone'] : [],
    roles: payload.mentionRoleIds ?? [],
    users: payload.mentionUserIds ?? [],
  }

  const components =
    payload.buttons && payload.buttons.length > 0
      ? [
          {
            type: 1,
            components: payload.buttons.slice(0, 5).map((b) =>
              b.customId
                ? {
                    type: 2,
                    style: b.style ?? 1,
                    label: b.label,
                    custom_id: b.customId,
                    ...(b.emoji ? { emoji: { name: b.emoji } } : {}),
                  }
                : {
                    type: 2,
                    style: 5,
                    label: b.label,
                    url: b.url,
                    ...(b.emoji ? { emoji: { name: b.emoji } } : {}),
                  },
            ),
          },
        ]
      : undefined

  return {
    content: payload.content || undefined,
    embeds: payload.embed ? [payload.embed] : undefined,
    components,
    allowed_mentions,
  }
}

export async function sendChannelMessage(
  channelId: string,
  payload: SendMessagePayload,
): Promise<{ id: string }> {
  const res = await botFetch(`/channels/${channelId}/messages`, {
    method: 'POST',
    body: JSON.stringify(buildDiscordMessageBody(payload)),
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string }
    throw new DiscordApiError(res.status, body.message ?? `Discord rejected the message (${res.status})`)
  }

  return res.json() as Promise<{ id: string }>
}

let cachedBotUserId: string | null = null

export async function fetchBotUserId(): Promise<string> {
  if (cachedBotUserId) return cachedBotUserId
  const res = await botFetch('/users/@me')
  if (!res.ok) throw new DiscordApiError(res.status, 'Failed to fetch bot identity')
  const user = (await res.json()) as { id: string }
  cachedBotUserId = user.id
  return user.id
}

const VIEW_CHANNEL = 1n << 10n
const SEND_MESSAGES = 1n << 11n
const READ_MESSAGE_HISTORY = 1n << 16n
const MANAGE_CHANNELS = 1n << 4n

export async function createTicketChannel(
  guildId: string,
  opts: { name: string; openerDiscordId: string; parentId?: string },
): Promise<{ id: string; name: string }> {
  const botUserId = await fetchBotUserId()
  const allowFullBits = VIEW_CHANNEL | SEND_MESSAGES | READ_MESSAGE_HISTORY

  const res = await botFetch(`/guilds/${guildId}/channels`, {
    method: 'POST',
    body: JSON.stringify({
      name: opts.name,
      type: 0,
      parent_id: opts.parentId,
      permission_overwrites: [
        { id: guildId, type: 0, deny: VIEW_CHANNEL.toString() }, // @everyone (role id === guild id)
        { id: opts.openerDiscordId, type: 1, allow: allowFullBits.toString() },
        { id: botUserId, type: 1, allow: (allowFullBits | MANAGE_CHANNELS).toString() },
      ],
    }),
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string }
    throw new DiscordApiError(res.status, body.message ?? 'Failed to create ticket channel')
  }

  return res.json() as Promise<{ id: string; name: string }>
}

export async function setChannelMemberAccess(channelId: string, userId: string, grant: boolean) {
  if (grant) {
    await botFetch(`/channels/${channelId}/permissions/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({
        type: 1,
        allow: (VIEW_CHANNEL | SEND_MESSAGES | READ_MESSAGE_HISTORY).toString(),
      }),
    })
  } else {
    await botFetch(`/channels/${channelId}/permissions/${userId}`, { method: 'DELETE' })
  }
}

export async function lockTicketChannel(channelId: string, openerDiscordId: string, locked: boolean) {
  await botFetch(`/channels/${channelId}/permissions/${openerDiscordId}`, {
    method: 'PUT',
    body: JSON.stringify({
      type: 1,
      allow: (VIEW_CHANNEL | READ_MESSAGE_HISTORY | (locked ? 0n : SEND_MESSAGES)).toString(),
      deny: locked ? SEND_MESSAGES.toString() : '0',
    }),
  })
}

export async function renameChannel(channelId: string, name: string) {
  const res = await botFetch(`/channels/${channelId}`, { method: 'PATCH', body: JSON.stringify({ name }) })
  if (!res.ok) throw new DiscordApiError(res.status, 'Failed to rename channel')
}

export async function deleteChannel(channelId: string) {
  const res = await botFetch(`/channels/${channelId}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) throw new DiscordApiError(res.status, 'Failed to delete channel')
}

// --- Moderation -----------------------------------------------------------

export interface DiscordRole {
  id: string
  name: string
  position: number
}

export interface DiscordMember {
  user: DiscordUser
  roles: string[]
}

export async function fetchGuildRoles(guildId: string): Promise<DiscordRole[]> {
  const res = await botFetch(`/guilds/${guildId}/roles`)
  if (!res.ok) throw new DiscordApiError(res.status, 'Failed to fetch roles')
  return res.json() as Promise<DiscordRole[]>
}

export async function fetchGuildMember(guildId: string, userId: string): Promise<DiscordMember | null> {
  const res = await botFetch(`/guilds/${guildId}/members/${userId}`)
  if (res.status === 404) return null
  if (!res.ok) throw new DiscordApiError(res.status, 'Failed to fetch member')
  return res.json() as Promise<DiscordMember>
}

function highestRolePosition(roles: DiscordRole[], memberRoleIds: string[]): number {
  const byId = new Map(roles.map((r) => [r.id, r.position]))
  return Math.max(0, ...memberRoleIds.map((id) => byId.get(id) ?? 0))
}

/**
 * Refuses to let the bot act on a member whose highest role outranks (or ties)
 * the bot's own highest role — mirrors Discord's own hierarchy rule so we fail
 * with a clear message instead of a confusing Discord 403.
 */
export async function assertCanModerate(guildId: string, targetUserId: string) {
  const [roles, botUserId] = [await fetchGuildRoles(guildId), await fetchBotUserId()]
  const [target, bot] = await Promise.all([
    fetchGuildMember(guildId, targetUserId),
    fetchGuildMember(guildId, botUserId),
  ])

  if (!target) throw new DiscordApiError(404, 'That user is not a member of this server')
  if (!bot) throw new DiscordApiError(500, 'Could not resolve the bot\'s own member record')

  const targetPos = highestRolePosition(roles, target.roles)
  const botPos = highestRolePosition(roles, bot.roles)

  if (targetPos >= botPos) {
    throw new DiscordApiError(403, "GREEN LIGHT's role is not above that member's highest role — moderation refused")
  }
}

export async function timeoutMember(guildId: string, userId: string, minutes: number, reason?: string) {
  const until = new Date(Date.now() + minutes * 60_000).toISOString()
  const res = await botFetch(`/guilds/${guildId}/members/${userId}`, {
    method: 'PATCH',
    headers: reason ? { 'X-Audit-Log-Reason': reason } : undefined,
    body: JSON.stringify({ communication_disabled_until: until }),
  })
  if (!res.ok) throw new DiscordApiError(res.status, 'Failed to time out member')
}

export async function kickMember(guildId: string, userId: string, reason?: string) {
  const res = await botFetch(`/guilds/${guildId}/members/${userId}`, {
    method: 'DELETE',
    headers: reason ? { 'X-Audit-Log-Reason': reason } : undefined,
  })
  if (!res.ok) throw new DiscordApiError(res.status, 'Failed to kick member')
}

export async function banMember(guildId: string, userId: string, reason?: string, deleteMessageDays = 0) {
  const res = await botFetch(`/guilds/${guildId}/bans/${userId}`, {
    method: 'PUT',
    headers: reason ? { 'X-Audit-Log-Reason': reason } : undefined,
    body: JSON.stringify({ delete_message_seconds: deleteMessageDays * 86_400 }),
  })
  if (!res.ok) throw new DiscordApiError(res.status, 'Failed to ban member')
}

export async function unbanMember(guildId: string, userId: string, reason?: string) {
  const res = await botFetch(`/guilds/${guildId}/bans/${userId}`, {
    method: 'DELETE',
    headers: reason ? { 'X-Audit-Log-Reason': reason } : undefined,
  })
  if (!res.ok && res.status !== 404) throw new DiscordApiError(res.status, 'Failed to unban member')
}

export async function purgeMessages(channelId: string, messageIds: string[]) {
  if (messageIds.length === 1) {
    await botFetch(`/channels/${channelId}/messages/${messageIds[0]}`, { method: 'DELETE' })
    return
  }
  const res = await botFetch(`/channels/${channelId}/messages/bulk-delete`, {
    method: 'POST',
    body: JSON.stringify({ messages: messageIds }),
  })
  if (!res.ok) throw new DiscordApiError(res.status, 'Failed to purge messages')
}

export async function fetchRecentMessageIds(channelId: string, limit: number): Promise<string[]> {
  const res = await botFetch(`/channels/${channelId}/messages?limit=${Math.min(limit, 100)}`)
  if (!res.ok) throw new DiscordApiError(res.status, 'Failed to fetch messages')
  const messages = (await res.json()) as Array<{ id: string }>
  return messages.map((m) => m.id)
}

export async function deleteMessage(channelId: string, messageId: string, reason?: string) {
  const res = await botFetch(`/channels/${channelId}/messages/${messageId}`, {
    method: 'DELETE',
    headers: reason ? { 'X-Audit-Log-Reason': reason } : undefined,
  })
  if (!res.ok && res.status !== 404) throw new DiscordApiError(res.status, 'Failed to delete message')
}

// --- Roles ------------------------------------------------------------------

export interface DiscordRoleFull extends DiscordRole {
  color: number
  hoist: boolean
  mentionable: boolean
  managed: boolean
}

export async function fetchGuildRolesFull(guildId: string): Promise<DiscordRoleFull[]> {
  const res = await botFetch(`/guilds/${guildId}/roles`)
  if (!res.ok) throw new DiscordApiError(res.status, 'Failed to fetch roles')
  return res.json() as Promise<DiscordRoleFull[]>
}

/** Throws unless the given role sits below the bot's own highest role. */
export async function assertRoleBelowBot(guildId: string, roleId: string) {
  const [roles, botUserId] = [await fetchGuildRolesFull(guildId), await fetchBotUserId()]
  const bot = await fetchGuildMember(guildId, botUserId)
  if (!bot) throw new DiscordApiError(500, "Could not resolve the bot's own member record")

  const rolePos = roles.find((r) => r.id === roleId)?.position ?? 0
  const botPos = highestRolePosition(roles, bot.roles)

  if (rolePos >= botPos) {
    throw new DiscordApiError(403, "That role is not below GREEN LIGHT's own highest role — action refused")
  }
}

export async function createGuildRole(
  guildId: string,
  opts: { name: string; color?: number; hoist?: boolean; mentionable?: boolean },
): Promise<DiscordRoleFull> {
  const res = await botFetch(`/guilds/${guildId}/roles`, { method: 'POST', body: JSON.stringify(opts) })
  if (!res.ok) throw new DiscordApiError(res.status, 'Failed to create role')
  return res.json() as Promise<DiscordRoleFull>
}

export async function editGuildRole(
  guildId: string,
  roleId: string,
  patch: { name?: string; color?: number; hoist?: boolean; mentionable?: boolean },
): Promise<DiscordRoleFull> {
  const res = await botFetch(`/guilds/${guildId}/roles/${roleId}`, { method: 'PATCH', body: JSON.stringify(patch) })
  if (!res.ok) throw new DiscordApiError(res.status, 'Failed to edit role')
  return res.json() as Promise<DiscordRoleFull>
}

export async function deleteGuildRole(guildId: string, roleId: string) {
  const res = await botFetch(`/guilds/${guildId}/roles/${roleId}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) throw new DiscordApiError(res.status, 'Failed to delete role')
}

export async function assignRole(guildId: string, userId: string, roleId: string) {
  const res = await botFetch(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, { method: 'PUT' })
  if (!res.ok) throw new DiscordApiError(res.status, 'Failed to assign role')
}

export async function removeRole(guildId: string, userId: string, roleId: string) {
  const res = await botFetch(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) throw new DiscordApiError(res.status, 'Failed to remove role')
}

// --- Channels (full management) ---------------------------------------------

export interface DiscordChannelFull extends DiscordChannel {
  topic: string | null
  rate_limit_per_second?: number
  rate_limit_per_user?: number
}

export async function fetchAllGuildChannels(guildId: string): Promise<DiscordChannelFull[]> {
  const res = await botFetch(`/guilds/${guildId}/channels`)
  if (!res.ok) throw new DiscordApiError(res.status, 'Failed to fetch channels')
  const channels = (await res.json()) as DiscordChannelFull[]
  return channels.sort((a, b) => a.position - b.position)
}

export async function createGuildChannel(
  guildId: string,
  opts: { name: string; type: number; parentId?: string; topic?: string },
): Promise<DiscordChannelFull> {
  const res = await botFetch(`/guilds/${guildId}/channels`, {
    method: 'POST',
    body: JSON.stringify({ name: opts.name, type: opts.type, parent_id: opts.parentId, topic: opts.topic }),
  })
  if (!res.ok) throw new DiscordApiError(res.status, 'Failed to create channel')
  return res.json() as Promise<DiscordChannelFull>
}

export async function updateChannel(
  channelId: string,
  patch: { name?: string; topic?: string; rate_limit_per_user?: number; parent_id?: string | null },
): Promise<DiscordChannelFull> {
  const res = await botFetch(`/channels/${channelId}`, { method: 'PATCH', body: JSON.stringify(patch) })
  if (!res.ok) throw new DiscordApiError(res.status, 'Failed to update channel')
  return res.json() as Promise<DiscordChannelFull>
}

const SEND_MESSAGES_BIT = 1n << 11n

export async function setChannelLocked(guildId: string, channelId: string, locked: boolean) {
  const res = await botFetch(`/channels/${channelId}/permissions/${guildId}`, {
    method: 'PUT',
    body: JSON.stringify({
      type: 0,
      deny: locked ? SEND_MESSAGES_BIT.toString() : '0',
      allow: locked ? '0' : SEND_MESSAGES_BIT.toString(),
    }),
  })
  if (!res.ok) throw new DiscordApiError(res.status, 'Failed to update channel lock')
}

// --- Members ------------------------------------------------------------------

export interface DiscordMemberFull {
  user: DiscordUser
  roles: string[]
  joined_at: string
  nick: string | null
}

export async function fetchGuildMembersPage(
  guildId: string,
  opts: { limit?: number; after?: string } = {},
): Promise<DiscordMemberFull[]> {
  const params = new URLSearchParams({ limit: String(opts.limit ?? 100) })
  if (opts.after) params.set('after', opts.after)

  const res = await botFetch(`/guilds/${guildId}/members?${params.toString()}`)
  if (!res.ok) throw new DiscordApiError(res.status, 'Failed to fetch members')
  return res.json() as Promise<DiscordMemberFull[]>
}
