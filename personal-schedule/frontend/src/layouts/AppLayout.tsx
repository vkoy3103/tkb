import { NavLink, Outlet } from 'react-router-dom'
import '../styles/AppLayout.css'

const links = [
  { path: '/dashboard', label: '📊 Dashboard' },
  { path: '/schedule', label: '📅 Schedule' },
  { path: '/subjects', label: '📚 Subjects' },
  { path: '/work', label: '💼 Work' },
  { path: '/statistics', label: '📈 Statistics' },
  { path: '/settings', label: '⚙️ Settings' },
]

export default function AppLayout() {
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
        </aside>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
