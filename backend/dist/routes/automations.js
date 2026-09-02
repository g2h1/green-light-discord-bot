import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireServerAccess } from '../middleware/requireServerAccess.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';
import { getOrCreateServerRow } from '../lib/serverStore.js';
import { supabase } from '../lib/supabase.js';
export const automationsRouter = Router({ mergeParams: true });
const actionSchema = z.object({
    actionType: z.enum(['give_role', 'send_message', 'send_log']),
    config: z.record(z.string(), z.any()),
});
const automationSchema = z.object({
    name: z.string().min(1).max(100),
    triggerEvent: z.enum(['member_join', 'ticket_close']),
    enabled: z.boolean().default(true),
    actions: z.array(actionSchema).min(1).max(10),
});
automationsRouter.get('/', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId);
    const { data: automations, error } = await supabase
        .from('automations')
        .select('*, automation_actions(*)')
        .eq('server_id', server.id)
        .order('created_at', { ascending: false });
    if (error)
        throw error;
    res.json({ automations });
}));
automationsRouter.post('/', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const body = automationSchema.parse(req.body);
    const server = await getOrCreateServerRow(req.params.serverId);
    const { data: automation, error } = await supabase
        .from('automations')
        .insert({
        server_id: server.id,
        name: body.name,
        trigger_event: body.triggerEvent,
        enabled: body.enabled,
    })
        .select()
        .single();
    if (error || !automation)
        throw error ?? new Error('Failed to create automation');
    const { error: actionsError } = await supabase.from('automation_actions').insert(body.actions.map((a, i) => ({
        automation_id: automation.id,
        order_index: i,
        action_type: a.actionType,
        config: a.config,
    })));
    if (actionsError)
        throw actionsError;
    res.status(201).json({ automation });
}));
automationsRouter.patch('/:automationId', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);
    const server = await getOrCreateServerRow(req.params.serverId);
    const { data, error } = await supabase
        .from('automations')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('id', req.params.automationId)
        .eq('server_id', server.id)
        .select()
        .single();
    if (error || !data)
        throw error ?? new HttpError(404, 'Automation not found');
    res.json({ automation: data });
}));
automationsRouter.delete('/:automationId', requireAuth, requireServerAccess, asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId);
    const { error } = await supabase
        .from('automations')
        .delete()
        .eq('id', req.params.automationId)
        .eq('server_id', server.id);
    if (error)
        throw error;
    res.status(204).end();
}));
