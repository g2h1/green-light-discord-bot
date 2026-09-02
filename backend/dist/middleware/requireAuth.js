import { sessionCookie, verifySession } from '../lib/session.js';
export function requireAuth(req, res, next) {
    const token = req.cookies?.[sessionCookie.name];
    const session = token ? verifySession(token) : null;
    if (!session) {
        res.status(401).json({ message: 'Not authenticated' });
        return;
    }
    req.session = session;
    next();
}
