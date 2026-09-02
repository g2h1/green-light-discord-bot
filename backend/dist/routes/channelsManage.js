import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireServerAccess } from '../middleware/requireServerAccess.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { createGuildChannel, deleteChannel, fetchAllGuildChannels, setChannelLocked, updateChannel, } from '../lib/discord.js';
export const channelsManageRouter = Router({ mergeParams: true });
channelsManageRouter.get('/', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const channels = await fetchAllGuildChannels(req.params.serverId);
    res.json({ channels });
}));
const createSchema = z.object({
    name: z.string().min(1).max(100),
    type: z.union([z.literal(0), z.literal(2), z.literal(4)]), // text, voice, category
    parentId: z.string().optional(),
    topic: z.string().max(1024).optional(),
});
channelsManageRouter.post('/', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const channel = await createGuildChannel(req.params.serverId, body);
    res.status(201).json({ channel });
}));
const updateSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    topic: z.string().max(1024).optional(),
    slowmodeSeconds: z.number().int().min(0).max(21600).optional(),
    parentId: z.string().nullable().optional(),
});
channelsManageRouter.patch('/:channelId', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const body = updateSchema.parse(req.body);
    const channel = await updateChannel(req.params.channelId, {
        name: body.name,
        topic: body.topic,
        rate_limit_per_user: body.slowmodeSeconds,
        parent_id: body.parentId,
    });
    res.json({ channel });
}));
channelsManageRouter.post('/:channelId/lock', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const { locked } = z.object({ locked: z.boolean() }).parse(req.body);
    await setChannelLocked(req.params.serverId, req.params.channelId, locked);
    res.status(204).end();
}));
channelsManageRouter.delete('/:channelId', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    await deleteChannel(req.params.channelId);
    res.status(204).end();
}));
