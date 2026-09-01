import type { Channel } from '../../messages/types'
import { Field, TextInput, Toggle } from '../../messages/components/FormControls'
import type { PanelFormState, TranscriptBehavior } from './types'

interface RoleOption {
  id: string
  name: string
}

type Setter = (updater: (f: PanelFormState) => PanelFormState) => void

function MultiRoleSelect({
  roles,
  selected,
  onChange,
}: {
  roles: RoleOption[] | null
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap gap-1.5">
        {selected.map((id) => (
          <span key={id} className="flex items-center gap-1 rounded bg-surface-3 px-2 py-0.5 text-xs text-text-secondary">
            {roles?.find((r) => r.id === id)?.name ?? id}
            <button onClick={() => onChange(selected.filter((r) => r !== id))} className="text-red-400">
              ×
            </button>
          </span>
        ))}
      </div>
      <select
        value=""
        onChange={(e) => e.target.value && onChange([...selected, e.target.value])}
        className="w-full rounded-md border border-surface-border bg-surface-2 px-2 py-1 text-xs text-text-primary"
      >
        <option value="">+ Add a role…</option>
        {roles?.filter((r) => !selected.includes(r.id)).map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
    </div>
  )
}

export function RoutingSection({
  form,
  setForm,
  channels,
  categories,
  roles,
}: {
  form: PanelFormState
  setForm: Setter
  channels: Channel[] | null
  categories: Channel[] | null
  roles: RoleOption[] | null
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Support Team (role)">
          <select
            value={form.config.supportTeamRoleId ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, config: { ...f.config, supportTeamRoleId: e.target.value } }))}
            className="w-full rounded-md border border-surface-border bg-surface-2 px-3 py-1.5 text-sm text-text-primary"
          >
            <option value="">None</option>
            {roles?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ticket Category (Discord)">
          <select
            value={form.config.ticketCategoryId ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, config: { ...f.config, ticketCategoryId: e.target.value } }))}
            className="w-full rounded-md border border-surface-border bg-surface-2 px-3 py-1.5 text-sm text-text-primary"
          >
            <option value="">None</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Knowledge Base Categories (comma-separated)">
        <TextInput
          defaultValue={form.config.knowledgeBaseCategories.join(', ')}
          onBlur={(e) =>
            setForm((f) => ({
              ...f,
              config: { ...f.config, knowledgeBaseCategories: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) },
            }))
          }
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Awaiting Response Category">
          <select
            value={form.config.awaitingResponseCategoryId ?? ''}
            onChange={(e) =>
              setForm((f) => ({ ...f, config: { ...f.config, awaitingResponseCategoryId: e.target.value } }))
            }
            className="w-full rounded-md border border-surface-border bg-surface-2 px-3 py-1.5 text-sm text-text-primary"
          >
            <option value="">None</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Transcript Channel">
          <select
            value={form.config.transcriptChannelId ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, config: { ...f.config, transcriptChannelId: e.target.value } }))}
            className="w-full rounded-md border border-surface-border bg-surface-2 px-3 py-1.5 text-sm text-text-primary"
          >
            <option value="">None</option>
            {channels?.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Mention On Open">
        <MultiRoleSelect
          roles={roles}
          selected={form.config.mentionOnOpenRoleIds}
          onChange={(ids) => setForm((f) => ({ ...f, config: { ...f.config, mentionOnOpenRoleIds: ids } }))}
        />
      </Field>

      <Field label="Mention Behaviour">
        <select
          value={form.config.mentionBehaviour}
          onChange={(e) =>
            setForm((f) => ({ ...f, config: { ...f.config, mentionBehaviour: e.target.value as typeof f.config.mentionBehaviour } }))
          }
          className="w-full rounded-md border border-surface-border bg-surface-2 px-3 py-1.5 text-sm text-text-primary"
        >
          <option value="none">Don't mention</option>
          <option value="mention">Mention and keep</option>
          <option value="ping_and_remove">Ping then remove mention</option>
        </select>
      </Field>

      <Toggle
        checked={form.config.enableTranscript}
        onChange={(v) => setForm((f) => ({ ...f, config: { ...f.config, enableTranscript: v } }))}
        label="Enable transcript"
      />
    </div>
  )
}

