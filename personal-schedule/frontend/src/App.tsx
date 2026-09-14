import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import Dashboard from './pages/Dashboard'
import SchedulePage from './pages/Schedule'
import CalendarPage from './pages/Calendar'
import Subjects from './pages/Subjects'
import WorkPage from './pages/Work'
import SettingsPage from './pages/Settings'
import CashBalancePage from './pages/CashBalance'
import Login from './pages/Login'
import { AuthProvider, useAuth } from './context/AuthContext'
import './index.css'

function AuthLoading() {
  return (
    <div className="auth-loading" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
      Đang tải...
    </div>
  )
}

// Bọc các trang CẦN đăng nhập (không dùng cho Cash balance)
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <AuthLoading />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <AuthLoading />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          {/*
            AppLayout hiển thị cho mọi người; từng trang tự yêu cầu đăng nhập,
            RIÊNG /cash-balance không cần đăng nhập.
          */}
          <Route path="/" element={<AppLayout />}>
            <Route index element={<RequireAuth><Navigate to="/dashboard" replace /></RequireAuth>} />
            <Route path="dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="schedule" element={<RequireAuth><SchedulePage /></RequireAuth>} />
            <Route path="calendar" element={<RequireAuth><CalendarPage /></RequireAuth>} />
            <Route path="subjects" element={<RequireAuth><Subjects /></RequireAuth>} />
            <Route path="work" element={<RequireAuth><WorkPage /></RequireAuth>} />
            <Route path="settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
            {/* Cash balance: KHÔNG cần đăng nhập */}
            <Route path="cash-balance" element={<CashBalancePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
