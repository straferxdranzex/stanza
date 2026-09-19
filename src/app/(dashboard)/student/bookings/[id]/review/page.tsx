import { redirect, notFound } from 'next/navigation'
import { getAuthenticatedUser, createServerSupabaseClient } from '@/lib/supabase/server'
import { ReviewForm } from '@/components/student/ReviewForm'
import Link from 'next/link'

export default async function LeaveReviewPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await getAuthenticatedUser()
  if (!user || user.role !== 'student') redirect('/login')

  const supabase = await createServerSupabaseClient()
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id, status, ends_at, scheduled_at,
      teacher:users!bookings_teacher_id_fkey(full_name),
      lesson:lessons(title),
      review:reviews(id)
    `)
    .eq('id', params.id)
    .eq('student_id', user.id)
    .single()

  if (!booking) notFound()

  const existingReview = Array.isArray(booking.review) ? booking.review[0] : booking.review
  if (existingReview) {
    redirect('/student/reviews')
  }

  const lessonEnded = new Date(booking.ends_at) <= new Date()
  const canReview =
    booking.status === 'completed' ||
    (booking.status === 'confirmed' && lessonEnded)

  const teacher = Array.isArray(booking.teacher) ? booking.teacher[0] : booking.teacher
  const lesson = Array.isArray(booking.lesson) ? booking.lesson[0] : booking.lesson

  return (
    <div className="max-w-lg mx-auto px-6 py-10">
      <Link href="/student/bookings" className="text-sm text-white/40 hover:text-white mb-6 inline-block">
        ← Back to bookings
      </Link>
      <h1 className="text-2xl font-semibold text-white mb-2">Leave a review</h1>
      <p className="text-white/50 text-sm mb-8">
        Help other students by sharing your experience.
      </p>

      {!canReview ? (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-white/50 text-sm">
            You can review this lesson after it has finished.
          </p>
          <p className="text-white/30 text-xs mt-2">
            Status: {booking.status}
          </p>
        </div>
      ) : (
        <ReviewForm
          bookingId={booking.id}
          lessonTitle={lesson?.title ?? 'Lesson'}
          teacherName={teacher?.full_name ?? 'Teacher'}
        />
      )}
    </div>
  )
}
