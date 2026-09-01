import { useState } from 'react'
import type { Template } from '../types'
import { Button, Field, TextInput } from './FormControls'
import { TEMPLATE_CATEGORIES } from '../types'

export function TemplatesPanel({
  templates,
  onApply,
  onSave,
  onDelete,
  saving,
}: {
  templates: Template[] | null
  onApply: (t: Template) => void
  onSave: (name: string, category: string) => Promise<void>
  onDelete: (id: string) => void
  saving: boolean
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState(TEMPLATE_CATEGORIES[0])

  return (
    <div className="rounded-lg border border-surface-border bg-surface-1 p-4">
      <h3 className="mb-3 text-sm font-semibold text-text-primary">Templates</h3>

      <div className="mb-4 flex flex-col gap-2 border-b border-surface-border pb-4">
        <Field label="Save current message as">
          <TextInput
            placeholder="Template name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
          />
        </Field>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-surface-border bg-surface-2 px-3 py-1.5 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
        >
          {TEMPLATE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Button
          type="button"
          disabled={!name.trim() || saving}
          onClick={async () => {
            await onSave(name.trim(), category)
            setName('')
          }}
        >
          Save template
        </Button>
      </div>

      {!templates && <p className="text-sm text-text-secondary">Loading templates…</p>}
      {templates && templates.length === 0 && (
        <p className="text-sm text-text-muted">No saved templates yet.</p>
      )}

      <div className="flex flex-col gap-1.5">
        {templates?.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-md border border-surface-border bg-surface-2 px-3 py-2"
          >
            <button
              type="button"
              onClick={() => onApply(t)}
              className="min-w-0 flex-1 truncate text-left text-sm text-text-primary hover:text-brand-400"
            >
              {t.name}
              <span className="ml-2 text-xs text-text-muted">{t.category}</span>
            </button>
            <button
              type="button"
              onClick={() => onDelete(t.id)}
              className="ml-2 shrink-0 text-xs text-red-400 hover:underline"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
