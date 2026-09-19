'use client'

import { useRouter } from 'next/navigation'
import { BookingCard } from '@/components/shared'
import Link from 'next/link'

interface Props {
  bookings: any[]
  timezone: string
}

export function TeacherBookingsClient({ bookings, timezone }: Props) {
  const router = useRouter()

  async function cancelBooking(id: string) {
    await fetch(`/api/bookings/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Cancelled by teacher' }),
    })
    router.refresh()
  }

  const upcoming = bookings.filter(b => new Date(b.scheduled_at) > new Date() && b.status !== 'cancelled')
  const past = bookings.filter(b => new Date(b.scheduled_at) <= new Date() || b.status === 'cancelled')

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Bookings</h1>
        <p className="text-white/50 mt-1">Upcoming and past student sessions</p>
      </div>

      {upcoming.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-4">Upcoming</h2>
          <div className="space-y-3">
            {upcoming.map(b => (
              <BookingCard
                key={b.id}
                booking={b}
                role="teacher"
                timezone={timezone}
                onCancel={() => cancelBooking(b.id)}
              />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-4">Past</h2>
          <div className="space-y-3">
            {past.map(b => (
              <BookingCard key={b.id} booking={b} role="teacher" timezone={timezone} />
            ))}
          </div>
        </section>
      )}

      {bookings.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <h2 className="text-white font-medium mb-2">No bookings yet</h2>
          <p className="text-white/40 text-sm mb-6">
            Student bookings appear here once they book your lessons.
          </p>
          <Link href="/teacher/lessons" className="btn-primary px-5 py-2.5 text-sm inline-block">
            Manage lessons
          </Link>
        </div>
      )}
    </div>
  )
}
