import { createServiceClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { TeacherProfileClient } from '@/components/teacher/TeacherProfileClient'

export default async function TeacherProfilePage({ params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const viewer = await getAuthenticatedUser()

  const { data: teacher } = await supabase
    .from('users')
    .select(`
      id, full_name, avatar_url, bio, timezone,
      teacher_profiles(
        id, headline, bio, experience_years, specialties, languages,
        is_verified, average_rating, total_reviews, total_lessons_taught,
        is_accepting_students, stripe_onboarding_complete
      ),
      lessons(id, title, description, duration_mins, price_cents, level, is_active, category)
    `)
    .eq('id', params.id)
    .eq('role', 'teacher')
    .single()

  if (!teacher) notFound()

  const profile = Array.isArray(teacher.teacher_profiles)
    ? teacher.teacher_profiles[0]
    : teacher.teacher_profiles

  const isOwner = viewer?.id === teacher.id
  const isAdmin = viewer?.role === 'admin'
  const isBookable =
    profile?.is_verified &&
    profile?.is_accepting_students &&
    profile?.stripe_onboarding_complete

  // Public marketplace only shows bookable teachers; owners/admins can always preview
  if (!isBookable && !isOwner && !isAdmin) {
    notFound()
  }

  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      id, rating, comment, created_at,
      student:users!reviews_student_id_fkey(full_name, avatar_url)
    `)
    .eq('teacher_id', params.id)
    .eq('is_visible', true)
    .order('created_at', { ascending: false })
    .limit(10)

  const activeLessons = ((teacher.lessons as any[]) ?? []).filter((l: any) => l.is_active)

  return (
    <TeacherProfileClient
      teacher={{ ...teacher, profile, lessons: activeLessons }}
      reviews={reviews ?? []}
    />
  )
}
