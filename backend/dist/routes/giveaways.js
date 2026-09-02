import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireServerAccess } from '../middleware/requireServerAccess.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';
import { getOrCreateServerRow } from '../lib/serverStore.js';
import { sendChannelMessage } from '../lib/discord.js';
import { supabase } from '../lib/supabase.js';
export const giveawaysRouter = Router({ mergeParams: true });
function giveawayEmbed(prize, winnersCount, endsAt, requiredRoleId) {
    return {
        title: `🎉 ${prize}`,
        description: [
            `Winners: **${winnersCount}**`,
            `Ends: <t:${Math.floor(new Date(endsAt).getTime() / 1000)}:R>`,
            requiredRoleId ? `Requires role: <@&${requiredRoleId}>` : null,
            '\nClick **Enter Giveaway** below to join.',
        ]
            .filter(Boolean)
            .join('\n'),
        color: 0x17c964,
    };
}
const createSchema = z.object({
    channelId: z.string().min(1),
    prize: z.string().min(1).max(256),
    winnersCount: z.number().int().min(1).max(50),
    requiredRoleId: z.string().optional(),
    minAccountAgeDays: z.number().int().min(0).optional(),
    endsAt: z.string().datetime(),
});
giveawaysRouter.post('/', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const server = await getOrCreateServerRow(req.params.serverId);
    const { data: giveaway, error } = await supabase
        .from('giveaways')
        .insert({
        server_id: server.id,
        channel_id: body.channelId,
        prize: body.prize,
        winners_count: body.winnersCount,
        required_role_id: body.requiredRoleId ?? null,
        min_account_age_days: body.minAccountAgeDays ?? null,
        ends_at: body.endsAt,
        created_by: req.session.userId,
    })
        .select()
        .single();
    if (error || !giveaway)
        throw error ?? new Error('Failed to create giveaway');
    const sent = await sendChannelMessage(body.channelId, {
        embed: giveawayEmbed(body.prize, body.winnersCount, body.endsAt, body.requiredRoleId),
        buttons: [{ label: 'Enter Giveaway', customId: `giveaway_enter:${giveaway.id}`, style: 3, emoji: '🎉' }],
    });
    await supabase.from('giveaways').update({ message_id: sent.id }).eq('id', giveaway.id);
    res.status(201).json({ giveaway: { ...giveaway, message_id: sent.id } });
}));
giveawaysRouter.get('/', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId);
    const { data, error } = await supabase
        .from('giveaways')
        .select('*')
        .eq('server_id', server.id)
        .order('created_at', { ascending: false });
    if (error)
        throw error;
    res.json({ giveaways: data });
}));
giveawaysRouter.get('/:giveawayId', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId);
    const { data: giveaway, error } = await supabase
        .from('giveaways')
        .select('*')
        .eq('id', req.params.giveawayId)
        .eq('server_id', server.id)
        .maybeSingle();
    if (error)
        throw error;
    if (!giveaway)
        throw new HttpError(404, 'Giveaway not found');
    const { count } = await supabase
        .from('giveaway_entries')
        .select('id', { count: 'exact', head: true })
        .eq('giveaway_id', giveaway.id);
    res.json({ giveaway, entryCount: count ?? 0 });
}));
giveawaysRouter.post('/:giveawayId/cancel', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId);
    const { data, error } = await supabase
        .from('giveaways')
        .update({ status: 'cancelled' })
        .eq('id', req.params.giveawayId)
        .eq('server_id', server.id)
        .select()
        .single();
    if (error || !data)
        throw error ?? new Error('Failed to cancel giveaway');
    res.json({ giveaway: data });
}));
async function pickWinners(giveawayId, count, excludeIds = []) {
    const { data: entries } = await supabase
        .from('giveaway_entries')
        .select('discord_user_id')
        .eq('giveaway_id', giveawayId);
    const pool = (entries ?? [])
        .map((e) => e.discord_user_id)
        .filter((id) => !excludeIds.includes(id));
    const shuffled = pool.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}
giveawaysRouter.post('/:giveawayId/reroll', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId);
    const { data: giveaway, error } = await supabase
        .from('giveaways')
        .select('*')
        .eq('id', req.params.giveawayId)
        .eq('server_id', server.id)
        .maybeSingle();
    if (error)
        throw error;
    if (!giveaway)
        throw new HttpError(404, 'Giveaway not found');
    if (giveaway.status !== 'ended')
        throw new HttpError(400, 'Only an ended giveaway can be rerolled');
    const newWinners = await pickWinners(giveaway.id, giveaway.winners_count, giveaway.winner_discord_ids);
    if (newWinners.length === 0)
        throw new HttpError(400, 'No remaining entrants to reroll from');
    await supabase.from('giveaways').update({ winner_discord_ids: newWinners }).eq('id', giveaway.id);
    await sendChannelMessage(giveaway.channel_id, {
        content: `🔁 Reroll for **${giveaway.prize}**: ${newWinners.map((id) => `<@${id}>`).join(', ')}`,
    });
    res.json({ winners: newWinners });
}));
