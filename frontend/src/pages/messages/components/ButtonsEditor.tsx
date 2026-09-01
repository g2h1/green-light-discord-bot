import type { ButtonDraft } from '../types'
import { TextInput, Button } from './FormControls'

export function ButtonsEditor({
  buttons,
  onChange,
}: {
  buttons: ButtonDraft[]
  onChange: (buttons: ButtonDraft[]) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary">Link buttons (up to 5)</span>
        <Button
          type="button"
          variant="ghost"
          className="!px-2 !py-1 text-xs"
          disabled={buttons.length >= 5}
          onClick={() => onChange([...buttons, { label: '', url: '' }])}
        >
          + Add button
        </Button>
      </div>

      {buttons.length === 0 && (
        <p className="text-xs text-text-muted">
          No buttons yet. Only link buttons are supported here — they open a URL and need no bot interaction handler.
        </p>
      )}

      {buttons.map((btn, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
          <TextInput
            placeholder="Label"
            value={btn.label}
            maxLength={80}
            onChange={(e) => {
              const next = [...buttons]
              next[i] = { ...btn, label: e.target.value }
              onChange(next)
            }}
          />
          <TextInput
            placeholder="https://..."
            value={btn.url}
            onChange={(e) => {
              const next = [...buttons]
              next[i] = { ...btn, url: e.target.value }
              onChange(next)
            }}
          />
          <button
            type="button"
            onClick={() => onChange(buttons.filter((_, idx) => idx !== i))}
            className="text-xs text-red-400 hover:underline"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  )
}
