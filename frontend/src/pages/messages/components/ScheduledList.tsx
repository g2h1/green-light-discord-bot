import type { ScheduledMessage } from '../types'

const STATUS_STYLES: Record<ScheduledMessage['status'], string> = {
  pending: 'bg-brand-500/15 text-brand-400',
  sent: 'bg-surface-3 text-text-secondary',
  failed: 'bg-red-500/15 text-red-400',
  cancelled: 'bg-surface-3 text-text-muted',
}

export function ScheduledList({
  items,
  channelName,
  onCancel,
}: {
  items: ScheduledMessage[] | null
  channelName: (channelId: string) => string
  onCancel: (id: string) => void
}) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-1 p-4">
      <h3 className="mb-3 text-sm font-semibold text-text-primary">Scheduled messages</h3>

      {!items && <p className="text-sm text-text-secondary">Loading…</p>}
      {items && items.length === 0 && (
        <p className="text-sm text-text-muted">Nothing scheduled yet.</p>
      )}

      <div className="flex flex-col gap-1.5">
        {items?.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between gap-2 rounded-md border border-surface-border bg-surface-2 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-text-primary">
                #{channelName(m.channel_id)} — {m.content || m.embed?.title || '(embed)'}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
                <span>{new Date(m.send_at).toLocaleString()}</span>
                {m.recurrence !== 'none' && <span>· {m.recurrence}</span>}
                <span className={`rounded px-1.5 py-0.5 ${STATUS_STYLES[m.status]}`}>{m.status}</span>
              </div>
              {m.status === 'failed' && m.last_error && (
                <div className="mt-0.5 text-xs text-red-400">{m.last_error}</div>
              )}
            </div>
            {m.status === 'pending' && (
              <button
                type="button"
                onClick={() => onCancel(m.id)}
                className="shrink-0 text-xs text-red-400 hover:underline"
              >
                Cancel
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
