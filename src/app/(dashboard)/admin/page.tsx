import { redirect } from 'next/navigation'
import { getAuthenticatedUser, isSupabaseConfigured, createServiceClient } from '@/lib/supabase/server'
import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient'
import { UnconfiguredBanner } from '@/components/shared/UnconfiguredBanner'

const DEMO_USER = {
  id: 'demo', role: 'admin' as const, full_name: 'Demo Admin',
  email: 'demo@example.com', avatar_url: null, timezone: 'UTC',
}

export default async function AdminDashboardPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="px-6 py-8">
        <UnconfiguredBanner />
        <AdminDashboardClient
          user={DEMO_USER}
          stats={{ gmv30d: 1240000, platformEarnings30d: 12400, totalUsers: 2847, pendingTeachers: 3, openDisputes: 1, transactions30d: 148 }}
          recentBookings={[
            { id: '1', status: 'confirmed', created_at: new Date().toISOString(), student: { full_name: 'Alice Chen' }, teacher: { full_name: 'Dr. Sofia Marchetti' }, lesson: { title: 'Classical Piano Technique', price_cents: 8500 } },
            { id: '2', status: 'completed', created_at: new Date(Date.now() - 86400000).toISOString(), student: { full_name: 'James Park' }, teacher: { full_name: 'Yuki Tanaka' }, lesson: { title: 'Art Fundamentals', price_cents: 6000 } },
            { id: '3', status: 'cancelled', created_at: new Date(Date.now() - 86400000*2).toISOString(), student: { full_name: 'Sara Kim' }, teacher: { full_name: 'Marco Reyes' }, lesson: { title: 'Cello Technique', price_cents: 9500 } },
          ]}
          pendingTeachers={[
            { id: 'p1', bio: '8 years teaching violin and chamber music. Graduate of the Royal Academy.', specialties: ['Violin','Chamber Music'], user: { id: 'u1', full_name: 'James Okafor', email: 'james@example.com', avatar_url: null, created_at: new Date(Date.now() - 86400000*3).toISOString() } },
          ]}
        />
      </div>
    )
  }

  const user = await getAuthenticatedUser()
  if (!user || user.role !== 'admin') redirect('/login')

  const supabase = createServiceClient()
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [
    { data: payments30d },
    { count: totalUsers },
    { count: pendingTeachers },
    { count: openDisputes },
    { data: recentBookings },
    { data: pendingTeachersList },
  ] = await Promise.all([
    supabase.from('payments').select('amount_cents,platform_fee_cents,status').eq('status','succeeded').gte('created_at', thirtyDaysAgo.toISOString()),
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('teacher_profiles').select('id', { count: 'exact', head: true }).eq('is_verified', false),
    supabase.from('disputes').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('bookings').select('id,status,scheduled_at,created_at, student:users!bookings_student_id_fkey(full_name), teacher:users!bookings_teacher_id_fkey(full_name), lesson:lessons(title,price_cents)').order('created_at', { ascending: false }).limit(10),
    supabase.from('teacher_profiles').select('*, user:users!teacher_profiles_user_id_fkey(id,full_name,email,avatar_url,created_at)').eq('is_verified', false).order('created_at', { ascending: true }).limit(10),
  ])

  const gmv30d = (payments30d ?? []).reduce((s, p) => s + p.amount_cents, 0)
  const platformEarnings30d = (payments30d ?? []).reduce((s, p) => s + p.platform_fee_cents, 0)

  return (
    <AdminDashboardClient
      user={user}
      stats={{ gmv30d, platformEarnings30d, totalUsers: totalUsers ?? 0, pendingTeachers: pendingTeachers ?? 0, openDisputes: openDisputes ?? 0, transactions30d: (payments30d ?? []).length }}
      recentBookings={recentBookings ?? []}
      pendingTeachers={pendingTeachersList ?? []}
    />
  )
}
