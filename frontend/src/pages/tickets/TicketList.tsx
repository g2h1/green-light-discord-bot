import type { Ticket } from './types'

const STATUS_STYLES: Record<Ticket['status'], string> = {
  open: 'bg-brand-500/15 text-brand-400',
  claimed: 'bg-yellow-500/15 text-yellow-400',
  closed: 'bg-surface-3 text-text-muted',
}

export function TicketList({
  tickets,
  activeId,
  onSelect,
}: {
  tickets: Ticket[] | null
  activeId: string | null
  onSelect: (t: Ticket) => void
}) {
  if (!tickets) return <p className="text-sm text-text-secondary">Loading tickets…</p>
  if (tickets.length === 0) return <p className="text-sm text-text-muted">No tickets yet.</p>

  return (
    <div className="flex flex-col gap-1.5">
      {tickets.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t)}
          className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
            activeId === t.id
              ? 'border-brand-500/40 bg-brand-500/10'
              : 'border-surface-border bg-surface-2 hover:border-surface-3'
          }`}
        >
          <div className="min-w-0">
            <div className="truncate text-text-primary">{t.category}</div>
            <div className="text-xs text-text-muted">{new Date(t.created_at).toLocaleString()}</div>
          </div>
          <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${STATUS_STYLES[t.status]}`}>{t.status}</span>
        </button>
      ))}
    </div>
  )
}
