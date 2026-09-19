import { redirect } from 'next/navigation'
import { getAuthenticatedUser, isSupabaseConfigured, createServerSupabaseClient } from '@/lib/supabase/server'
import { StudentDashboardClient } from '@/components/student/StudentDashboardClient'
import { UnconfiguredBanner } from '@/components/shared/UnconfiguredBanner'

const DEMO_USER = {
  id: 'demo', role: 'student' as const, full_name: 'Demo Student',
  email: 'demo@example.com', avatar_url: null, timezone: 'UTC',
}
const DEMO_BOOKINGS: any[] = [
  {
    id: '1', status: 'confirmed',
    scheduled_at: new Date(Date.now() + 86400000 * 2).toISOString(),
    ends_at: new Date(Date.now() + 86400000 * 2 + 3600000).toISOString(),
    teacher: { id: 't1', full_name: 'Dr. Sofia Marchetti', avatar_url: null },
    lesson: { id: 'l1', title: 'Classical Technique', duration_mins: 60, price_cents: 8500 },
  },
  {
    id: '2', status: 'confirmed',
    scheduled_at: new Date(Date.now() + 86400000 * 5).toISOString(),
    ends_at: new Date(Date.now() + 86400000 * 5 + 3600000).toISOString(),
    teacher: { id: 't2', full_name: 'Yuki Tanaka', avatar_url: null },
    lesson: { id: 'l2', title: 'Art Fundamentals', duration_mins: 45, price_cents: 6000 },
  },
]

export default async function StudentDashboardPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="px-6 py-8">
        <UnconfiguredBanner />
        <StudentDashboardClient
          user={DEMO_USER}
          upcomingBookings={DEMO_BOOKINGS}
          completedBookings={[]}
          unreadMessages={2}
          notifications={[]}
          stats={{ totalLessons: 12, totalSpentCents: 102000 }}
        />
      </div>
    )
  }

  const user = await getAuthenticatedUser()
  if (!user) redirect('/login')

  const supabase = await createServerSupabaseClient()

  const [
    { data: upcoming },
    { data: completed },
    { count: unreadMessages },
    { data: notifications },
    { count: totalLessons },
    { data: spentData },
  ] = await Promise.all([
    supabase.from('bookings').select('*, teacher:users!bookings_teacher_id_fkey(id,full_name,avatar_url), lesson:lessons(id,title,duration_mins,price_cents)').eq('student_id', user.id).in('status', ['pending','confirmed']).gte('scheduled_at', new Date().toISOString()).order('scheduled_at', { ascending: true }).limit(5),
    supabase.from('bookings').select('*, teacher:users!bookings_teacher_id_fkey(id,full_name,avatar_url), lesson:lessons(title), review:reviews(id)').eq('student_id', user.id).eq('status', 'completed').order('scheduled_at', { ascending: false }).limit(5),
    supabase.from('messages').select('id', { count: 'exact', head: true }).eq('receiver_id', user.id).eq('is_read', false),
    supabase.from('notifications').select('*').eq('user_id', user.id).eq('is_read', false).order('created_at', { ascending: false }).limit(10),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('student_id', user.id).eq('status', 'completed'),
    supabase.from('payments').select('amount_cents').eq('student_id', user.id).eq('status', 'succeeded'),
  ])

  const totalSpentCents = (spentData ?? []).reduce((s: number, p: any) => s + p.amount_cents, 0)

  return (
    <StudentDashboardClient
      user={user}
      upcomingBookings={upcoming ?? []}
      completedBookings={completed ?? []}
      unreadMessages={unreadMessages ?? 0}
      notifications={notifications ?? []}
      stats={{ totalLessons: totalLessons ?? 0, totalSpentCents }}
    />
  )
}
