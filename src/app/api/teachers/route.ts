// src/app/api/teachers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { SearchTeachersSchema } from '@/lib/validators'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const parsed = SearchTeachersSchema.safeParse(params)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { minPrice, maxPrice, minRating, level, category, language, page, limit } = parsed.data
    const offset = (page - 1) * limit
    const supabase = createServiceClient()

    // ── 1. Fetch teacher profiles ─────────────────────────────────────────
    let profilesQuery = supabase
      .from('teacher_profiles')
      .select('*', { count: 'exact' })
      .eq('is_accepting_students', true)
      .eq('is_verified', true)
      .eq('stripe_onboarding_complete', true)
      .order('average_rating', { ascending: false })
      .range(offset, offset + limit - 1)

    if (minRating !== undefined) profilesQuery = profilesQuery.gte('average_rating', minRating)
    if (language) profilesQuery = profilesQuery.contains('languages', [language])

    const { data: profiles, error: profilesError, count } = await profilesQuery

    if (profilesError) {
      console.error('[teachers] profiles error:', profilesError.message)
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ teachers: [], total: 0, page, limit })
    }

    // ── 2. Fetch users for those profiles ────────────────────────────────
    const userIds = profiles.map((p: any) => p.user_id).filter(Boolean)

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, avatar_url, bio, timezone')
      .in('id', userIds)

    if (usersError) {
      console.error('[teachers] users error:', usersError.message)
      return NextResponse.json({ error: usersError.message }, { status: 500 })
    }

    // ── 3. Fetch active lessons for those teachers ────────────────────────
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, teacher_id, title, duration_mins, price_cents, level, category, is_active')
      .in('teacher_id', userIds)
      .eq('is_active', true)

    if (lessonsError) {
      console.error('[teachers] lessons error:', lessonsError.message)
      return NextResponse.json({ error: lessonsError.message }, { status: 500 })
    }

    // ── 4. Merge in JS ────────────────────────────────────────────────────
    const usersMap: Record<string, any> = Object.fromEntries((users ?? []).map((u: any) => [u.id, u]))
    const lessonsByTeacher: Record<string, any[]> = {}
    for (const l of (lessons ?? []) as any[]) {
      if (!lessonsByTeacher[l.teacher_id]) lessonsByTeacher[l.teacher_id] = []
      lessonsByTeacher[l.teacher_id].push(l)
    }

    let merged: any[] = (profiles as any[]).map(p => ({
      ...p,
      user: usersMap[p.user_id] ?? null,
      lessons: lessonsByTeacher[p.user_id] ?? [],
    }))

    // ── 5. Post-fetch filters ─────────────────────────────────────────────
    if (category || level || minPrice !== undefined || maxPrice !== undefined) {
      merged = merged.filter(t =>
        t.lessons.some((l: any) => {
          if (category && l.category !== category) return false
          if (level && l.level !== level && l.level !== 'all_levels') return false
          if (minPrice !== undefined && l.price_cents < minPrice * 100) return false
          if (maxPrice !== undefined && l.price_cents > maxPrice * 100) return false
          return true
        })
      )
    }

    console.log('[teachers] returning', merged.length, 'teachers')
    return NextResponse.json({ teachers: merged, total: count ?? merged.length, page, limit })

  } catch (err: any) {
    console.error('[teachers] unexpected error:', err?.message ?? err)
    return NextResponse.json({ error: 'Failed to search teachers', detail: err?.message }, { status: 500 })
  }
}
