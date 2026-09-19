// src/app/api/bookings/[id]/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getAuthenticatedUser, createServiceClient } from '@/lib/supabase/server'
import { processRefund, calculateRefundAmount } from '@/lib/stripe'
import { deleteMeeting } from '@/lib/zoom'
import { CancelBookingSchema } from '@/lib/validators'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const parsed = CancelBookingSchema.safeParse({ ...body, booking_id: params.id })

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { booking_id, reason } = parsed.data
    const supabase = await createServerSupabaseClient()

    // Fetch booking with payment info
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        payment:payments(
          id, amount_cents, stripe_payment_intent_id, status
        ),
        lesson:lessons(duration_mins, price_cents)
      `)
      .eq('id', booking_id)
      .single()

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Authorization: student can cancel their own, teacher can cancel their own
    // Admin can cancel any
    const canCancel =
      user.role === 'admin' ||
      (user.role === 'student' && booking.student_id === user.id) ||
      (user.role === 'teacher' && booking.teacher_id === user.id)

    if (!canCancel) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!['pending', 'confirmed'].includes(booking.status)) {
      return NextResponse.json(
        { error: `Cannot cancel a booking with status: ${booking.status}` },
        { status: 400 }
      )
    }

    // ─── Calculate Refund ─────────────────────────────────────────
    let refundCents = 0
    let refundId: string | undefined
    const payment = Array.isArray(booking.payment) ? booking.payment[0] : booking.payment

    if (payment?.status === 'succeeded' && payment.stripe_payment_intent_id) {
      // Get cancellation policy
      const serviceSupabase = createServiceClient()
      const { data: policy } = await serviceSupabase
        .from('cancellation_policies')
        .select('*')
        .eq('teacher_id', booking.teacher_id)
        .single()

      const defaultPolicy = {
        full_refund_hours: 24,
        partial_refund_pct: 50,
        partial_refund_hours: 2,
      }

      const { refundCents: rc } = calculateRefundAmount(
        payment.amount_cents,
        new Date(booking.scheduled_at),
        policy ?? defaultPolicy
      )
      refundCents = rc

      if (refundCents > 0) {
        const refund = await processRefund({
          paymentIntentId: payment.stripe_payment_intent_id,
          amountCents: refundCents,
          reason: 'requested_by_customer',
        })
        refundId = refund.id
      }
    }

    // ─── Cancel Zoom Meeting ───────────────────────────────────────
    if (booking.zoom_meeting_id) {
      await deleteMeeting(booking.zoom_meeting_id).catch(err =>
        console.error('[Cancel] Zoom meeting deletion failed:', err)
      )
    }

    // ─── Update Booking Status ────────────────────────────────────
    await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
        cancellation_reason: reason ?? null,
      })
      .eq('id', booking_id)

    // ─── Free the slot ────────────────────────────────────────────
    await supabase
      .from('availability_slots')
      .update({ is_booked: false })
      .eq('id', booking.slot_id)

    // ─── Notify both parties ──────────────────────────────────────
    const serviceSupabase = createServiceClient()
    await serviceSupabase.from('notifications').insert([
      {
        user_id: booking.student_id,
        type: 'booking_cancelled' as const,
        title: 'Booking cancelled',
        body: refundCents > 0
          ? `Your booking was cancelled. Refund of $${(refundCents / 100).toFixed(2)} initiated.`
          : 'Your booking was cancelled.',
        data: { booking_id, refund_amount: refundCents },
      },
      {
        user_id: booking.teacher_id,
        type: 'booking_cancelled' as const,
        title: 'Booking cancelled',
        body: `A student cancelled their booking for ${new Date(booking.scheduled_at).toLocaleString()}.`,
        data: { booking_id },
      },
    ])

    return NextResponse.json({
      success: true,
      refundAmount: refundCents,
      refundId,
    })

  } catch (error) {
    console.error('[POST /api/bookings/[id]/cancel]', error)
    return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 })
  }
}
