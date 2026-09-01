import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { ServerSelect } from './pages/ServerSelect'
import { Dashboard } from './pages/Dashboard'
import { Messages } from './pages/messages/Messages'
import { Tickets } from './pages/tickets/Tickets'
import { PanelEditor } from './pages/tickets/PanelEditor'
import { Moderation } from './pages/moderation/Moderation'
import { Logs } from './pages/logs/Logs'
import { Roles } from './pages/roles/Roles'
import { Channels } from './pages/channels/Channels'
import { Giveaways } from './pages/giveaways/Giveaways'
import { Automations } from './pages/automations/Automations'
import { Settings } from './pages/settings/Settings'
import { Members } from './pages/members/Members'
import { Analytics } from './pages/analytics/Analytics'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/servers" element={<ServerSelect />} />
        <Route path="/:serverId" element={<Layout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="messages" element={<Messages />} />
          <Route path="tickets" element={<Tickets />} />
          <Route path="tickets/panels/:panelId" element={<PanelEditor />} />
          <Route path="moderation" element={<Moderation />} />
          <Route path="logs" element={<Logs />} />
          <Route path="roles" element={<Roles />} />
          <Route path="channels" element={<Channels />} />
          <Route path="giveaways" element={<Giveaways />} />
          <Route path="automations" element={<Automations />} />
          <Route path="settings" element={<Settings />} />
          <Route path="members" element={<Members />} />
          <Route path="analytics" element={<Analytics />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/servers" replace />} />
      <Route path="*" element={<Navigate to="/servers" replace />} />
    </Routes>
  )
}
