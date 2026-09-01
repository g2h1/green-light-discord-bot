import type { Channel } from '../../messages/types'
import { Field, TextArea, TextInput, Toggle } from '../../messages/components/FormControls'
import type { ButtonColor, PanelFormState } from './types'
import { PanelPreview } from './PanelPreview'
import { ImageUploadField } from './ImageUploadField'

const BUTTON_COLORS: { value: ButtonColor; label: string }[] = [
  { value: 'green', label: 'Green' },
  { value: 'gray', label: 'Gray' },
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' },
]

export function AppearanceSection({
  form,
  setForm,
  channels,
  uploadBaseUrl,
}: {
  form: PanelFormState
  setForm: (updater: (f: PanelFormState) => PanelFormState) => void
  channels: Channel[] | null
  uploadBaseUrl: string
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-text-primary">Panel Properties</h3>
        <div className="flex flex-col gap-3">
          <Field label="Panel Title">
            <TextInput
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              maxLength={256}
            />
          </Field>

          <Field label="Panel Color">
            <input
              type="color"
              value={'#' + form.color.toString(16).padStart(6, '0')}
              onChange={(e) => setForm((f) => ({ ...f, color: parseInt(e.target.value.slice(1), 16) }))}
              className="h-9 w-full rounded-md border border-surface-border bg-surface-2"
            />
          </Field>

          <Field label="Panel Content">
            <TextArea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              maxLength={4096}
              placeholder="Supports basic Discord-style formatting: **bold**, *italic*, ~~strike~~"
            />
          </Field>

          <Field label="Panel Channel">
            <select
              value={form.channelId}
              onChange={(e) => setForm((f) => ({ ...f, channelId: e.target.value }))}
              disabled={!channels}
              className="w-full rounded-md border border-surface-border bg-surface-2 px-3 py-1.5 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            >
              <option value="">{channels ? 'Select a channel' : 'Loading…'}</option>
              {channels?.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.name}
                </option>
              ))}
            </select>
          </Field>

          <Toggle checked={form.disabled} onChange={(v) => setForm((f) => ({ ...f, disabled: v }))} label="Disable panel" />

          <ImageUploadField
            label="Banner / Main Image (static, GIF, or banner — leave empty for the default GREEN LIGHT ticket banner)"
            value={form.config.imageUrl}
            onChange={(url) => setForm((f) => ({ ...f, config: { ...f.config, imageUrl: url } }))}
            uploadUrl={`${uploadBaseUrl}/image`}
          />

          <ImageUploadField
            label="Thumbnail"
            value={form.config.thumbnailUrl}
            onChange={(url) => setForm((f) => ({ ...f, config: { ...f.config, thumbnailUrl: url } }))}
            uploadUrl={`${uploadBaseUrl}/thumbnail`}
          />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Button Text">
              <TextInput
                value={form.config.buttonText}
                onChange={(e) => setForm((f) => ({ ...f, config: { ...f.config, buttonText: e.target.value } }))}
                maxLength={80}
              />
            </Field>
            <Field label="Button Color">
              <select
                value={form.config.buttonColor}
                onChange={(e) =>
                  setForm((f) => ({ ...f, config: { ...f.config, buttonColor: e.target.value as ButtonColor } }))
                }
                className="w-full rounded-md border border-surface-border bg-surface-2 px-3 py-1.5 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              >
                {BUTTON_COLORS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Button Emoji">
            <TextInput
              value={form.config.buttonEmoji ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, config: { ...f.config, buttonEmoji: e.target.value } }))}
              placeholder="🎫"
              className="!w-20"
            />
          </Field>
        </div>
      </div>

      <div>
        <PanelPreview form={form} />
      </div>
    </div>
  )
}
