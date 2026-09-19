// src/lib/zoom/index.ts
import type { BookingWithDetails } from '@/types'

interface ZoomTokens {
  access_token: string
  expires_at: number
}

// Cached token (module-level, refreshed as needed)
let _tokens: ZoomTokens | null = null

async function getAccessToken(): Promise<string> {
  const now = Date.now()

  if (_tokens && _tokens.expires_at > now + 60_000) {
    return _tokens.access_token
  }

  // Server-to-Server OAuth (Zoom Server-to-Server App)
  const credentials = Buffer.from(
    `${process.env.ZOOM_ACCOUNT_ID}:${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${process.env.ZOOM_ACCOUNT_ID}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
        ).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Zoom token refresh failed: ${err}`)
  }

  const data = await res.json()
  _tokens = {
    access_token: data.access_token,
    expires_at: now + data.expires_in * 1000,
  }

  return _tokens.access_token
}

async function zoomFetch(path: string, options: RequestInit = {}) {
  const token = await getAccessToken()

  const res = await fetch(`https://api.zoom.us/v2${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(`Zoom API error ${res.status}: ${error.message}`)
  }

  if (res.status === 204) return null
  return res.json()
}

// ============================================================
// Meeting Management
// ============================================================

export interface ZoomMeeting {
  id: string
  uuid: string
  host_id: string
  join_url: string
  start_url: string
  password: string
  encrypted_password: string
  duration: number
  start_time: string
}

export async function createMeeting(booking: BookingWithDetails): Promise<ZoomMeeting> {
  const meeting = await zoomFetch('/users/me/meetings', {
    method: 'POST',
    body: JSON.stringify({
      topic: `Lesson: ${booking.lesson.title}`,
      type: 2, // Scheduled meeting
      start_time: booking.scheduled_at, // ISO 8601 UTC
      duration: booking.lesson.duration_mins,
      timezone: 'UTC',
      password: generateMeetingPassword(),
      agenda: `Lesson between ${booking.teacher.full_name} (teacher) and ${booking.student.full_name} (student)`,
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        mute_upon_entry: true,
        waiting_room: true,
        auto_recording: 'none', // Privacy: no auto recording
        meeting_authentication: false,
        approval_type: 0, // Automatically approve
        close_registration: false,
        contact_email: booking.teacher.email,
        contact_name: booking.teacher.full_name,
      },
    }),
  })

  return {
    id: String(meeting.id),
    uuid: meeting.uuid,
    host_id: meeting.host_id,
    join_url: meeting.join_url,
    start_url: meeting.start_url,
    password: meeting.password,
    encrypted_password: meeting.encrypted_password,
    duration: meeting.duration,
    start_time: meeting.start_time,
  }
}

export async function deleteMeeting(meetingId: string): Promise<void> {
  try {
    await zoomFetch(`/meetings/${meetingId}`, {
      method: 'DELETE',
      body: JSON.stringify({ schedule_for_reminder: false }),
    })
  } catch (err) {
    // Meeting may already not exist — log but don't throw
    console.error('[Zoom] Delete meeting error:', err)
  }
}

export async function updateMeeting(
  meetingId: string,
  updates: { start_time?: string; duration?: number }
): Promise<void> {
  await zoomFetch(`/meetings/${meetingId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      ...updates,
      timezone: 'UTC',
    }),
  })
}

export async function getMeeting(meetingId: string): Promise<ZoomMeeting> {
  return zoomFetch(`/meetings/${meetingId}`)
}

// ============================================================
// Helpers
// ============================================================
function generateMeetingPassword(): string {
  // Zoom passwords: max 10 chars, alphanumeric + @-_*
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

// Build a secure join URL that we serve to students (via our server, not directly)
// This prevents the raw Zoom URL from being scraped
export function buildSecureJoinUrl(bookingId: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/join/${bookingId}`
}
