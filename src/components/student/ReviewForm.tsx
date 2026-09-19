'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { StarRating } from '@/components/shared'

interface Props {
  bookingId: string
  lessonTitle: string
  teacherName: string
}

export function ReviewForm({ bookingId, lessonTitle, teacherName }: Props) {
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (rating < 1) {
      setError('Please select a rating')
      return
    }
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          rating,
          comment: comment.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to submit review')
        setSubmitting(false)
        return
      }
      setDone(true)
      setTimeout(() => router.push('/student/reviews'), 1200)
    } catch {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <p className="text-emerald-400 font-medium mb-2">Thanks for your review!</p>
        <p className="text-white/40 text-sm">Redirecting…</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="glass rounded-2xl p-7 space-y-6">
      <div>
        <p className="text-xs text-white/40 mb-1">Lesson</p>
        <p className="font-medium text-white">{lessonTitle}</p>
        <p className="text-sm text-white/50 mt-0.5">with {teacherName}</p>
      </div>

      <div>
        <p className="text-xs text-white/40 mb-3">Your rating</p>
        <StarRating rating={rating} size="lg" interactive onChange={setRating} />
      </div>

      <div>
        <label className="text-xs text-white/40 mb-2 block">Comment (optional)</label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="What went well? What could improve?"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#C9A84C]/40 resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting || rating < 1}
          className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit review'}
        </button>
        <Link href="/student/bookings" className="text-sm text-white/40 hover:text-white">
          Cancel
        </Link>
      </div>
    </form>
  )
}
