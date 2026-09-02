import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireServerAccess } from '../middleware/requireServerAccess.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { sendChannelMessage } from '../lib/discord.js';
import { getOrCreateServerRow } from '../lib/serverStore.js';
import { supabase } from '../lib/supabase.js';
export const messagesRouter = Router({ mergeParams: true });
const embedSchema = z
    .object({
    title: z.string().max(256).optional(),
    description: z.string().max(4096).optional(),
    url: z.string().url().optional(),
    color: z.number().int().min(0).max(0xffffff).optional(),
    timestamp: z.string().optional(),
    footer: z.object({ text: z.string(), icon_url: z.string().url().optional() }).optional(),
    author: z
        .object({ name: z.string(), icon_url: z.string().url().optional(), url: z.string().url().optional() })
        .optional(),
    thumbnail: z.object({ url: z.string().url() }).optional(),
    image: z.object({ url: z.string().url() }).optional(),
    fields: z
        .array(z.object({ name: z.string().max(256), value: z.string().max(1024), inline: z.boolean().optional() }))
        .max(25)
        .optional(),
})
    .optional();
const buttonSchema = z.object({
    label: z.string().min(1).max(80),
    url: z.string().url(),
    emoji: z.string().optional(),
});
const sendSchema = z
    .object({
    channelId: z.string().min(1),
    content: z.string().max(2000).optional(),
    embed: embedSchema,
    buttons: z.array(buttonSchema).max(5).optional(),
    mentionEveryone: z.boolean().optional(),
    mentionRoleIds: z.array(z.string()).optional(),
    mentionUserIds: z.array(z.string()).optional(),
    scheduledAt: z.string().datetime().optional(),
    recurrence: z.enum(['none', 'daily', 'weekly', 'custom']).optional(),
    recurrenceIntervalMinutes: z.number().int().positive().optional(),
})
    .refine((v) => v.content || v.embed, { message: 'Message must have content or an embed' });
messagesRouter.post('/send', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const body = sendSchema.parse(req.body);
    if (body.scheduledAt && new Date(body.scheduledAt) > new Date()) {
        const server = await getOrCreateServerRow(req.params.serverId);
        const { data: scheduled, error } = await supabase
            .from('scheduled_messages')
            .insert({
            server_id: server.id,
            channel_id: body.channelId,
            content: body.content ?? null,
            embed: body.embed ?? null,
            buttons: body.buttons ?? [],
            mentions: {
                everyone: body.mentionEveryone ?? false,
                roles: body.mentionRoleIds ?? [],
                users: body.mentionUserIds ?? [],
            },
            send_at: body.scheduledAt,
            recurrence: body.recurrence ?? 'none',
            recurrence_interval_minutes: body.recurrenceIntervalMinutes ?? null,
            created_by: req.session.userId,
        })
            .select()
            .single();
        if (error || !scheduled)
            throw error ?? new Error('Failed to schedule message');
        res.status(201).json({ scheduled });
        return;
    }
    const result = await sendChannelMessage(body.channelId, {
        content: body.content,
        embed: body.embed,
        buttons: body.buttons,
        mentionEveryone: body.mentionEveryone,
        mentionRoleIds: body.mentionRoleIds,
        mentionUserIds: body.mentionUserIds,
    });
    res.json({ sent: result });
}));
messagesRouter.get('/scheduled', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId);
    const { data, error } = await supabase
        .from('scheduled_messages')
        .select('*')
        .eq('server_id', server.id)
        .order('send_at', { ascending: true });
    if (error)
        throw error;
    res.json({ scheduled: data });
}));
messagesRouter.delete('/scheduled/:id', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId);
    const { error } = await supabase
        .from('scheduled_messages')
        .update({ status: 'cancelled' })
        .eq('id', req.params.id)
        .eq('server_id', server.id);
    if (error)
        throw error;
    res.status(204).end();
}));
const templateSchema = z.object({
    name: z.string().min(1).max(80),
    category: z.string().min(1).max(40).default('custom'),
    content: z.string().max(2000).optional(),
    embed: embedSchema,
    buttons: z.array(buttonSchema).max(5).optional(),
});
messagesRouter.get('/templates', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId);
    const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('server_id', server.id)
        .order('created_at', { ascending: false });
    if (error)
        throw error;
    res.json({ templates: data });
}));
messagesRouter.post('/templates', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const body = templateSchema.parse(req.body);
    const server = await getOrCreateServerRow(req.params.serverId);
    const { data, error } = await supabase
        .from('message_templates')
        .insert({
        server_id: server.id,
        name: body.name,
        category: body.category,
        content: body.content ?? null,
        embed: body.embed ?? null,
        buttons: body.buttons ?? [],
        created_by: req.session.userId,
    })
        .select()
        .single();
    if (error || !data)
        throw error ?? new Error('Failed to create template');
    res.status(201).json({ template: data });
}));
messagesRouter.delete('/templates/:id', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId);
    const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', req.params.id)
        .eq('server_id', server.id);
    if (error)
        throw error;
    res.status(204).end();
}));
