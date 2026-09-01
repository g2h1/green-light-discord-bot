import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  type ButtonInteraction,
  type Guild,
} from 'discord.js'
import { supabase } from './supabase.js'
import { runAutomations } from './automations.js'

interface PanelConfig {
  buttonText: string
  buttonEmoji?: string
  ticketCategoryId?: string
  transcriptChannelId?: string
  mentionOnOpenRoleIds: string[]
  enableTranscript: boolean
  welcomeEnabled: boolean
  welcomeMessage?: string
  welcomeEmbedTitle?: string
  welcomeEmbedDescription?: string
  welcomeImageUrl?: string
  welcomeThumbnailUrl?: string
  namingFormat: string
  maxOpenTicketsPerUser: number
  allowReopen: boolean
  deleteOnClose: boolean
  archiveInsteadOfDelete: boolean
  transcriptBehavior: 'channel' | 'dm' | 'none'
  enableClaim: boolean
  claimButtonText: string
  claimButtonEmoji?: string
  claimPermissionRoleIds: string[]
  enableClose: boolean
  closeButtonText: string
  closeButtonEmoji?: string
}

interface TicketPanelRow {
  id: string
  server_id: string
  categories: Array<{ label: string; emoji?: string }>
  disabled: boolean
  config: PanelConfig
}

function actionButtons(status: 'open' | 'claimed' | 'closed', config: PanelConfig) {
  const row = new ActionRowBuilder<ButtonBuilder>()

  if (status !== 'closed') {
    if (config.enableClaim) {
      const b = new ButtonBuilder().setCustomId('ticket_claim').setLabel(config.claimButtonText).setStyle(ButtonStyle.Primary)
      if (config.claimButtonEmoji) b.setEmoji(config.claimButtonEmoji)
      row.addComponents(b)
    }
    if (config.enableClose) {
      const b = new ButtonBuilder().setCustomId('ticket_close').setLabel(config.closeButtonText).setStyle(ButtonStyle.Danger)
      if (config.closeButtonEmoji) b.setEmoji(config.closeButtonEmoji)
      row.addComponents(b)
    }
  } else {
    if (config.allowReopen) {
      row.addComponents(new ButtonBuilder().setCustomId('ticket_reopen').setLabel('Reopen').setStyle(ButtonStyle.Secondary))
    }
    row.addComponents(new ButtonBuilder().setCustomId('ticket_delete').setLabel('Delete').setStyle(ButtonStyle.Danger))
  }

  return row
}

function ratingButtons() {
  const row = new ActionRowBuilder<ButtonBuilder>()
  for (let stars = 1; stars <= 5; stars++) {
    row.addComponents(
      new ButtonBuilder().setCustomId(`ticket_rate:${stars}`).setLabel('★'.repeat(stars)).setStyle(ButtonStyle.Secondary),
    )
  }
  return row
}

async function countOpenTickets(serverId: string, openerDiscordId: string) {
  const { count } = await supabase
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('server_id', serverId)
    .eq('opener_discord_id', openerDiscordId)
    .in('status', ['open', 'claimed'])
  return count ?? 0
}

function fillTicketVariables(
  text: string,
  vars: { user: string; username: string; ticket: string; ticketId: string; server: string; createdAt: string },
) {
  return text
    .replace(/\{user\}/g, vars.user)
    .replace(/\{username\}/g, vars.username)
    .replace(/\{ticket\}/g, vars.ticket)
    .replace(/\{ticket_id\}/g, vars.ticketId)
    .replace(/\{server\}/g, vars.server)
    .replace(/\{created_at\}/g, vars.createdAt)
}

