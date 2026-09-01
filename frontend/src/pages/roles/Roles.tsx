import { useEffect, useState } from 'react'
import { api, ApiError } from '../../lib/api'
import { useServerId } from '../../context/ServerContext'
import { Button, Field, TextInput } from '../messages/components/FormControls'

interface Role {
  id: string
  name: string
  color: number
  position: number
  managed: boolean
  hoist: boolean
  mentionable: boolean
}

export function Roles() {
  const serverId = useServerId()
  const [roles, setRoles] = useState<Role[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const [newName, setNewName] = useState('')
  const [assignUserId, setAssignUserId] = useState('')
  const [assignRoleId, setAssignRoleId] = useState('')

  function load() {
    api
      .get<{ roles: Role[] }>(`/servers/${serverId}/roles`)
      .then((res) => setRoles(res.roles.filter((r) => r.name !== '@everyone').sort((a, b) => b.position - a.position)))
      .catch((err) =>
        setLoadError(
          err instanceof ApiError && err.status === 404
            ? 'GREEN LIGHT is not installed on this server yet.'
            : 'Could not load roles. Try refreshing.',
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
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-text-primary">Roles</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-surface-border bg-surface-1 p-4">
            <h3 className="mb-2 text-sm font-semibold text-text-primary">Create role</h3>
            <div className="flex gap-2">
              <TextInput placeholder="Role name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <Button
                type="button"
                disabled={!newName.trim()}
                onClick={() =>
                  run(async () => {
                    await api.post(`/servers/${serverId}/roles`, { name: newName.trim() })
                    setNewName('')
                  }, 'Role created.')
                }
              >
                Create
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-surface-border bg-surface-1 p-4">
            <h3 className="mb-2 text-sm font-semibold text-text-primary">Assign / remove role</h3>
            <div className="flex flex-col gap-2">
              <Field label="Discord user ID">
                <TextInput value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)} />
              </Field>
              <Field label="Role">
                <select
                  value={assignRoleId}
                  onChange={(e) => setAssignRoleId(e.target.value)}
                  className="w-full rounded-md border border-surface-border bg-surface-2 px-3 py-1.5 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                >
                  <option value="">Select a role</option>
                  {roles?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!assignUserId || !assignRoleId}
                  onClick={() =>
                    run(async () => {
                      await api.post(`/servers/${serverId}/roles/${assignRoleId}/members`, { discordUserId: assignUserId })
                    }, 'Role assigned.')
                  }
                >
                  Assign
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  disabled={!assignUserId || !assignRoleId}
                  onClick={() =>
                    run(async () => {
                      await api.delete(`/servers/${serverId}/roles/${assignRoleId}/members/${assignUserId}`)
                    }, 'Role removed.')
                  }
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>

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
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-1 p-4">
          <h3 className="mb-2 text-sm font-semibold text-text-primary">All roles</h3>
          {!roles && <p className="text-sm text-text-secondary">Loading…</p>}
          <div className="flex max-h-[70vh] flex-col gap-1.5 overflow-y-auto">
            {roles?.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : '#71717a' }}
                  />
                  <span className="text-text-primary">{r.name}</span>
                  {r.managed && <span className="text-xs text-text-muted">(managed)</span>}
                </div>
                {!r.managed && (
                  <button
                    onClick={() =>
                      run(async () => {
                        await api.delete(`/servers/${serverId}/roles/${r.id}`)
                      }, 'Role deleted.')
                    }
                    className="text-xs text-red-400 hover:underline"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
