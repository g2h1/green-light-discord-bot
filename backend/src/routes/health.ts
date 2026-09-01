import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

export const healthRouter = Router()

healthRouter.get('/', async (_req, res) => {
  const { error } = await supabase.from('servers').select('id').limit(1)

  res.json({
    status: 'ok',
    supabase: error ? 'unreachable' : 'ok',
    time: new Date().toISOString(),
  })
})
