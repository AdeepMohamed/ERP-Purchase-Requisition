import { useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useRequisitionQueue } from '../../hooks/useRequisitionQueue'

// ── Types ──────────────────────────────────────────────────────────────────

interface Requisition {
  id: string
  itemName: string
  quantity: number
  justification: string
  urgency: string
  estimatedCostPaise: number
  status: string
  department: string
  createdAt: string
  decidedAt: string | null
  requester: { name: string; email: string }
  approval?: { decision: string; comment?: string; approver: { name: string } }
}

// ── Status Badge ───────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  pending:     'bg-warning-600/20 text-warning-500 border-warning-600/30',
  pending_2nd: 'bg-primary-600/20 text-primary-400 border-primary-600/30',
  approved:    'bg-success-700/20 text-success-500 border-success-700/30',
  rejected:    'bg-danger-600/20 text-danger-400 border-danger-600/30',
}

const URGENCY_STYLES: Record<string, string> = {
  low:      'text-neutral-400',
  medium:   'text-primary-400',
  high:     'text-warning-500',
  critical: 'text-danger-400 font-semibold',
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? 'bg-neutral-700/20 text-neutral-400 border-neutral-700/30'
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

// ── Requisition List ───────────────────────────────────────────────────────

export function RequisitionsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery<Requisition[]>({
    queryKey: ['requisitions'],
    queryFn: () => api.get('/requisitions').then((r) => r.data),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Requisitions</h1>
          <p className="mt-1 text-sm text-neutral-400">
            {user?.role === 'employee' ? 'Your purchase requests' : 'Department requisitions'}
          </p>
        </div>
        {/* Employees can create new requisitions */}
        {(user?.role === 'employee') && (
          <button
            id="new-requisition-btn"
            onClick={() => navigate('/requisitions/new')}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-600/20 transition-all hover:bg-primary-500 active:scale-95"
          >
            + New Requisition
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"></div>
        </div>
      ) : !data?.length ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-12 text-center">
          <p className="text-neutral-400">No requisitions yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-800/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Item</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Qty</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Est. Cost</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Urgency</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Requested</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {data.map((req) => (
                <tr key={req.id} className="transition-colors hover:bg-neutral-800/30">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-white">{req.itemName}</p>
                    <p className="text-xs text-neutral-500 truncate max-w-[200px]">{req.justification}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-300">{req.quantity}</td>
                  <td className="px-6 py-4 text-sm text-neutral-300">
                    ₹{(req.estimatedCostPaise / 100).toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={URGENCY_STYLES[req.urgency]}>{req.urgency}</span>
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={req.status} /></td>
                  <td className="px-6 py-4 text-xs text-neutral-500">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── New Requisition Form ───────────────────────────────────────────────────

export function NewRequisitionPage() {
  const isOnline = useOnlineStatus()
  const { queueRequisition } = useRequisitionQueue()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    itemName: '',
    quantity: '',
    justification: '',
    urgency: 'medium',
    estimatedCostRupees: '', // User inputs rupees; we convert to paise before sending
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMsg, setSuccessMsg] = useState('')

  const mutation = useMutation({
    mutationFn: (data: object) => api.post('/requisitions', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] })
      setSuccessMsg('Requisition submitted successfully!')
      setTimeout(() => navigate('/requisitions'), 1500)
    },
  })

  // Client-side validation — mirrors server Zod schema
  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.itemName.trim() || form.itemName.length < 2) e.itemName = 'Item name must be at least 2 characters'
    const qty = Number(form.quantity)
    if (!qty || qty < 1 || qty > 10_000 || !Number.isInteger(qty)) e.quantity = 'Quantity must be a whole number between 1 and 10,000'
    if (form.justification.trim().length < 10) e.justification = 'Justification must be at least 10 characters'
    const cost = Number(form.estimatedCostRupees)
    if (!cost || cost <= 0) e.estimatedCostRupees = 'Please enter a valid estimated cost'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const payload = {
      itemName: form.itemName.trim(),
      quantity: Number(form.quantity),
      justification: form.justification.trim(),
      urgency: form.urgency,
      // Convert rupees to paise for consistent integer storage
      estimatedCostPaise: Math.round(Number(form.estimatedCostRupees) * 100),
    }

    if (!isOnline) {
      // Queue locally when offline — syncs automatically on reconnect
      await queueRequisition(payload)
      setSuccessMsg('Saved offline — will sync when connection is restored.')
      setTimeout(() => navigate('/requisitions'), 1500)
      return
    }

    mutation.mutate(payload)
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: any) => setForm((f) => ({ ...f, [key]: e.target.value })),
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">New Purchase Requisition</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Submit a request for supplies or equipment. Estimated cost over ₹25,000 requires department head approval.
        </p>
      </div>

      {!isOnline && (
        <div className="rounded-lg border border-warning-600/30 bg-warning-600/10 px-4 py-3 text-sm text-warning-500">
          ⚠ You're offline. Your requisition will be saved locally and submitted automatically when you reconnect.
        </div>
      )}

      {successMsg && (
        <div className="rounded-lg border border-success-700/30 bg-success-700/10 px-4 py-3 text-sm text-success-500">
          {successMsg}
        </div>
      )}

      {mutation.error && (
        <div className="rounded-lg border border-danger-600/30 bg-danger-600/10 px-4 py-3 text-sm text-danger-400">
          {(mutation.error as any).response?.data?.error ?? 'Submission failed. Please try again.'}
        </div>
      )}

      <form id="new-requisition-form" onSubmit={handleSubmit} noValidate className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 space-y-5">
        {/* Item Name */}
        <div>
          <label htmlFor="req-item-name" className="mb-1.5 block text-sm font-medium text-neutral-300">
            Item name <span className="text-danger-500">*</span>
          </label>
          <input
            id="req-item-name"
            type="text"
            {...field('itemName')}
            placeholder="e.g., Office Chair, HDMI Cable"
            className={`w-full rounded-lg border bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500 ${errors.itemName ? 'border-danger-600' : 'border-neutral-700 focus:border-primary-500'}`}
          />
          {errors.itemName && <p className="mt-1 text-xs text-danger-400">{errors.itemName}</p>}
        </div>

        {/* Quantity + Urgency row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="req-quantity" className="mb-1.5 block text-sm font-medium text-neutral-300">
              Quantity <span className="text-danger-500">*</span>
            </label>
            <input
              id="req-quantity"
              type="number"
              min="1"
              max="10000"
              {...field('quantity')}
              placeholder="1"
              className={`w-full rounded-lg border bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500 ${errors.quantity ? 'border-danger-600' : 'border-neutral-700 focus:border-primary-500'}`}
            />
            {errors.quantity && <p className="mt-1 text-xs text-danger-400">{errors.quantity}</p>}
          </div>

          <div>
            <label htmlFor="req-urgency" className="mb-1.5 block text-sm font-medium text-neutral-300">
              Urgency <span className="text-danger-500">*</span>
            </label>
            <select
              id="req-urgency"
              {...field('urgency')}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-sm text-white focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        {/* Estimated Cost */}
        <div>
          <label htmlFor="req-cost" className="mb-1.5 block text-sm font-medium text-neutral-300">
            Estimated cost (₹) <span className="text-danger-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-neutral-400">₹</span>
            <input
              id="req-cost"
              type="number"
              min="0.01"
              step="0.01"
              {...field('estimatedCostRupees')}
              placeholder="0.00"
              className={`w-full rounded-lg border bg-neutral-800 pl-8 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500 ${errors.estimatedCostRupees ? 'border-danger-600' : 'border-neutral-700 focus:border-primary-500'}`}
            />
          </div>
          {errors.estimatedCostRupees && <p className="mt-1 text-xs text-danger-400">{errors.estimatedCostRupees}</p>}
          {Number(form.estimatedCostRupees) >= 25000 && (
            <p className="mt-1 text-xs text-warning-500">
              ⚠ Amounts ≥ ₹25,000 require department head (2nd-level) approval
            </p>
          )}
        </div>

        {/* Justification */}
        <div>
          <label htmlFor="req-justification" className="mb-1.5 block text-sm font-medium text-neutral-300">
            Justification <span className="text-danger-500">*</span>
          </label>
          <textarea
            id="req-justification"
            rows={4}
            {...field('justification')}
            placeholder="Explain why this purchase is needed (min 10 characters)"
            className={`w-full rounded-lg border bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder-neutral-500 resize-none focus:outline-none focus:ring-1 focus:ring-primary-500 ${errors.justification ? 'border-danger-600' : 'border-neutral-700 focus:border-primary-500'}`}
          />
          {errors.justification && <p className="mt-1 text-xs text-danger-400">{errors.justification}</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            id="req-submit-btn"
            type="submit"
            disabled={mutation.isPending}
            className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/20 transition-all hover:bg-primary-500 disabled:opacity-60 active:scale-95"
          >
            {mutation.isPending ? 'Submitting…' : isOnline ? 'Submit Requisition' : 'Save Offline'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/requisitions')}
            className="rounded-lg border border-neutral-700 px-6 py-2.5 text-sm font-medium text-neutral-400 transition-all hover:bg-neutral-800 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
