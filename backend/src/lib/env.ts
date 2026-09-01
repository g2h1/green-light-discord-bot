import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  // Comma-separated list of additional allowed CORS origins (e.g. a Vercel
  // preview + production domain). FRONTEND_URL is always allowed regardless.
  ALLOWED_ORIGINS: z.string().optional(),

  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  DISCORD_BOT_TOKEN: z.string().min(1),
  DISCORD_REDIRECT_URI: z.string().url(),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  SESSION_SECRET: z.string().min(16),
})

export const env = envSchema.parse(process.env)
