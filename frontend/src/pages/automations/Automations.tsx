import { useEffect, useState } from 'react'
import { api, ApiError } from '../../lib/api'
import { useServerId } from '../../context/ServerContext'
import type { Channel } from '../messages/types'
import { Button, Field, TextInput } from '../messages/components/FormControls'

type TriggerEvent = 'member_join' | 'ticket_close'
type ActionType = 'give_role' | 'send_message' | 'send_log'

interface AutomationAction {
  id: string
  action_type: ActionType
  order_index: number
  config: Record<string, string>
}

interface Automation {
  id: string
  name: string
  trigger_event: TriggerEvent
  enabled: boolean
  automation_actions: AutomationAction[]
}

interface DraftAction {
  actionType: ActionType
  config: Record<string, string>
}

export function Automations() {
  const serverId = useServerId()
  const [channels, setChannels] = useState<Channel[] | null>(null)
  const [automations, setAutomations] = useState<Automation[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const [name, setName] = useState('')
  const [trigger, setTrigger] = useState<TriggerEvent>('member_join')
  const [actions, setActions] = useState<DraftAction[]>([{ actionType: 'send_message', config: {} }])

  function load() {
    api
      .get<{ automations: Automation[] }>(`/servers/${serverId}/automations`)
      .then((res) => setAutomations(res.automations))
      .catch(() => setAutomations([]))
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
            : 'Could not load automation data. Try refreshing.',
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

  function updateAction(i: number, patch: Partial<DraftAction>) {
    const next = [...actions]
    next[i] = { ...next[i], ...patch }
    setActions(next)
  }

  function updateActionConfig(i: number, key: string, value: string) {
    const next = [...actions]
    next[i] = { ...next[i], config: { ...next[i].config, [key]: value } }
    setActions(next)
  }

  if (loadError) {
    return <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-red-400">{loadError}</div>
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-text-primary">Automations</h1>
      <p className="mb-6 text-sm text-text-secondary">WHEN an event happens → THEN run these actions, in order.</p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-lg border border-surface-border bg-surface-1 p-4">
          <h3 className="mb-3 text-sm font-semibold text-text-primary">Create automation</h3>

          <div className="flex flex-col gap-3">
            <Field label="Name">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
            </Field>

            <Field label="WHEN">
              <select
                value={trigger}
                onChange={(e) => setTrigger(e.target.value as TriggerEvent)}
                className="w-full rounded-md border border-surface-border bg-surface-2 px-3 py-1.5 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              >
                <option value="member_join">Member joins</option>
                <option value="ticket_close">Ticket closes</option>
              </select>
            </Field>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-text-secondary">THEN</span>
                <Button
                  type="button"
                  variant="ghost"
                  className="!px-2 !py-1 text-xs"
                  disabled={actions.length >= 10}
                  onClick={() => setActions([...actions, { actionType: 'send_message', config: {} }])}
                >
                  + Add action
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                {actions.map((a, i) => (
                  <div key={i} className="rounded-md border border-surface-border bg-surface-2 p-2">
                    <div className="mb-1.5 flex items-center gap-2">
                      <select
                        value={a.actionType}
                        onChange={(e) => updateAction(i, { actionType: e.target.value as ActionType, config: {} })}
                        className="flex-1 rounded-md border border-surface-border bg-surface-3 px-2 py-1 text-sm text-text-primary"
                      >
                        <option value="give_role">Give role</option>
                        <option value="send_message">Send message</option>
                        <option value="send_log">Send log entry</option>
                      </select>
                      {actions.length > 1 && (
                        <button
                          onClick={() => setActions(actions.filter((_, idx) => idx !== i))}
                          className="text-xs text-red-400 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {a.actionType === 'give_role' && (
                      <TextInput
                        placeholder="Role ID to grant"
                        value={a.config.roleId ?? ''}
                        onChange={(e) => updateActionConfig(i, 'roleId', e.target.value)}
                      />
                    )}
                    {a.actionType === 'send_message' && (
                      <div className="flex flex-col gap-1.5">
                        <select
                          value={a.config.channelId ?? ''}
                          onChange={(e) => updateActionConfig(i, 'channelId', e.target.value)}
                          className="rounded-md border border-surface-border bg-surface-3 px-2 py-1 text-sm text-text-primary"
                        >
                          <option value="">Select channel</option>
                          {channels?.map((c) => (
                            <option key={c.id} value={c.id}>
                              #{c.name}
                            </option>
                          ))}
                        </select>
                        <TextInput
                          placeholder="Message ({user}, {username}, {server}, {category})"
                          value={a.config.message ?? ''}
                          onChange={(e) => updateActionConfig(i, 'message', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                ))}
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

            <Button
              type="button"
              disabled={!name.trim()}
              className="self-start"
              onClick={() =>
                run(async () => {
                  await api.post(`/servers/${serverId}/automations`, {
                    name: name.trim(),
                    triggerEvent: trigger,
                    enabled: true,
                    actions,
                  })
                  setName('')
                  setActions([{ actionType: 'send_message', config: {} }])
                }, 'Automation created.')
              }
            >
              Create automation
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-1 p-4">
          <h3 className="mb-2 text-sm font-semibold text-text-primary">Automations</h3>
          {!automations && <p className="text-sm text-text-secondary">Loading…</p>}
          {automations && automations.length === 0 && <p className="text-sm text-text-muted">None yet.</p>}
          <div className="flex flex-col gap-1.5">
            {automations?.map((a) => (
              <div key={a.id} className="rounded-md bg-surface-2 px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-text-primary">{a.name}</span>
                  <button
                    onClick={() =>
                      run(async () => {
                        await api.patch(`/servers/${serverId}/automations/${a.id}`, { enabled: !a.enabled })
                      }, a.enabled ? 'Disabled.' : 'Enabled.')
                    }
                    className={`rounded px-1.5 py-0.5 text-xs ${
                      a.enabled ? 'bg-brand-500/15 text-brand-400' : 'bg-surface-3 text-text-muted'
                    }`}
                  >
                    {a.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                <div className="text-xs text-text-muted">
                  {a.trigger_event === 'member_join' ? 'Member joins' : 'Ticket closes'} →{' '}
                  {a.automation_actions.length} action{a.automation_actions.length === 1 ? '' : 's'}
                </div>
                <button
                  onClick={() =>
                    run(async () => {
                      await api.delete(`/servers/${serverId}/automations/${a.id}`)
                    }, 'Automation deleted.')
                  }
                  className="mt-1 text-xs text-red-400 hover:underline"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
