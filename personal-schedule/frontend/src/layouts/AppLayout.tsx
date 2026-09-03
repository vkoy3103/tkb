import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/AppLayout.css'

const links = [
  { path: '/dashboard', icon: '📊', label: 'Dashboard', short: 'Trang chủ' },
  { path: '/schedule', icon: '📅', label: 'Schedule', short: 'Lịch' },
  { path: '/subjects', icon: '📚', label: 'Subjects', short: 'Môn' },
  { path: '/work', icon: '💼', label: 'Work', short: 'Work' },
  { path: '/cash-balance', icon: '💰', label: 'Cash balance', short: 'Két' },
  { path: '/settings', icon: '⚙️', label: 'Settings', short: 'Cài đặt' },
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
        {/* Sidebar trái — chỉ hiện trên màn hình lớn (desktop) */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <p className="sidebar-label">Personal Schedule Manager</p>
            <h1 className="sidebar-title">LOCAL planner</h1>
          </div>
          <nav className="sidebar-nav">
            {links.map((link) => (
              <NavLink key={link.path} to={link.path} className="nav-link">
                <span className="nav-link__icon">{link.icon}</span>
                <span className="nav-link__label">{link.label}</span>
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

        {/* Thanh trên — chỉ hiện trên màn hình nhỏ */}
        <header className="m-topbar">
          <span className="m-topbar__brand">🗓️ LOCAL planner</span>
          <div className="m-topbar__actions">
            <span className="m-topbar__avatar">{avatarText}</span>
            <button type="button" className="m-topbar__logout" onClick={handleLogout} title="Đăng xuất">
              ⎋
            </button>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>

        {/* Thanh điều hướng dưới — chỉ hiện trên màn hình nhỏ */}
        <nav className="m-nav">
          {links.map((link) => (
            <NavLink key={link.path} to={link.path} className="m-nav__item">
              <span className="m-nav__icon">{link.icon}</span>
              <span className="m-nav__label">{link.short}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
