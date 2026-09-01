import { PermissionFlagsBits, type Message } from 'discord.js'
import { supabase } from './supabase.js'
import { getServerSetting } from './serverSettings.js'
import { recordModerationAction } from './moderationLog.js'

interface StrictChannelRule {
  channelId: string
  enabled: boolean
  exemptRoleIds: string[]
}

function isExempt(message: Message, rule: StrictChannelRule): boolean {
  const member = message.member
  if (!member) return true // fail open: can't verify, don't punish

  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true
  if (member.permissions.has(PermissionFlagsBits.ModerateMembers)) return true
  if (rule.exemptRoleIds.some((roleId) => member.roles.cache.has(roleId))) return true

  return false
}

/** Returns true if this message was a strict-channel violation (already handled). */
export async function checkStrictChannel(message: Message): Promise<boolean> {
  if (!message.guild || !message.member) return false

  const { data: server } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_guild_id', message.guild.id)
    .maybeSingle()
  if (!server) return false

  const rules = await getServerSetting<StrictChannelRule[]>(server.id, 'strict_channels', [])
  const rule = rules.find((r) => r.channelId === message.channelId && r.enabled)
  if (!rule) return false

  if (isExempt(message, rule)) return false

  await message.delete().catch(() => undefined)

  const botMember = message.guild.members.me
  const canBan =
    botMember &&
    message.member.roles.highest.position < botMember.roles.highest.position &&
    message.guild.ownerId !== message.member.id

  const reason = `Strict Channel Protection: sent a message in a protected channel (#${'name' in message.channel ? message.channel.name : message.channelId})`

  if (canBan) {
    await message.member.ban({ reason }).catch(() => undefined)
  }

  await recordModerationAction(message.guild, {
    action: canBan ? 'ban' : 'delete_message',
    targetDiscordId: message.author.id,
    moderatorDiscordId: message.guild.client.user.id,
    reason: canBan
      ? reason
      : `${reason} — ban skipped: bot's role is not above this member's highest role`,
    metadata: {
      channelId: message.channelId,
      messageContent: message.content.slice(0, 500),
      strictChannelProtection: true,
      banned: Boolean(canBan),
    },
  })

  return true
}
