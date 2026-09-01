import { useEffect, useState } from 'react'
import { api, ApiError } from '../../lib/api'
import { useServerId } from '../../context/ServerContext'
import { TextInput } from '../messages/components/FormControls'

interface Member {
  id: string
  username: string
  nick: string | null
  avatar: string | null
  joinedAt: string
  roles: string[]
}

export function Members() {
  const serverId = useServerId()
  const [members, setMembers] = useState<Member[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoadError(null)
    api
      .get<{ members: Member[] }>(`/servers/${serverId}/members`)
      .then((res) => setMembers(res.members))
      .catch((err) =>
        setLoadError(
          err instanceof ApiError && err.status === 404
            ? 'GREEN LIGHT is not installed on this server yet.'
            : 'Could not load members. Try refreshing.',
        ),
      )
  }, [serverId])

  const filtered = members?.filter(
    (m) =>
      !search ||
      m.username.toLowerCase().includes(search.toLowerCase()) ||
      m.nick?.toLowerCase().includes(search.toLowerCase()) ||
      m.id === search,
  )

  if (loadError) {
    return <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-red-400">{loadError}</div>
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold tracking-tight text-text-primary">Members</h1>

      <div className="mb-4">
        <TextInput
          placeholder="Search by username or ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {!members && <p className="text-sm text-text-secondary">Loading…</p>}
      {members && filtered?.length === 0 && <p className="text-sm text-text-muted">No members found.</p>}

      <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border text-left text-text-secondary">
              <th className="px-4 py-2 font-medium">Member</th>
              <th className="px-4 py-2 font-medium">Joined</th>
              <th className="px-4 py-2 font-medium">Roles</th>
            </tr>
          </thead>
          <tbody>
            {filtered?.map((m) => (
              <tr key={m.id} className="border-b border-surface-border last:border-0">
                <td className="px-4 py-2">
                  <div className="text-text-primary">{m.nick ?? m.username}</div>
                  <div className="text-xs text-text-muted">{m.id}</div>
                </td>
                <td className="px-4 py-2 text-text-secondary">{new Date(m.joinedAt).toLocaleDateString()}</td>
                <td className="px-4 py-2 text-text-secondary">{m.roles.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
