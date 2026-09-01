import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

interface Server {
  id: string
  name: string
  icon: string | null
  botInstalled: boolean
  inviteUrl: string
}

export function ServerSelect() {
  const [servers, setServers] = useState<Server[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    api
      .get<{ servers: Server[] }>('/servers')
      .then((res) => setServers(res.servers))
      .catch(() => setError('Could not load your servers. Try refreshing.'))
  }, [])

  return (
    <div className="min-h-screen bg-surface-0 px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-text-primary">
          Select a server
        </h1>
        <p className="mb-8 text-sm text-text-secondary">
          Choose a server to manage, or add GREEN LIGHT to a new one.
        </p>

        {error && (
          <div className="mb-6 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {!servers && !error && (
          <div className="text-sm text-text-secondary">Loading your servers…</div>
        )}

        {servers && servers.length === 0 && (
          <div className="rounded-lg border border-surface-border bg-surface-1 p-8 text-center text-text-secondary">
            No manageable servers found. You need the "Manage Server" permission on a Discord server.
          </div>
        )}

        <div className="flex flex-col gap-2">
          {servers?.map((server) => (
            <div
              key={server.id}
              className="flex items-center justify-between rounded-lg border border-surface-border bg-surface-1 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                {server.icon ? (
                  <img src={server.icon} alt="" className="h-9 w-9 rounded-full" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-sm font-medium text-text-secondary">
                    {server.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="font-medium text-text-primary">{server.name}</span>
              </div>

              {server.botInstalled ? (
                <button
                  onClick={() => navigate(`/${server.id}/dashboard`)}
                  className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-semibold text-black transition-colors hover:bg-brand-400"
                >
                  Manage
                </button>
              ) : (
                <a
                  href={server.inviteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-brand-500/40 px-3 py-1.5 text-sm font-medium text-brand-400 transition-colors hover:bg-brand-500/10"
                >
                  Add bot
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
