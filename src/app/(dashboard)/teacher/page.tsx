import { redirect } from 'next/navigation'
import { getAuthenticatedUser, isSupabaseConfigured, createServerSupabaseClient } from '@/lib/supabase/server'
import { checkStripeAccountStatus } from '@/lib/stripe'
import { TeacherDashboardClient } from '@/components/teacher/TeacherDashboardClient'
import { UnconfiguredBanner } from '@/components/shared/UnconfiguredBanner'

const DEMO_USER = {
  id: 'demo', role: 'teacher' as const, full_name: 'Demo Teacher',
  email: 'demo@example.com', avatar_url: null, timezone: 'UTC',
}
const DEMO_PROFILE = {
  id: 'demo', user_id: 'demo', bio: 'Experienced teacher across music and art.', headline: 'Piano & 2D Art',
  experience_years: 8, specialties: ['Piano', '2D Art'], languages: ['english'] as any,
  is_verified: true, verification_note: null, stripe_account_id: null,
  stripe_onboarding_complete: false, average_rating: 4.9, total_reviews: 47,
  total_lessons_taught: 320, is_accepting_students: true,
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
}
const DEMO_LESSONS: any[] = [
  { id: 'l1', teacher_id: 'demo', title: 'Classical Foundations', description: 'Technique, scales, and repertoire.', duration_mins: 60, price_cents: 8500, level: 'beginner', category: 'piano', is_active: true, max_students: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'l2', teacher_id: 'demo', title: 'Art Fundamentals', description: 'Shape, colour, and composition basics.', duration_mins: 60, price_cents: 7500, level: 'beginner', category: '2d_art', is_active: true, max_students: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]

export default async function TeacherDashboardPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="px-6 py-8">
        <UnconfiguredBanner />
        <TeacherDashboardClient
          user={DEMO_USER}
          profile={DEMO_PROFILE}
          stripeStatus={null}
          upcomingBookings={[]}
          lessons={DEMO_LESSONS}
          recentReviews={[]}
          stats={{ monthlyEarnings: 340000, allTimeEarnings: 2800000, totalLessonsTaught: 320, averageRating: 4.9, totalReviews: 47 }}
        />
      </div>
    )
  }

  const user = await getAuthenticatedUser()
  if (!user) redirect('/login')

  const supabase = await createServerSupabaseClient()
  const { data: profile } = await supabase.from('teacher_profiles').select('*').eq('user_id', user.id).single()

  let stripeStatus = null
  if (profile?.stripe_account_id) {
    try { stripeStatus = await checkStripeAccountStatus(profile.stripe_account_id) } catch {}
  }

  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0)
  const [
    { data: upcomingBookings },
    { data: monthlyPayments },
    { data: allTimePayments },
    { data: lessons },
    { data: recentReviews },
    { count: totalLessonsTaught },
  ] = await Promise.all([
    supabase.from('bookings').select('*, student:users!bookings_student_id_fkey(id,full_name,avatar_url,email), lesson:lessons(id,title,duration_mins,price_cents)').eq('teacher_id', user.id).in('status', ['pending','confirmed']).gte('scheduled_at', new Date().toISOString()).order('scheduled_at', { ascending: true }).limit(10),
    supabase.from('payments').select('teacher_payout_cents').eq('teacher_id', user.id).eq('status', 'succeeded').gte('created_at', monthStart.toISOString()),
    supabase.from('payments').select('teacher_payout_cents').eq('teacher_id', user.id).eq('status', 'succeeded'),
    supabase.from('lessons').select('*').eq('teacher_id', user.id).order('created_at', { ascending: false }),
    supabase.from('reviews').select('*, student:users!reviews_student_id_fkey(full_name,avatar_url), booking:bookings(lesson:lessons(title))').eq('teacher_id', user.id).eq('is_visible', true).order('created_at', { ascending: false }).limit(5),
    supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('teacher_id', user.id).eq('status', 'completed'),
  ])

  const monthlyEarnings = (monthlyPayments ?? []).reduce((s: number, p: any) => s + p.teacher_payout_cents, 0)
  const allTimeEarnings = (allTimePayments ?? []).reduce((s: number, p: any) => s + p.teacher_payout_cents, 0)

  return (
    <TeacherDashboardClient
      user={user}
      profile={profile}
      stripeStatus={stripeStatus}
      upcomingBookings={upcomingBookings ?? []}
      lessons={lessons ?? []}
      recentReviews={recentReviews ?? []}
      stats={{ monthlyEarnings, allTimeEarnings, totalLessonsTaught: totalLessonsTaught ?? 0, averageRating: profile?.average_rating ?? 0, totalReviews: profile?.total_reviews ?? 0 }}
    />
  )
}
