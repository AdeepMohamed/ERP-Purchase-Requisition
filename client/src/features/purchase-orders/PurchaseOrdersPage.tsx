import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'

interface PurchaseOrder {
  id: string
  poNumber: string
  status: string
  supplier: string | null
  unitCostPaise: number | null
  totalCostPaise: number | null
  createdAt: string
  receivedAt: string | null
  requisition: {
    itemName: string
    quantity: number
    requester: { name: string; department: string }
  }
}

const STATUS_STYLES: Record<string, string> = {
  draft:     'bg-neutral-700/30 text-neutral-400 border-neutral-700/30',
  sent:      'bg-primary-600/20 text-primary-400 border-primary-600/30',
  received:  'bg-success-700/20 text-success-500 border-success-700/30',
  cancelled: 'bg-danger-600/20 text-danger-400 border-danger-600/30',
}

const NEXT_STATUS: Record<string, { label: string; value: string }[]> = {
  draft:    [{ label: 'Mark as Sent', value: 'sent' }, { label: 'Cancel', value: 'cancelled' }],
  sent:     [{ label: 'Mark Received', value: 'received' }, { label: 'Cancel', value: 'cancelled' }],
  received: [],
  cancelled: [],
}

export default function PurchaseOrdersPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [updating, setUpdating] = useState<string | null>(null)
  const [supplier, setSupplier] = useState('')
  const [unitCost, setUnitCost] = useState('')

  const { data, isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['purchase-orders'],
    queryFn: () => api.get('/purchase-orders').then((r) => r.data),
    refetchInterval: 30_000,
  })

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/purchase-orders/${id}/status`, {
        status,
        ...(supplier && { supplier }),
        ...(unitCost && { unitCostPaise: Math.round(Number(unitCost) * 100) }),
      }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setUpdating(null)
      setSupplier('')
      setUnitCost('')
    },
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
        <h1 className="text-2xl font-bold text-white">Purchase Orders</h1>
        <p className="mt-1 text-sm text-neutral-400">{data?.length ?? 0} purchase order(s)</p>
      </div>

      {mutation.error && (
        <div className="rounded-lg border border-danger-600/30 bg-danger-600/10 px-4 py-3 text-sm text-danger-400">
          {(mutation.error as any).response?.data?.error ?? 'Update failed'}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-800/50">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">PO Number</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Item</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Requester</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Total Cost</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Status</th>
              {(user?.role === 'manager' || user?.role === 'admin') && (
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {!data?.length ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-neutral-500">
                  No purchase orders yet.
                </td>
              </tr>
            ) : (
              data.map((po) => (
                <>
                  <tr key={po.id} className="transition-colors hover:bg-neutral-800/30">
                    <td className="px-6 py-4 font-mono text-sm text-primary-400">{po.poNumber}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-white">{po.requisition.itemName}</p>
                      <p className="text-xs text-neutral-500">Qty: {po.requisition.quantity}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-300">{po.requisition.requester.name}</td>
                    <td className="px-6 py-4 text-sm text-neutral-300">
                      {po.totalCostPaise ? `₹${(po.totalCostPaise / 100).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[po.status]}`}>
                        {po.status}
                      </span>
                    </td>
                    {(user?.role === 'manager' || user?.role === 'admin') && (
                      <td className="px-6 py-4">
                        {NEXT_STATUS[po.status]?.map((action) => (
                          <button
                            key={action.value}
                            id={`po-${action.value}-${po.id}`}
                            onClick={() => setUpdating(updating === po.id ? null : po.id)}
                            className="mr-2 rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-all hover:bg-neutral-700 hover:text-white"
                          >
                            {action.label}
                          </button>
                        ))}
                      </td>
                    )}
                  </tr>

                  {/* Inline update form for the selected PO */}
                  {updating === po.id && (
                    <tr key={`${po.id}-form`} className="bg-neutral-800/30">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="flex flex-wrap items-end gap-3">
                          <div>
                            <label className="mb-1 block text-xs text-neutral-400">Supplier</label>
                            <input
                              value={supplier}
                              onChange={(e) => setSupplier(e.target.value)}
                              placeholder="Supplier name"
                              className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-neutral-400">Unit Cost (₹)</label>
                            <input
                              type="number"
                              value={unitCost}
                              onChange={(e) => setUnitCost(e.target.value)}
                              placeholder="0.00"
                              className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                          </div>
                          <div className="flex gap-2">
                            {NEXT_STATUS[po.status]?.map((action) => (
                              <button
                                key={action.value}
                                onClick={() => mutation.mutate({ id: po.id, status: action.value })}
                                disabled={mutation.isPending}
                                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-60 ${
                                  action.value === 'cancelled'
                                    ? 'bg-danger-600 hover:bg-danger-500'
                                    : 'bg-primary-600 hover:bg-primary-500'
                                }`}
                              >
                                {mutation.isPending ? '…' : action.label}
                              </button>
                            ))}
                            <button
                              onClick={() => setUpdating(null)}
                              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-400 hover:bg-neutral-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
