import { EmbedBuilder, type Guild } from 'discord.js'
import { supabase } from './supabase.js'
import { getOrCreateServerRow } from './serverStore.js'

type LogCategory = 'member' | 'moderation' | 'message' | 'role' | 'channel' | 'ticket' | 'security' | 'bot'

const CATEGORY_TO_CHANNEL_KEY: Record<LogCategory, string> = {
  member: 'member_logs',
  moderation: 'moderation_logs',
  message: 'message_logs',
  ticket: 'ticket_logs',
  role: 'role_logs',
  channel: 'channel_logs',
  security: 'security_logs',
  bot: 'bot_logs',
}

const CATEGORY_COLOR: Record<LogCategory, number> = {
  member: 0x17c964,
  moderation: 0xf5a524,
  message: 0x71717a,
  ticket: 0x17c964,
  role: 0x9333ea,
  channel: 0x3b82f6,
  security: 0xf31260,
  bot: 0x71717a,
}

export async function logEvent(
  guild: Guild,
  category: LogCategory,
  eventType: string,
  summary: string,
  metadata: Record<string, unknown> = {},
) {
  const server = await getOrCreateServerRow(guild)

  await supabase.from('system_logs').insert({
    server_id: server.id,
    category,
    event_type: eventType,
    summary,
    metadata,
  })

  const { data: setting } = await supabase
    .from('server_settings')
    .select('value')
    .eq('server_id', server.id)
    .eq('key', 'log_channels')
    .maybeSingle()

  const channelId = (setting?.value as Record<string, string> | undefined)?.[CATEGORY_TO_CHANNEL_KEY[category]]
  if (!channelId) return

  const channel = guild.channels.cache.get(channelId)
  if (!channel || !channel.isTextBased()) return

  const embed = new EmbedBuilder().setDescription(summary).setColor(CATEGORY_COLOR[category]).setTimestamp()
  await channel.send({ embeds: [embed] }).catch(() => undefined)
}
