import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import Dashboard from './pages/Dashboard'
import SchedulePage from './pages/Schedule'
import CalendarPage from './pages/Calendar'
import Subjects from './pages/Subjects'
import WorkPage from './pages/Work'
import SettingsPage from './pages/Settings'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="subjects" element={<Subjects />} />
          <Route path="work" element={<WorkPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
