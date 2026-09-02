import jwt from 'jsonwebtoken';
import { env } from './env.js';
const COOKIE_NAME = 'gl_session';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export function signSession(payload) {
    return jwt.sign(payload, env.SESSION_SECRET, { expiresIn: '7d' });
}
export function verifySession(token) {
    try {
        return jwt.verify(token, env.SESSION_SECRET);
    }
    catch {
        return null;
    }
}
export const sessionCookie = {
    name: COOKIE_NAME,
    options: {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: MAX_AGE_MS,
        path: '/',
    },
};
