// Cancels abandoned pending bookings and frees slots.
// Call from a cron (e.g. every 5–10 minutes) with Authorization: Bearer $CRON_SECRET
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

const MAX_PENDING_AGE_MINUTES = 30

type StaleBooking = {
  id: string
  slot_id: string
  stripe_payment_intent_id: string | null
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const cutoff = new Date(Date.now() - MAX_PENDING_AGE_MINUTES * 60_000).toISOString()

  const { data, error } = await supabase
    .from('bookings')
    .select('id, slot_id, stripe_payment_intent_id')
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .limit(50)

  if (error) {
    console.error('[expire-pending]', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  const stale = (data ?? []) as unknown as StaleBooking[]
  let released = 0

  for (const booking of stale) {
    if (booking.stripe_payment_intent_id) {
      try {
        await stripe.paymentIntents.cancel(booking.stripe_payment_intent_id)
      } catch (err) {
        console.warn('[expire-pending] PI cancel:', err)
      }
    }

    await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancellation_reason: 'Checkout abandoned / expired',
        cancelled_at: new Date().toISOString(),
      } as never)
      .eq('id', booking.id)
      .eq('status', 'pending')

    await supabase
      .from('availability_slots')
      .update({ is_booked: false } as never)
      .eq('id', booking.slot_id)

    await supabase
      .from('payments')
      .update({ status: 'failed' } as never)
      .eq('booking_id', booking.id)
      .eq('status', 'pending')

    released += 1
  }

  return NextResponse.json({ released, checked: stale.length })
}
