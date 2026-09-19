import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreateDisputeSchema = z.object({
  booking_id: z.string().uuid(),
  reason: z.string().min(20).max(2000),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const parsed = CreateDisputeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { booking_id, reason } = parsed.data
    const supabase = await createServerSupabaseClient()

    const { data: booking } = await supabase
      .from('bookings')
      .select('id, student_id, teacher_id, status')
      .eq('id', booking_id)
      .single()

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const isParty = booking.student_id === user.id || booking.teacher_id === user.id
    if (!isParty && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!['confirmed', 'completed'].includes(booking.status)) {
      return NextResponse.json({ error: 'Disputes only allowed for confirmed or completed lessons' }, { status: 400 })
    }

    const service = createServiceClient()
    const { data: existing } = await service
      .from('disputes')
      .select('id')
      .eq('booking_id', booking_id)
      .in('status', ['open', 'under_review'])
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'An open dispute already exists for this booking' }, { status: 409 })
    }

    const { data: dispute, error } = await service
      .from('disputes')
      .insert({
        booking_id,
        opened_by: user.id,
        reason,
        status: 'open',
      })
      .select()
      .single()

    if (error) throw error

    // Notify admins
    const { data: admins } = await service
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .eq('is_active', true)

    if (admins?.length) {
      await service.from('notifications').insert(
        admins.map(a => ({
          user_id: a.id,
          type: 'booking_cancelled' as const,
          title: 'New dispute opened',
          body: reason.slice(0, 120),
          data: { dispute_id: dispute.id, booking_id },
        }))
      )
    }

    return NextResponse.json({ dispute }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/disputes]', error)
    return NextResponse.json({ error: 'Failed to open dispute' }, { status: 500 })
  }
}
