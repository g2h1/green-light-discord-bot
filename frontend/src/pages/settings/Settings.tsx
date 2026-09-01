import { useEffect, useState } from 'react'
import { api, ApiError } from '../../lib/api'
import { useServerId } from '../../context/ServerContext'
import type { Channel, EmbedDraft } from '../messages/types'
import { EmbedBuilder } from '../messages/components/EmbedBuilder'
import { Button, Field, TextArea, TextInput, Toggle } from '../messages/components/FormControls'
import { StrictChannels, type StrictChannelRule } from './StrictChannels'

interface WelcomeConfig {
  enabled: boolean
  message: string
  useEmbed: boolean
  embed?: EmbedDraft
  channelId?: string
  autoRoleId?: string
  dmEnabled: boolean
  dmMessage?: string
}

const DEFAULT_WELCOME: WelcomeConfig = {
  enabled: false,
  message: 'Welcome {user} to {server}! You are member #{memberCount}.',
  useEmbed: false,
  embed: { color: 0x17c964 },
  channelId: '',
  autoRoleId: '',
  dmEnabled: false,
  dmMessage: '',
}

interface AutomodConfig {
  antiSpam: boolean
  antiFlood: boolean
  antiRaid: boolean
  linkFilter: boolean
  badWordFilter: boolean
  mentionSpam: boolean
  duplicateMessage: boolean
  capsDetection: boolean
  bannedWords: string[]
}

const DEFAULT_AUTOMOD: AutomodConfig = {
  antiSpam: false,
  antiFlood: false,
  antiRaid: false,
  linkFilter: false,
  badWordFilter: false,
  mentionSpam: false,
  duplicateMessage: false,
  capsDetection: false,
  bannedWords: [],
}

const AUTOMOD_LABELS: Array<{ key: keyof Omit<AutomodConfig, 'bannedWords'>; label: string }> = [
  { key: 'antiSpam', label: 'Anti-Spam (rapid repeated messages)' },
  { key: 'antiFlood', label: 'Anti-Flood (message rate limiting)' },
  { key: 'antiRaid', label: 'Anti-Raid (mass join detection)' },
  { key: 'linkFilter', label: 'Link Filter' },
  { key: 'badWordFilter', label: 'Bad Word Filter' },
  { key: 'mentionSpam', label: 'Mention Spam' },
  { key: 'duplicateMessage', label: 'Duplicate Message Detection' },
  { key: 'capsDetection', label: 'Caps Detection' },
]

interface RoleOption {
  id: string
  name: string
}

