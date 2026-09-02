import { PermissionFlagsBits, type GuildMember } from 'discord.js'

/** True for server owner, Administrator, or Manage Guild — the bot's baseline "staff" bar. */
export function isServerStaff(member: GuildMember): boolean {
  if (member.guild.ownerId === member.id) return true
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true
  return false
}

/** True if the member holds Administrator/Manage Guild, or any of the given role IDs. */
export function hasAnyRole(member: GuildMember, roleIds: string[]): boolean {
  if (isServerStaff(member)) return true
  return roleIds.some((id) => member.roles.cache.has(id))
}

/** True if the bot's highest role sits above `member`'s highest role (required to move/mute/ban them). */
export function botOutranks(member: GuildMember): boolean {
  const botMember = member.guild.members.me
  if (!botMember) return false
  if (member.guild.ownerId === member.id) return false
  return botMember.roles.highest.position > member.roles.highest.position
}
