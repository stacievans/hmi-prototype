import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import TeleopPage from './pages/TeleopPage.jsx'
import CollectionPage from './pages/CollectionPage.jsx'
import TaskDetailPage from './pages/TaskDetailPage.jsx'
import WorkstationPage from './pages/WorkstationPage.jsx'
import DevicesPage from './pages/DevicesPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<TeleopPage />} />
        <Route path="collection" element={<CollectionPage />} />
        <Route path="collection/task/:taskId" element={<TaskDetailPage />} />
        <Route path="collection/workstation/:taskId" element={<WorkstationPage />} />
        <Route path="devices" element={<DevicesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
