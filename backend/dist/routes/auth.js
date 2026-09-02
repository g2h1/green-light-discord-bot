import crypto from 'node:crypto';
import { Router } from 'express';
import { env } from '../lib/env.js';
import { exchangeCodeForToken, fetchDiscordUser } from '../lib/discord.js';
import { supabase } from '../lib/supabase.js';
import { sessionCookie, signSession } from '../lib/session.js';
export const authRouter = Router();
const STATE_COOKIE = 'gl_oauth_state';
authRouter.get('/discord', (_req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    res.cookie(STATE_COOKIE, state, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 5 * 60 * 1000,
        path: '/',
    });
    const params = new URLSearchParams({
        client_id: env.DISCORD_CLIENT_ID,
        redirect_uri: env.DISCORD_REDIRECT_URI,
        response_type: 'code',
        scope: 'identify guilds',
        state,
        prompt: 'none',
    });
    res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});
authRouter.get('/discord/callback', async (req, res) => {
    const { code, state } = req.query;
    const expectedState = req.cookies?.[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE, { path: '/' });
    if (!code || typeof code !== 'string' || !state || state !== expectedState) {
        res.redirect(`${env.FRONTEND_URL}/login?error=oauth_state`);
        return;
    }
    try {
        const { access_token } = await exchangeCodeForToken(code);
        const discordUser = await fetchDiscordUser(access_token);
        const { data: user, error } = await supabase
            .from('users')
            .upsert({
            discord_id: discordUser.id,
            username: discordUser.global_name ?? discordUser.username,
            avatar: discordUser.avatar,
        }, { onConflict: 'discord_id' })
            .select('id, discord_id')
            .single();
        if (error || !user)
            throw error ?? new Error('Failed to upsert user');
        const token = signSession({
            userId: user.id,
            discordId: user.discord_id,
            discordAccessToken: access_token,
        });
        res.cookie(sessionCookie.name, token, sessionCookie.options);
        res.redirect(`${env.FRONTEND_URL}/servers`);
    }
    catch (err) {
        console.error('Discord OAuth callback failed:', err);
        res.redirect(`${env.FRONTEND_URL}/login?error=oauth_failed`);
    }
});
authRouter.post('/logout', (_req, res) => {
    res.clearCookie(sessionCookie.name, { path: '/' });
    res.status(204).end();
});
