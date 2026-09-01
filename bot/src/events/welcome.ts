import { EmbedBuilder, type Client, type GuildMember } from 'discord.js'
import { supabase } from '../lib/supabase.js'
import { runAutomations } from '../lib/automations.js'

interface WelcomeConfig {
  enabled: boolean
  message: string
  useEmbed: boolean
  embed?: Record<string, unknown>
  channelId?: string
  autoRoleId?: string
  dmEnabled: boolean
  dmMessage?: string
}

function fillVariables(text: string, member: GuildMember) {
  return text
    .replace(/\{user\}/g, `<@${member.id}>`)
    .replace(/\{username\}/g, member.user.username)
    .replace(/\{server\}/g, member.guild.name)
    .replace(/\{memberCount\}/g, String(member.guild.memberCount))
}

export function registerWelcome(client: Client) {
  client.on('guildMemberAdd', async (member) => {
    try {
      const { data: server } = await supabase
        .from('servers')
        .select('id')
        .eq('discord_guild_id', member.guild.id)
        .maybeSingle()

      const config = server
        ? ((
            await supabase
              .from('server_settings')
              .select('value')
              .eq('server_id', server.id)
              .eq('key', 'welcome')
              .maybeSingle()
          ).data?.value as WelcomeConfig | undefined)
        : undefined

      if (config?.enabled) {
        if (config.autoRoleId) {
          await member.roles.add(config.autoRoleId).catch((err) => console.error('Auto-role failed:', err))
        }

        const channel = config.channelId ? member.guild.channels.cache.get(config.channelId) : undefined
        if (channel?.isTextBased()) {
          const text = fillVariables(config.message, member)
          if (config.useEmbed && config.embed) {
            const embed = new EmbedBuilder(config.embed as ConstructorParameters<typeof EmbedBuilder>[0])
            if (embed.data.description) embed.setDescription(fillVariables(embed.data.description, member))
            await channel.send({ content: config.useEmbed ? undefined : text, embeds: [embed] })
          } else {
            await channel.send(text)
          }
        }

        if (config.dmEnabled && config.dmMessage) {
          await member.send(fillVariables(config.dmMessage, member)).catch(() => undefined)
        }
      }

      await runAutomations(member.guild, 'member_join', {
        userId: member.id,
        vars: {
          user: `<@${member.id}>`,
          username: member.user.username,
          server: member.guild.name,
          memberCount: String(member.guild.memberCount),
        },
      })
    } catch (err) {
      console.error('Welcome handler failed:', err)
    }
  })
}
