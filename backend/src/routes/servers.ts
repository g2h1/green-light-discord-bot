import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireServerAccess } from '../middleware/requireServerAccess.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import {
  canManageGuild,
  fetchBotGuildIds,
  fetchGuildChannelCount,
  fetchGuildDetail,
  fetchGuildRoleCount,
  fetchUserGuilds,
} from '../lib/discord.js'
import { env } from '../lib/env.js'
import { supabase } from '../lib/supabase.js'
import { HttpError } from '../middleware/errorHandler.js'

export const serversRouter = Router()

serversRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const [userGuilds, botGuildIds] = await Promise.all([
      fetchUserGuilds(req.session!.discordAccessToken),
      fetchBotGuildIds(),
    ])

    const manageable = userGuilds.filter(canManageGuild)

    const servers = manageable.map((guild) => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
        : null,
      botInstalled: botGuildIds.has(guild.id),
      inviteUrl: `https://discord.com/oauth2/authorize?client_id=${env.DISCORD_CLIENT_ID}&scope=bot%20applications.commands&permissions=8&guild_id=${guild.id}`,
    }))

    const installedServers = servers.filter((s) => s.botInstalled)
    if (installedServers.length > 0) {
      await supabase
        .from('servers')
        .upsert(
          installedServers.map((s) => ({ discord_guild_id: s.id, name: s.name, icon: s.icon })),
          { onConflict: 'discord_guild_id' },
        )
    }

    res.json({ servers })
  }),
)

serversRouter.get(
  '/:serverId/overview',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    const { serverId } = req.params

    const detail = await fetchGuildDetail(serverId)
    if (!detail) {
      throw new HttpError(404, 'GREEN LIGHT is not installed on this server yet')
    }

    const [channelCount, roleCount] = await Promise.all([
      fetchGuildChannelCount(serverId),
      fetchGuildRoleCount(serverId),
    ])

    res.json({
      server: {
        id: detail.id,
        name: detail.name,
        icon: detail.icon
          ? `https://cdn.discordapp.com/icons/${detail.id}/${detail.icon}.png`
          : null,
      },
      stats: {
        memberCount: detail.approximate_member_count ?? 0,
        onlineCount: detail.approximate_presence_count ?? 0,
        channelCount,
        roleCount,
      },
    })
  }),
)
