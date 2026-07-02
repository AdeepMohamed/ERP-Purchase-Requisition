import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import api from '../../lib/api'
import { getSocket } from '../../lib/socket'

interface InventoryItem {
  id: string
  name: string
  sku: string
  quantityOnHand: number
  reorderThreshold: number
  lastUpdated: string
}

export default function InventoryPage() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<InventoryItem[]>({
    queryKey: ['inventory'],
    queryFn: () => api.get('/inventory').then((r) => r.data),
    refetchInterval: 30_000,
  })

  // Refresh on WebSocket inventory update events
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['inventory'] })
    socket.on('inventory:updated', refresh)
    return () => { socket.off('inventory:updated', refresh) }
  }, [queryClient])

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  const lowStock = data?.filter((i) => i.quantityOnHand < i.reorderThreshold) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Inventory</h1>
        <p className="mt-1 text-sm text-neutral-400">
          {data?.length ?? 0} items · {lowStock.length} below reorder threshold
        </p>
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-xl border border-danger-600/30 bg-danger-600/10 px-4 py-3 text-sm text-danger-400">
          ⚠ {lowStock.length} item(s) are below their reorder threshold: {lowStock.map((i) => i.name).join(', ')}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-800/50">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Item</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">In Stock</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Reorder At</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Last Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {!data?.length ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-neutral-500">
                  No inventory items.
                </td>
              </tr>
            ) : (
              data.map((item) => {
                const isLow = item.quantityOnHand < item.reorderThreshold
                return (
                  <tr key={item.id} className={`transition-colors hover:bg-neutral-800/30 ${isLow ? 'bg-danger-600/5' : ''}`}>
                    <td className="px-6 py-4 text-sm font-medium text-white">{item.name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-neutral-400">{item.sku}</td>
                    <td className="px-6 py-4">
                      <span className={`text-lg font-bold ${isLow ? 'text-danger-400' : 'text-white'}`}>
                        {item.quantityOnHand}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-400">{item.reorderThreshold}</td>
                    <td className="px-6 py-4">
                      {isLow ? (
                        <span className="rounded-full border border-danger-600/30 bg-danger-600/20 px-2.5 py-0.5 text-xs font-medium text-danger-400">
                          Low Stock
                        </span>
                      ) : (
                        <span className="rounded-full border border-success-700/30 bg-success-700/20 px-2.5 py-0.5 text-xs font-medium text-success-500">
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-neutral-500">
                      {new Date(item.lastUpdated).toLocaleString()}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
