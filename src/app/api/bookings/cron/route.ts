// Unified cron for Vercel Hobby (max ~2 jobs, once/day) and external schedulers.
// Prefer calling this every 10 minutes via an external cron with CRON_SECRET
// for production-quality slot expiry + reminders.
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { createMeeting } from '@/lib/zoom'
import { sendLessonReminderEmail } from '@/lib/email'
import type { BookingWithDetails } from '@/types'

const MAX_PENDING_AGE_MINUTES = 30

function authorize(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return request.headers.get('authorization') === `Bearer ${secret}`
}

async function expirePending() {
  const supabase = createServiceClient()
  const cutoff = new Date(Date.now() - MAX_PENDING_AGE_MINUTES * 60_000).toISOString()

  const { data, error } = await supabase
    .from('bookings')
    .select('id, slot_id, stripe_payment_intent_id')
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .limit(50)

  if (error) throw error

  let released = 0
  for (const booking of data ?? []) {
    if (booking.stripe_payment_intent_id) {
      try {
        await stripe.paymentIntents.cancel(booking.stripe_payment_intent_id)
      } catch (err) {
        console.warn('[cron] PI cancel:', err)
      }
    }

    await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancellation_reason: 'Checkout abandoned / expired',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', booking.id)
      .eq('status', 'pending')

    await supabase
      .from('availability_slots')
      .update({ is_booked: false })
      .eq('id', booking.slot_id)

    await supabase
      .from('payments')
      .update({ status: 'failed' })
      .eq('booking_id', booking.id)
      .eq('status', 'pending')

    released += 1
  }

  return { released, checked: data?.length ?? 0 }
}

async function maintenance() {
  const supabase = createServiceClient()
  const now = new Date().toISOString()

  const { data: toComplete, error: completeError } = await supabase
    .from('bookings')
    .update({ status: 'completed' })
    .eq('status', 'confirmed')
    .lt('ends_at', now)
    .select('id')

  if (completeError) console.error('[cron] complete failed:', completeError)

  const { data: missingZoom } = await supabase
    .from('bookings')
    .select(`
      *,
      student:users!bookings_student_id_fkey(id, full_name, avatar_url, email, timezone),
      teacher:users!bookings_teacher_id_fkey(id, full_name, avatar_url, email, timezone),
      lesson:lessons(id, title, duration_mins, price_cents)
    `)
    .eq('status', 'confirmed')
    .is('zoom_meeting_id', null)
    .gt('ends_at', now)
    .limit(20)

  let zoomCreated = 0
  let zoomFailed = 0

  for (const booking of missingZoom ?? []) {
    try {
      const meeting = await createMeeting(booking as unknown as BookingWithDetails)
      const { error } = await supabase
        .from('bookings')
        .update({
          zoom_meeting_id: meeting.id,
          zoom_join_url: meeting.join_url,
          zoom_start_url: meeting.start_url,
        })
        .eq('id', booking.id)
        .is('zoom_meeting_id', null)

      if (error) throw error
      zoomCreated += 1
    } catch (err) {
      zoomFailed += 1
      console.error(`[cron] Zoom retry failed for ${booking.id}:`, err)
    }
  }

  return {
    completed: toComplete?.length ?? 0,
    zoomCreated,
    zoomFailed,
  }
}

async function sendReminders() {
  const supabase = createServiceClient()
  const now = Date.now()
  const windowStart = new Date(now + 50 * 60_000).toISOString()
  const windowEnd = new Date(now + 70 * 60_000).toISOString()

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      *,
      student:users!bookings_student_id_fkey(id, full_name, avatar_url, email, timezone),
      teacher:users!bookings_teacher_id_fkey(id, full_name, avatar_url, email, timezone),
      lesson:lessons(id, title, duration_mins, price_cents)
    `)
    .eq('status', 'confirmed')
    .gte('scheduled_at', windowStart)
    .lte('scheduled_at', windowEnd)
    .limit(50)

  if (error) throw error

  let sent = 0
  for (const booking of bookings ?? []) {
    if ((booking as any).reminder_sent_at) continue
    try {
      await sendLessonReminderEmail(booking as unknown as BookingWithDetails)
      await supabase
        .from('bookings')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', booking.id)
      sent += 1
    } catch (err) {
      console.error(`[cron] reminder failed for ${booking.id}:`, err)
    }
  }

  return { sent, checked: bookings?.length ?? 0 }
}

async function runAll() {
  const [expired, maintained, reminded] = await Promise.all([
    expirePending(),
    maintenance(),
    sendReminders(),
  ])
  return { expired, maintained, reminded }
}

export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runAll()
    return NextResponse.json(result)
  } catch (error) {
    console.error('[cron]', error)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