export function Settings() {
  const serverId = useServerId()
  const [channels, setChannels] = useState<Channel[] | null>(null)
  const [roles, setRoles] = useState<RoleOption[] | null>(null)
  const [welcome, setWelcome] = useState<WelcomeConfig | null>(null)
  const [automod, setAutomod] = useState<AutomodConfig | null>(null)
  const [strictChannels, setStrictChannels] = useState<StrictChannelRule[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [savingWelcome, setSavingWelcome] = useState(false)
  const [savingAutomod, setSavingAutomod] = useState(false)
  const [welcomeStatus, setWelcomeStatus] = useState<string | null>(null)
  const [automodStatus, setAutomodStatus] = useState<string | null>(null)

  useEffect(() => {
    setLoadError(null)
    Promise.all([
      api.get<{ channels: Channel[] }>(`/servers/${serverId}/channels`),
      api.get<{ roles: RoleOption[] }>(`/servers/${serverId}/roles`),
      api.get<{ welcome: WelcomeConfig }>(`/servers/${serverId}/settings/welcome`),
      api.get<{ automod: AutomodConfig }>(`/servers/${serverId}/settings/automod`),
      api.get<{ strictChannels: StrictChannelRule[] }>(`/servers/${serverId}/settings/strict-channels`),
    ])
      .then(([c, r, w, a, s]) => {
        setChannels(c.channels)
        setRoles(r.roles.filter((role) => role.name !== '@everyone'))
        setWelcome({ ...DEFAULT_WELCOME, ...w.welcome })
        setAutomod({ ...DEFAULT_AUTOMOD, ...a.automod })
        setStrictChannels(s.strictChannels)
      })
      .catch((err) =>
        setLoadError(
          err instanceof ApiError && err.status === 404
            ? 'GREEN LIGHT is not installed on this server yet.'
            : 'Could not load settings. Try refreshing.',
        ),
      )
  }, [serverId])

  async function saveStrictChannels(next: StrictChannelRule[]) {
    setStrictChannels(next)
    await api.put(`/servers/${serverId}/settings/strict-channels`, next)
  }

  async function saveWelcome() {
    if (!welcome) return
    setSavingWelcome(true)
    setWelcomeStatus(null)
    try {
      await api.put(`/servers/${serverId}/settings/welcome`, welcome)
      setWelcomeStatus('Saved.')
    } catch {
      setWelcomeStatus('Failed to save.')
    } finally {
      setSavingWelcome(false)
    }
  }

  async function saveAutomod(next: AutomodConfig) {
    setAutomod(next)
    setSavingAutomod(true)
    setAutomodStatus(null)
    try {
      await api.put(`/servers/${serverId}/settings/automod`, next)
      setAutomodStatus('Saved.')
    } catch {
      setAutomodStatus('Failed to save.')
    } finally {
      setSavingAutomod(false)
    }
  }

  if (loadError) {
    return <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-red-400">{loadError}</div>
  }

  if (!welcome || !automod || !strictChannels) {
    return <p className="text-sm text-text-secondary">Loading…</p>
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-text-primary">Settings</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-surface-border bg-surface-1 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Welcome system</h3>
            <Toggle checked={welcome.enabled} onChange={(v) => setWelcome({ ...welcome, enabled: v })} label="Enabled" />
          </div>

          <div className="flex flex-col gap-3">
            <Field label="Channel">
              <select
                value={welcome.channelId ?? ''}
                onChange={(e) => setWelcome({ ...welcome, channelId: e.target.value })}
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

            <Field label="Auto-role ID (assigned on join, optional)">
              <TextInput value={welcome.autoRoleId ?? ''} onChange={(e) => setWelcome({ ...welcome, autoRoleId: e.target.value })} />
            </Field>

            <Toggle checked={welcome.useEmbed} onChange={(v) => setWelcome({ ...welcome, useEmbed: v })} label="Use embed" />

            {welcome.useEmbed ? (
              <EmbedBuilder
                embed={welcome.embed ?? { color: 0x17c964 }}
                onChange={(embed) => setWelcome({ ...welcome, embed })}
              />
            ) : (
              <Field label="Message ({user}, {username}, {server}, {memberCount})">
                <TextArea
                  rows={3}
                  value={welcome.message}
                  onChange={(e) => setWelcome({ ...welcome, message: e.target.value })}
                  maxLength={2000}
                />
              </Field>
            )}

            <Toggle checked={welcome.dmEnabled} onChange={(v) => setWelcome({ ...welcome, dmEnabled: v })} label="Also DM the new member" />
            {welcome.dmEnabled && (
              <Field label="DM message">
                <TextArea
                  rows={2}
                  value={welcome.dmMessage ?? ''}
                  onChange={(e) => setWelcome({ ...welcome, dmMessage: e.target.value })}
                  maxLength={2000}
                />
              </Field>
            )}

            {welcomeStatus && <div className="text-sm text-brand-400">{welcomeStatus}</div>}

            <Button type="button" disabled={savingWelcome} onClick={saveWelcome} className="self-start">
              {savingWelcome ? 'Saving…' : 'Save welcome settings'}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-1 p-4">
          <h3 className="mb-3 text-sm font-semibold text-text-primary">AutoMod</h3>
          <div className="flex flex-col gap-2">
            {AUTOMOD_LABELS.map(({ key, label }) => (
              <Toggle
                key={key}
                checked={automod[key]}
                onChange={(v) => saveAutomod({ ...automod, [key]: v })}
                label={label}
              />
            ))}

            {automod.badWordFilter && (
              <Field label="Banned words (comma-separated)">
                <TextInput
                  defaultValue={automod.bannedWords.join(', ')}
                  onBlur={(e) =>
                    saveAutomod({
                      ...automod,
                      bannedWords: e.target.value
                        .split(',')
                        .map((w) => w.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </Field>
            )}

            {automodStatus && <div className="text-sm text-brand-400">{automodStatus}</div>}
            {savingAutomod && <div className="text-sm text-text-muted">Saving…</div>}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <StrictChannels channels={channels} roles={roles} rules={strictChannels} onSave={saveStrictChannels} />
      </div>
    </div>
  )
}
