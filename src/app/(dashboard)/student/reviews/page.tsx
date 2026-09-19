import { redirect } from 'next/navigation'
import { getAuthenticatedUser, createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { StarRating } from '@/components/shared'
import Link from 'next/link'

export default async function StudentReviewsPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold text-white">Reviews</h1>
        <p className="text-white/50 mt-2">Connect Supabase to manage reviews.</p>
      </div>
    )
  }

  const user = await getAuthenticatedUser()
  if (!user) redirect('/login')
  if (user.role !== 'student') redirect('/student')

  const supabase = await createServerSupabaseClient()

  // Submitted reviews
  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      id, rating, comment, created_at,
      teacher:users!reviews_teacher_id_fkey(full_name),
      booking:bookings(id, lesson:lessons(title))
    `)
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })

  // Completed / ended lessons without a review
  const { data: pendingBookings } = await supabase
    .from('bookings')
    .select(`
      id, status, ends_at, scheduled_at,
      teacher:users!bookings_teacher_id_fkey(full_name),
      lesson:lessons(title),
      review:reviews(id)
    `)
    .eq('student_id', user.id)
    .in('status', ['completed', 'confirmed'])
    .lt('ends_at', new Date().toISOString())
    .order('ends_at', { ascending: false })

  const reviewable = (pendingBookings ?? []).filter(b => {
    const rev = Array.isArray(b.review) ? b.review[0] : b.review
    return !rev
  })

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Reviews</h1>
        <p className="text-white/50 mt-1">Rate completed lessons and see what you’ve written</p>
      </div>

      {reviewable.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-4">
            Awaiting your review
          </h2>
          <div className="space-y-3">
            {reviewable.map(b => {
              const teacher = Array.isArray(b.teacher) ? b.teacher[0] : b.teacher
              const lesson = Array.isArray(b.lesson) ? b.lesson[0] : b.lesson
              return (
                <div key={b.id} className="glass rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-white">{lesson?.title ?? 'Lesson'}</p>
                    <p className="text-xs text-white/40 mt-0.5">
                      with {teacher?.full_name} · {new Date(b.scheduled_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    href={`/student/bookings/${b.id}/review`}
                    className="btn-primary px-4 py-2 text-sm flex-shrink-0"
                  >
                    Leave review
                  </Link>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-4">
          Your reviews
        </h2>
        {(reviews ?? []).length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <h2 className="text-white font-medium mb-2">No reviews yet</h2>
            <p className="text-white/40 text-sm mb-6">
              After completing a lesson, you can leave a review for your teacher.
            </p>
            <Link href="/student/bookings" className="btn-primary px-5 py-2.5 text-sm inline-block">
              View bookings
            </Link>
          </div>
        ) : (
          <div className="glass rounded-2xl divide-y divide-white/[0.06] overflow-hidden">
            {(reviews ?? []).map(review => {
              const teacher = Array.isArray(review.teacher) ? review.teacher[0] : review.teacher
              const booking = Array.isArray(review.booking) ? review.booking[0] : review.booking
              const lesson = booking?.lesson
                ? (Array.isArray(booking.lesson) ? booking.lesson[0] : booking.lesson)
                : null
              return (
                <div key={review.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {lesson?.title ?? 'Lesson'} · {teacher?.full_name}
                      </p>
                      <p className="text-xs text-white/35 mt-0.5">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <StarRating rating={review.rating} size="sm" />
                  </div>
                  {review.comment && (
                    <p className="text-sm text-white/55 leading-relaxed">{review.comment}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