export async function handleTicketOpen(interaction: ButtonInteraction, panelId: string, categoryIndex: string) {
  const guild = interaction.guild
  if (!guild) return

  // Defer immediately, before any DB round-trips — Discord invalidates an
  // interaction token ~3s after creation, and a slow Supabase query ahead of
  // the first ack was enough to blow that budget and throw "Unknown interaction".
  await interaction.deferReply({ ephemeral: true })

  const { data: panel } = await supabase
    .from('ticket_panels')
    .select('id, server_id, categories, disabled, config')
    .eq('id', panelId)
    .maybeSingle<TicketPanelRow>()

  if (!panel || panel.disabled) {
    await interaction.editReply('This ticket panel is not currently accepting tickets.')
    return
  }

  const config = panel.config
  const category = panel.categories[Number(categoryIndex)] ?? { label: config.buttonText, emoji: config.buttonEmoji }

  const openCount = await countOpenTickets(panel.server_id, interaction.user.id)
  if (openCount >= config.maxOpenTicketsPerUser) {
    await interaction.editReply(
      `You already have ${openCount} open ticket(s), which is the limit for this server (${config.maxOpenTicketsPerUser}).`,
    )
    return
  }

  const channelName = fillTicketVariables(config.namingFormat || 'ticket-{username}', {
    user: `<@${interaction.user.id}>`,
    username: interactionSafeName(guild, interaction.user.id),
    ticket: '',
    ticketId: '',
    server: guild.name,
    createdAt: new Date().toISOString(),
  })
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .slice(0, 90)

  const channel = await createTicketChannel(guild, channelName, interaction.user.id, config.ticketCategoryId)

  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert({
      server_id: panel.server_id,
      panel_id: panel.id,
      discord_channel_id: channel.id,
      category: category.label,
      opener_discord_id: interaction.user.id,
      status: 'open',
    })
    .select()
    .single()

  if (error || !ticket) {
    await channel.delete().catch(() => undefined)
    await interaction.editReply('Failed to create your ticket. Please try again.')
    return
  }

  const vars = {
    user: `<@${interaction.user.id}>`,
    username: interaction.user.username,
    ticket: channel.name,
    ticketId: ticket.id,
    server: guild.name,
    createdAt: new Date(ticket.created_at).toLocaleString(),
  }

  const mentions = config.mentionOnOpenRoleIds.length
    ? config.mentionOnOpenRoleIds.map((id) => `<@&${id}>`).join(' ') + ' '
    : ''

  if (config.welcomeEnabled) {
    const embed = new EmbedBuilder()
      .setTitle(config.welcomeEmbedTitle ? fillTicketVariables(config.welcomeEmbedTitle, vars) : `${category.label} ticket`)
      .setDescription(
        config.welcomeEmbedDescription
          ? fillTicketVariables(config.welcomeEmbedDescription, vars)
          : `Welcome ${vars.user}. Support will be with you shortly.`,
      )
      .setColor(0x17c964)
    if (config.welcomeImageUrl) embed.setImage(config.welcomeImageUrl)
    if (config.welcomeThumbnailUrl) embed.setThumbnail(config.welcomeThumbnailUrl)

    await channel.send({
      content: mentions ? `${mentions}${vars.user}` : undefined,
      embeds: [embed],
      components: [actionButtons('open', config)],
    })
    if (config.welcomeMessage) {
      await channel.send(fillTicketVariables(config.welcomeMessage, vars))
    }
  } else {
    await channel.send({ content: `${mentions}${vars.user}`, components: [actionButtons('open', config)] })
  }

  await interaction.editReply(`Your ticket is ready: <#${channel.id}>`)
}

async function createTicketChannel(guild: Guild, name: string, openerId: string, parentId?: string) {
  return guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: parentId,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: openerId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
      {
        id: guild.client.user!.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageChannels,
        ],
      },
    ],
  })
}

function interactionSafeName(guild: Guild, userId: string) {
  const member = guild.members.cache.get(userId)
  return (member?.user.username ?? userId).toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 16) || userId
}

async function loadTicketByChannel(channelId: string) {
  const { data } = await supabase.from('tickets').select('*').eq('discord_channel_id', channelId).maybeSingle()
  return data
}

async function loadPanelConfig(panelId: string | null): Promise<PanelConfig | null> {
  if (!panelId) return null
  const { data } = await supabase.from('ticket_panels').select('config').eq('id', panelId).maybeSingle()
  return (data?.config as PanelConfig) ?? null
}

export async function handleTicketClaim(interaction: ButtonInteraction) {
  // Deferred immediately for the same reason as handleTicketOpen: the DB/config
  // lookups below can push past Discord's ~3s interaction-ack window.
  await interaction.deferReply()

  const ticket = await loadTicketByChannel(interaction.channelId)
  if (!ticket) return interaction.editReply('This is not a ticket channel.')

  const config = await loadPanelConfig(ticket.panel_id)
  if (config?.claimPermissionRoleIds.length) {
    const roles = interaction.member?.roles
    const hasPermission = Array.isArray(roles)
      ? roles.some((r) => config.claimPermissionRoleIds.includes(r))
      : (roles?.cache.some((_, id) => config.claimPermissionRoleIds.includes(id)) ?? false)
    if (!hasPermission) {
      return interaction.editReply("You don't have permission to claim this ticket.")
    }
  }

  await supabase
    .from('tickets')
    .update({ status: 'claimed', claimed_by_discord_id: interaction.user.id })
    .eq('id', ticket.id)

  await interaction.editReply(`🎫 Claimed by <@${interaction.user.id}>`)
}

async function postTranscript(guild: Guild, ticket: { id: string; discord_channel_id: string; category: string }, config: PanelConfig | null) {
  if (!config?.enableTranscript || config.transcriptBehavior === 'none') return
  if (config.transcriptBehavior === 'channel' && !config.transcriptChannelId) return

  const { data: messages } = await supabase
    .from('ticket_messages')
    .select('author_username, content, created_at')
    .eq('ticket_id', ticket.id)
    .order('created_at', { ascending: true })

  const lines = (messages ?? []).map((m) => `[${new Date(m.created_at).toLocaleString()}] ${m.author_username}: ${m.content}`)
  const transcriptText = lines.length ? lines.join('\n').slice(0, 3800) : '(no messages were sent in this ticket)'

  const embed = new EmbedBuilder()
    .setTitle(`Transcript: ${ticket.category}`)
    .setDescription('```\n' + transcriptText + '\n```')
    .setColor(0x71717a)
    .setTimestamp()

  if (config.transcriptBehavior === 'channel' && config.transcriptChannelId) {
    const channel = guild.channels.cache.get(config.transcriptChannelId)
    if (channel?.isTextBased()) await channel.send({ embeds: [embed] }).catch(() => undefined)
  }
}

