// src/app/api/bookings/[id]/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getAuthenticatedUser, createServiceClient } from '@/lib/supabase/server'
import { processRefund, calculateRefundAmount } from '@/lib/stripe'
import { deleteMeeting } from '@/lib/zoom'
import { sendCancellationEmail } from '@/lib/email'
import { CancelBookingSchema } from '@/lib/validators'
import type { BookingWithDetails } from '@/types'

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
    const service = createServiceClient()

    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        payment:payments(
          id, amount_cents, stripe_payment_intent_id, status
        ),
        lesson:lessons(id, title, duration_mins, price_cents),
        student:users!bookings_student_id_fkey(id, full_name, email, timezone),
        teacher:users!bookings_teacher_id_fkey(id, full_name, email, timezone)
      `)
      .eq('id', booking_id)
      .single()

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

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

    let refundCents = 0
    let refundId: string | undefined
    const payment = Array.isArray(booking.payment) ? booking.payment[0] : booking.payment

    if (payment?.status === 'succeeded' && payment.stripe_payment_intent_id) {
      const { data: policy } = await service
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

    if (booking.zoom_meeting_id) {
      await deleteMeeting(booking.zoom_meeting_id).catch(err =>
        console.error('[Cancel] Zoom meeting deletion failed:', err)
      )
    }

    // Service role: students cannot UPDATE slots or arbitrary booking fields under RLS
    await service
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
        cancellation_reason: reason ?? null,
      })
      .eq('id', booking_id)

    await service
      .from('availability_slots')
      .update({ is_booked: false })
      .eq('id', booking.slot_id)

    const cancelledByStudent = user.id === booking.student_id
    const counterpartBody = cancelledByStudent
      ? `A student cancelled their booking for ${new Date(booking.scheduled_at).toLocaleString()}.`
      : user.role === 'teacher'
        ? `Your teacher cancelled the booking for ${new Date(booking.scheduled_at).toLocaleString()}.`
        : `An admin cancelled the booking for ${new Date(booking.scheduled_at).toLocaleString()}.`

    await service.from('notifications').insert([
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
        body: counterpartBody,
        data: { booking_id },
      },
    ])

    await sendCancellationEmail(
      booking as unknown as BookingWithDetails,
      refundCents
    ).catch(err => console.error('[Cancel] Email failed:', err))

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
