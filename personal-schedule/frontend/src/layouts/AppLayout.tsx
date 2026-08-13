import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { path: '/dashboard', label: '📊 Dashboard' },
  { path: '/calendar', label: '📅 Calendar' },
  { path: '/subjects', label: '📚 Subjects' },
  { path: '/statistics', label: '📈 Statistics' },
  { path: '/settings', label: '⚙️ Settings' },
]

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1400px] gap-5 p-4 md:p-6">
        <aside className="w-full max-w-[280px] rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Personal Schedule Manager</p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900">LOCAL planner</h1>
          </div>
          <nav className="space-y-2">
            {links.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive ? 'bg-slate-900 text-white shadow' : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