export async function handleTicketClose(interaction: ButtonInteraction) {
  // Deferred immediately — this handler does a permission-overwrite edit, a DB
  // update, and a transcript post before it used to reply, comfortably enough
  // work to blow the 3s ack window (confirmed live: this exact handler failed
  // with "Unknown interaction" on a real ticket before this fix).
  await interaction.deferReply()

  const ticket = await loadTicketByChannel(interaction.channelId)
  if (!ticket) return interaction.editReply('This is not a ticket channel.')

  const config = await loadPanelConfig(ticket.panel_id)

  const channel = interaction.channel
  if (channel && channel.type === ChannelType.GuildText) {
    await channel.permissionOverwrites.edit(ticket.opener_discord_id, { SendMessages: false }).catch(() => undefined)
  }

  await supabase.from('tickets').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', ticket.id)

  if (interaction.guild) await postTranscript(interaction.guild, ticket, config)

  await interaction.editReply({
    content: 'Ticket closed. Please rate your support experience:',
    components: [ratingButtons(), actionButtons('closed', config ?? DEFAULT_CONFIG)],
  })

  if (interaction.guild) {
    await runAutomations(interaction.guild, 'ticket_close', {
      userId: ticket.opener_discord_id,
      channelId: ticket.discord_channel_id,
      vars: { user: `<@${ticket.opener_discord_id}>`, category: ticket.category },
    })

    if (config?.deleteOnClose && !config.archiveInsteadOfDelete) {
      const ch = interaction.guild.channels.cache.get(ticket.discord_channel_id)
      if (ch) setTimeout(() => ch.delete().catch(() => undefined), 5000)
    }
  }
}

const DEFAULT_CONFIG: PanelConfig = {
  buttonText: 'Open a ticket',
  ticketCategoryId: undefined,
  transcriptChannelId: undefined,
  mentionOnOpenRoleIds: [],
  enableTranscript: true,
  welcomeEnabled: true,
  namingFormat: 'ticket-{username}',
  maxOpenTicketsPerUser: 1,
  allowReopen: true,
  deleteOnClose: false,
  archiveInsteadOfDelete: true,
  transcriptBehavior: 'channel',
  enableClaim: true,
  claimButtonText: 'Claim',
  claimPermissionRoleIds: [],
  enableClose: true,
  closeButtonText: 'Close',
}

export async function handleTicketReopen(interaction: ButtonInteraction) {
  await interaction.deferReply()

  const ticket = await loadTicketByChannel(interaction.channelId)
  if (!ticket) return interaction.editReply('This is not a ticket channel.')

  const channel = interaction.channel
  if (channel && channel.type === ChannelType.GuildText) {
    await channel.permissionOverwrites.edit(ticket.opener_discord_id, { SendMessages: true }).catch(() => undefined)
  }

  const config = await loadPanelConfig(ticket.panel_id)
  await supabase.from('tickets').update({ status: 'claimed', closed_at: null }).eq('id', ticket.id)
  await interaction.editReply({ content: 'Ticket reopened.', components: [actionButtons('claimed', config ?? DEFAULT_CONFIG)] })
}

export async function handleTicketDelete(interaction: ButtonInteraction) {
  await interaction.deferReply()

  const ticket = await loadTicketByChannel(interaction.channelId)
  if (!ticket) return interaction.editReply('This is not a ticket channel.')

  await interaction.editReply('Deleting this ticket channel…')
  await supabase.from('tickets').delete().eq('id', ticket.id)
  const channel = interaction.channel
  if (channel && 'delete' in channel) await channel.delete().catch(() => undefined)
}

export async function handleTicketRate(interaction: ButtonInteraction, stars: string) {
  await interaction.deferReply({ ephemeral: true })

  const ticket = await loadTicketByChannel(interaction.channelId)
  if (!ticket) return interaction.editReply('This is not a ticket channel.')

  await supabase.from('ticket_ratings').upsert(
    { ticket_id: ticket.id, stars: Number(stars), rated_by_discord_id: interaction.user.id },
    { onConflict: 'ticket_id' },
  )

  await interaction.editReply(`Thanks for the ${stars}-star rating!`)
}

export async function logTicketMessage(channelId: string, authorId: string, authorUsername: string, content: string) {
  const ticket = await loadTicketByChannel(channelId)
  if (!ticket || ticket.status === 'closed') return

  await supabase.from('ticket_messages').insert({
    ticket_id: ticket.id,
    author_discord_id: authorId,
    author_username: authorUsername,
    content,
  })
}
