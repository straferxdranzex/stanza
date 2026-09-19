'use client'

import { useEffect, useState } from 'react'
import { formatRelativeTime } from '@/lib/utils'

interface DisputeRow {
  id: string
  status: string
  reason: string
  resolution_note: string | null
  created_at: string
  booking: {
    id: string
    scheduled_at: string
    lesson: { title: string } | null
    student: { full_name: string } | null
    teacher: { full_name: string } | null
  } | null
  opener: { full_name: string; email: string } | null
}

export function AdminDisputesClient() {
  const [disputes, setDisputes] = useState<DisputeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)
  const [note, setNote] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/disputes')
    const data = await res.json()
    if (res.ok) setDisputes(data.disputes ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function resolve(disputeId: string, status: string, issueRefund: boolean) {
    const resolution_note = note[disputeId]?.trim()
    if (!resolution_note || resolution_note.length < 10) {
      setError('Resolution note must be at least 10 characters')
      return
    }
    setResolving(disputeId)
    setError('')
    const res = await fetch('/api/admin/disputes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dispute_id: disputeId,
        status,
        resolution_note,
        issue_refund: issueRefund,
      }),
    })
    const data = await res.json()
    setResolving(null)
    if (!res.ok) {
      setError(data.error ?? 'Failed to resolve')
      return
    }
    await load()
  }

  const statusClass: Record<string, string> = {
    open: 'bg-amber-500/10 text-amber-400',
    under_review: 'bg-blue-500/10 text-blue-400',
    resolved_student: 'bg-emerald-500/10 text-emerald-400',
    resolved_teacher: 'bg-emerald-500/10 text-emerald-300',
    closed: 'bg-white/5 text-white/40',
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Disputes</h1>
        <p className="text-white/50 mt-1">Review and resolve booking disputes</p>
      </div>

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      {loading ? (
        <p className="text-white/30 text-sm">Loading…</p>
      ) : disputes.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-white/40 text-sm">No disputes — all clear</p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map(d => {
            const booking = d.booking
            const open = d.status === 'open' || d.status === 'under_review'
            return (
              <div key={d.id} className="glass rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="font-medium text-white">
                      {booking?.lesson?.title ?? 'Lesson'} dispute
                    </p>
                    <p className="text-xs text-white/40 mt-1">
                      Opened by {d.opener?.full_name ?? '—'} · {formatRelativeTime(d.created_at)}
                    </p>
                    <p className="text-xs text-white/35 mt-0.5">
                      {booking?.student?.full_name} ↔ {booking?.teacher?.full_name}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass[d.status] ?? ''}`}>
                    {d.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-sm text-white/60 mb-4 whitespace-pre-wrap">{d.reason}</p>

                {d.resolution_note && (
                  <p className="text-sm text-emerald-400/80 mb-3">
                    Resolution: {d.resolution_note}
                  </p>
                )}

                {open && (
                  <div className="space-y-3 pt-3 border-t border-white/[0.06]">
                    <textarea
                      value={note[d.id] ?? ''}
                      onChange={e => setNote(n => ({ ...n, [d.id]: e.target.value }))}
                      rows={2}
                      placeholder="Resolution note (required)…"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#C9A84C]/40 resize-none"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => resolve(d.id, 'resolved_student', true)}
                        disabled={resolving === d.id}
                        className="px-3 py-1.5 text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-lg disabled:opacity-50"
                      >
                        Resolve for student (+ refund)
                      </button>
                      <button
                        onClick={() => resolve(d.id, 'resolved_teacher', false)}
                        disabled={resolving === d.id}
                        className="px-3 py-1.5 text-xs bg-blue-500/15 text-blue-400 border border-blue-500/20 rounded-lg disabled:opacity-50"
                      >
                        Resolve for teacher
                      </button>
                      <button
                        onClick={() => resolve(d.id, 'closed', false)}
                        disabled={resolving === d.id}
                        className="px-3 py-1.5 text-xs border border-white/10 text-white/40 rounded-lg disabled:opacity-50"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
