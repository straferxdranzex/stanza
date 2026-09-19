'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import type { DBNotification, UserRole } from '@/types'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'

// StatCard
interface StatCardProps { label: string; value: string; accent?: boolean; subtitle?: string }
export function StatCard({ label, value, accent, subtitle }: StatCardProps) {
  return (
    <div className={`p-4 rounded-xl border ${accent ? 'bg-amber-500/5 border-amber-500/20' : 'bg-white/[0.03] border-white/[0.06]'}`}>
      <p className="text-xs text-white/40 mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${accent ? 'text-amber-400' : 'text-white'}`}>{value}</p>
      {subtitle && <p className="text-xs text-white/30 mt-1">{subtitle}</p>}
    </div>
  )
}

// BookingCard
interface BookingCardProps { booking: any; role: UserRole; timezone?: string; onCancel?: () => Promise<void> }
export function BookingCard({ booking, role, timezone = 'UTC', onCancel }: BookingCardProps) {
  const [cancelling, setCancelling] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [showDispute, setShowDispute] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputing, setDisputing] = useState(false)
  const [disputeMsg, setDisputeMsg] = useState('')
  const person = role === 'student' ? booking.teacher : booking.student
  const scheduledAt = new Date(booking.scheduled_at)
  const isUpcoming = scheduledAt > new Date()
  const canCancel = isUpcoming && ['pending', 'confirmed'].includes(booking.status)
  const canDispute = ['confirmed', 'completed'].includes(booking.status) && !isUpcoming
  const formattedTime = scheduledAt.toLocaleString('en-US', { timeZone: timezone, weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
  const statusColors: Record<string, string> = { pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20', confirmed: 'bg-blue-500/10 text-blue-400 border-blue-500/20', completed: 'bg-green-500/10 text-green-400 border-green-500/20', cancelled: 'bg-red-500/10 text-red-400 border-red-500/20', refunded: 'bg-white/5 text-white/40 border-white/10' }
  async function handleCancel() { if (!onCancel) return; setCancelling(true); try { await onCancel() } finally { setCancelling(false); setShowCancel(false) } }
  async function handleDispute() {
    if (disputeReason.trim().length < 20) {
      setDisputeMsg('Please describe the issue (at least 20 characters).')
      return
    }
    setDisputing(true)
    setDisputeMsg('')
    try {
      const res = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: booking.id, reason: disputeReason.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setDisputeMsg(data.error ?? 'Failed to open dispute')
      } else {
        setDisputeMsg('Dispute submitted. An admin will review it.')
        setShowDispute(false)
        setDisputeReason('')
      }
    } finally {
      setDisputing(false)
    }
  }
  return (
    <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:border-white/10 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-white/[0.06] flex-shrink-0 flex items-center justify-center text-sm font-medium text-white/60">{person?.full_name?.[0] ?? '?'}</div>
          <div className="min-w-0">
            <p className="font-medium text-white truncate">{booking.lesson?.title}</p>
            <p className="text-sm text-white/40 mt-0.5">{role === 'student' ? 'with' : 'Student:'} {person?.full_name}</p>
            <p className="text-sm text-white/50 mt-1">{formattedTime}</p>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${statusColors[booking.status] ?? ''}`}>{booking.status}</span>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/30">{booking.lesson?.duration_mins} min</span>
          {booking.lesson?.price_cents && <span className="text-sm text-white/30">{formatCurrency(booking.lesson.price_cents)}</span>}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {booking.status === 'confirmed' && isUpcoming && <Link href={`/join/${booking.id}`} className="text-xs px-3 py-1.5 bg-[#C9A84C] text-black font-medium rounded-lg hover:bg-[#E8C87A] transition-colors">Join Zoom</Link>}
          {(booking.status === 'completed' || (booking.status === 'confirmed' && !isUpcoming)) && role === 'student' && !(Array.isArray(booking.review) ? booking.review.length : booking.review) && (
            <Link href={`/student/bookings/${booking.id}/review`} className="text-xs px-3 py-1.5 border border-white/10 text-white/50 rounded-lg hover:bg-white/5">Leave review</Link>
          )}
          {canCancel && onCancel && (showCancel ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">Confirm?</span>
              <button onClick={handleCancel} disabled={cancelling} className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50">{cancelling ? '…' : 'Yes'}</button>
              <button onClick={() => setShowCancel(false)} className="text-xs px-2 py-1 border border-white/10 rounded hover:bg-white/5">No</button>
            </div>
          ) : <button onClick={() => setShowCancel(true)} className="text-xs text-white/30 hover:text-red-400 transition-colors">Cancel</button>)}
          {canDispute && (
            <button onClick={() => setShowDispute(v => !v)} className="text-xs text-white/30 hover:text-amber-400 transition-colors">Dispute</button>
          )}
          {role === 'student' && (
            <Link href={`/student/messages?to=${booking.teacher?.id ?? booking.teacher_id}`} className="text-xs text-white/30 hover:text-white/60">Message</Link>
          )}
          {role === 'teacher' && (
            <Link href={`/teacher/messages?to=${booking.student?.id ?? booking.student_id}`} className="text-xs text-white/30 hover:text-white/60">Message</Link>
          )}
        </div>
      </div>
      {showDispute && (
        <div className="mt-3 pt-3 border-t border-white/[0.04] space-y-2">
          <textarea
            value={disputeReason}
            onChange={e => setDisputeReason(e.target.value)}
            rows={3}
            placeholder="Describe what went wrong (min 20 characters)…"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#C9A84C]/40 resize-none"
          />
          <div className="flex items-center gap-2">
            <button onClick={handleDispute} disabled={disputing} className="text-xs px-3 py-1.5 bg-amber-500/20 text-amber-300 rounded-lg disabled:opacity-50">
              {disputing ? 'Submitting…' : 'Submit dispute'}
            </button>
            <button onClick={() => setShowDispute(false)} className="text-xs text-white/30">Cancel</button>
          </div>
        </div>
      )}
      {disputeMsg && <p className="text-xs text-white/40 mt-2">{disputeMsg}</p>}
    </div>
  )
}

// StarRating
interface StarRatingProps { rating: number; size?: 'sm' | 'md' | 'lg'; interactive?: boolean; onChange?: (r: number) => void }
export function StarRating({ rating, size = 'md', interactive, onChange }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const sizes = { sm: 'text-sm', md: 'text-base', lg: 'text-xl' }
  const display = hovered ?? rating
  return (
    <div className={`flex items-center gap-0.5 ${sizes[size]}`}>
      {[1,2,3,4,5].map(star => (
        <span key={star} className={`${interactive ? 'cursor-pointer' : ''} ${star <= display ? 'text-[#C9A84C]' : 'text-white/15'} transition-colors`} onMouseEnter={() => interactive && setHovered(star)} onMouseLeave={() => interactive && setHovered(null)} onClick={() => interactive && onChange?.(star)}>&#x2605;</span>
      ))}
    </div>
  )
}

// NotificationBell
interface NotificationBellProps { notifications: DBNotification[]; onMarkRead: (id: string) => Promise<void> }
export function NotificationBell({ notifications, onMarkRead }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const unreadCount = notifications.filter(n => !n.is_read).length
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)} className="relative p-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors" aria-label="Notifications">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white/60"><path d="M8 1C5.24 1 3 3.24 3 6v4l-1 1h12l-1-1V6c0-2.76-2.24-5-5-5z" stroke="currentColor" strokeWidth="1.2" fill="none"/><path d="M6.5 13a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.2" fill="none"/></svg>
        {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#0e0e18] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-sm font-medium text-white">Notifications</span>
            {unreadCount > 0 && <button onClick={() => notifications.forEach(n => !n.is_read && onMarkRead(n.id))} className="text-xs text-white/40 hover:text-white">Mark all read</button>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? <p className="text-sm text-white/30 text-center py-8">No notifications</p> : notifications.map(n => (
              <div key={n.id} className={`px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer ${!n.is_read ? 'bg-[#C9A84C]/5' : ''}`} onClick={() => !n.is_read && onMarkRead(n.id)}>
                <p className="text-sm text-white">{n.title}</p>
                {n.body && <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{n.body}</p>}
                <p className="text-xs text-white/25 mt-1">{formatRelativeTime(n.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
