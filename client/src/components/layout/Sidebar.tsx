import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

interface NavItem {
  label: string
  to: string
  icon: string
  roles: string[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',         to: '/dashboard',        icon: '⊞', roles: ['employee', 'manager', 'admin'] },
  { label: 'My Requisitions',   to: '/requisitions',     icon: '📋', roles: ['employee', 'manager', 'admin'] },
  { label: 'New Requisition',   to: '/requisitions/new', icon: '＋', roles: ['employee'] },
  { label: 'Approval Queue',    to: '/approvals',        icon: '✓',  roles: ['manager', 'admin'] },
  { label: 'Purchase Orders',   to: '/purchase-orders',  icon: '🛒', roles: ['manager', 'admin'] },
  { label: 'Inventory',         to: '/inventory',        icon: '📦', roles: ['manager', 'admin'] },
  { label: 'Audit Log',         to: '/audit-log',        icon: '🕵',  roles: ['admin'] },
]

export default function Sidebar() {
  const { user, logout } = useAuth()

  if (!user) return null

  // Only show nav items relevant to this user's role
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role))

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-neutral-800 bg-neutral-900">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-neutral-800 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white font-bold text-sm">
          P
        </div>
        <span className="text-lg font-semibold text-white tracking-tight">ProcureFlow</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-primary-600/20 text-primary-400 border border-primary-600/30'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
              }`
            }
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-neutral-800 p-4">
        <div className="mb-3 flex items-center gap-3">
          {/* Avatar — first letter of name as monogram */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-700 text-white text-sm font-semibold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <p className="truncate text-xs text-neutral-400 capitalize">{user.role}</p>
          </div>
        </div>
        <button
          id="sidebar-logout-btn"
          onClick={logout}
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-400 hover:bg-neutral-800 hover:text-danger-400 transition-colors duration-150"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
