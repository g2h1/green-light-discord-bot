import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireServerAccess } from '../middleware/requireServerAccess.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { fetchGuildMembersPage } from '../lib/discord.js';
import { getOrCreateServerRow } from '../lib/serverStore.js';
import { supabase } from '../lib/supabase.js';
export const membersRouter = Router({ mergeParams: true });
membersRouter.get('/', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const after = typeof req.query.after === 'string' ? req.query.after : undefined;
    const members = await fetchGuildMembersPage(req.params.serverId, { limit: 100, after });
    res.json({
        members: members.map((m) => ({
            id: m.user.id,
            username: m.user.username,
            nick: m.nick,
            avatar: m.user.avatar,
            joinedAt: m.joined_at,
            roles: m.roles,
        })),
    });
}));
membersRouter.get('/:discordUserId/summary', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId);
    const { count: warningCount } = await supabase
        .from('warnings')
        .select('id', { count: 'exact', head: true })
        .eq('server_id', server.id)
        .eq('discord_user_id', req.params.discordUserId);
    res.json({ warningCount: warningCount ?? 0 });
}));
