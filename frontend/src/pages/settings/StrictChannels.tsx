import { useState } from 'react'
import type { Channel } from '../messages/types'
import { Button, Field, TextInput, Toggle } from '../messages/components/FormControls'

interface Role {
  id: string
  name: string
}

export interface StrictChannelRule {
  channelId: string
  enabled: boolean
  exemptRoleIds: string[]
}

export function StrictChannels({
  channels,
  roles,
  rules,
  onSave,
}: {
  channels: Channel[] | null
  roles: Role[] | null
  rules: StrictChannelRule[]
  onSave: (rules: StrictChannelRule[]) => Promise<void>
}) {
  const [newChannelId, setNewChannelId] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const configuredIds = new Set(rules.map((r) => r.channelId))
  const availableChannels = channels?.filter((c) => !configuredIds.has(c.id))

  async function save(next: StrictChannelRule[]) {
    setSaving(true)
    setStatus(null)
    try {
      await onSave(next)
      setStatus('Saved.')
    } catch {
      setStatus('Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  function channelName(id: string) {
    return channels?.find((c) => c.id === id)?.name ?? id
  }

  function roleName(id: string) {
    return roles?.find((r) => r.id === id)?.name ?? id
  }

  return (
    <div className="rounded-lg border border-surface-border bg-surface-1 p-4">
      <h3 className="mb-1 text-sm font-semibold text-text-primary">Strict Channel Protection</h3>
      <p className="mb-3 text-xs text-text-muted">
        Normal members who send a message in a protected channel are instantly deleted and banned. Admins,
        Manage Server, moderators (Moderate Members), and the roles you exempt below can still post. Violations
        are logged to your configured Moderation Logs channel (set under Logs) and recorded in Moderation history.
      </p>

      <div className="mb-3 flex items-end gap-2">
        <Field label="Add a channel">
          <select
            value={newChannelId}
            onChange={(e) => setNewChannelId(e.target.value)}
            className="rounded-md border border-surface-border bg-surface-2 px-3 py-1.5 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
          >
            <option value="">Select a channel</option>
            {availableChannels?.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.name}
              </option>
            ))}
          </select>
        </Field>
        <Button
          type="button"
          variant="ghost"
          disabled={!newChannelId}
          onClick={() => {
            save([...rules, { channelId: newChannelId, enabled: true, exemptRoleIds: [] }])
            setNewChannelId('')
          }}
        >
          Add
        </Button>
      </div>

      {status && <div className="mb-3 text-sm text-brand-400">{status}</div>}
      {saving && <div className="mb-3 text-sm text-text-muted">Saving…</div>}

      {rules.length === 0 && <p className="text-sm text-text-muted">No protected channels configured.</p>}

      <div className="flex flex-col gap-3">
        {rules.map((rule, i) => (
          <div key={rule.channelId} className="rounded-md border border-surface-border bg-surface-2 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-text-primary">#{channelName(rule.channelId)}</span>
              <div className="flex items-center gap-3">
                <Toggle
                  checked={rule.enabled}
                  onChange={(v) => {
                    const next = [...rules]
                    next[i] = { ...rule, enabled: v }
                    save(next)
                  }}
                  label={rule.enabled ? 'On' : 'Off'}
                />
                <button
                  onClick={() => save(rules.filter((_, idx) => idx !== i))}
                  className="text-xs text-red-400 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="mb-1.5 text-xs font-medium text-text-secondary">Exempt roles</div>
            <div className="mb-1.5 flex flex-wrap gap-1.5">
              {rule.exemptRoleIds.map((roleId) => (
                <span key={roleId} className="flex items-center gap-1 rounded bg-surface-3 px-2 py-0.5 text-xs text-text-secondary">
                  {roleName(roleId)}
                  <button
                    onClick={() => {
                      const next = [...rules]
                      next[i] = { ...rule, exemptRoleIds: rule.exemptRoleIds.filter((r) => r !== roleId) }
                      save(next)
                    }}
                    className="text-red-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <select
              value=""
              onChange={(e) => {
                if (!e.target.value) return
                const next = [...rules]
                next[i] = { ...rule, exemptRoleIds: [...rule.exemptRoleIds, e.target.value] }
                save(next)
              }}
              className="w-full rounded-md border border-surface-border bg-surface-3 px-2 py-1 text-xs text-text-primary"
            >
              <option value="">+ Exempt a role…</option>
              {roles
                ?.filter((r) => !rule.exemptRoleIds.includes(r.id))
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
