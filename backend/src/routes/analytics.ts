import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireServerAccess } from '../middleware/requireServerAccess.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { getOrCreateServerRow } from '../lib/serverStore.js'
import { supabase } from '../lib/supabase.js'

export const analyticsRouter = Router({ mergeParams: true })

const MODERATION_ACTIONS = ['warn', 'timeout', 'kick', 'ban', 'unban', 'purge', 'delete_message'] as const

analyticsRouter.get(
  '/',
  requireAuth,
  requireServerAccess,
  asyncHandler(async (req, res) => {
    const server = await getOrCreateServerRow(req.params.serverId)
    const since7d = new Date(Date.now() - 7 * 86_400_000).toISOString()

    const [
      ticketsTotal,
      ticketsOpen,
      ticketsClosed7d,
      warningsTotal,
      giveawaysActive,
      memberJoins7d,
      memberLeaves7d,
    ] = await Promise.all([
      supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('server_id', server.id),
      supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('server_id', server.id).in('status', ['open', 'claimed']),
      supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('server_id', server.id).eq('status', 'closed').gte('closed_at', since7d),
      supabase.from('warnings').select('id', { count: 'exact', head: true }).eq('server_id', server.id),
      supabase.from('giveaways').select('id', { count: 'exact', head: true }).eq('server_id', server.id).eq('status', 'active'),
      supabase.from('system_logs').select('id', { count: 'exact', head: true }).eq('server_id', server.id).eq('event_type', 'member_join').gte('created_at', since7d),
      supabase.from('system_logs').select('id', { count: 'exact', head: true }).eq('server_id', server.id).eq('event_type', 'member_leave').gte('created_at', since7d),
    ])

    const moderationByAction: Record<string, number> = {}
    await Promise.all(
      MODERATION_ACTIONS.map(async (action) => {
        const { count } = await supabase
          .from('moderation_logs')
          .select('id', { count: 'exact', head: true })
          .eq('server_id', server.id)
          .eq('action', action)
          .gte('created_at', since7d)
        moderationByAction[action] = count ?? 0
      }),
    )

    res.json({
      ticketsTotal: ticketsTotal.count ?? 0,
      ticketsOpen: ticketsOpen.count ?? 0,
      ticketsClosedLast7d: ticketsClosed7d.count ?? 0,
      warningsTotal: warningsTotal.count ?? 0,
      giveawaysActive: giveawaysActive.count ?? 0,
      memberJoinsLast7d: memberJoins7d.count ?? 0,
      memberLeavesLast7d: memberLeaves7d.count ?? 0,
      moderationActionsLast7d: moderationByAction,
    })
  }),
)
