import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireServerAccess } from '../middleware/requireServerAccess.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { fetchGuildChannels } from '../lib/discord.js'

export const channelsRouter = Router({ mergeParams: true })

channelsRouter.get(
  '/',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    const channels = await fetchGuildChannels(req.params.serverId)
    res.json({ channels })
  }),
)
