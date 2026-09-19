import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createServiceClient } from '@/lib/supabase/server'
import { AdminResolveDisputeSchema } from '@/lib/validators'
import { processRefund } from '@/lib/stripe'

export async function GET() {
  const admin = await getAuthenticatedUser()
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('disputes')
    .select(`
      id, status, reason, resolution_note, created_at, booking_id, opened_by,
      opener:users!disputes_opened_by_fkey(full_name, email),
      booking:bookings(
        id, scheduled_at,
        lesson:lessons(title),
        student:users!bookings_student_id_fkey(full_name),
        teacher:users!bookings_teacher_id_fkey(full_name),
        payment:payments(stripe_payment_intent_id, amount_cents, status)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[admin/disputes GET]', error)
    return NextResponse.json({ error: 'Failed to fetch disputes' }, { status: 500 })
  }

  const disputes = (data ?? []).map(d => ({
    ...d,
    opener: Array.isArray(d.opener) ? d.opener[0] : d.opener,
    booking: (() => {
      const b = Array.isArray(d.booking) ? d.booking[0] : d.booking
      if (!b) return null
      return {
        ...b,
        lesson: Array.isArray(b.lesson) ? b.lesson[0] : b.lesson,
        student: Array.isArray(b.student) ? b.student[0] : b.student,
        teacher: Array.isArray(b.teacher) ? b.teacher[0] : b.teacher,
      }
    })(),
  }))

  return NextResponse.json({ disputes })
}

export async function PATCH(request: NextRequest) {
  const admin = await getAuthenticatedUser()
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = AdminResolveDisputeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const { dispute_id, status, resolution_note, issue_refund } = parsed.data
  const supabase = createServiceClient()

  const { data: dispute, error: fetchError } = await supabase
    .from('disputes')
    .select(`
      id, status, booking_id,
      booking:bookings(
        student_id, teacher_id,
        payment:payments(stripe_payment_intent_id, amount_cents, status)
      )
    `)
    .eq('id', dispute_id)
    .single()

  if (fetchError || !dispute) {
    return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
  }

  if (!['open', 'under_review'].includes(dispute.status)) {
    return NextResponse.json({ error: 'Dispute already resolved' }, { status: 400 })
  }

  const booking = Array.isArray(dispute.booking) ? dispute.booking[0] : dispute.booking
  const payment = booking?.payment
    ? (Array.isArray(booking.payment) ? booking.payment[0] : booking.payment)
    : null

  if (issue_refund && payment?.status === 'succeeded' && payment.stripe_payment_intent_id) {
    try {
      await processRefund({
        paymentIntentId: payment.stripe_payment_intent_id,
        amountCents: payment.amount_cents,
        reason: 'requested_by_customer',
      })
    } catch (err) {
      console.error('[admin/disputes] refund failed', err)
      return NextResponse.json({ error: 'Refund failed — dispute not updated' }, { status: 502 })
    }
  }

  const { error: updateError } = await supabase
    .from('disputes')
    .update({
      status,
      resolution_note,
      resolved_by: admin.id,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', dispute_id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update dispute' }, { status: 500 })
  }

  if (booking) {
    await supabase.from('notifications').insert([
      {
        user_id: booking.student_id,
        type: 'refund_processed',
        title: 'Dispute resolved',
        body: resolution_note,
        data: { dispute_id, status },
      },
      {
        user_id: booking.teacher_id,
        type: 'refund_processed',
        title: 'Dispute resolved',
        body: resolution_note,
        data: { dispute_id, status },
      },
    ])
  }

  return NextResponse.json({ success: true })
}
