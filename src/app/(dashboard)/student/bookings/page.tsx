import { redirect } from 'next/navigation'
import { getAuthenticatedUser, createServerSupabaseClient } from '@/lib/supabase/server'
import { StudentBookingsClient } from '@/components/student/StudentBookingsClient'

export default async function StudentBookingsPage() {
  const user = await getAuthenticatedUser()
  if (!user || user.role !== 'student') redirect('/login')

  const supabase = await createServerSupabaseClient()

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      *,
      teacher:users!bookings_teacher_id_fkey(id, full_name, avatar_url, email, timezone),
      lesson:lessons(id, title, duration_mins, price_cents),
      payment:payments(id, amount_cents, status),
      review:reviews(id)
    `)
    .eq('student_id', user.id)
    .order('scheduled_at', { ascending: false })

  return (
    <StudentBookingsClient
      bookings={bookings ?? []}
      timezone={user.timezone}
    />
  )
}
