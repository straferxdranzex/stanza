// src/app/api/lessons/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createServerSupabaseClient } from '@/lib/supabase/server'
import { CreateLessonSchema, UpdateLessonSchema } from '@/lib/validators'

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user || user.role !== 'teacher') {
    return NextResponse.json({ error: 'Only teachers can create lessons' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = CreateLessonSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('lessons')
    .insert({ ...parsed.data, teacher_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to create lesson' }, { status: 500 })
  return NextResponse.json({ lesson: data }, { status: 201 })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const teacherId = searchParams.get('teacher_id')

  const supabase = await createServerSupabaseClient()
  let query = supabase.from('lessons').select('*').eq('is_active', true)
  if (teacherId) query = query.eq('teacher_id', teacherId)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Failed to fetch lessons' }, { status: 500 })
  return NextResponse.json({ lessons: data ?? [] })
}
