import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireServerAccess } from '../middleware/requireServerAccess.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import {
  assertRoleBelowBot,
  assignRole,
  createGuildRole,
  deleteGuildRole,
  editGuildRole,
  fetchGuildRolesFull,
  removeRole,
} from '../lib/discord.js'

export const rolesRouter = Router({ mergeParams: true })

rolesRouter.get(
  '/',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    const roles = await fetchGuildRolesFull(req.params.serverId)
    res.json({ roles })
  }),
)

const createSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.number().int().min(0).max(0xffffff).optional(),
  hoist: z.boolean().optional(),
  mentionable: z.boolean().optional(),
})

rolesRouter.post(
  '/',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body)
    const role = await createGuildRole(req.params.serverId, body)
    res.status(201).json({ role })
  }),
)

rolesRouter.patch(
  '/:roleId',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    const body = createSchema.partial().parse(req.body)
    await assertRoleBelowBot(req.params.serverId, req.params.roleId)
    const role = await editGuildRole(req.params.serverId, req.params.roleId, body)
    res.json({ role })
  }),
)

rolesRouter.delete(
  '/:roleId',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    await assertRoleBelowBot(req.params.serverId, req.params.roleId)
    await deleteGuildRole(req.params.serverId, req.params.roleId)
    res.status(204).end()
  }),
)

const memberRoleSchema = z.object({ discordUserId: z.string().min(1) })

rolesRouter.post(
  '/:roleId/members',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    const body = memberRoleSchema.parse(req.body)
    await assertRoleBelowBot(req.params.serverId, req.params.roleId)
    await assignRole(req.params.serverId, body.discordUserId, req.params.roleId)
    res.status(204).end()
  }),
)

rolesRouter.delete(
  '/:roleId/members/:discordUserId',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    await assertRoleBelowBot(req.params.serverId, req.params.roleId)
    await removeRole(req.params.serverId, req.params.discordUserId, req.params.roleId)
    res.status(204).end()
  }),
)
