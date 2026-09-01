import { useEffect, useState } from 'react'
import { api, ApiError } from '../../lib/api'
import { useServerId } from '../../context/ServerContext'
import type { Channel } from '../messages/types'
import { Button, Field, TextInput } from '../messages/components/FormControls'

interface Giveaway {
  id: string
  channel_id: string
  prize: string
  winners_count: number
  ends_at: string
  status: 'active' | 'ended' | 'cancelled'
  winner_discord_ids: string[]
}

export function Giveaways() {
  const serverId = useServerId()
  const [channels, setChannels] = useState<Channel[] | null>(null)
  const [giveaways, setGiveaways] = useState<Giveaway[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const [channelId, setChannelId] = useState('')
  const [prize, setPrize] = useState('')
  const [winnersCount, setWinnersCount] = useState(1)
  const [endsAt, setEndsAt] = useState('')
  const [requiredRoleId, setRequiredRoleId] = useState('')

  function load() {
    api
      .get<{ giveaways: Giveaway[] }>(`/servers/${serverId}/giveaways`)
      .then((res) => setGiveaways(res.giveaways))
      .catch(() => setGiveaways([]))
  }

  useEffect(() => {
    setLoadError(null)
    api
      .get<{ channels: Channel[] }>(`/servers/${serverId}/channels`)
      .then((res) => setChannels(res.channels))
      .catch((err) =>
        setLoadError(
          err instanceof ApiError && err.status === 404
            ? 'GREEN LIGHT is not installed on this server yet.'
            : 'Could not load giveaway data. Try refreshing.',
        ),
      )
    load()
  }, [serverId])

  async function run(action: () => Promise<void>, successText: string) {
    setStatus(null)
    try {
      await action()
      setStatus({ kind: 'success', text: successText })
      load()
    } catch (err) {
      setStatus({ kind: 'error', text: err instanceof ApiError ? err.message : 'Action failed' })
    }
  }

  if (loadError) {
    return <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-red-400">{loadError}</div>
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-text-primary">Giveaways</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-lg border border-surface-border bg-surface-1 p-4">
          <h3 className="mb-3 text-sm font-semibold text-text-primary">Start a giveaway</h3>
          <div className="flex flex-col gap-3">
            <Field label="Channel">
              <select
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                className="w-full rounded-md border border-surface-border bg-surface-2 px-3 py-1.5 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              >
                <option value="">Select a channel</option>
                {channels?.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Prize">
              <TextInput value={prize} onChange={(e) => setPrize(e.target.value)} maxLength={256} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Winners">
                <TextInput
                  type="number"
                  min={1}
                  value={winnersCount}
                  onChange={(e) => setWinnersCount(Number(e.target.value))}
                />
              </Field>
              <Field label="Ends at">
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="w-full rounded-md border border-surface-border bg-surface-2 px-3 py-1.5 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                />
              </Field>
            </div>
            <Field label="Required role ID (optional)">
              <TextInput value={requiredRoleId} onChange={(e) => setRequiredRoleId(e.target.value)} />
            </Field>

            {status && (
              <div
                className={`rounded-md px-3 py-2 text-sm ${
                  status.kind === 'success'
                    ? 'border border-brand-500/30 bg-brand-500/10 text-brand-400'
                    : 'border border-red-500/30 bg-red-500/10 text-red-400'
                }`}
              >
                {status.text}
              </div>
            )}

            <Button
              type="button"
              disabled={!channelId || !prize.trim() || !endsAt}
              className="self-start"
              onClick={() =>
                run(async () => {
                  await api.post(`/servers/${serverId}/giveaways`, {
                    channelId,
                    prize: prize.trim(),
                    winnersCount,
                    endsAt: new Date(endsAt).toISOString(),
                    requiredRoleId: requiredRoleId || undefined,
                  })
                  setPrize('')
                  setRequiredRoleId('')
                }, 'Giveaway started.')
              }
            >
              Start giveaway
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-1 p-4">
          <h3 className="mb-2 text-sm font-semibold text-text-primary">Giveaways</h3>
          {!giveaways && <p className="text-sm text-text-secondary">Loading…</p>}
          {giveaways && giveaways.length === 0 && <p className="text-sm text-text-muted">None yet.</p>}
          <div className="flex flex-col gap-1.5">
            {giveaways?.map((g) => (
              <div key={g.id} className="rounded-md bg-surface-2 px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-text-primary">🎉 {g.prize}</span>
                  <span className="rounded bg-surface-3 px-1.5 py-0.5 text-xs text-text-muted">{g.status}</span>
                </div>
                <div className="text-xs text-text-muted">
                  {g.winners_count} winner{g.winners_count === 1 ? '' : 's'} · ends {new Date(g.ends_at).toLocaleString()}
                </div>
                {g.winner_discord_ids.length > 0 && (
                  <div className="text-xs text-brand-400">
                    Winners: {g.winner_discord_ids.map((id) => `<@${id}>`).join(', ')}
                  </div>
                )}
                <div className="mt-1 flex gap-2">
                  {g.status === 'active' && (
                    <button
                      onClick={() =>
                        run(async () => {
                          await api.post(`/servers/${serverId}/giveaways/${g.id}/cancel`)
                        }, 'Giveaway cancelled.')
                      }
                      className="text-xs text-red-400 hover:underline"
                    >
                      Cancel
                    </button>
                  )}
                  {g.status === 'ended' && (
                    <button
                      onClick={() =>
                        run(async () => {
                          await api.post(`/servers/${serverId}/giveaways/${g.id}/reroll`)
                        }, 'Rerolled.')
                      }
                      className="text-xs text-brand-400 hover:underline"
                    >
                      Reroll
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
