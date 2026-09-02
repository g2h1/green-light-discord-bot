import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireServerAccess } from '../middleware/requireServerAccess.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';
import { deleteChannel, lockTicketChannel, renameChannel, sendChannelMessage, setChannelMemberAccess, } from '../lib/discord.js';
import { getOrCreateServerRow } from '../lib/serverStore.js';
import { supabase } from '../lib/supabase.js';
import { uploadPanelImage, deletePanelImageIfOwned, deleteAllPanelImages } from '../lib/imageUpload.js';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
export const ticketsRouter = Router({ mergeParams: true });
const BUTTON_COLOR_STYLES = { green: 3, gray: 2, red: 4, blue: 1 };
// Full Panel Editor config — appearance extras + routing + welcome message +
// ticket behavior + claiming/closing. Stored as one flexible jsonb column
// (see 0006_ticket_panel_config.sql) rather than a column per field.
const panelConfigSchema = z.object({
    thumbnailUrl: z.string().optional(),
    imageUrl: z.string().optional(),
    buttonText: z.string().min(1).max(80).default('Open a ticket'),
    buttonColor: z.enum(['green', 'gray', 'red', 'blue']).default('green'),
    buttonEmoji: z.string().optional(),
    // Routing
    supportTeamRoleId: z.string().optional(),
    knowledgeBaseCategories: z.array(z.string()).default([]),
    ticketCategoryId: z.string().optional(), // Discord channel category to nest ticket channels under
    awaitingResponseCategoryId: z.string().optional(),
    transcriptChannelId: z.string().optional(),
    mentionOnOpenRoleIds: z.array(z.string()).default([]),
    mentionBehaviour: z.enum(['none', 'mention', 'ping_and_remove']).default('mention'),
    formFields: z.array(z.object({ label: z.string(), required: z.boolean().default(false) })).default([]),
    enableTranscript: z.boolean().default(true),
    // Welcome message (shown inside the ticket channel on open — distinct from
    // the server-wide member-join Welcome system already in Settings)
    welcomeEnabled: z.boolean().default(true),
    welcomeMessage: z.string().max(2000).optional(),
    welcomeEmbedTitle: z.string().max(256).optional(),
    welcomeEmbedDescription: z.string().max(4096).optional(),
    welcomeImageUrl: z.string().optional(),
    welcomeThumbnailUrl: z.string().optional(),
    // Ticket behavior
    namingFormat: z.string().max(100).default('ticket-{username}'),
    maxOpenTicketsPerUser: z.number().int().min(1).max(20).default(1),
    allowReopen: z.boolean().default(true),
    allowStaffClose: z.boolean().default(true),
    deleteOnClose: z.boolean().default(false),
    archiveInsteadOfDelete: z.boolean().default(true),
    transcriptBehavior: z.enum(['channel', 'dm', 'none']).default('channel'),
    // Claiming / closing
    enableClaim: z.boolean().default(true),
    claimButtonText: z.string().max(80).default('Claim'),
    claimButtonEmoji: z.string().optional(),
    claimPermissionRoleIds: z.array(z.string()).default([]),
    enableClose: z.boolean().default(true),
    closeButtonText: z.string().max(80).default('Close'),
    closeButtonEmoji: z.string().optional(),
});
const panelSchema = z.object({
    id: z.string().uuid().optional(), // client-generated so image uploads can start before the panel row exists
    channelId: z.string().min(1),
    title: z.string().min(1).max(256),
    description: z.string().max(4096).optional(),
    color: z.number().int().min(0).max(0xffffff).optional(),
    disabled: z.boolean().default(false),
    config: panelConfigSchema.partial().default({}),
});
function buildPanelEmbed(body) {
    return {
        title: body.title,
        description: body.description,
        color: body.color ?? 0x17c964,
        thumbnail: body.config.thumbnailUrl ? { url: body.config.thumbnailUrl } : undefined,
        image: body.config.imageUrl ? { url: body.config.imageUrl } : undefined,
    };
}
async function postOrUpdatePanelMessage(channelId, panelId, embed, config, existingMessageId) {
    const payload = {
        embed,
        buttons: [
            {
                label: config.buttonText,
                customId: `ticket_open:${panelId}:0`,
                style: BUTTON_COLOR_STYLES[config.buttonColor],
                emoji: config.buttonEmoji,
            },
        ],
    };
    if (existingMessageId) {
        // Panel messages are edited in place rather than reposted so the same
        // message keeps working — editing needs a plain fetch since none of the
        // existing discord.ts helpers cover PATCH on an arbitrary message yet.
        const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${existingMessageId}`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                embeds: [embed],
                components: [
                    {
                        type: 1,
                        components: [
                            {
                                type: 2,
                                style: BUTTON_COLOR_STYLES[config.buttonColor],
                                label: config.buttonText,
                                custom_id: `ticket_open:${panelId}:0`,
                                ...(config.buttonEmoji ? { emoji: { name: config.buttonEmoji } } : {}),
                            },
                        ],
                    },
                ],
            }),
        });
        if (res.ok)
            return { id: existingMessageId };
        // Fall through to posting a new message if the old one is gone (e.g. deleted in Discord).
    }
    return sendChannelMessage(channelId, payload);
}
ticketsRouter.post('/panels', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const body = panelSchema.parse(req.body);
    const server = await getOrCreateServerRow(req.params.serverId);
    const config = panelConfigSchema.parse(body.config);
    const embed = buildPanelEmbed(body);
    const { data: panel, error } = await supabase
        .from('ticket_panels')
        .insert({
        ...(body.id ? { id: body.id } : {}),
        server_id: server.id,
        channel_id: body.channelId,
        title: body.title,
        description: body.description ?? null,
        embed,
        categories: [{ label: config.buttonText, emoji: config.buttonEmoji }],
        config,
        disabled: body.disabled,
        created_by: req.session.userId,
    })
        .select()
        .single();
    if (error || !panel)
        throw error ?? new Error('Failed to create panel');
    if (!body.disabled) {
        const sent = await postOrUpdatePanelMessage(body.channelId, panel.id, embed, config);
        await supabase.from('ticket_panels').update({ message_id: sent.id }).eq('id', panel.id);
        panel.message_id = sent.id;
    }
    res.status(201).json({ panel });
}));
ticketsRouter.get('/panels', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId);
    const { data, error } = await supabase
        .from('ticket_panels')
        .select('*')
        .eq('server_id', server.id)
        .order('created_at', { ascending: false });
    if (error)
        throw error;
    res.json({ panels: data });
}));
ticketsRouter.get('/panels/:panelId', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId);
    const { data: panel, error } = await supabase
        .from('ticket_panels')
        .select('*')
        .eq('id', req.params.panelId)
        .eq('server_id', server.id)
        .maybeSingle();
    if (error)
        throw error;
    if (!panel)
        throw new HttpError(404, 'Panel not found');
    res.json({ panel });
}));
const uploadFieldSchema = z.object({ field: z.enum(['image', 'thumbnail']) });
ticketsRouter.post('/panels/:panelId/assets/:field', requireAuth, requireServerAccess, upload.single('file'), asyncHandler(async (req, res) => {
    const { field } = uploadFieldSchema.parse(req.params);
    if (!req.file)
        throw new HttpError(400, 'No file uploaded');
    const url = await uploadPanelImage(req.params.panelId, field, {
        buffer: req.file.buffer,
        size: req.file.size,
    });
    res.status(201).json({ url });
}));
ticketsRouter.patch('/panels/:panelId', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const body = panelSchema.parse(req.body);
    const server = await getOrCreateServerRow(req.params.serverId);
    const config = panelConfigSchema.parse(body.config);
    const embed = buildPanelEmbed(body);
    const { data: existing, error: loadErr } = await supabase
        .from('ticket_panels')
        .select('id, channel_id, message_id, config')
        .eq('id', req.params.panelId)
        .eq('server_id', server.id)
        .maybeSingle();
    if (loadErr)
        throw loadErr;
    if (!existing)
        throw new HttpError(404, 'Panel not found');
    // Conservative cleanup: only delete the *old* image once the update below
    // has actually succeeded, and only when it was replaced with a different
    // URL — never delete on a failed save, never delete anything still in use.
    const oldConfig = (existing.config ?? {});
    const staleUrls = [
        oldConfig.imageUrl && oldConfig.imageUrl !== config.imageUrl ? oldConfig.imageUrl : null,
        oldConfig.thumbnailUrl && oldConfig.thumbnailUrl !== config.thumbnailUrl ? oldConfig.thumbnailUrl : null,
    ].filter((u) => Boolean(u));
    let messageId = existing.message_id;
    if (body.disabled) {
        // Leave any already-posted message as-is (still visible, just no longer
        // wired to accept new tickets since the panel row itself is disabled) —
        // deleting it would silently orphan a channel message the user posted.
    }
    else {
        const sent = await postOrUpdatePanelMessage(body.channelId, req.params.panelId, embed, config, body.channelId === existing.channel_id ? existing.message_id : null);
        messageId = sent.id;
    }
    const { data: panel, error } = await supabase
        .from('ticket_panels')
        .update({
        channel_id: body.channelId,
        title: body.title,
        description: body.description ?? null,
        embed,
        categories: [{ label: config.buttonText, emoji: config.buttonEmoji }],
        config,
        disabled: body.disabled,
        message_id: messageId,
    })
        .eq('id', req.params.panelId)
        .select()
        .single();
    if (error || !panel)
        throw error ?? new Error('Failed to update panel');
    for (const url of staleUrls) {
        await deletePanelImageIfOwned(url);
    }
    res.json({ panel });
}));
ticketsRouter.delete('/panels/:panelId', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId);
    const { error } = await supabase
        .from('ticket_panels')
        .delete()
        .eq('id', req.params.panelId)
        .eq('server_id', server.id);
    if (error)
        throw error;
    await deleteAllPanelImages(req.params.panelId);
    res.status(204).end();
}));
ticketsRouter.get('/', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    let query = supabase
        .from('tickets')
        .select('*')
        .eq('server_id', server.id)
        .order('created_at', { ascending: false });
    if (status)
        query = query.eq('status', status);
    const { data, error } = await query;
    if (error)
        throw error;
    res.json({ tickets: data });
}));
async function loadTicket(serverRowId, ticketId) {
    const { data: ticket, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .eq('server_id', serverRowId)
        .maybeSingle();
    if (error)
        throw error;
    if (!ticket)
        throw new HttpError(404, 'Ticket not found');
    return ticket;
}
ticketsRouter.get('/:ticketId', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId);
    const ticket = await loadTicket(server.id, req.params.ticketId);
    const [{ data: messages }, { data: rating }] = await Promise.all([
        supabase
            .from('ticket_messages')
            .select('*')
            .eq('ticket_id', ticket.id)
            .order('created_at', { ascending: true }),
        supabase.from('ticket_ratings').select('*').eq('ticket_id', ticket.id).maybeSingle(),
    ]);
    res.json({ ticket, messages: messages ?? [], rating: rating ?? null });
}));
ticketsRouter.post('/:ticketId/claim', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId);
    await loadTicket(server.id, req.params.ticketId);
    const { data, error } = await supabase
        .from('tickets')
        .update({ status: 'claimed', claimed_by_discord_id: req.session.discordId })
        .eq('id', req.params.ticketId)
        .select()
        .single();
    if (error || !data)
        throw error ?? new Error('Failed to claim ticket');
    res.json({ ticket: data });
}));
ticketsRouter.post('/:ticketId/close', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId);
    const ticket = await loadTicket(server.id, req.params.ticketId);
    await lockTicketChannel(ticket.discord_channel_id, ticket.opener_discord_id, true);
    await sendChannelMessage(ticket.discord_channel_id, {
        content: 'This ticket has been closed. It will remain visible for reference.',
    });
    const { data, error } = await supabase
        .from('tickets')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', ticket.id)
        .select()
        .single();
    if (error || !data)
        throw error ?? new Error('Failed to close ticket');
    res.json({ ticket: data });
}));
ticketsRouter.post('/:ticketId/reopen', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId);
    const ticket = await loadTicket(server.id, req.params.ticketId);
    await lockTicketChannel(ticket.discord_channel_id, ticket.opener_discord_id, false);
    const { data, error } = await supabase
        .from('tickets')
        .update({ status: 'claimed', closed_at: null })
        .eq('id', ticket.id)
        .select()
        .single();
    if (error || !data)
        throw error ?? new Error('Failed to reopen ticket');
    res.json({ ticket: data });
}));
ticketsRouter.delete('/:ticketId', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId);
    const ticket = await loadTicket(server.id, req.params.ticketId);
    await deleteChannel(ticket.discord_channel_id);
    const { error } = await supabase.from('tickets').delete().eq('id', ticket.id);
    if (error)
        throw error;
    res.status(204).end();
}));
ticketsRouter.patch('/:ticketId', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const { name } = z.object({ name: z.string().min(1).max(100) }).parse(req.body);
    const server = await getOrCreateServerRow(req.params.serverId);
    const ticket = await loadTicket(server.id, req.params.ticketId);
    await renameChannel(ticket.discord_channel_id, name);
    res.json({ ticket });
}));
const memberSchema = z.object({ discordUserId: z.string().min(1), action: z.enum(['add', 'remove']) });
ticketsRouter.post('/:ticketId/members', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const body = memberSchema.parse(req.body);
    const server = await getOrCreateServerRow(req.params.serverId);
    const ticket = await loadTicket(server.id, req.params.ticketId);
    await setChannelMemberAccess(ticket.discord_channel_id, body.discordUserId, body.action === 'add');
    res.status(204).end();
}));
