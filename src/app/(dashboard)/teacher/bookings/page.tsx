import { redirect } from 'next/navigation'
import { getAuthenticatedUser, createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { TeacherBookingsClient } from '@/components/teacher/TeacherBookingsClient'
import { UnconfiguredBanner } from '@/components/shared/UnconfiguredBanner'

export default async function TeacherBookingsPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <UnconfiguredBanner />
      </div>
    )
  }

  const user = await getAuthenticatedUser()
  if (!user) redirect('/login')
  if (user.role !== 'teacher') redirect('/student')

  const supabase = await createServerSupabaseClient()
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      *,
      student:users!bookings_student_id_fkey(id, full_name, avatar_url, email, timezone),
      lesson:lessons(id, title, duration_mins, price_cents),
      payment:payments(id, amount_cents, status),
      review:reviews(id, rating)
    `)
    .eq('teacher_id', user.id)
    .order('scheduled_at', { ascending: false })

  return (
    <TeacherBookingsClient
      bookings={bookings ?? []}
      timezone={user.timezone}
    />
  )
}
