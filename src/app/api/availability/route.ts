// src/app/api/availability/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createServerSupabaseClient } from '@/lib/supabase/server'
import { BulkAvailabilitySchema } from '@/lib/validators'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const teacherId = searchParams.get('teacher_id')
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  const availableOnly = searchParams.get('available_only') === 'true'

  if (!teacherId) return NextResponse.json({ error: 'teacher_id required' }, { status: 400 })

  const supabase = await createServerSupabaseClient()
  let query = supabase
    .from('availability_slots')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('start_time', { ascending: true })

  if (start) query = query.gte('start_time', start)
  if (end) query = query.lte('start_time', end)
  if (availableOnly) query = query.eq('is_booked', false)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 })

  return NextResponse.json({ slots: data ?? [] })
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user || user.role !== 'teacher') {
    return NextResponse.json({ error: 'Only teachers can add availability' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = BulkAvailabilitySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const slotsToInsert = parsed.data.slots.map(slot => ({
    teacher_id: user.id,
    start_time: slot.start_time,
    end_time: slot.end_time,
    is_recurring: slot.is_recurring,
    recurring_freq: slot.recurring_freq ?? null,
    recurring_end_date: slot.recurring_end_date ?? null,
  }))

  const { data, error } = await supabase
    .from('availability_slots')
    .insert(slotsToInsert)
    .select()

  if (error) {
    if (error.code === '23P01') {
      return NextResponse.json({ error: 'One or more slots overlap with existing availability' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to add slots' }, { status: 500 })
  }

  return NextResponse.json({ slots: data }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user || user.role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const slotId = searchParams.get('id')
  if (!slotId) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('availability_slots')
    .delete()
    .eq('id', slotId)
    .eq('teacher_id', user.id)
    .eq('is_booked', false)

  if (error) return NextResponse.json({ error: 'Failed to delete slot' }, { status: 500 })
  return NextResponse.json({ success: true })
}
