'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AuthUser, DBNotification } from '@/types'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { BookingCard, NotificationBell, StatCard } from '@/components/shared'

interface Props {
  user: AuthUser
  upcomingBookings: any[]
  completedBookings: any[]
  unreadMessages: number
  notifications: DBNotification[]
  stats: {
    totalLessons: number
    totalSpentCents: number
  }
}

export function StudentDashboardClient({
  user,
  upcomingBookings: initialBookings,
  completedBookings,
  unreadMessages: initialUnread,
  notifications: initialNotifications,
  stats,
}: Props) {
  const [upcomingBookings, setUpcomingBookings] = useState(initialBookings)
  const [notifications, setNotifications] = useState(initialNotifications)
  const [unreadMessages] = useState(initialUnread)
  const supabase = createClient()

  useEffect(() => {
    const bookingsChannel = supabase
      .channel('student-bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `student_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setUpcomingBookings(prev =>
              prev.map(b => b.id === payload.new.id ? { ...b, ...payload.new } : b)
            )
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications(prev => [payload.new as DBNotification, ...prev])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(bookingsChannel) }
  }, [user.id, supabase])

  const pendingReviews = completedBookings.filter(b => !(Array.isArray(b.review) ? b.review.length : b.review))

  return (
    <div className="px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-wider text-[#C9A84C]/70 mb-1">Student</p>
          <h1 className="text-2xl font-semibold text-white">
            Welcome back, {user.full_name.split(' ')[0]}
          </h1>
          <p className="text-white/45 mt-1 text-sm">Ready for your next lesson?</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <NotificationBell
            notifications={notifications}
            onMarkRead={async (id) => {
              await supabase.from('notifications').update({ is_read: true }).eq('id', id)
              setNotifications(prev => prev.filter(n => n.id !== id))
            }}
          />
          <Link href="/student/messages" className="relative btn-ghost px-4 py-2 text-sm">
            Messages
            {unreadMessages > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {unreadMessages > 9 ? '9+' : unreadMessages}
              </span>
            )}
          </Link>
          <Link href="/teachers" className="btn-primary px-4 py-2 text-sm">
            Book a lesson
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Lessons completed" value={stats.totalLessons.toString()} />
        <StatCard label="Total spent" value={formatCurrency(stats.totalSpentCents)} />
        <StatCard label="Upcoming" value={upcomingBookings.length.toString()} />
        <StatCard
          label="Pending reviews"
          value={pendingReviews.length.toString()}
          accent={pendingReviews.length > 0}
        />
      </div>

      {pendingReviews.length > 0 && (
        <div className="glass-gold rounded-2xl p-5 mb-6">
          <p className="text-sm font-medium text-[#E8C87A] mb-3">
            {pendingReviews.length} lesson{pendingReviews.length > 1 ? 's' : ''} awaiting your review
          </p>
          <div className="flex flex-wrap gap-2">
            {pendingReviews.slice(0, 3).map(b => (
              <Link
                key={b.id}
                href={`/student/bookings/${b.id}/review`}
                className="text-xs px-3 py-1.5 bg-[#C9A84C]/15 text-[#E8C87A] border border-[#C9A84C]/25 rounded-lg hover:bg-[#C9A84C]/25 transition-colors"
              >
                Review {(b.lesson as any)?.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider">Upcoming lessons</h2>
          <Link href="/student/bookings" className="text-sm text-[#C9A84C] hover:underline">
            View all →
          </Link>
        </div>

        {upcomingBookings.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center border border-dashed border-white/10">
            <div className="w-12 h-12 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-5 h-5 text-[#C9A84C]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
              </svg>
            </div>
            <p className="text-white/50 mb-1 font-medium">No upcoming lessons</p>
            <p className="text-white/30 text-sm mb-5">Browse teachers and book your next session.</p>
            <Link href="/teachers" className="btn-primary px-5 py-2.5 text-sm inline-block">
              Browse teachers
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingBookings.map(booking => (
              <BookingCard
                key={booking.id}
                booking={booking}
                role="student"
                timezone={user.timezone}
                onCancel={async () => {
                  const res = await fetch(`/api/bookings/${booking.id}/cancel`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason: 'Student cancelled' }),
                  })
                  if (res.ok) {
                    setUpcomingBookings(prev => prev.filter(b => b.id !== booking.id))
                  }
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
