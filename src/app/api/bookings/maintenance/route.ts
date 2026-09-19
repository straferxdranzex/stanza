// Marks ended confirmed lessons as completed, and retries Zoom for confirmed
// bookings that never got a meeting. Auth: Authorization: Bearer $CRON_SECRET
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createMeeting } from '@/lib/zoom'
import type { BookingWithDetails } from '@/types'

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date().toISOString()

  // ─── 1. Complete past confirmed bookings ─────────────────────
  const { data: toComplete, error: completeError } = await supabase
    .from('bookings')
    .update({ status: 'completed' })
    .eq('status', 'confirmed')
    .lt('ends_at', now)
    .select('id')

  if (completeError) {
    console.error('[bookings/maintenance] complete failed:', completeError)
  }

  // ─── 2. Retry Zoom for confirmed bookings missing a meeting ──
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
      console.error(`[bookings/maintenance] Zoom retry failed for ${booking.id}:`, err)
    }
  }

  return NextResponse.json({
    completed: toComplete?.length ?? 0,
    zoomCreated,
    zoomFailed,
  })
}
