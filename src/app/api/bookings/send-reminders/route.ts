// Sends 1-hour lesson reminder emails. Vercel Cron: GET every 10 min.
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendLessonReminderEmail } from '@/lib/email'
import type { BookingWithDetails } from '@/types'

function authorize(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization')
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  if (auth === `Bearer ${secret}`) return true
  // Also accept Vercel cron header when CRON_SECRET matches
  const cronHeader = request.headers.get('x-vercel-cron')
  if (cronHeader && auth === `Bearer ${secret}`) return true
  return false
}

async function runReminders() {
  const supabase = createServiceClient()
  const now = Date.now()
  const windowStart = new Date(now + 50 * 60_000).toISOString() // ~50 min ahead
  const windowEnd = new Date(now + 70 * 60_000).toISOString() // ~70 min ahead

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

  if (error) {
    console.error('[send-reminders]', error)
    return { sent: 0, error: error.message }
  }

  let sent = 0
  for (const booking of bookings ?? []) {
    const alreadySent = (booking as any).reminder_sent_at
    if (alreadySent) continue

    try {
      await sendLessonReminderEmail(booking as unknown as BookingWithDetails)
      await supabase
        .from('bookings')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', booking.id)
      sent += 1
    } catch (err) {
      console.error(`[send-reminders] failed for ${booking.id}:`, err)
    }
  }

  return { sent, checked: bookings?.length ?? 0 }
}

export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await runReminders()
  return NextResponse.json(result)
}

export async function GET(request: NextRequest) {
  return POST(request)
}
