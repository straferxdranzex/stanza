'use client'

import { useRouter } from 'next/navigation'
import { BookingCard } from '@/components/shared'
import Link from 'next/link'

interface Props {
  bookings: any[]
  timezone: string
}

export function StudentBookingsClient({ bookings, timezone }: Props) {
  const router = useRouter()

  async function cancelBooking(id: string) {
    await fetch(`/api/bookings/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Cancelled by student' }),
    })
    router.refresh()
  }

  const upcoming = bookings.filter(b => new Date(b.scheduled_at) > new Date() && b.status !== 'cancelled')
  const past = bookings.filter(b => new Date(b.scheduled_at) <= new Date() || b.status === 'cancelled')

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-8">My bookings</h1>

      {upcoming.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-4">Upcoming</h2>
          <div className="space-y-3">
            {upcoming.map(b => (
              <BookingCard
                key={b.id}
                booking={b}
                role="student"
                timezone={timezone}
                onCancel={() => cancelBooking(b.id)}
              />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-4">Past lessons</h2>
          <div className="space-y-3">
            {past.map(b => (
              <BookingCard key={b.id} booking={b} role="student" timezone={timezone} />
            ))}
          </div>
        </section>
      )}

      {bookings.length === 0 && (
        <div className="text-center py-20">
          <p className="text-white/30 mb-4">No bookings yet</p>
          <Link href="/teachers" className="btn-primary px-6 py-2.5 text-sm inline-block">
            Find a teacher
          </Link>
        </div>
      )}
    </div>
  )
}
