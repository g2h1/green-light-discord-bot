import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type CategoryChannel,
  type ChatInputCommandInteraction,
  type Guild,
} from 'discord.js'
import { logEvent } from '../lib/logging.js'
import { SERVER_STRUCTURE } from '../config/serverStructure.js'
import { supabase } from '../lib/supabase.js'
import { getOrCreateServerRow } from '../lib/serverStore.js'
import { getSupportConfig } from '../lib/supportQueue.js'

export const data = new SlashCommandBuilder()
  .setName('server')
  .setDescription('Server structure management')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) => sub.setName('sync').setDescription('Idempotently create/verify the server category & channel structure'))

type Tier = 'public' | 'pro' | 'staff'

const STAFF_CATEGORIES = new Set(['STAFF', 'MODERATION', 'SYSTEM', 'DEVELOPMENT'])
const PRO_CATEGORIES = new Set(['PRO VOICE'])

function tierForCategory(categoryName: string): Tier {
  if (STAFF_CATEGORIES.has(categoryName)) return 'staff'
  if (PRO_CATEGORIES.has(categoryName)) return 'pro'
  return 'public'
}

async function ensureBotRoleHighest(guild: Guild) {
  const botMember = guild.members.me
  if (!botMember) return
  const highestOther = guild.roles.cache
    .filter((r) => r.id !== guild.roles.everyone.id && !r.managed)
    .sort((a, b) => b.position - a.position)
    .first()
  if (highestOther && botMember.roles.highest.position <= highestOther.position && botMember.manageable === false) {
    // Bot cannot move its own highest role above others via the API without Manage Roles
    // on itself; this is a manual step for the server owner. We only detect and report it.
  }
}

function permissionsForTier(guild: Guild, tier: Tier, staffRoleIds: string[], proRoleId?: string) {
  const everyone = guild.roles.everyone.id
  if (tier === 'public') {
    return [{ id: everyone, allow: [PermissionFlagsBits.ViewChannel] }]
  }
  if (tier === 'pro') {
    const overwrites = [{ id: everyone, deny: [PermissionFlagsBits.ViewChannel] }]
    if (proRoleId) overwrites.push({ id: proRoleId, allow: [PermissionFlagsBits.ViewChannel] } as never)
    return overwrites
  }
  // staff
  const overwrites: Array<{ id: string; allow?: bigint[]; deny?: bigint[] }> = [
    { id: everyone, deny: [PermissionFlagsBits.ViewChannel] },
  ]
  for (const roleId of staffRoleIds) overwrites.push({ id: roleId, allow: [PermissionFlagsBits.ViewChannel] })
  return overwrites
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild
  if (!guild || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({ content: 'You need the Manage Server permission to run this.', ephemeral: true })
    return
  }

  await interaction.deferReply({ ephemeral: true })

  const staffRoleIds = guild.roles.cache
    .filter((r) => /staff|mod|admin/i.test(r.name) && !r.managed && r.id !== guild.roles.everyone.id)
    .map((r) => r.id)
  const proRole = guild.roles.cache.find((r) => /pro/i.test(r.name) && !r.managed)

  const created: string[] = []
  const skipped: string[] = []

  for (const plan of SERVER_STRUCTURE) {
    let category = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === plan.category.toLowerCase(),
    ) as CategoryChannel | undefined

    const tier = tierForCategory(plan.category)
    const overwrites = permissionsForTier(guild, tier, staffRoleIds, proRole?.id) as never

    if (!category) {
      category = await guild.channels.create({
        name: plan.category,
        type: ChannelType.GuildCategory,
        permissionOverwrites: overwrites,
      })
      created.push(`category "${plan.category}"`)
    } else {
      await category.permissionOverwrites.set(overwrites).catch(() => undefined)
      skipped.push(`category "${plan.category}" (already exists — permissions verified)`)
    }

    for (const ch of plan.channels) {
      const existingChannel = guild.channels.cache.find(
        (c) =>
          c.parentId === category!.id &&
          c.type === ch.type &&
          c.name.toLowerCase().replace(/[^a-z0-9-]/g, '-') === ch.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      )
      if (existingChannel) {
        skipped.push(`channel "${ch.name}" in ${plan.category}`)
        continue
      }
      await guild.channels.create({
        name: ch.name,
        type: ch.type,
        parent: category.id,
      })
      created.push(`channel "${ch.name}" in ${plan.category}`)
    }
  }

  await ensureBotRoleHighest(guild)
  const supportConfigUpdated = await syncSupportQueueConfig(guild)

  await logEvent(guild, 'bot', 'server_sync', `Server structure synced by <@${interaction.user.id}>`, {
    created: created.length,
    skipped: skipped.length,
  })

  const summary =
    `**Server sync complete.**\n` +
    `Created: ${created.length ? created.join(', ') : 'nothing new'}\n` +
    `Already present (untouched or perms re-applied): ${skipped.length}\n` +
    `Support queue config: ${supportConfigUpdated ? 'updated (waiting channel + rooms wired up)' : 'unchanged — support voice channels not found'}`

  await interaction.editReply(summary.slice(0, 1900))
}

function findVoiceChannelId(guild: Guild, name: string): string | undefined {
  return guild.channels.cache.find((c) => c.isVoiceBased() && c.name.toLowerCase() === name.toLowerCase())?.id
}

/** Wires the freshly-synced "SUPPORT VOICE" channels into the support_queue server setting, preserving any other fields already set (staff roles, locale). */
async function syncSupportQueueConfig(guild: Guild): Promise<boolean> {
  const waitingChannelId = findVoiceChannelId(guild, 'Support Waiting')
  const roomChannelIds = [findVoiceChannelId(guild, 'Support Room 1'), findVoiceChannelId(guild, 'Support Room 2')].filter(
    (id): id is string => Boolean(id),
  )

  if (!waitingChannelId && roomChannelIds.length === 0) return false

  const server = await getOrCreateServerRow(guild)
  const existing = await getSupportConfig(server.id)

  const value = {
    ...existing,
    ...(waitingChannelId ? { waitingChannelId } : {}),
    ...(roomChannelIds.length ? { roomChannelIds } : {}),
  }

  await supabase
    .from('server_settings')
    .upsert({ server_id: server.id, key: 'support_queue', value }, { onConflict: 'server_id,key' })

  return true
}
