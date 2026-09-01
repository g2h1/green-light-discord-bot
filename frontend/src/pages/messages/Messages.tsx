import { useEffect, useState } from 'react'
import { api, ApiError } from '../../lib/api'
import { useServerId } from '../../context/ServerContext'
import { emptyDraft, type Channel, type MessageDraft, type ScheduledMessage, type Template } from './types'
import { EmbedBuilder } from './components/EmbedBuilder'
import { ButtonsEditor } from './components/ButtonsEditor'
import { MessagePreview } from './components/MessagePreview'
import { TemplatesPanel } from './components/TemplatesPanel'
import { ScheduledList } from './components/ScheduledList'
import { Button, Field, TextArea, Toggle } from './components/FormControls'

type Tab = 'content' | 'embed' | 'buttons'

export function Messages() {
  const serverId = useServerId()
  const [channels, setChannels] = useState<Channel[] | null>(null)
  const [templates, setTemplates] = useState<Template[] | null>(null)
  const [scheduled, setScheduled] = useState<ScheduledMessage[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [draft, setDraft] = useState<MessageDraft>(emptyDraft())
  const [tab, setTab] = useState<Tab>('content')
  const [schedule, setSchedule] = useState(false)
  const [scheduleAt, setScheduleAt] = useState('')
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'custom'>('none')

  const [sending, setSending] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    setChannels(null)
    setTemplates(null)
    setScheduled(null)
    setLoadError(null)
    setDraft((d) => ({ ...emptyDraft(), channelId: d.channelId }))

    Promise.all([
      api.get<{ channels: Channel[] }>(`/servers/${serverId}/channels`),
      api.get<{ templates: Template[] }>(`/servers/${serverId}/messages/templates`),
      api.get<{ scheduled: ScheduledMessage[] }>(`/servers/${serverId}/messages/scheduled`),
    ])
      .then(([c, t, s]) => {
        setChannels(c.channels)
        setTemplates(t.templates)
        setScheduled(s.scheduled)
        setDraft((d) => ({ ...d, channelId: c.channels[0]?.id ?? '' }))
      })
      .catch((err) =>
        setLoadError(
          err instanceof ApiError && err.status === 404
            ? 'GREEN LIGHT is not installed on this server yet.'
            : 'Could not load message data. Try refreshing.',
        ),
      )
  }, [serverId])

  function channelName(id: string) {
    return channels?.find((c) => c.id === id)?.name ?? id
  }

  async function refreshScheduled() {
    const s = await api.get<{ scheduled: ScheduledMessage[] }>(`/servers/${serverId}/messages/scheduled`)
    setScheduled(s.scheduled)
  }

  async function handleSend() {
    setStatus(null)
    setSending(true)
    try {
      await api.post(`/servers/${serverId}/messages/send`, {
        channelId: draft.channelId,
        content: draft.content || undefined,
        embed: draft.useEmbed ? draft.embed : undefined,
        buttons: draft.buttons.filter((b) => b.label && b.url),
        mentionEveryone: draft.mentionEveryone,
        mentionRoleIds: [],
        mentionUserIds: [],
        scheduledAt: schedule && scheduleAt ? new Date(scheduleAt).toISOString() : undefined,
        recurrence: schedule ? recurrence : undefined,
      })
      setStatus({
        kind: 'success',
        text: schedule ? 'Message scheduled.' : 'Message sent.',
      })
      if (schedule) await refreshScheduled()
    } catch (err) {
      setStatus({ kind: 'error', text: err instanceof ApiError ? err.message : 'Failed to send message' })
    } finally {
      setSending(false)
    }
  }

  async function handleSaveTemplate(name: string, category: string) {
    setSavingTemplate(true)
    try {
      const { template } = await api.post<{ template: Template }>(`/servers/${serverId}/messages/templates`, {
        name,
        category,
        content: draft.content || undefined,
        embed: draft.useEmbed ? draft.embed : undefined,
        buttons: draft.buttons.filter((b) => b.label && b.url),
      })
      setTemplates((prev) => [template, ...(prev ?? [])])
    } catch {
      setStatus({ kind: 'error', text: 'Failed to save template' })
    } finally {
      setSavingTemplate(false)
    }
  }

  function applyTemplate(t: Template) {
    setDraft((d) => ({
      ...d,
      content: t.content ?? '',
      useEmbed: Boolean(t.embed),
      embed: t.embed ?? { color: 0x17c964 },
      buttons: t.buttons,
    }))
  }

  async function deleteTemplate(id: string) {
    await api.delete(`/servers/${serverId}/messages/templates/${id}`)
    setTemplates((prev) => prev?.filter((t) => t.id !== id) ?? null)
  }

  async function cancelScheduled(id: string) {
    await api.delete(`/servers/${serverId}/messages/scheduled/${id}`)
    setScheduled((prev) => prev?.map((m) => (m.id === id ? { ...m, status: 'cancelled' } : m)) ?? null)
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-red-400">{loadError}</div>
    )
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-text-primary">Messages</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-surface-border bg-surface-1 p-4">
            <Field label="Channel">
              <select
                value={draft.channelId}
                onChange={(e) => setDraft((d) => ({ ...d, channelId: e.target.value }))}
                disabled={!channels}
                className="w-full rounded-md border border-surface-border bg-surface-2 px-3 py-1.5 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              >
                {!channels && <option>Loading channels…</option>}
                {channels?.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="mt-3 flex gap-4">
              <Toggle
                checked={draft.mentionEveryone}
                onChange={(v) => setDraft((d) => ({ ...d, mentionEveryone: v }))}
                label="@everyone"
              />
              <Toggle
                checked={draft.mentionHere}
                onChange={(v) => setDraft((d) => ({ ...d, mentionHere: v }))}
                label="@here"
              />
              <Toggle
                checked={draft.useEmbed}
                onChange={(v) => setDraft((d) => ({ ...d, useEmbed: v }))}
                label="Use embed"
              />
            </div>

            <div className="mt-4 flex gap-1 border-b border-surface-border">
              {(['content', 'embed', 'buttons'] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium capitalize transition-colors ${
                    tab === t
                      ? 'border-brand-500 text-brand-400'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="mt-4">
              {tab === 'content' && (
                <Field label="Message content">
                  <TextArea
                    rows={5}
                    maxLength={2000}
                    value={draft.content}
                    onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
                    placeholder="Type your message…"
                  />
                </Field>
              )}
              {tab === 'embed' && (
                <EmbedBuilder embed={draft.embed} onChange={(embed) => setDraft((d) => ({ ...d, embed }))} />
              )}
              {tab === 'buttons' && (
                <ButtonsEditor
                  buttons={draft.buttons}
                  onChange={(buttons) => setDraft((d) => ({ ...d, buttons }))}
                />
              )}
            </div>
          </div>

          <MessagePreview draft={draft} />

          <div className="rounded-lg border border-surface-border bg-surface-1 p-4">
            <Toggle checked={schedule} onChange={setSchedule} label="Schedule this message" />
            {schedule && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field label="Send at">
                  <input
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                    className="w-full rounded-md border border-surface-border bg-surface-2 px-3 py-1.5 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                  />
                </Field>
                <Field label="Repeat">
                  <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value as typeof recurrence)}
                    className="w-full rounded-md border border-surface-border bg-surface-2 px-3 py-1.5 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                  >
                    <option value="none">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </Field>
              </div>
            )}
          </div>

          {status && (
            <div
              className={`rounded-md px-4 py-2.5 text-sm ${
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
            onClick={handleSend}
            disabled={sending || !draft.channelId || (!draft.content && !draft.useEmbed)}
            className="self-start"
          >
            {sending ? 'Sending…' : schedule ? 'Schedule message' : 'Send message'}
          </Button>
        </div>

        <div className="flex flex-col gap-6">
          <TemplatesPanel
            templates={templates}
            onApply={applyTemplate}
            onSave={handleSaveTemplate}
            onDelete={deleteTemplate}
            saving={savingTemplate}
          />
          <ScheduledList items={scheduled} channelName={channelName} onCancel={cancelScheduled} />
        </div>
      </div>
    </div>
  )
}
