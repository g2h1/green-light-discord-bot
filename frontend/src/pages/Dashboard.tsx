import { useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { useServerId } from '../context/ServerContext'

interface Overview {
  server: { id: string; name: string; icon: string | null }
  stats: { memberCount: number; onlineCount: number; channelCount: number; roleCount: number }
}

const STAT_LABELS: Array<{ key: keyof Overview['stats']; label: string }> = [
  { key: 'memberCount', label: 'Members' },
  { key: 'onlineCount', label: 'Online' },
  { key: 'channelCount', label: 'Channels' },
  { key: 'roleCount', label: 'Roles' },
]

export function Dashboard() {
  const serverId = useServerId()
  const [overview, setOverview] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setOverview(null)
    setError(null)
    api
      .get<Overview>(`/servers/${serverId}/overview`)
      .then(setOverview)
      .catch((err) =>
        setError(
          err instanceof ApiError && err.status === 404
            ? 'GREEN LIGHT is not installed on this server yet.'
            : 'Could not load server data. Try refreshing.',
        ),
      )
  }, [serverId])

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-red-400">
        {error}
      </div>
    )
  }

  if (!overview) {
    return (
      <div>
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-surface-2" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-surface-2" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        {overview.server.icon ? (
          <img src={overview.server.icon} alt="" className="h-10 w-10 rounded-full" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-sm font-medium text-text-secondary">
            {overview.server.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          {overview.server.name}
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {STAT_LABELS.map(({ key, label }) => (
          <div
            key={key}
            className="rounded-lg border border-surface-border bg-surface-1 p-5"
          >
            <div className="text-sm text-text-secondary">{label}</div>
            <div className="mt-1 text-2xl font-semibold text-text-primary">
              {overview.stats[key].toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
