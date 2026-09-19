// src/app/api/admin/teachers/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createServiceClient } from '@/lib/supabase/server'
import { AdminVerifyTeacherSchema } from '@/lib/validators'

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = AdminVerifyTeacherSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
  }

  const { teacher_profile_id, is_verified, verification_note } = parsed.data
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('teacher_profiles')
    .update({ is_verified, verification_note: verification_note ?? null })
    .eq('id', teacher_profile_id)

  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  // Notify teacher
  const { data: profile } = await supabase
    .from('teacher_profiles')
    .select('user_id')
    .eq('id', teacher_profile_id)
    .single()

  if (profile) {
    await supabase.from('notifications').insert({
      user_id: profile.user_id,
      type: 'teacher_approved' as const,
      title: is_verified ? 'Your account has been verified!' : 'Verification update',
      body: is_verified
        ? 'Congratulations! You are now a verified teacher on Stanza.'
        : `Your verification was not approved. ${verification_note ?? ''}`,
      data: { is_verified },
    })
  }

  return NextResponse.json({ success: true })
}
