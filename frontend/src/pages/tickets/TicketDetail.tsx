import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { Button, TextInput } from '../messages/components/FormControls'
import type { Ticket, TicketMessage, TicketRating } from './types'

export function TicketDetail({
  serverId,
  ticket,
  onChanged,
}: {
  serverId: string
  ticket: Ticket
  onChanged: (t: Ticket) => void
}) {
  const [messages, setMessages] = useState<TicketMessage[] | null>(null)
  const [rating, setRating] = useState<TicketRating | null>(null)
  const [busy, setBusy] = useState(false)
  const [newMember, setNewMember] = useState('')
  const [renameTo, setRenameTo] = useState('')

  useEffect(() => {
    setMessages(null)
    setRating(null)
    api
      .get<{ ticket: Ticket; messages: TicketMessage[]; rating: TicketRating | null }>(
        `/servers/${serverId}/tickets/${ticket.id}`,
      )
      .then((res) => {
        setMessages(res.messages)
        setRating(res.rating)
      })
  }, [serverId, ticket.id])

  async function runAction(fn: () => Promise<Ticket | void>) {
    setBusy(true)
    try {
      const updated = await fn()
      if (updated) onChanged(updated)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-surface-border bg-surface-1 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">
          {ticket.category} — #{ticket.discord_channel_id}
        </h3>
        <span className="text-xs text-text-muted">{ticket.status}</span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {ticket.status !== 'closed' && (
          <>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() =>
                runAction(async () => {
                  const { ticket: t } = await api.post<{ ticket: Ticket }>(
                    `/servers/${serverId}/tickets/${ticket.id}/claim`,
                  )
                  return t
                })
              }
            >
              Claim
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={busy}
              onClick={() =>
                runAction(async () => {
                  const { ticket: t } = await api.post<{ ticket: Ticket }>(
                    `/servers/${serverId}/tickets/${ticket.id}/close`,
                  )
                  return t
                })
              }
            >
              Close
            </Button>
          </>
        )}
        {ticket.status === 'closed' && (
          <>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() =>
                runAction(async () => {
                  const { ticket: t } = await api.post<{ ticket: Ticket }>(
                    `/servers/${serverId}/tickets/${ticket.id}/reopen`,
                  )
                  return t
                })
              }
            >
              Reopen
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={busy}
              onClick={() =>
                runAction(async () => {
                  await api.delete(`/servers/${serverId}/tickets/${ticket.id}`)
                })
              }
            >
              Delete
            </Button>
          </>
        )}
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="flex gap-1.5">
          <TextInput
            placeholder="Discord user ID to add"
            value={newMember}
            onChange={(e) => setNewMember(e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            disabled={!newMember || busy}
            onClick={() =>
              runAction(async () => {
                await api.post(`/servers/${serverId}/tickets/${ticket.id}/members`, {
                  discordUserId: newMember,
                  action: 'add',
                })
                setNewMember('')
              })
            }
          >
            Add
          </Button>
        </div>
        <div className="flex gap-1.5">
          <TextInput
            placeholder="Rename channel to…"
            value={renameTo}
            onChange={(e) => setRenameTo(e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            disabled={!renameTo || busy}
            onClick={() =>
              runAction(async () => {
                await api.patch(`/servers/${serverId}/tickets/${ticket.id}`, { name: renameTo })
                setRenameTo('')
              })
            }
          >
            Rename
          </Button>
        </div>
      </div>

      {rating && (
        <div className="mb-3 text-sm text-brand-400">
          Rated {'★'.repeat(rating.stars)}
          {'☆'.repeat(5 - rating.stars)}
        </div>
      )}

      <div className="max-h-80 overflow-y-auto rounded-md border border-surface-border bg-surface-2 p-3">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Transcript</div>
        {!messages && <p className="text-sm text-text-secondary">Loading…</p>}
        {messages && messages.length === 0 && (
          <p className="text-sm text-text-muted">No messages logged yet.</p>
        )}
        <div className="flex flex-col gap-1.5">
          {messages?.map((m) => (
            <div key={m.id} className="text-sm">
              <span className="font-medium text-text-primary">{m.author_username}</span>
              <span className="ml-2 text-xs text-text-muted">{new Date(m.created_at).toLocaleTimeString()}</span>
              <div className="text-text-secondary">{m.content}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
