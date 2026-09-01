import { useEffect, useState } from 'react'
import { api, ApiError } from '../../lib/api'
import { useServerId } from '../../context/ServerContext'

interface AnalyticsData {
  ticketsTotal: number
  ticketsOpen: number
  ticketsClosedLast7d: number
  warningsTotal: number
  giveawaysActive: number
  memberJoinsLast7d: number
  memberLeavesLast7d: number
  moderationActionsLast7d: Record<string, number>
}

export function Analytics() {
  const serverId = useServerId()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    setLoadError(null)
    api
      .get<AnalyticsData>(`/servers/${serverId}/analytics`)
      .then(setData)
      .catch((err) =>
        setLoadError(
          err instanceof ApiError && err.status === 404
            ? 'GREEN LIGHT is not installed on this server yet.'
            : 'Could not load analytics. Try refreshing.',
        ),
      )
  }, [serverId])

  if (loadError) {
    return <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-red-400">{loadError}</div>
  }

  if (!data) {
    return <p className="text-sm text-text-secondary">Loading…</p>
  }

  const stats = [
    { label: 'Open tickets', value: data.ticketsOpen },
    { label: 'Tickets total', value: data.ticketsTotal },
    { label: 'Closed last 7d', value: data.ticketsClosedLast7d },
    { label: 'Warnings total', value: data.warningsTotal },
    { label: 'Active giveaways', value: data.giveawaysActive },
    { label: 'Joins last 7d', value: data.memberJoinsLast7d },
    { label: 'Leaves last 7d', value: data.memberLeavesLast7d },
  ]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-text-primary">Analytics</h1>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-surface-border bg-surface-1 p-5">
            <div className="text-sm text-text-secondary">{s.label}</div>
            <div className="mt-1 text-2xl font-semibold text-text-primary">{s.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-surface-border bg-surface-1 p-4">
        <h3 className="mb-3 text-sm font-semibold text-text-primary">Moderation actions (last 7 days)</h3>
        <div className="flex flex-col gap-2">
          {Object.entries(data.moderationActionsLast7d).map(([action, count]) => (
            <div key={action} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-sm capitalize text-text-secondary">{action.replace('_', ' ')}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full bg-brand-500"
                  style={{ width: `${Math.min(100, count * 10)}%` }}
                />
              </div>
              <span className="w-8 text-right text-sm text-text-primary">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
