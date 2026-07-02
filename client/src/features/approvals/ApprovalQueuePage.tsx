import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import { getSocket } from '../../lib/socket'
import { useAuth } from '../../hooks/useAuth'

interface Requisition {
  id: string
  itemName: string
  quantity: number
  estimatedCostPaise: number
  justification: string
  urgency: string
  status: string
  createdAt: string
  department: string
  requester: { name: string; email: string; department: string }
}

const URGENCY_STYLES: Record<string, string> = {
  low:      'bg-neutral-700/30 text-neutral-400',
  medium:   'bg-primary-600/20 text-primary-400',
  high:     'bg-warning-600/20 text-warning-500',
  critical: 'bg-danger-600/20 text-danger-400',
}

export default function ApprovalQueuePage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [commentError, setCommentError] = useState('')

  const { data: requisitions, isLoading } = useQuery<Requisition[]>({
    queryKey: ['requisitions', 'pending'],
    queryFn: () =>
      api.get('/requisitions').then((r) =>
        r.data.filter((req: Requisition) =>
          ['pending', 'pending_2nd'].includes(req.status)
        )
      ),
    refetchInterval: 15_000, // Backup polling every 15s
  })

  // Live update via WebSocket — invalidate on new requisition events
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['requisitions', 'pending'] })
    socket.on('requisition:new', refresh)
    socket.on('approval-queue:refresh', refresh)
    return () => {
      socket.off('requisition:new', refresh)
      socket.off('approval-queue:refresh', refresh)
    }
  }, [queryClient])

  const decideMutation = useMutation({
    mutationFn: ({ id, decision, comment }: { id: string; decision: string; comment: string }) =>
      api.post(`/approvals/${id}/decide`, { decision, comment }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setSelectedId(null)
      setComment('')
    },
  })

  function handleDecide(requisitionId: string, decision: 'approved' | 'rejected') {
    // Client-side comment validation for rejections — server also validates
    if (decision === 'rejected' && comment.trim().length < 5) {
      setCommentError('A comment (min 5 characters) is required when rejecting')
      return
    }
    setCommentError('')
    decideMutation.mutate({ id: requisitionId, decision, comment })
  }

  const selected = requisitions?.find((r) => r.id === selectedId)

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
        <h1 className="text-2xl font-bold text-white">Approval Queue</h1>
        <p className="mt-1 text-sm text-neutral-400">
          {requisitions?.length ?? 0} requisition(s) awaiting your decision
        </p>
      </div>

      {decideMutation.error && (
        <div className="rounded-lg border border-danger-600/30 bg-danger-600/10 px-4 py-3 text-sm text-danger-400">
          {(decideMutation.error as any).response?.data?.error ?? 'Action failed. Please try again.'}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Queue list */}
        <div className="space-y-3">
          {!requisitions?.length ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-12 text-center">
              <p className="text-4xl mb-3">✓</p>
              <p className="text-neutral-400">All caught up! No pending approvals.</p>
            </div>
          ) : (
            requisitions.map((req) => (
              <button
                key={req.id}
                onClick={() => { setSelectedId(req.id); setComment(''); setCommentError('') }}
                className={`w-full rounded-xl border p-4 text-left transition-all ${
                  selectedId === req.id
                    ? 'border-primary-500 bg-primary-600/10'
                    : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-white">{req.itemName}</p>
                    <p className="mt-0.5 text-xs text-neutral-400">
                      by {req.requester.name} · {req.requester.department}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${URGENCY_STYLES[req.urgency]}`}>
                    {req.urgency}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-4 text-sm text-neutral-400">
                  <span>Qty: <span className="text-neutral-200">{req.quantity}</span></span>
                  <span>Cost: <span className="text-neutral-200">₹{(req.estimatedCostPaise / 100).toLocaleString('en-IN')}</span></span>
                  {req.status === 'pending_2nd' && (
                    <span className="rounded-full bg-primary-600/20 px-2 py-0.5 text-xs text-primary-400">2nd level</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail + decision panel */}
        {selected ? (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 space-y-5 animate-fade-in">
            <div>
              <h2 className="text-lg font-semibold text-white">{selected.itemName}</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Requested by <span className="text-neutral-200">{selected.requester.name}</span> ·{' '}
                {new Date(selected.createdAt).toLocaleString()}
              </p>
            </div>

            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-400">Department</dt>
                <dd className="text-neutral-200">{selected.department}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-400">Quantity</dt>
                <dd className="text-neutral-200">{selected.quantity}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-400">Estimated Cost</dt>
                <dd className="font-semibold text-white">₹{(selected.estimatedCostPaise / 100).toLocaleString('en-IN')}</dd>
              </div>
              {selected.estimatedCostPaise >= 2_500_000 && (
                <div className="rounded-lg border border-warning-600/30 bg-warning-600/10 px-3 py-2 text-xs text-warning-500">
                  ⚠ This amount exceeds ₹25,000 — requires department head approval
                </div>
              )}
            </dl>

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">Justification</p>
              <p className="text-sm text-neutral-300 rounded-lg bg-neutral-800 px-4 py-3">{selected.justification}</p>
            </div>

            {/* Business rule: self-approval warning (backend also blocks this) */}
            {user?.id === (selected as any).requesterId && (
              <div className="rounded-lg border border-danger-600/30 bg-danger-600/10 px-4 py-3 text-sm text-danger-400">
                You cannot approve your own requisition.
              </div>
            )}

            {/* Comment field */}
            <div>
              <label htmlFor="approval-comment" className="mb-1.5 block text-sm font-medium text-neutral-300">
                Comment <span className="text-neutral-500">(required for rejection)</span>
              </label>
              <textarea
                id="approval-comment"
                rows={3}
                value={comment}
                onChange={(e) => { setComment(e.target.value); setCommentError('') }}
                placeholder="Add a comment…"
                className={`w-full rounded-lg border bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder-neutral-500 resize-none focus:outline-none focus:ring-1 focus:ring-primary-500 ${commentError ? 'border-danger-600' : 'border-neutral-700 focus:border-primary-500'}`}
              />
              {commentError && <p className="mt-1 text-xs text-danger-400">{commentError}</p>}
            </div>

            {/* Decision buttons */}
            <div className="flex gap-3">
              <button
                id="approve-btn"
                onClick={() => handleDecide(selected.id, 'approved')}
                disabled={decideMutation.isPending}
                className="flex-1 rounded-lg bg-success-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-success-500 disabled:opacity-60 active:scale-95"
              >
                {decideMutation.isPending ? '…' : '✓ Approve'}
              </button>
              <button
                id="reject-btn"
                onClick={() => handleDecide(selected.id, 'rejected')}
                disabled={decideMutation.isPending}
                className="flex-1 rounded-lg bg-danger-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-danger-500 disabled:opacity-60 active:scale-95"
              >
                {decideMutation.isPending ? '…' : '✗ Reject'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center rounded-xl border border-neutral-800 border-dashed bg-neutral-900">
            <p className="text-sm text-neutral-500">Select a requisition to review</p>
          </div>
        )}
      </div>
    </div>
  )
}
