// src/lib/email/index.ts
// Uses Resend for transactional emails
// https://resend.com

import type { BookingWithDetails, DBUser } from '@/types'

interface EmailPayload {
  to: string
  subject: string
  html: string
}

async function sendEmail({ to, subject, html }: EmailPayload): Promise<void> {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM_DOMAIN) {
    console.warn('[Email] RESEND_API_KEY or EMAIL_FROM_DOMAIN missing — skip send')
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Stanza <lessons@${process.env.EMAIL_FROM_DOMAIN}>`,
      to,
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    console.error('[Email] Send failed:', error)
  }
}

function formatDateTime(isoString: string, timezone = 'UTC'): string {
  return new Date(isoString).toLocaleString('en-US', {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

// ─── Base template ─────────────────────────────────────────────
function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 580px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; }
    .header { background: #1a1a2e; color: white; padding: 32px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 500; }
    .header p { margin: 8px 0 0; opacity: 0.7; font-size: 14px; }
    .body { padding: 32px; }
    .info-box { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #666; }
    .info-value { font-weight: 500; }
    .btn { display: inline-block; background: #1a1a2e; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; margin-top: 24px; }
    .footer { padding: 24px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎨 Stanza</h1>
      <p>Your art &amp; music learning journey</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>Stanza · <a href="${process.env.NEXT_PUBLIC_APP_URL}">stanza.app</a></p>
      <p>You're receiving this because you have an account on Stanza.</p>
    </div>
  </div>
</body>
</html>`
}

// ─── Booking Confirmation ──────────────────────────────────────
export async function sendBookingConfirmationEmail(
  booking: BookingWithDetails
): Promise<void> {
  const studentTimezone = booking.student.timezone ?? 'UTC'
  const teacherTimezone = booking.teacher.timezone ?? 'UTC'

  const content = `
    <h2 style="margin-top:0">Booking confirmed!</h2>
    <p>Hi ${booking.student.full_name}, your lesson is confirmed.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Lesson</span>
        <span class="info-value">${booking.lesson.title}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Teacher</span>
        <span class="info-value">${booking.teacher.full_name}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Date & Time</span>
        <span class="info-value">${formatDateTime(booking.scheduled_at, studentTimezone)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Duration</span>
        <span class="info-value">${booking.lesson.duration_mins} minutes</span>
      </div>
    </div>
    <p>Your Zoom meeting link will be available on your dashboard 30 minutes before the lesson.</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/join/${booking.id}" class="btn">Join lesson</a>
    <p style="margin-top:16px;font-size:13px;color:#666">
      Or view all bookings: <a href="${process.env.NEXT_PUBLIC_APP_URL}/student/bookings">Student dashboard</a>
    </p>
  `

  // Email student
  await sendEmail({
    to: booking.student.email,
    subject: `Booking confirmed: ${booking.lesson.title} with ${booking.teacher.full_name}`,
    html: baseTemplate(content),
  })

  // Email teacher
  const teacherContent = `
    <h2 style="margin-top:0">New lesson booked!</h2>
    <p>Hi ${booking.teacher.full_name}, a student has booked your lesson.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Student</span>
        <span class="info-value">${booking.student.full_name}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Lesson</span>
        <span class="info-value">${booking.lesson.title}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Date & Time</span>
        <span class="info-value">${formatDateTime(booking.scheduled_at, teacherTimezone)}</span>
      </div>
    </div>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/join/${booking.id}" class="btn">Start lesson</a>
    <p style="margin-top:16px;font-size:13px;color:#666">
      Or view bookings: <a href="${process.env.NEXT_PUBLIC_APP_URL}/teacher/bookings">Teacher dashboard</a>
    </p>
  `

  await sendEmail({
    to: booking.teacher.email,
    subject: `New booking: ${booking.lesson.title} with ${booking.student.full_name}`,
    html: baseTemplate(teacherContent),
  })
}

// ─── Lesson Reminder ──────────────────────────────────────────
export async function sendLessonReminderEmail(
  booking: BookingWithDetails
): Promise<void> {
  const studentTimezone = booking.student.timezone ?? 'UTC'

  const content = `
    <h2 style="margin-top:0">Your lesson starts in 1 hour</h2>
    <p>Hi ${booking.student.full_name}, just a reminder that you have a lesson coming up!</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Time</span>
        <span class="info-value">${formatDateTime(booking.scheduled_at, studentTimezone)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Teacher</span>
        <span class="info-value">${booking.teacher.full_name}</span>
      </div>
    </div>
    ${booking.zoom_join_url || booking.id
      ? `<a href="${process.env.NEXT_PUBLIC_APP_URL}/join/${booking.id}" class="btn">Join lesson securely</a>`
      : `<a href="${process.env.NEXT_PUBLIC_APP_URL}/student/bookings" class="btn">View bookings</a>`
    }
  `

  await sendEmail({
    to: booking.student.email,
    subject: `Reminder: Lesson in 1 hour with ${booking.teacher.full_name}`,
    html: baseTemplate(content),
  })
}

// ─── Payment Failed ────────────────────────────────────────────
export async function sendPaymentFailedEmail(
  booking: Partial<BookingWithDetails> & {
    student_id: string
    student?: { email?: string; full_name?: string }
    lesson?: { title?: string }
  }
): Promise<void> {
  const email = booking.student?.email
  if (!email) {
    console.log('[Email] Payment failed — no student email for booking', booking.student_id)
    return
  }

  const content = `
    <h2 style="margin-top:0">Payment failed</h2>
    <p>Hi ${booking.student?.full_name ?? 'there'}, we couldn't process your payment${
      booking.lesson?.title ? ` for <strong>${booking.lesson.title}</strong>` : ''
    }.</p>
    <p>Your slot was released. You can try booking again with a different payment method.</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/teachers" class="btn">Browse teachers</a>
  `

  await sendEmail({
    to: email,
    subject: 'Payment failed — Stanza',
    html: baseTemplate(content),
  })
}

// ─── Cancellation ─────────────────────────────────────────────
export async function sendCancellationEmail(
  booking: BookingWithDetails,
  refundAmountCents: number
): Promise<void> {
  const content = `
    <h2 style="margin-top:0">Booking cancelled</h2>
    <p>Hi ${booking.student.full_name}, your booking has been cancelled.</p>
    ${refundAmountCents > 0
      ? `<p>A refund of <strong>$${(refundAmountCents / 100).toFixed(2)}</strong> has been initiated to your original payment method. Allow 5-10 business days.</p>`
      : '<p>No refund applies based on the cancellation policy.</p>'
    }
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/student/bookings" class="btn">View Bookings</a>
  `

  await sendEmail({
    to: booking.student.email,
    subject: 'Booking cancelled — Stanza',
    html: baseTemplate(content),
  })
}
