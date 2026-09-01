import { Field, TextArea, TextInput, Toggle } from '../../messages/components/FormControls'
import type { PanelFormState } from './types'

const VARIABLES = ['{user}', '{username}', '{ticket}', '{ticket_id}', '{server}', '{created_at}']

export function WelcomeSection({
  form,
  setForm,
}: {
  form: PanelFormState
  setForm: (updater: (f: PanelFormState) => PanelFormState) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <Toggle
        checked={form.config.welcomeEnabled}
        onChange={(v) => setForm((f) => ({ ...f, config: { ...f.config, welcomeEnabled: v } }))}
        label="Enabled"
      />

      <div className="flex flex-wrap gap-1.5">
        {VARIABLES.map((v) => (
          <code key={v} className="rounded bg-surface-3 px-1.5 py-0.5 text-xs text-brand-400">
            {v}
          </code>
        ))}
      </div>

      <Field label="Embed Title">
        <TextInput
          value={form.config.welcomeEmbedTitle ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, config: { ...f.config, welcomeEmbedTitle: e.target.value } }))}
          maxLength={256}
        />
      </Field>

      <Field label="Embed Description">
        <TextArea
          rows={3}
          value={form.config.welcomeEmbedDescription ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, config: { ...f.config, welcomeEmbedDescription: e.target.value } }))}
          maxLength={4096}
        />
      </Field>

      <Field label="Message content (sent as a separate plain message after the embed, optional)">
        <TextArea
          rows={2}
          value={form.config.welcomeMessage ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, config: { ...f.config, welcomeMessage: e.target.value } }))}
          maxLength={2000}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Image / Banner">
          <TextInput
            value={form.config.welcomeImageUrl ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, config: { ...f.config, welcomeImageUrl: e.target.value } }))}
          />
        </Field>
        <Field label="Thumbnail">
          <TextInput
            value={form.config.welcomeThumbnailUrl ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, config: { ...f.config, welcomeThumbnailUrl: e.target.value } }))}
          />
        </Field>
      </div>
    </div>
  )
}