export function BehaviorSection({ form, setForm }: { form: PanelFormState; setForm: Setter }) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Ticket naming format ({user}, {username}, {server}, {created_at})">
        <TextInput
          value={form.config.namingFormat}
          onChange={(e) => setForm((f) => ({ ...f, config: { ...f.config, namingFormat: e.target.value } }))}
        />
      </Field>

      <Field label="Maximum open tickets per user">
        <TextInput
          type="number"
          min={1}
          max={20}
          value={form.config.maxOpenTicketsPerUser}
          onChange={(e) =>
            setForm((f) => ({ ...f, config: { ...f.config, maxOpenTicketsPerUser: Number(e.target.value) } }))
          }
          className="!w-24"
        />
      </Field>

      <Toggle
        checked={form.config.allowReopen}
        onChange={(v) => setForm((f) => ({ ...f, config: { ...f.config, allowReopen: v } }))}
        label="Allow users to reopen a closed ticket"
      />
      <Toggle
        checked={form.config.allowStaffClose}
        onChange={(v) => setForm((f) => ({ ...f, config: { ...f.config, allowStaffClose: v } }))}
        label="Allow staff to close tickets"
      />
      <Toggle
        checked={form.config.deleteOnClose}
        onChange={(v) => setForm((f) => ({ ...f, config: { ...f.config, deleteOnClose: v } }))}
        label="Delete channel on close"
      />
      <Toggle
        checked={form.config.archiveInsteadOfDelete}
        onChange={(v) => setForm((f) => ({ ...f, config: { ...f.config, archiveInsteadOfDelete: v } }))}
        label="Archive channel instead of deleting"
      />

      <Field label="Transcript behavior">
        <select
          value={form.config.transcriptBehavior}
          onChange={(e) =>
            setForm((f) => ({ ...f, config: { ...f.config, transcriptBehavior: e.target.value as TranscriptBehavior } }))
          }
          className="w-full rounded-md border border-surface-border bg-surface-2 px-3 py-1.5 text-sm text-text-primary"
        >
          <option value="channel">Post to transcript channel</option>
          <option value="dm">DM the ticket opener</option>
          <option value="none">Don't generate a transcript</option>
        </select>
      </Field>
    </div>
  )
}

export function ClaimCloseSection({ form, setForm, roles }: { form: PanelFormState; setForm: Setter; roles: RoleOption[] | null }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <Toggle
          checked={form.config.enableClaim}
          onChange={(v) => setForm((f) => ({ ...f, config: { ...f.config, enableClaim: v } }))}
          label="Enable Claim"
        />
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Field label="Claim button text">
            <TextInput
              value={form.config.claimButtonText}
              onChange={(e) => setForm((f) => ({ ...f, config: { ...f.config, claimButtonText: e.target.value } }))}
            />
          </Field>
          <Field label="Emoji">
            <TextInput
              value={form.config.claimButtonEmoji ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, config: { ...f.config, claimButtonEmoji: e.target.value } }))}
              className="!w-16"
            />
          </Field>
        </div>
        <Field label="Claim permissions (roles that can claim; empty = anyone)">
          <MultiRoleSelect
            roles={roles}
            selected={form.config.claimPermissionRoleIds}
            onChange={(ids) => setForm((f) => ({ ...f, config: { ...f.config, claimPermissionRoleIds: ids } }))}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-3">
        <Toggle
          checked={form.config.enableClose}
          onChange={(v) => setForm((f) => ({ ...f, config: { ...f.config, enableClose: v } }))}
          label="Enable Close"
        />
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Field label="Close button text">
            <TextInput
              value={form.config.closeButtonText}
              onChange={(e) => setForm((f) => ({ ...f, config: { ...f.config, closeButtonText: e.target.value } }))}
            />
          </Field>
          <Field label="Emoji">
            <TextInput
              value={form.config.closeButtonEmoji ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, config: { ...f.config, closeButtonEmoji: e.target.value } }))}
              className="!w-16"
            />
          </Field>
        </div>
      </div>
    </div>
  )
}
