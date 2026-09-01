import type { EmbedDraft } from '../types'
import { Field, TextArea, TextInput, Button } from './FormControls'

export function EmbedBuilder({
  embed,
  onChange,
}: {
  embed: EmbedDraft
  onChange: (embed: EmbedDraft) => void
}) {
  function set<K extends keyof EmbedDraft>(key: K, value: EmbedDraft[K]) {
    onChange({ ...embed, [key]: value })
  }

  const fields = embed.fields ?? []

  return (
    <div className="flex flex-col gap-3">
      <Field label="Title">
        <TextInput
          value={embed.title ?? ''}
          onChange={(e) => set('title', e.target.value || undefined)}
          maxLength={256}
        />
      </Field>

      <Field label="Description">
        <TextArea
          rows={3}
          value={embed.description ?? ''}
          onChange={(e) => set('description', e.target.value || undefined)}
          maxLength={4096}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="URL (title link)">
          <TextInput value={embed.url ?? ''} onChange={(e) => set('url', e.target.value || undefined)} />
        </Field>
        <Field label="Color">
          <input
            type="color"
            value={'#' + (embed.color ?? 0x17c964).toString(16).padStart(6, '0')}
            onChange={(e) => set('color', parseInt(e.target.value.slice(1), 16))}
            className="h-8 w-full rounded-md border border-surface-border bg-surface-2"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Author name">
          <TextInput
            value={embed.author?.name ?? ''}
            onChange={(e) => set('author', e.target.value ? { name: e.target.value } : undefined)}
          />
        </Field>
        <Field label="Footer text">
          <TextInput
            value={embed.footer?.text ?? ''}
            onChange={(e) => set('footer', e.target.value ? { text: e.target.value } : undefined)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Thumbnail URL">
          <TextInput
            value={embed.thumbnail?.url ?? ''}
            onChange={(e) => set('thumbnail', e.target.value ? { url: e.target.value } : undefined)}
          />
        </Field>
        <Field label="Image URL">
          <TextInput
            value={embed.image?.url ?? ''}
            onChange={(e) => set('image', e.target.value ? { url: e.target.value } : undefined)}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-text-secondary">
        <input
          type="checkbox"
          checked={Boolean(embed.timestamp)}
          onChange={(e) => set('timestamp', e.target.checked ? new Date().toISOString() : undefined)}
          className="accent-brand-500"
        />
        Show current timestamp
      </label>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium text-text-secondary">Fields</span>
          <Button
            type="button"
            variant="ghost"
            className="!px-2 !py-1 text-xs"
            disabled={fields.length >= 25}
            onClick={() => set('fields', [...fields, { name: '', value: '', inline: false }])}
          >
            + Add field
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {fields.map((field, i) => (
            <div key={i} className="rounded-md border border-surface-border bg-surface-2 p-2">
              <div className="mb-1.5 grid grid-cols-2 gap-2">
                <TextInput
                  placeholder="Name"
                  value={field.name}
                  onChange={(e) => {
                    const next = [...fields]
                    next[i] = { ...field, name: e.target.value }
                    set('fields', next)
                  }}
                />
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs text-text-secondary">
                    <input
                      type="checkbox"
                      checked={Boolean(field.inline)}
                      onChange={(e) => {
                        const next = [...fields]
                        next[i] = { ...field, inline: e.target.checked }
                        set('fields', next)
                      }}
                      className="accent-brand-500"
                    />
                    Inline
                  </label>
                  <button
                    type="button"
                    onClick={() => set('fields', fields.filter((_, idx) => idx !== i))}
                    className="ml-auto text-xs text-red-400 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <TextArea
                placeholder="Value"
                rows={2}
                value={field.value}
                onChange={(e) => {
                  const next = [...fields]
                  next[i] = { ...field, value: e.target.value }
                  set('fields', next)
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
