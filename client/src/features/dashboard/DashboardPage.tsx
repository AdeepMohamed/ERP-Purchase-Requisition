import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import api from '../../lib/api'
import { getSocket } from '../../lib/socket'
import { useAuth } from '../../hooks/useAuth'

// ── Types ──────────────────────────────────────────────────────────────────

interface DashboardStats {
  pendingApprovalsCount: number
  lowStockItems: { id: string; name: string; sku: string; quantityOnHand: number; reorderThreshold: number }[]
  recentActivity: {
    id: string
    entityType: string
    action: string
    timestamp: string
    actor: { name: string; role: string }
    metadata: any
  }[]
  poStatusCounts: Record<string, number>
}

// ── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({ label, value, color, icon }: { label: string; value: number | string; color: string; icon: string }) {
  return (
    <div className={`rounded-xl border bg-neutral-900 p-5 transition-all hover:border-neutral-600 ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}

// ── Action Badge ───────────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
  submitted:  'bg-primary-600/20 text-primary-400',
  approved:   'bg-success-700/20 text-success-500',
  rejected:   'bg-danger-600/20 text-danger-400',
  created:    'bg-neutral-700/30 text-neutral-300',
  received:   'bg-success-700/20 text-success-500',
}

// ── Dashboard Page ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((r) => r.data),
    refetchInterval: 30_000, // Poll every 30s as backup to WebSocket push
  })

  // Listen for WebSocket dashboard:refresh events — invalidate and refetch immediately
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handler = () => queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    socket.on('dashboard:refresh', handler)
    socket.on('requisition:new', handler)
    socket.on('requisition:decided', handler)

    return () => {
      socket.off('dashboard:refresh', handler)
      socket.off('requisition:new', handler)
      socket.off('requisition:decided', handler)
    }
  }, [queryClient])

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger-600/30 bg-danger-600/10 p-6 text-danger-400">
        Failed to load dashboard. Please refresh.
      </div>
    )
  }

  const pos = data?.poStatusCounts ?? {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Welcome back, {user?.name}. Here's what's happening.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending Approvals"
          value={data?.pendingApprovalsCount ?? 0}
          color="border-warning-600/30"
          icon="⏳"
        />
        <StatCard
          label="Low Stock Alerts"
          value={data?.lowStockItems.length ?? 0}
          color={data?.lowStockItems.length ? 'border-danger-600/30' : 'border-neutral-800'}
          icon="📦"
        />
        <StatCard
          label="POs In Transit"
          value={pos.sent ?? 0}
          color="border-primary-600/30"
          icon="🚚"
        />
        <StatCard
          label="POs Received"
          value={pos.received ?? 0}
          color="border-success-700/30"
          icon="✅"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Low stock alerts */}
        {(data?.lowStockItems.length ?? 0) > 0 && (
          <div className="rounded-xl border border-danger-600/20 bg-neutral-900 p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-danger-400">
              ⚠ Low Stock Alerts
            </h2>
            <div className="space-y-3">
              {data!.lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg bg-neutral-800/50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{item.name}</p>
                    <p className="text-xs text-neutral-500">SKU: {item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-danger-400">{item.quantityOnHand}</p>
                    <p className="text-xs text-neutral-500">of {item.reorderThreshold} min</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent activity */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Recent Activity
          </h2>
          {data?.recentActivity.length === 0 ? (
            <p className="text-sm text-neutral-500">No recent activity.</p>
          ) : (
            <div className="space-y-3">
              {data!.recentActivity.map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] ?? 'bg-neutral-700/30 text-neutral-400'}`}
                  >
                    {log.action}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-neutral-300">
                      <span className="font-medium text-white">{log.actor.name}</span>{' '}
                      {log.action} a {log.entityType.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
