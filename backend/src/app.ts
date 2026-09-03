import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { env } from './lib/env.js'
import { healthRouter } from './routes/health.js'
import { authRouter } from './routes/auth.js'
import { meRouter } from './routes/me.js'
import { serversRouter } from './routes/servers.js'
import { channelsRouter } from './routes/channels.js'
import { messagesRouter } from './routes/messages.js'
import { ticketsRouter } from './routes/tickets.js'
import { moderationRouter } from './routes/moderation.js'
import { settingsRouter } from './routes/settings.js'
import { logsRouter } from './routes/logs.js'
import { rolesRouter } from './routes/roles.js'
import { channelsManageRouter } from './routes/channelsManage.js'
import { giveawaysRouter } from './routes/giveaways.js'
import { automationsRouter } from './routes/automations.js'
import { membersRouter } from './routes/members.js'
import { analyticsRouter } from './routes/analytics.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

export function createApp() {
  const app = express()

  // The frontend now proxies all /api/* requests server-to-server through a
  // Vercel serverless function (see frontend/api/proxy.js) rather than the
  // browser hitting alwaysdata directly, so every request Express sees
  // arrives from Vercel's own outbound IP unless we trust the
  // X-Forwarded-For header Vercel sets on the way in. Without this, the
  // rate limiter below keys on that single shared IP and lumps every
  // visitor into one bucket, causing spurious 429s under normal traffic.
  app.set('trust proxy', true)

  const allowedOrigins = new Set(
    [env.FRONTEND_URL, ...(env.ALLOWED_ORIGINS?.split(',') ?? [])].map((o) => o.trim()).filter(Boolean),
  )

  app.use(helmet())
  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin/non-browser requests (curl, health checks) send no Origin header.
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true)
          return
        }
        callback(new Error(`Origin ${origin} is not allowed`))
      },
      credentials: true,
    }),
  )
  app.use(express.json())
  app.use(cookieParser())
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  )

  app.use('/api/health', healthRouter)
  app.use('/api/auth', authRouter)
  app.use('/api/me', meRouter)
  app.use('/api/servers', serversRouter)
  app.use('/api/servers/:serverId/channels', channelsRouter)
  app.use('/api/servers/:serverId/messages', messagesRouter)
  app.use('/api/servers/:serverId/tickets', ticketsRouter)
  app.use('/api/servers/:serverId/moderation', moderationRouter)
  app.use('/api/servers/:serverId/settings', settingsRouter)
  app.use('/api/servers/:serverId/logs', logsRouter)
  app.use('/api/servers/:serverId/roles', rolesRouter)
  app.use('/api/servers/:serverId/manage-channels', channelsManageRouter)
  app.use('/api/servers/:serverId/giveaways', giveawaysRouter)
  app.use('/api/servers/:serverId/automations', automationsRouter)
  app.use('/api/servers/:serverId/members', membersRouter)
  app.use('/api/servers/:serverId/analytics', analyticsRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
