import { useEffect, useState } from 'react'
import { api, ApiError } from '../../lib/api'
import { useServerId } from '../../context/ServerContext'
import type { Channel } from '../messages/types'
import { Button, Field } from '../messages/components/FormControls'

interface LogEntry {
  id: string
  category: string
  event_type: string
  summary: string
  created_at: string
}

const CATEGORIES = [
  { key: 'member', label: 'Members', settingKey: 'member_logs' },
  { key: 'moderation', label: 'Moderation', settingKey: 'moderation_logs' },
  { key: 'message', label: 'Messages', settingKey: 'message_logs' },
  { key: 'ticket', label: 'Tickets', settingKey: 'ticket_logs' },
  { key: 'role', label: 'Roles', settingKey: 'role_logs' },
  { key: 'channel', label: 'Channels', settingKey: 'channel_logs' },
  { key: 'security', label: 'Security', settingKey: 'security_logs' },
  { key: 'bot', label: 'Bot', settingKey: 'bot_logs' },
] as const

export function Logs() {
  const serverId = useServerId()
  const [channels, setChannels] = useState<Channel[] | null>(null)
  const [logChannels, setLogChannels] = useState<Record<string, string> | null>(null)
  const [entries, setEntries] = useState<LogEntry[] | null>(null)
  const [category, setCategory] = useState<string>('all')
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    setLoadError(null)
    Promise.all([
      api.get<{ channels: Channel[] }>(`/servers/${serverId}/channels`),
      api.get<{ logChannels: Record<string, string> }>(`/servers/${serverId}/settings/log-channels`),
    ])
      .then(([c, l]) => {
        setChannels(c.channels)
        setLogChannels(l.logChannels)
      })
      .catch((err) =>
        setLoadError(
          err instanceof ApiError && err.status === 404
            ? 'GREEN LIGHT is not installed on this server yet.'
            : 'Could not load log data. Try refreshing.',
        ),
      )
  }, [serverId])

  useEffect(() => {
    setEntries(null)
    const query = category === 'all' ? '' : `?category=${category}`
    api
      .get<{ logs: LogEntry[] }>(`/servers/${serverId}/logs${query}`)
      .then((res) => setEntries(res.logs))
      .catch(() => setEntries([]))
  }, [serverId, category])

  async function updateLogChannel(settingKey: string, channelId: string) {
    const next = { ...logChannels }
    if (channelId) {
      next[settingKey] = channelId
    } else {
      delete next[settingKey]
    }
    setLogChannels(next)
    await api.put(`/servers/${serverId}/settings/log-channels`, next)
  }

  if (loadError) {
    return <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-red-400">{loadError}</div>
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-text-primary">Logs</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-lg border border-surface-border bg-surface-1 p-4">
          <h3 className="mb-3 text-sm font-semibold text-text-primary">Log channels</h3>
          <div className="flex flex-col gap-2">
            {CATEGORIES.map((c) => (
              <Field key={c.key} label={c.label}>
                <select
                  value={logChannels?.[c.settingKey] ?? ''}
                  onChange={(e) => updateLogChannel(c.settingKey, e.target.value)}
                  disabled={!channels}
                  className="w-full rounded-md border border-surface-border bg-surface-2 px-3 py-1.5 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                >
                  <option value="">Not configured</option>
                  {channels?.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-1 p-4">
          <div className="mb-3 flex flex-wrap gap-1">
            <Button
              variant={category === 'all' ? 'primary' : 'ghost'}
              className="!py-1 text-xs"
              onClick={() => setCategory('all')}
            >
              All
            </Button>
            {CATEGORIES.map((c) => (
              <Button
                key={c.key}
                variant={category === c.key ? 'primary' : 'ghost'}
                className="!py-1 text-xs"
                onClick={() => setCategory(c.key)}
              >
                {c.label}
              </Button>
            ))}
          </div>

          {!entries && <p className="text-sm text-text-secondary">Loading…</p>}
          {entries && entries.length === 0 && <p className="text-sm text-text-muted">No events logged yet.</p>}
          <div className="flex max-h-[70vh] flex-col gap-1.5 overflow-y-auto">
            {entries?.map((e) => (
              <div key={e.id} className="rounded-md bg-surface-2 px-3 py-2 text-sm">
                <span className="rounded bg-surface-3 px-1.5 py-0.5 text-xs text-text-muted">{e.category}</span>
                <span className="ml-2 text-text-primary">{e.summary}</span>
                <div className="text-xs text-text-muted">{new Date(e.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
