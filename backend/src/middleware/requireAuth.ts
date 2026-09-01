import type { NextFunction, Request, Response } from 'express'
import { sessionCookie, verifySession, type SessionPayload } from '../lib/session.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: SessionPayload
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[sessionCookie.name]
  const session = token ? verifySession(token) : null

  if (!session) {
    res.status(401).json({ message: 'Not authenticated' })
    return
  }

  req.session = session
  next()
}
