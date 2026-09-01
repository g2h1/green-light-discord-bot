import { createContext, useContext, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'

const ServerContext = createContext<string | null>(null)

export function ServerProvider({ children }: { children: ReactNode }) {
  const { serverId } = useParams<{ serverId: string }>()
  return <ServerContext.Provider value={serverId ?? null}>{children}</ServerContext.Provider>
}

export function useServerId() {
  const serverId = useContext(ServerContext)
  if (!serverId) throw new Error('useServerId must be used within ServerProvider, under a :serverId route')
  return serverId
}
