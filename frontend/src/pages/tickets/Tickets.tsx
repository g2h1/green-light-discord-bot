import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { useServerId } from '../../context/ServerContext'
import { Button } from '../messages/components/FormControls'
import { TicketList } from './TicketList'
import { TicketDetail } from './TicketDetail'
import type { Ticket, TicketPanel } from './types'

const STATUS_TABS = ['open', 'claimed', 'closed'] as const

export function Tickets() {
  const serverId = useServerId()
  const [panels, setPanels] = useState<TicketPanel[] | null>(null)
  const [tickets, setTickets] = useState<Ticket[] | null>(null)
  const [statusTab, setStatusTab] = useState<(typeof STATUS_TABS)[number]>('open')
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    setLoadError(null)
    setSelected(null)
    api
      .get<{ panels: TicketPanel[] }>(`/servers/${serverId}/tickets/panels`)
      .then((p) => setPanels(p.panels))
      .catch((err) =>
        setLoadError(
          err instanceof ApiError && err.status === 404
            ? 'GREEN LIGHT is not installed on this server yet.'
            : 'Could not load ticket data. Try refreshing.',
        ),
      )
  }, [serverId])

  useEffect(() => {
    setTickets(null)
    api
      .get<{ tickets: Ticket[] }>(`/servers/${serverId}/tickets?status=${statusTab}`)
      .then((res) => setTickets(res.tickets))
      .catch(() => setTickets([]))
  }, [serverId, statusTab])

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-red-400">{loadError}</div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Tickets</h1>
        <Link to={`/${serverId}/tickets/panels/new`}>
          <Button type="button">+ New panel</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-surface-border bg-surface-1 p-4">
            <h3 className="mb-2 text-sm font-semibold text-text-primary">Panels</h3>
            {!panels && <p className="text-sm text-text-secondary">Loading…</p>}
            {panels && panels.length === 0 && (
              <p className="text-sm text-text-muted">No panels yet — create one to let members open tickets.</p>
            )}
            <div className="flex flex-col gap-1.5">
              {panels?.map((p) => (
                <Link
                  key={p.id}
                  to={`/${serverId}/tickets/panels/${p.id}`}
                  className="flex items-center justify-between rounded-md border border-surface-border bg-surface-2 px-3 py-2 text-sm text-text-secondary transition-colors hover:border-brand-500/40 hover:text-text-primary"
                >
                  <span>{p.title}</span>
                  {p.disabled && (
                    <span className="rounded bg-surface-3 px-1.5 py-0.5 text-xs text-text-muted">Disabled</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-surface-border bg-surface-1 p-4">
            <div className="mb-3 flex gap-1 border-b border-surface-border">
              {STATUS_TABS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusTab(s)}
                  className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium capitalize transition-colors ${
                    statusTab === s
                      ? 'border-brand-500 text-brand-400'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <TicketList tickets={tickets} activeId={selected?.id ?? null} onSelect={setSelected} />
          </div>

          {selected && (
            <TicketDetail
              serverId={serverId}
              ticket={selected}
              onChanged={(t) => {
                setSelected(t)
                setTickets((prev) => prev?.map((x) => (x.id === t.id ? t : x)) ?? null)
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
