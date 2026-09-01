import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ message: 'Not found' })
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message })
    return
  }

  if (err instanceof ZodError) {
    res.status(400).json({ message: err.issues[0]?.message ?? 'Invalid request' })
    return
  }

  // Errors with a numeric `status` (e.g. DiscordApiError) map straight through.
  if (err instanceof Error && 'status' in err && typeof (err as { status: unknown }).status === 'number') {
    const status = (err as { status: number }).status
    if (status >= 400 && status < 500) {
      res.status(status).json({ message: err.message })
      return
    }
  }

  console.error(err)
  res.status(500).json({ message: 'Internal server error' })
}
