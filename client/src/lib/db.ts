import Dexie, { type Table } from 'dexie'

// Queued requisition: created offline, synced when connection is restored
export interface QueuedRequisition {
  id?: number        // Auto-incremented by IndexedDB
  itemName: string
  quantity: number
  justification: string
  urgency: string
  estimatedCostPaise: number
  queuedAt: Date
  syncStatus: 'pending' | 'syncing' | 'failed'
  errorMessage?: string
}

/**
 * Dexie (IndexedDB) database for offline support.
 * Only used to queue requisitions submitted while the network is down.
 * Data is cleared after successful sync with the backend.
 */
class ErpOfflineDb extends Dexie {
  queuedRequisitions!: Table<QueuedRequisition>

  constructor() {
    super('erp-offline')
    this.version(1).stores({
      // Index by syncStatus so we can quickly find pending items
      queuedRequisitions: '++id, syncStatus, queuedAt',
    })
  }
}

export const offlineDb = new ErpOfflineDb()
