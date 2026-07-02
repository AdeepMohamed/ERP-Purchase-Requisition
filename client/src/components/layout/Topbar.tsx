import { useLocation } from 'react-router-dom'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useRequisitionQueue } from '../../hooks/useRequisitionQueue'

// Maps route paths to human-readable breadcrumb labels
const BREADCRUMBS: Record<string, string> = {
  '/dashboard':        'Dashboard',
  '/requisitions':     'Requisitions',
  '/requisitions/new': 'New Requisition',
  '/approvals':        'Approval Queue',
  '/purchase-orders':  'Purchase Orders',
  '/inventory':        'Inventory',
  '/audit-log':        'Audit Log',
}

export default function Topbar() {
  const { pathname } = useLocation()
  const isOnline = useOnlineStatus()
  const { pendingCount, isSyncing } = useRequisitionQueue()

  // Build breadcrumb segments from path
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumb = segments.map((seg, i) => {
    const path = '/' + segments.slice(0, i + 1).join('/')
    return BREADCRUMBS[path] ?? seg
  })

  return (
    <header className="fixed left-64 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-800 bg-neutral-900/80 px-6 backdrop-blur-sm">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb">
        <ol className="flex items-center gap-2 text-sm">
          {breadcrumb.map((crumb, i) => (
            <li key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-neutral-600">/</span>}
              <span className={i === breadcrumb.length - 1 ? 'text-white font-medium' : 'text-neutral-400'}>
                {crumb}
              </span>
            </li>
          ))}
        </ol>
      </nav>

      {/* Status indicators */}
      <div className="flex items-center gap-3">
        {/* Offline banner — non-blocking, persistent while offline */}
        {!isOnline && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-full border border-warning-600/40 bg-warning-600/10 px-3 py-1.5 text-xs font-medium text-warning-500 animate-pulse-soft"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-warning-500"></span>
            Offline
          </div>
        )}

        {/* Syncing indicator — shown when offline queue is uploading */}
        {isOnline && isSyncing && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-full border border-primary-600/40 bg-primary-600/10 px-3 py-1.5 text-xs font-medium text-primary-400"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary-400 animate-pulse"></span>
            Syncing {pendingCount} queued…
          </div>
        )}

        {/* Queued items badge — shown when online but items remain pending */}
        {isOnline && !isSyncing && pendingCount > 0 && (
          <div className="flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-400">
            {pendingCount} queued
          </div>
        )}

        {/* Online indicator */}
        {isOnline && !isSyncing && (
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <span className="h-1.5 w-1.5 rounded-full bg-success-500"></span>
            Live
          </div>
        )}
      </div>
    </header>
  )
}
