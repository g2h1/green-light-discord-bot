import type { NextFunction, Request, Response } from 'express'
import { canManageGuild, fetchUserGuilds, type DiscordGuild } from '../lib/discord.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      guild?: { id: string; name: string }
    }
  }
}

// A dashboard page load fires several requireServerAccess-gated requests at
// once (channels, roles, tickets, etc.), and each used to independently
// re-fetch the caller's full guild list from Discord. Discord rate-limits
// GET /users/@me/guilds aggressively, so that burst was enough to trip 429s
// on nearly every route. Caching per access token for a short window fixes
// the burst without meaningfully weakening the "re-check live" guarantee —
// a revoked Manage Server permission is still caught within this window.
const CACHE_TTL_MS = 15_000
const guildListCache = new Map<string, { guilds: DiscordGuild[]; expiresAt: number }>()

// The TTL cache above only helps once a value exists. On a cold cache — the
// common case, since a dashboard page load fires its first burst of
// requireServerAccess-gated requests all at once — every one of those
// requests would see a cache miss and independently call fetchUserGuilds,
// so the burst hit Discord's rate limit anyway. Sharing the in-flight
// promise across concurrent callers for the same token means Discord only
// ever sees one request per cold burst, not five.
const inFlightRequests = new Map<string, Promise<DiscordGuild[]>>()

async function getCachedUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
  const cached = guildListCache.get(accessToken)
  if (cached && cached.expiresAt > Date.now()) return cached.guilds

  const inFlight = inFlightRequests.get(accessToken)
  if (inFlight) return inFlight

  const request = fetchUserGuilds(accessToken)
    .then((guilds) => {
      guildListCache.set(accessToken, { guilds, expiresAt: Date.now() + CACHE_TTL_MS })
      return guilds
    })
    .finally(() => {
      inFlightRequests.delete(accessToken)
    })

  inFlightRequests.set(accessToken, request)
  return request
}

/**
 * Must run after requireAuth. Re-checks the caller's Discord permissions on
 * :serverId against Discord itself (via a short-lived cache, see above)
 * rather than trusting anything from login time, since a user's Manage
 * Server permission can change at any time.
 */
export async function requireServerAccess(req: Request, res: Response, next: NextFunction) {
  const { serverId } = req.params
  if (!serverId) {
    res.status(400).json({ message: 'Missing serverId' })
    return
  }

  try {
    const guilds = await getCachedUserGuilds(req.session!.discordAccessToken)
    const guild = guilds.find((g) => g.id === serverId)

    if (!guild || !canManageGuild(guild)) {
      res.status(403).json({ message: 'You do not have access to this server' })
      return
    }

    req.guild = { id: guild.id, name: guild.name }
    next()
  } catch (err) {
    next(err)
  }
}
