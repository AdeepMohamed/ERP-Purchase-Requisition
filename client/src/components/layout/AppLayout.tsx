import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

/**
 * AppLayout — wraps all authenticated routes.
 * Redirects to /login if no session exists.
 * Sidebar is fixed on the left (64px wide); Topbar is fixed at top.
 * Content area has matching left and top padding to avoid overlap.
 */
export default function AppLayout() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex min-h-screen bg-neutral-950">
      <Sidebar />
      <div className="flex flex-1 flex-col pl-64">
        <Topbar />
        <main className="flex-1 pt-16">
          {/* Page content scrolls independently; Sidebar and Topbar stay fixed */}
          <div className="p-6 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
