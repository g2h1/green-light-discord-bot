import { useEffect, useState } from 'react'
import { api, ApiError } from '../../lib/api'
import { useServerId } from '../../context/ServerContext'
import { Button, Field, TextInput } from '../messages/components/FormControls'

interface ManagedChannel {
  id: string
  name: string
  type: number
  position: number
  parent_id: string | null
  topic: string | null
  rate_limit_per_user?: number
}

const TYPE_LABEL: Record<number, string> = { 0: 'Text', 2: 'Voice', 4: 'Category' }

export function Channels() {
  const serverId = useServerId()
  const [channels, setChannels] = useState<ManagedChannel[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('0')

  function load() {
    api
      .get<{ channels: ManagedChannel[] }>(`/servers/${serverId}/manage-channels`)
      .then((res) => setChannels(res.channels))
      .catch((err) =>
        setLoadError(
          err instanceof ApiError && err.status === 404
            ? 'GREEN LIGHT is not installed on this server yet.'
            : 'Could not load channels. Try refreshing.',
        ),
      )
  }

  useEffect(() => {
    setLoadError(null)
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
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-text-primary">Channels</h1>

      <div className="mb-4 rounded-lg border border-surface-border bg-surface-1 p-4">
        <h3 className="mb-2 text-sm font-semibold text-text-primary">Create channel</h3>
        <div className="flex items-end gap-2">
          <Field label="Name">
            <TextInput value={newName} onChange={(e) => setNewName(e.target.value)} />
          </Field>
          <Field label="Type">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="rounded-md border border-surface-border bg-surface-2 px-3 py-1.5 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            >
              <option value="0">Text</option>
              <option value="2">Voice</option>
              <option value="4">Category</option>
            </select>
          </Field>
          <Button
            type="button"
            disabled={!newName.trim()}
            onClick={() =>
              run(async () => {
                await api.post(`/servers/${serverId}/manage-channels`, { name: newName.trim(), type: Number(newType) })
                setNewName('')
              }, 'Channel created.')
            }
          >
            Create
          </Button>
        </div>
      </div>

      {status && (
        <div
          className={`mb-4 rounded-md px-3 py-2 text-sm ${
            status.kind === 'success'
              ? 'border border-brand-500/30 bg-brand-500/10 text-brand-400'
              : 'border border-red-500/30 bg-red-500/10 text-red-400'
          }`}
        >
          {status.text}
        </div>
      )}

      <div className="rounded-lg border border-surface-border bg-surface-1 p-4">
        {!channels && <p className="text-sm text-text-secondary">Loading…</p>}
        <div className="flex flex-col gap-1.5">
          {channels?.map((c) => (
            <ChannelRow key={c.id} channel={c} onAction={run} serverId={serverId} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ChannelRow({
  channel,
  serverId,
  onAction,
}: {
  channel: ManagedChannel
  serverId: string
  onAction: (fn: () => Promise<void>, successText: string) => Promise<void>
}) {
  const [slowmode, setSlowmode] = useState(channel.rate_limit_per_user ?? 0)

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface-2 px-3 py-2 text-sm">
      <div>
        <span className="text-text-primary">{channel.type === 0 ? '#' : ''}{channel.name}</span>
        <span className="ml-2 text-xs text-text-muted">{TYPE_LABEL[channel.type] ?? channel.type}</span>
      </div>
      <div className="flex items-center gap-2">
        {channel.type === 0 && (
          <>
            <TextInput
              type="number"
              min={0}
              max={21600}
              value={slowmode}
              onChange={(e) => setSlowmode(Number(e.target.value))}
              className="!w-20"
            />
            <button
              onClick={() =>
                onAction(async () => {
                  await api.patch(`/servers/${serverId}/manage-channels/${channel.id}`, { slowmodeSeconds: slowmode })
                }, 'Slowmode updated.')
              }
              className="text-xs text-brand-400 hover:underline"
            >
              Set slowmode
            </button>
            <button
              onClick={() =>
                onAction(async () => {
                  await api.post(`/servers/${serverId}/manage-channels/${channel.id}/lock`, { locked: true })
                }, 'Channel locked.')
              }
              className="text-xs text-text-secondary hover:underline"
            >
              Lock
            </button>
            <button
              onClick={() =>
                onAction(async () => {
                  await api.post(`/servers/${serverId}/manage-channels/${channel.id}/lock`, { locked: false })
                }, 'Channel unlocked.')
              }
              className="text-xs text-text-secondary hover:underline"
            >
              Unlock
            </button>
          </>
        )}
        <button
          onClick={() =>
            onAction(async () => {
              await api.delete(`/servers/${serverId}/manage-channels/${channel.id}`)
            }, 'Channel deleted.')
          }
          className="text-xs text-red-400 hover:underline"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
