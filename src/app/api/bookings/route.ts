// src/app/api/bookings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getAuthenticatedUser, createServiceClient } from '@/lib/supabase/server'
import { createPaymentIntent, calculateFees } from '@/lib/stripe'
import { CreateBookingSchema } from '@/lib/validators'

async function rollbackBooking(
  bookingId: string,
  slotId: string,
  paymentIntentId?: string
) {
  const supabase = createServiceClient()
  await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      cancellation_reason: 'Payment setup failed',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', bookingId)

  await supabase
    .from('availability_slots')
    .update({ is_booked: false })
    .eq('id', slotId)

  await supabase.from('payments').delete().eq('booking_id', bookingId)

  if (paymentIntentId) {
    try {
      const { stripe } = await import('@/lib/stripe')
      await stripe.paymentIntents.cancel(paymentIntentId)
    } catch (err) {
      console.error('[rollbackBooking] Failed to cancel PaymentIntent:', err)
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'student') {
      return NextResponse.json({ error: 'Only students can book lessons' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = CreateBookingSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { slot_id, lesson_id, notes } = parsed.data
    const supabase = await createServerSupabaseClient()

    // ─── Step 1: Get the lesson (price + teacher info) ───────────
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lesson_id)
      .eq('is_active', true)
      .single()

    if (lessonError || !lesson) {
      return NextResponse.json({ error: 'Lesson not found or inactive' }, { status: 404 })
    }

    // ─── Step 2: Get teacher's Stripe account ────────────────────
    const { data: teacherProfile } = await supabase
      .from('teacher_profiles')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('user_id', lesson.teacher_id)
      .single()

    if (!teacherProfile?.stripe_account_id || !teacherProfile.stripe_onboarding_complete) {
      return NextResponse.json(
        { error: 'Teacher has not completed payment setup' },
        { status: 400 }
      )
    }

    // ─── Step 3: Atomic slot booking via DB function ─────────────
    const { data: bookingId, error: bookingError } = await supabase
      .rpc('book_slot', {
        p_slot_id: slot_id,
        p_student_id: user.id,
        p_lesson_id: lesson_id,
        p_notes: notes ?? null,
      })

    if (bookingError) {
      if (bookingError.message.includes('slot_unavailable')) {
        return NextResponse.json(
          { error: 'This time slot was just booked by someone else. Please choose another.' },
          { status: 409 }
        )
      }
      throw bookingError
    }

    // ─── Step 4: Stripe PaymentIntent — rollback slot if this fails ────
    const idempotencyKey = `booking-pi-${bookingId}`
    const { platformFeeCents, teacherPayoutCents } = calculateFees(lesson.price_cents)

    let paymentIntentId: string | undefined
    try {
      const paymentIntent = await createPaymentIntent({
        bookingId,
        amountCents: lesson.price_cents,
        teacherStripeAccountId: teacherProfile.stripe_account_id,
        idempotencyKey,
        studentEmail: user.email,
      })
      paymentIntentId = paymentIntent.id

      // Service role: payments have no student INSERT policy by design
      const service = createServiceClient()
      const { error: paymentInsertError } = await service.from('payments').insert({
        booking_id: bookingId,
        student_id: user.id,
        teacher_id: lesson.teacher_id,
        stripe_payment_intent_id: paymentIntent.id,
        amount_cents: lesson.price_cents,
        platform_fee_cents: platformFeeCents,
        teacher_payout_cents: teacherPayoutCents,
        status: 'pending',
        idempotency_key: idempotencyKey,
      })

      if (paymentInsertError) {
        throw paymentInsertError
      }

      const { error: bookingUpdateError } = await service
        .from('bookings')
        .update({ stripe_payment_intent_id: paymentIntent.id })
        .eq('id', bookingId)

      if (bookingUpdateError) {
        throw bookingUpdateError
      }

      return NextResponse.json({
        bookingId,
        paymentIntentClientSecret: paymentIntent.client_secret,
        amount: lesson.price_cents,
        currency: 'usd',
      })
    } catch (stripeOrDbError) {
      console.error('[POST /api/bookings] Payment setup failed, rolling back:', stripeOrDbError)
      await rollbackBooking(bookingId, slot_id, paymentIntentId)
      return NextResponse.json(
        { error: 'Could not start payment. The slot has been released — please try again.' },
        { status: 502 }
      )
    }

  } catch (error) {
    console.error('[POST /api/bookings]', error)
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    )
  }
}

// ─── GET: List bookings (role-aware) ─────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
    const offset = (page - 1) * limit

    const supabase = await createServerSupabaseClient()

    let query = supabase
      .from('bookings')
      .select(`
        *,
        student:users!bookings_student_id_fkey(id, full_name, avatar_url, email, timezone),
        teacher:users!bookings_teacher_id_fkey(id, full_name, avatar_url, email, timezone),
        lesson:lessons(id, title, duration_mins, price_cents),
        payment:payments(id, amount_cents, status, platform_fee_cents, teacher_payout_cents),
        review:reviews(id, rating, comment)
      `, { count: 'exact' })
      .order('scheduled_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (user.role === 'student') {
      query = query.eq('student_id', user.id)
    } else if (user.role === 'teacher') {
      query = query.eq('teacher_id', user.id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      bookings: data,
      total: count ?? 0,
      page,
      limit,
    })

  } catch (error) {
    console.error('[GET /api/bookings]', error)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}
