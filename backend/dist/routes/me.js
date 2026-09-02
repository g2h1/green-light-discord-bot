import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { supabase } from '../lib/supabase.js';
import { HttpError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../lib/asyncHandler.js';
export const meRouter = Router();
meRouter.get('/', requireAuth, asyncHandler(async (req, res) => {
    const { data: user, error } = await supabase
        .from('users')
        .select('id, discord_id, username, avatar')
        .eq('id', req.session.userId)
        .single();
    if (error || !user)
        throw new HttpError(404, 'User not found');
    res.json({ user });
}));
