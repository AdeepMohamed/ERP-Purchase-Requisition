import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'

interface AuditLogEntry {
  id: string
  entityType: string
  entityId: string
  action: string
  timestamp: string
  metadata: any
  actor: { name: string; role: string; department: string }
}

const ACTION_COLORS: Record<string, string> = {
  submitted:                  'bg-primary-600/20 text-primary-400',
  approved:                   'bg-success-700/20 text-success-500',
  rejected:                   'bg-danger-600/20 text-danger-400',
  created:                    'bg-neutral-700/30 text-neutral-300',
  status_changed_to_sent:     'bg-primary-600/20 text-primary-400',
  status_changed_to_received: 'bg-success-700/20 text-success-500',
  status_changed_to_cancelled:'bg-danger-600/20 text-danger-400',
}

export default function AuditLogPage() {
  const { data, isLoading } = useQuery<AuditLogEntry[]>({
    queryKey: ['audit-log'],
    queryFn: () => api.get('/audit-log').then((r) => r.data),
    refetchInterval: 60_000,
  })

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Audit Log</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Immutable record of all system actions. Read-only — no entries can be edited or deleted.
        </p>
      </div>

      {/* "Insert-only" notice */}
      <div className="rounded-xl border border-primary-600/20 bg-primary-600/5 px-5 py-4 text-sm text-primary-400">
        🔒 This log is append-only. The API has no update or delete endpoints for audit entries — this mirrors financial audit compliance requirements.
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-800/50">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Timestamp</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Actor</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Action</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Entity</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {!data?.length ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-neutral-500">
                  No audit log entries yet.
                </td>
              </tr>
            ) : (
              data.map((log) => (
                <tr key={log.id} className="transition-colors hover:bg-neutral-800/20">
                  <td className="px-6 py-4 text-xs text-neutral-500 tabular-nums whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-white">{log.actor.name}</p>
                    <p className="text-xs capitalize text-neutral-500">{log.actor.role}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] ?? 'bg-neutral-700/30 text-neutral-400'}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-neutral-400 capitalize">
                    {log.entityType.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 text-xs text-neutral-500 max-w-xs truncate">
                    {log.metadata ? JSON.stringify(log.metadata) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
