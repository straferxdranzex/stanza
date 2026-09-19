// supabase/functions/send-reminder/index.ts
// Runs on a cron schedule (every 15 minutes via pg_cron or Supabase scheduled functions)
// Sends reminder emails/notifications for lessons starting in ~1 hour

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const APP_URL = Deno.env.get('APP_URL')!

Deno.serve(async (req) => {
  // Validate cron secret to prevent unauthorized invocations
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const now = new Date()
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
  const oneHourFifteenFromNow = new Date(now.getTime() + 75 * 60 * 1000)

  // Find confirmed bookings starting in ~1 hour (with 15-min window to avoid duplicates)
  const { data: upcomingBookings, error } = await supabase
    .from('bookings')
    .select(`
      id, scheduled_at, zoom_join_url,
      student:users!bookings_student_id_fkey(id, full_name, email, timezone),
      teacher:users!bookings_teacher_id_fkey(id, full_name, email),
      lesson:lessons(title, duration_mins)
    `)
    .eq('status', 'confirmed')
    .gte('scheduled_at', oneHourFromNow.toISOString())
    .lte('scheduled_at', oneHourFifteenFromNow.toISOString())

  if (error) {
    console.error('[send-reminder] DB query error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  console.log(`[send-reminder] Found ${upcomingBookings?.length ?? 0} bookings to remind`)

  const results = await Promise.allSettled(
    (upcomingBookings ?? []).map(async (booking) => {
      const student = booking.student as any
      const teacher = booking.teacher as any
      const lesson = booking.lesson as any

      const formattedTime = new Date(booking.scheduled_at).toLocaleString('en-US', {
        timeZone: student.timezone ?? 'UTC',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      })

      // Send email to student
      const emailHtml = `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:40px 20px">
          <h2 style="font-size:20px;font-weight:500;color:#111">Your lesson starts in 1 hour</h2>
          <p style="color:#555">Hi ${student.full_name}, don't forget your lesson with ${teacher.full_name}!</p>
          <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:20px 0">
            <p style="margin:0 0 8px"><strong>Lesson:</strong> ${lesson.title}</p>
            <p style="margin:0 0 8px"><strong>Time:</strong> ${formattedTime}</p>
            <p style="margin:0"><strong>Duration:</strong> ${lesson.duration_mins} minutes</p>
          </div>
          ${booking.zoom_join_url
            ? `<a href="${booking.zoom_join_url}" style="display:inline-block;background:#111;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">Join Zoom Meeting</a>`
            : `<a href="${APP_URL}/join/${booking.id}" style="display:inline-block;background:#111;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">Get Meeting Link</a>`
          }
        </div>
      `

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Elevato Piano <lessons@elevatopiano.com>',
          to: student.email,
          subject: `Your lesson with ${teacher.full_name} starts in 1 hour`,
          html: emailHtml,
        }),
      })

      // Create in-app notification
      await supabase.from('notifications').insert({
        user_id: student.id,
        type: 'booking_reminder',
        title: 'Lesson reminder',
        body: `Your lesson "${lesson.title}" with ${teacher.full_name} starts in 1 hour.`,
        data: {
          booking_id: booking.id,
          zoom_join_url: booking.zoom_join_url,
        },
      })
    })
  )

  const succeeded = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return new Response(
    JSON.stringify({
      total: upcomingBookings?.length ?? 0,
      succeeded,
      failed,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
