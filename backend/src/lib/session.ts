import jwt from 'jsonwebtoken'
import { env } from './env.js'

export interface SessionPayload {
  userId: string
  discordId: string
  discordAccessToken: string
}

const COOKIE_NAME = 'gl_session'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, env.SESSION_SECRET, { expiresIn: '7d' })
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, env.SESSION_SECRET) as SessionPayload
  } catch {
    return null
  }
}

export const sessionCookie = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    // The frontend (Vercel) and backend (alwaysdata) live on different
    // registrable domains, so this cookie must ride along on cross-site
    // fetch() calls from the SPA. That requires SameSite=None, which in
    // turn requires Secure — browsers silently drop None cookies without it.
    secure: true,
    sameSite: 'none' as const,
    maxAge: MAX_AGE_MS,
    path: '/',
  },
}
