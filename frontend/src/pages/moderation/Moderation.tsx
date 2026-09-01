import { useEffect, useState } from 'react'
import { api, ApiError } from '../../lib/api'
import { useServerId } from '../../context/ServerContext'
import type { Channel } from '../messages/types'
import { Button, Field, TextArea, TextInput } from '../messages/components/FormControls'

interface Warning {
  id: string
  discord_user_id: string
  reason: string
  moderator_discord_id: string
  created_at: string
}

interface ModLog {
  id: string
  action: string
  target_discord_id: string | null
  moderator_discord_id: string
  reason: string | null
  created_at: string
}

interface WarningAutomation {
  threshold: number
  action: 'timeout' | 'ban'
  durationMinutes?: number
}

export function Moderation() {
  const serverId = useServerId()
  const [channels, setChannels] = useState<Channel[] | null>(null)
  const [logs, setLogs] = useState<ModLog[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [userId, setUserId] = useState('')
  const [reason, setReason] = useState('')
  const [minutes, setMinutes] = useState(60)
  const [warnings, setWarnings] = useState<Warning[] | null>(null)
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const [purgeChannel, setPurgeChannel] = useState('')
  const [purgeAmount, setPurgeAmount] = useState(10)

  const [automations, setAutomations] = useState<WarningAutomation[] | null>(null)

  useEffect(() => {
    setLoadError(null)
    Promise.all([
      api.get<{ channels: Channel[] }>(`/servers/${serverId}/channels`),
      api.get<{ logs: ModLog[] }>(`/servers/${serverId}/moderation/logs`),
      api.get<{ automations: WarningAutomation[] }>(`/servers/${serverId}/settings/warning-automations`),
    ])
      .then(([c, l, a]) => {
        setChannels(c.channels)
        setLogs(l.logs)
        setAutomations(a.automations)
      })
      .catch((err) =>
        setLoadError(
          err instanceof ApiError && err.status === 404
            ? 'GREEN LIGHT is not installed on this server yet.'
            : 'Could not load moderation data. Try refreshing.',
        ),
      )
  }, [serverId])

  async function loadWarnings(id: string) {
    if (!id) return setWarnings(null)
    const res = await api.get<{ warnings: Warning[] }>(`/servers/${serverId}/moderation/warnings?discordUserId=${id}`)
    setWarnings(res.warnings)
  }

  async function refreshLogs() {
    const res = await api.get<{ logs: ModLog[] }>(`/servers/${serverId}/moderation/logs`)
    setLogs(res.logs)
  }

  async function run(action: () => Promise<void>, successText: string) {
    setStatus(null)
    setBusy(true)
    try {
      await action()
      setStatus({ kind: 'success', text: successText })
      await Promise.all([refreshLogs(), loadWarnings(userId)])
    } catch (err) {
      setStatus({ kind: 'error', text: err instanceof ApiError ? err.message : 'Action failed' })
    } finally {
      setBusy(false)
    }
  }

  async function saveAutomations(next: WarningAutomation[]) {
    setAutomations(next)
    await api.put(`/servers/${serverId}/settings/warning-automations`, next)
  }

  if (loadError) {
    return <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-red-400">{loadError}</div>
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-text-primary">Moderation</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-surface-border bg-surface-1 p-4">
            <Field label="Discord user ID">
              <div className="flex gap-2">
                <TextInput value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="123456789012345678" />
                <Button type="button" variant="ghost" onClick={() => loadWarnings(userId)}>
                  Look up
                </Button>
              </div>
            </Field>

            <Field label="Reason">
              <TextArea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
            </Field>

            <div className="mt-3 flex flex-wrap items-end gap-2">
              <Button
                type="button"
                disabled={!userId || !reason || busy}
                onClick={() =>
                  run(async () => {
                    await api.post(`/servers/${serverId}/moderation/warn`, { discordUserId: userId, reason })
                  }, 'Warning issued.')
                }
              >
                Warn
              </Button>

              <div className="flex items-end gap-1.5">
                <Field label="Minutes">
                  <TextInput
                    type="number"
                    min={1}
                    value={minutes}
                    onChange={(e) => setMinutes(Number(e.target.value))}
                    className="!w-20"
                  />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!userId || busy}
                  onClick={() =>
                    run(async () => {
                      await api.post(`/servers/${serverId}/moderation/timeout`, { discordUserId: userId, reason, minutes })
                    }, 'Member timed out.')
                  }
                >
                  Timeout
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                disabled={!userId || busy}
                onClick={() =>
                  run(async () => {
                    await api.post(`/servers/${serverId}/moderation/kick`, { discordUserId: userId, reason })
                  }, 'Member kicked.')
                }
              >
                Kick
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={!userId || busy}
                onClick={() =>
                  run(async () => {
                    await api.post(`/servers/${serverId}/moderation/ban`, { discordUserId: userId, reason })
                  }, 'Member banned.')
                }
              >
                Ban
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={!userId || busy}
                onClick={() =>
                  run(async () => {
                    await api.post(`/servers/${serverId}/moderation/unban`, { discordUserId: userId, reason })
                  }, 'Member unbanned.')
                }
              >
                Unban
              </Button>
            </div>

            {status && (
              <div
                className={`mt-3 rounded-md px-3 py-2 text-sm ${
                  status.kind === 'success'
                    ? 'border border-brand-500/30 bg-brand-500/10 text-brand-400'
                    : 'border border-red-500/30 bg-red-500/10 text-red-400'
                }`}
              >
                {status.text}
              </div>
            )}
          </div>

          {warnings && (
            <div className="rounded-lg border border-surface-border bg-surface-1 p-4">
              <h3 className="mb-2 text-sm font-semibold text-text-primary">
                Warnings for {userId} ({warnings.length})
              </h3>
              {warnings.length === 0 && <p className="text-sm text-text-muted">No warnings.</p>}
              <div className="flex flex-col gap-1.5">
                {warnings.map((w) => (
                  <div key={w.id} className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-2 text-sm">
                    <div>
                      <div className="text-text-primary">{w.reason}</div>
                      <div className="text-xs text-text-muted">{new Date(w.created_at).toLocaleString()}</div>
                    </div>
                    <button
                      onClick={() =>
                        run(async () => {
                          await api.delete(`/servers/${serverId}/moderation/warnings/${w.id}`)
                        }, 'Warning removed.')
                      }
                      className="text-xs text-red-400 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-surface-border bg-surface-1 p-4">
            <h3 className="mb-2 text-sm font-semibold text-text-primary">Purge messages</h3>
            <div className="flex items-end gap-2">
              <Field label="Channel">
                <select
                  value={purgeChannel}
                  onChange={(e) => setPurgeChannel(e.target.value)}
                  className="rounded-md border border-surface-border bg-surface-2 px-3 py-1.5 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                >
                  <option value="">Select</option>
                  {channels?.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Amount (max 100)">
                <TextInput
                  type="number"
                  min={1}
                  max={100}
                  value={purgeAmount}
                  onChange={(e) => setPurgeAmount(Number(e.target.value))}
                  className="!w-24"
                />
              </Field>
              <Button
                type="button"
                variant="danger"
                disabled={!purgeChannel || busy}
                onClick={() =>
                  run(async () => {
                    await api.post(`/servers/${serverId}/moderation/purge`, {
                      channelId: purgeChannel,
                      amount: purgeAmount,
                    })
                  }, 'Messages purged.')
                }
              >
                Purge
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-surface-border bg-surface-1 p-4">
            <h3 className="mb-2 text-sm font-semibold text-text-primary">Warning automations</h3>
            <p className="mb-2 text-xs text-text-muted">Auto-escalate once a user reaches a warning count.</p>
            <div className="flex flex-col gap-2">
              {automations?.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-text-secondary">At</span>
                  <TextInput
                    type="number"
                    min={1}
                    value={a.threshold}
                    onChange={(e) => {
                      const next = [...automations]
                      next[i] = { ...a, threshold: Number(e.target.value) }
                      saveAutomations(next)
                    }}
                    className="!w-16"
                  />
                  <span className="text-text-secondary">warnings →</span>
                  <select
                    value={a.action}
                    onChange={(e) => {
                      const next = [...automations]
                      next[i] = { ...a, action: e.target.value as 'timeout' | 'ban' }
                      saveAutomations(next)
                    }}
                    className="rounded-md border border-surface-border bg-surface-2 px-2 py-1 text-sm text-text-primary"
                  >
                    <option value="timeout">Timeout</option>
                    <option value="ban">Ban</option>
                  </select>
                  {a.action === 'timeout' && (
                    <>
                      <TextInput
                        type="number"
                        min={1}
                        value={a.durationMinutes ?? 1440}
                        onChange={(e) => {
                          const next = [...automations]
                          next[i] = { ...a, durationMinutes: Number(e.target.value) }
                          saveAutomations(next)
                        }}
                        className="!w-20"
                      />
                      <span className="text-text-secondary">min</span>
                    </>
                  )}
                  <button
                    onClick={() => saveAutomations(automations.filter((_, idx) => idx !== i))}
                    className="ml-auto text-xs text-red-400 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                className="self-start !px-2 !py-1 text-xs"
                onClick={() => saveAutomations([...(automations ?? []), { threshold: 3, action: 'timeout', durationMinutes: 1440 }])}
              >
                + Add rule
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-1 p-4">
          <h3 className="mb-2 text-sm font-semibold text-text-primary">Recent actions</h3>
          {!logs && <p className="text-sm text-text-secondary">Loading…</p>}
          {logs && logs.length === 0 && <p className="text-sm text-text-muted">No moderation actions yet.</p>}
          <div className="flex max-h-[70vh] flex-col gap-1.5 overflow-y-auto">
            {logs?.map((l) => (
              <div key={l.id} className="rounded-md bg-surface-2 px-3 py-2 text-sm">
                <span className="font-medium capitalize text-text-primary">{l.action.replace('_', ' ')}</span>
                {l.target_discord_id && <span className="text-text-secondary"> → {l.target_discord_id}</span>}
                <div className="text-xs text-text-muted">
                  by {l.moderator_discord_id} · {new Date(l.created_at).toLocaleString()}
                </div>
                {l.reason && <div className="text-xs text-text-secondary">{l.reason}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
