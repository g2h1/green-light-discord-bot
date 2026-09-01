import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireServerAccess } from '../middleware/requireServerAccess.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { getOrCreateServerRow } from '../lib/serverStore.js'
import { supabase } from '../lib/supabase.js'

export const logsRouter = Router({ mergeParams: true })

logsRouter.get(
  '/',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId)
    const category = typeof req.query.category === 'string' ? req.query.category : undefined

    let query = supabase
      .from('system_logs')
      .select('*')
      .eq('server_id', server.id)
      .order('created_at', { ascending: false })
      .limit(200)

    if (category) query = query.eq('category', category)

    const { data, error } = await query
    if (error) throw error
    res.json({ logs: data })
  }),
)
