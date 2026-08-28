import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/AppLayout.css'

const links = [
  { path: '/dashboard', label: '📊 Dashboard' },
  { path: '/schedule', label: '📅 Schedule' },
  { path: '/subjects', label: '📚 Subjects' },
  { path: '/work', label: '💼 Work' },
  { path: '/cash-balance', label: '💰 Cash balance' },
  { path: '/settings', label: '⚙️ Settings' },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const displayName = user ? [user.last_name, user.first_name].filter(Boolean).join(' ') || user.email : ''
  const avatarText = (displayName || user?.email || '?').trim().charAt(0).toUpperCase()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-layout">
      <div className="app-container">
        <aside className="sidebar">
          <div className="sidebar-header">
            <p className="sidebar-label">Personal Schedule Manager</p>
            <h1 className="sidebar-title">LOCAL planner</h1>
          </div>
          <nav className="sidebar-nav">
            {links.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className="nav-link"
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-user">
            <div className="sidebar-user__avatar">{avatarText}</div>
            <div className="sidebar-user__info">
              <span className="sidebar-user__name">{displayName || user?.email}</span>
              <span className="sidebar-user__role">{user?.role === 'admin' ? 'Quản trị' : 'Thành viên'}</span>
            </div>
            <button type="button" className="sidebar-user__logout" onClick={handleLogout} title="Đăng xuất">
              ⎋
            </button>
          </div>
        </aside>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
