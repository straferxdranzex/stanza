// src/app/api/lessons/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'
import { UpdateLessonSchema } from '@/lib/validators'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser()
  if (!user || user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const supabase = createServiceClient()
  const { data: lesson, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', params.id)
    .eq('teacher_id', user.id)
    .single()
  if (error || !lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  return NextResponse.json({ lesson })
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser()
  if (!user || user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = UpdateLessonSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('lessons')
    .update(parsed.data)
    .eq('id', params.id)
    .eq('teacher_id', user.id) // ensure teacher owns this lesson
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to update lesson' }, { status: 500 })
  return NextResponse.json({ lesson: data })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser()
  if (!user || user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Soft-delete so historical bookings retain lesson references
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('lessons')
    .update({ is_active: false })
    .eq('id', params.id)
    .eq('teacher_id', user.id)

  if (error) return NextResponse.json({ error: 'Failed to deactivate lesson' }, { status: 500 })
  return NextResponse.json({ success: true })
}
