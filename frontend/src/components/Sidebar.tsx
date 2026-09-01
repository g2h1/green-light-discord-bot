import { NavLink } from 'react-router-dom'
import { useServerId } from '../context/ServerContext'

const NAV_ITEMS = [
  { to: 'dashboard', label: 'Dashboard' },
  { to: 'messages', label: 'Messages' },
  { to: 'tickets', label: 'Tickets' },
  { to: 'members', label: 'Members' },
  { to: 'moderation', label: 'Moderation' },
  { to: 'roles', label: 'Roles' },
  { to: 'channels', label: 'Channels' },
  { to: 'giveaways', label: 'Giveaways' },
  { to: 'automations', label: 'Automations' },
  { to: 'logs', label: 'Logs' },
  { to: 'analytics', label: 'Analytics' },
  { to: 'settings', label: 'Settings' },
]

export function Sidebar() {
  const serverId = useServerId()

  return (
    <aside className="w-60 shrink-0 border-r border-surface-border bg-surface-1 p-4">
      <div className="mb-6 flex items-center gap-2 px-2">
        <span className="h-2 w-2 rounded-full bg-brand-500 shadow-[0_0_8px_theme(colors.brand.500)]" />
        <span className="text-lg font-semibold tracking-tight text-text-primary">
          GREEN LIGHT
        </span>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={`/${serverId}/${item.to}`}
            className={({ isActive }) =>
              `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-500/15 text-brand-400 ring-1 ring-inset ring-brand-500/30'
                  : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <NavLink
        to="/servers"
        className="mt-4 block rounded-md px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text-secondary"
      >
        ← Switch server
      </NavLink>
    </aside>
  )
}
