import { supabase } from './supabase.js'
import { getServerSetting } from './serverSettings.js'
import { sendChannelMessage, type EmbedPayload } from './discord.js'

export type ModerationAction = 'warn' | 'timeout' | 'kick' | 'ban' | 'unban' | 'purge' | 'delete_message'

interface LogChannels {
  moderation_logs?: string
  member_logs?: string
  message_logs?: string
  ticket_logs?: string
  role_logs?: string
  channel_logs?: string
  security_logs?: string
  bot_logs?: string
}

const ACTION_COLOR: Record<ModerationAction, number> = {
  warn: 0xf5a524,
  timeout: 0xf5a524,
  kick: 0xf31260,
  ban: 0xf31260,
  unban: 0x17c964,
  purge: 0x71717a,
  delete_message: 0x71717a,
}

export async function recordModerationAction(
  serverRowId: string,
  opts: {
    action: ModerationAction
    targetDiscordId?: string
    moderatorDiscordId: string
    reason?: string
    metadata?: Record<string, unknown>
  },
) {
  await supabase.from('moderation_logs').insert({
    server_id: serverRowId,
    action: opts.action,
    target_discord_id: opts.targetDiscordId ?? null,
    moderator_discord_id: opts.moderatorDiscordId,
    reason: opts.reason ?? null,
    metadata: opts.metadata ?? {},
  })

  const channels = await getServerSetting<LogChannels>(serverRowId, 'log_channels', {})
  const channelId = channels.moderation_logs
  if (!channelId) return

  const embed: EmbedPayload = {
    title: `Moderation: ${opts.action.replace('_', ' ')}`,
    color: ACTION_COLOR[opts.action],
    fields: [
      ...(opts.targetDiscordId ? [{ name: 'Target', value: `<@${opts.targetDiscordId}>`, inline: true }] : []),
      { name: 'Moderator', value: `<@${opts.moderatorDiscordId}>`, inline: true },
      ...(opts.reason ? [{ name: 'Reason', value: opts.reason }] : []),
    ],
    timestamp: new Date().toISOString(),
  }

  await sendChannelMessage(channelId, { embed }).catch((err) =>
    console.error('Failed to post moderation log message:', err),
  )
}
