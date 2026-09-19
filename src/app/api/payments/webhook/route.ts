// src/app/api/payments/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { constructWebhookEvent } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { createMeeting } from '@/lib/zoom'
import { sendBookingConfirmationEmail, sendPaymentFailedEmail } from '@/lib/email'
import type Stripe from 'stripe'
import type { BookingWithDetails } from '@/types'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret || webhookSecret === 'whsec_placeholder') {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = constructWebhookEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        const bookingId = pi.metadata.booking_id
        if (!bookingId) break

        // Idempotency: skip if payment already marked succeeded
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id, status')
          .eq('stripe_payment_intent_id', pi.id)
          .maybeSingle()

        if (existingPayment?.status === 'succeeded') {
          // Still ensure Zoom exists if a previous attempt failed mid-way
          const { data: existingBooking } = await supabase
            .from('bookings')
            .select('id, zoom_meeting_id, status')
            .eq('id', bookingId)
            .single()

          if (existingBooking?.zoom_meeting_id) {
            break
          }
        } else {
          await supabase
            .from('payments')
            .update({
              status: 'succeeded',
              stripe_charge_id: typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id ?? null,
            })
            .eq('stripe_payment_intent_id', pi.id)
        }

        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', bookingId)
          .select(`
            *,
            student:users!bookings_student_id_fkey(id, full_name, avatar_url, email, timezone),
            teacher:users!bookings_teacher_id_fkey(id, full_name, avatar_url, email, timezone),
            lesson:lessons(id, title, duration_mins, price_cents)
          `)
          .single()

        if (bookingError || !booking) {
          throw bookingError ?? new Error(`Booking ${bookingId} not found after payment`)
        }

        if (!(booking as any).zoom_meeting_id) {
          try {
            const meeting = await createMeeting(booking as unknown as BookingWithDetails)
            const { error: zoomUpdateError } = await supabase
              .from('bookings')
              .update({
                zoom_meeting_id: meeting.id,
                zoom_join_url: meeting.join_url,
                zoom_start_url: meeting.start_url,
              })
              .eq('id', bookingId)

            if (zoomUpdateError) throw zoomUpdateError
          } catch (zoomErr) {
            // Payment already succeeded — don't fail the webhook (Stripe would retry forever).
            // Notify teacher so Zoom can be set up manually / via a later job.
            console.error('[Stripe Webhook] Zoom meeting creation failed:', zoomErr)
            await supabase.from('notifications').insert({
              user_id: (booking as any).teacher_id,
              type: 'booking_confirmed',
              title: 'Booking confirmed — Zoom setup needed',
              body: `Booking ${bookingId} confirmed but Zoom meeting creation failed. Please set up manually.`,
              data: { booking_id: bookingId, zoom_error: true },
            })
          }
        }

        await Promise.allSettled([
          sendBookingConfirmationEmail(booking as unknown as BookingWithDetails),
          supabase.from('notifications').insert([
            {
              user_id: (booking as any).student_id,
              type: 'booking_confirmed',
              title: 'Booking confirmed!',
              body: `Your lesson "${(booking as any).lesson?.title}" is confirmed.`,
              data: { booking_id: bookingId },
            },
            {
              user_id: (booking as any).teacher_id,
              type: 'booking_confirmed',
              title: 'New lesson booked',
              body: `${(booking as any).student?.full_name} booked "${(booking as any).lesson?.title}".`,
              data: { booking_id: bookingId },
            },
          ]),
        ])

        break
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        const bookingId = pi.metadata.booking_id
        if (!bookingId) break

        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent_id', pi.id)

        const { data: booking } = await supabase
          .from('bookings')
          .update({
            status: 'cancelled',
            cancellation_reason: 'Payment failed',
            cancelled_at: new Date().toISOString(),
          })
          .eq('id', bookingId)
          .neq('status', 'cancelled')
          .select(`
            slot_id,
            student_id,
            lesson:lessons(title),
            student:users!bookings_student_id_fkey(email, full_name)
          `)
          .maybeSingle()

        if (booking) {
          await supabase
            .from('availability_slots')
            .update({ is_booked: false })
            .eq('id', (booking as any).slot_id)

          await supabase.from('notifications').insert({
            user_id: (booking as any).student_id,
            type: 'booking_cancelled',
            title: 'Payment failed',
            body: `Your payment for "${(booking as any).lesson?.title}" failed. Please try again.`,
            data: { booking_id: bookingId, reason: 'payment_failed' },
          })

          await sendPaymentFailedEmail({
            ...(booking as any),
            student: Array.isArray((booking as any).student)
              ? (booking as any).student[0]
              : (booking as any).student,
            lesson: Array.isArray((booking as any).lesson)
              ? (booking as any).lesson[0]
              : (booking as any).lesson,
          })
        }

        break
      }

      case 'payment_intent.canceled': {
        // Abandoned / expired checkout — free the slot
        const pi = event.data.object as Stripe.PaymentIntent
        const bookingId = pi.metadata.booking_id
        if (!bookingId) break

        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent_id', pi.id)
          .eq('status', 'pending')

        const { data: booking } = await supabase
          .from('bookings')
          .update({
            status: 'cancelled',
            cancellation_reason: 'Payment canceled or expired',
            cancelled_at: new Date().toISOString(),
          })
          .eq('id', bookingId)
          .eq('status', 'pending')
          .select('slot_id')
          .maybeSingle()

        if (booking) {
          await supabase
            .from('availability_slots')
            .update({ is_booked: false })
            .eq('id', (booking as any).slot_id)
        }

        break
      }

      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer
        if (transfer.metadata?.booking_id) {
          await supabase
            .from('payments')
            .update({ stripe_transfer_id: transfer.id })
            .eq('booking_id', transfer.metadata.booking_id)
        }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const refunds = charge.refunds?.data ?? []
        const latestRefund = refunds[0]
        if (!latestRefund) break

        await supabase
          .from('payments')
          .update({
            status: charge.amount_refunded === charge.amount ? 'refunded' : 'partially_refunded',
            refund_amount_cents: charge.amount_refunded,
            stripe_refund_id: latestRefund.id,
            refunded_at: new Date().toISOString(),
          })
          .eq('stripe_charge_id', charge.id)

        const { data: payment } = await supabase
          .from('payments')
          .select('booking_id, student_id')
          .eq('stripe_charge_id', charge.id)
          .single()

        if (payment) {
          await supabase.from('notifications').insert({
            user_id: payment.student_id,
            type: 'refund_processed',
            title: 'Refund processed',
            body: `$${(charge.amount_refunded / 100).toFixed(2)} has been refunded to your card.`,
            data: {
              booking_id: payment.booking_id,
              refund_amount: charge.amount_refunded,
            },
          })

          await supabase
            .from('bookings')
            .update({ status: 'refunded' })
            .eq('id', payment.booking_id)
        }

        break
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        await supabase
          .from('teacher_profiles')
          .update({
            stripe_onboarding_complete:
              !!(account.charges_enabled && account.payouts_enabled),
          })
          .eq('stripe_account_id', account.id)
        break
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (err) {
    console.error('[Stripe Webhook] Handler error:', err)
    // Return 500 so Stripe retries — do NOT swallow failures
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }
}
