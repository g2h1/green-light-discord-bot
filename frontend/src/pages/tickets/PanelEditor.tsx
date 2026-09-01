import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { useServerId } from '../../context/ServerContext'
import type { Channel } from '../messages/types'
import { Button } from '../messages/components/FormControls'
import { Section } from './editor/Section'
import { AppearanceSection } from './editor/AppearanceSection'
import { RoutingSection, BehaviorSection, ClaimCloseSection } from './editor/AdvancedSections'
import { WelcomeSection } from './editor/WelcomeSection'
import { defaultPanelForm, type PanelFormState } from './editor/types'

interface RoleOption {
  id: string
  name: string
}

interface ManagedChannel extends Channel {
  parent_id: string | null
}

export function PanelEditor() {
  const serverId = useServerId()
  const { panelId } = useParams<{ panelId: string }>()
  const isNew = !panelId || panelId === 'new'
  const navigate = useNavigate()

  const [channels, setChannels] = useState<Channel[] | null>(null)
  const [categories, setCategories] = useState<Channel[] | null>(null)
  const [roles, setRoles] = useState<RoleOption[] | null>(null)
  const [form, setForm] = useState<PanelFormState>(defaultPanelForm())
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  // Image uploads need a panel id to organize storage paths under. For a new,
  // unsaved panel there isn't one yet, so a stable id is generated client-side
  // and sent along on create — the backend uses it as the actual row id
  // instead of generating its own, keeping upload paths and the saved panel
  // in sync from the very first upload.
  const [draftId] = useState(() => crypto.randomUUID())
  const effectivePanelId = isNew ? draftId : panelId!

  useEffect(() => {
    setLoadError(null)
    const requests: Promise<unknown>[] = [
      api.get<{ channels: Channel[] }>(`/servers/${serverId}/channels`).then((r) => setChannels(r.channels)),
      api
        .get<{ channels: ManagedChannel[] }>(`/servers/${serverId}/manage-channels`)
        .then((r) => setCategories(r.channels.filter((c) => c.type === 4))),
      api.get<{ roles: RoleOption[] }>(`/servers/${serverId}/roles`).then((r) => setRoles(r.roles.filter((role) => role.name !== '@everyone'))),
    ]

    if (!isNew) {
      requests.push(
        api.get<{ panel: { channel_id: string; title: string; description: string | null; embed: { color?: number }; disabled: boolean; config: Partial<PanelFormState['config']> } }>(
          `/servers/${serverId}/tickets/panels/${panelId}`,
        ).then((r) => {
          const d = defaultPanelForm()
          setForm({
            channelId: r.panel.channel_id,
            title: r.panel.title,
            description: r.panel.description ?? '',
            color: r.panel.embed?.color ?? d.color,
            disabled: r.panel.disabled,
            config: { ...d.config, ...r.panel.config },
          })
        }),
      )
    }

    Promise.all(requests).catch((err) =>
      setLoadError(
        err instanceof ApiError && err.status === 404
          ? 'GREEN LIGHT is not installed on this server yet, or this panel no longer exists.'
          : 'Could not load panel data. Try refreshing.',
      ),
    )
  }, [serverId, panelId, isNew])

  async function save() {
    setSaving(true)
    setStatus(null)
    try {
      if (isNew) {
        await api.post(`/servers/${serverId}/tickets/panels`, { ...form, id: draftId })
      } else {
        await api.patch(`/servers/${serverId}/tickets/panels/${panelId}`, form)
      }
      setStatus('Saved.')
      navigate(`/${serverId}/tickets`)
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : 'Failed to save panel')
    } finally {
      setSaving(false)
    }
  }

  if (loadError) {
    return <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-red-400">{loadError}</div>
  }

  return (
    <div className="pb-10">
      <div className="mb-2 flex items-center gap-1.5 text-sm text-text-muted">
        <Link to={`/${serverId}/tickets`} className="hover:text-text-secondary">
          Panels
        </Link>
        <span>›</span>
        <span className="text-text-secondary">{isNew ? 'New' : 'Edit'}</span>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Panel Editor - {form.title || 'Open a ticket!'}</h1>
      <p className="mb-6 text-sm text-text-secondary">Edit the panel to allow users to open tickets.</p>

      <div className="flex flex-col gap-4">
        <Section title="Panel Appearance" subtitle="Configure the panel's appearance" defaultOpen>
          <AppearanceSection
            form={form}
            setForm={setForm}
            channels={channels}
            uploadBaseUrl={`/servers/${serverId}/tickets/panels/${effectivePanelId}/assets`}
          />
        </Section>

        <Section title="Routing" subtitle="Configure ticket team, knowledge, and routing settings">
          <RoutingSection form={form} setForm={setForm} channels={channels} categories={categories} roles={roles} />
        </Section>

        <Section title="Welcome Message" subtitle="Configure the message users see when their ticket opens">
          <WelcomeSection form={form} setForm={setForm} />
        </Section>

        <Section title="Ticket Behavior" subtitle="Configure how tickets are created and closed">
          <BehaviorSection form={form} setForm={setForm} />
        </Section>

        <Section title="Closing & Claiming" subtitle="Configure the claim and close buttons">
          <ClaimCloseSection form={form} setForm={setForm} roles={roles} />
        </Section>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button type="button" disabled={saving || !form.channelId} onClick={save}>
          {saving ? 'Saving…' : isNew ? 'Create panel' : 'Save changes'}
        </Button>
        {status && <span className="text-sm text-brand-400">{status}</span>}
      </div>
    </div>
  )
}
