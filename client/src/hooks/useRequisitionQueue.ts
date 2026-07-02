import { useState, useEffect, useCallback } from 'react'
import { offlineDb } from '../lib/db'
import type { QueuedRequisition } from '../lib/db'
import api from '../lib/api'
import { useOnlineStatus } from './useOnlineStatus'

/**
 * Manages the offline requisition queue.
 * - Adds items to IndexedDB when offline
 * - Syncs pending items to the backend when connection is restored
 * - Returns queue count and sync status for UI feedback
 */
export function useRequisitionQueue() {
  const isOnline = useOnlineStatus()
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  // Refresh the pending count from IndexedDB
  const refreshCount = useCallback(async () => {
    const count = await offlineDb.queuedRequisitions
      .where('syncStatus')
      .anyOf(['pending', 'failed'])
      .count()
    setPendingCount(count)
  }, [])

  useEffect(() => {
    refreshCount()
  }, [refreshCount])

  // Queue a requisition locally when offline
  const queueRequisition = useCallback(
    async (data: Omit<QueuedRequisition, 'id' | 'queuedAt' | 'syncStatus'>) => {
      await offlineDb.queuedRequisitions.add({
        ...data,
        queuedAt: new Date(),
        syncStatus: 'pending',
      })
      await refreshCount()
    },
    [refreshCount]
  )

  // Sync all pending items to the backend — called automatically when online
  const syncQueue = useCallback(async () => {
    const pending = await offlineDb.queuedRequisitions
      .where('syncStatus')
      .anyOf(['pending', 'failed'])
      .toArray()

    if (pending.length === 0) return

    setIsSyncing(true)

    for (const item of pending) {
      try {
        // Mark as syncing so UI can show individual item state
        await offlineDb.queuedRequisitions.update(item.id!, { syncStatus: 'syncing' })

        await api.post('/requisitions', {
          itemName: item.itemName,
          quantity: item.quantity,
          justification: item.justification,
          urgency: item.urgency,
          estimatedCostPaise: item.estimatedCostPaise,
        })

        // Remove from queue on success
        await offlineDb.queuedRequisitions.delete(item.id!)
      } catch (err) {
        // Mark as failed so the user knows and can retry
        await offlineDb.queuedRequisitions.update(item.id!, {
          syncStatus: 'failed',
          errorMessage: err instanceof Error ? err.message : 'Sync failed',
        })
      }
    }

    setIsSyncing(false)
    await refreshCount()
  }, [refreshCount])

  // Auto-sync when the network comes back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncQueue()
    }
  }, [isOnline, pendingCount, syncQueue])

  return { pendingCount, isSyncing, queueRequisition, syncQueue }
}
