// Secure Zoom join page — validates participant before redirecting
import { redirect } from 'next/navigation'
import { getAuthenticatedUser, createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface Props {
  params: { bookingId: string }
}

function JoinState({
  title,
  body,
  detail,
  bookingsHref,
}: {
  title: string
  body: string
  detail?: string
  bookingsHref: string
}) {
  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center px-6 relative">
      <div className="absolute inset-0 bg-gradient-radial from-[#15111f] to-[#050508]" />
      <div className="relative glass rounded-2xl p-10 max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center mx-auto mb-5">
          <svg className="w-6 h-6 text-[#C9A84C]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-white mb-2">{title}</h1>
        <p className="text-white/50 text-sm leading-relaxed">{body}</p>
        {detail && <p className="text-white/30 text-xs mt-3">{detail}</p>}
        <Link href={bookingsHref} className="btn-primary inline-block mt-6 px-5 py-2.5 text-sm">
          Back to bookings
        </Link>
      </div>
    </div>
  )
}

export default async function JoinZoomPage({ params }: Props) {
  const user = await getAuthenticatedUser()
  if (!user) redirect(`/login?redirect=/join/${params.bookingId}`)

  const bookingsHref =
    user.role === 'teacher' ? '/teacher/bookings' : user.role === 'admin' ? '/admin/bookings' : '/student/bookings'

  const supabase = await createServerSupabaseClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, student_id, teacher_id, zoom_join_url, zoom_start_url, status, scheduled_at, ends_at')
    .eq('id', params.bookingId)
    .single()

  if (!booking) redirect(bookingsHref)

  const isStudent = booking.student_id === user.id
  const isTeacher = booking.teacher_id === user.id

  if (!isStudent && !isTeacher && user.role !== 'admin') {
    redirect(bookingsHref)
  }

  if (booking.status !== 'confirmed') {
    return (
      <JoinState
        title="Meeting not available"
        body={`This booking is currently ${booking.status}.`}
        bookingsHref={bookingsHref}
      />
    )
  }

  const scheduledAt = new Date(booking.scheduled_at)
  const endsAt = new Date(booking.ends_at)
  const now = new Date()
  const earlyJoinMs = 15 * 60 * 1000

  if (now < new Date(scheduledAt.getTime() - earlyJoinMs)) {
    const minutesUntil = Math.round((scheduledAt.getTime() - now.getTime()) / 60000)
    return (
      <JoinState
        title="Too early to join"
        body={`The meeting opens ${minutesUntil} minutes before the lesson starts.`}
        detail={`Starts at ${scheduledAt.toLocaleString()}`}
        bookingsHref={bookingsHref}
      />
    )
  }

  if (now > endsAt) {
    return (
      <JoinState
        title="Lesson ended"
        body="This lesson window has already closed."
        bookingsHref={bookingsHref}
      />
    )
  }

  const zoomUrl = isTeacher ? booking.zoom_start_url : booking.zoom_join_url

  if (!zoomUrl) {
    return (
      <JoinState
        title="Meeting link not ready"
        body="Zoom is still being set up for this lesson. Try again in a moment, or contact support if it persists."
        bookingsHref={bookingsHref}
      />
    )
  }

  redirect(zoomUrl)
}
