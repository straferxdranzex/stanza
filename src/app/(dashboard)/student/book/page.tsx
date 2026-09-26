'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { createClient } from '@/lib/supabase/client'
import { getStripe } from '@/lib/stripe/client'
import { CheckoutForm } from '@/components/booking/CheckoutForm'
import Link from 'next/link'
import { Navbar } from '@/components/landing/Navbar'

interface SlotInfo {
  id: string
  start_time: string
  end_time: string
}
interface LessonInfo {
  id: string
  title: string
  duration_mins: number
  price_cents: number
}
interface TeacherInfo {
  id: string
  full_name: string
}

type Step = 'review' | 'pay' | 'done'

function BookPageContent() {
  const params = useSearchParams()
  const router = useRouter()
  const slotId = params.get('slot')
  const lessonId = params.get('lesson')
  const teacherId = params.get('teacher')

  const [slot, setSlot] = useState<SlotInfo | null>(null)
  const [lesson, setLesson] = useState<LessonInfo | null>(null)
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [step, setStep] = useState<Step>('review')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)

  useEffect(() => {
    if (!slotId || !lessonId || !teacherId) { router.push('/teachers'); return }
    const supabase = createClient()

    Promise.all([
      supabase.from('availability_slots').select('id,start_time,end_time').eq('id', slotId).single(),
      supabase.from('lessons').select('id,title,duration_mins,price_cents').eq('id', lessonId).single(),
      supabase.from('users').select('id,full_name').eq('id', teacherId).single(),
    ]).then(([{ data: s }, { data: l }, { data: t }]) => {
      setSlot(s)
      setLesson(l)
      setTeacher(t)
      setLoading(false)
    })
  }, [slotId, lessonId, teacherId, router])

  async function startCheckout() {
    if (!slot || !lesson) return
    setBooking(true)
    setError('')

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_id: slot.id, lesson_id: lesson.id, notes }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Booking failed. Please try again.')
        setBooking(false)
        return
      }

      setBookingId(data.bookingId)

      if (!data.paymentIntentClientSecret) {
        setError('Payment could not be initialized. Please try again or contact support.')
        setBooking(false)
        return
      }

      setClientSecret(data.paymentIntentClientSecret)
      setStep('pay')
      setBooking(false)
    } catch {
      setError('Something went wrong. Please try again.')
      setBooking(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" />
    </div>
  )

  if (step === 'done') return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center px-6">
      <div className="glass rounded-2xl p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Payment received</h1>
        <p className="text-white/50 text-sm mb-6">
          Your lesson with {teacher?.full_name} is confirmed.
          A Zoom link will appear on your bookings page once ready.
        </p>
        <Link href="/student/bookings" className="btn-primary px-6 py-2.5 text-sm inline-block">
          View bookings
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#050508]">
      <Navbar />
      <div className="max-w-lg mx-auto px-6 pt-28 pb-16">
        <Link href={`/teachers/${teacherId}`} className="text-sm text-white/40 hover:text-white mb-6 inline-flex items-center gap-1.5">
          ← Back to profile
        </Link>

        <h1 className="text-2xl font-bold text-white mb-2">
          {step === 'pay' ? 'Complete payment' : 'Confirm your booking'}
        </h1>
        <p className="text-white/40 text-sm mb-8">
          {step === 'pay' ? 'Enter your card details to confirm the lesson.' : 'Review details, then pay securely with Stripe.'}
        </p>

        <div className="glass rounded-2xl p-6 space-y-5">
          <div className="pb-5 border-b border-white/[0.06]">
            <p className="text-xs text-white/40 mb-1">Lesson</p>
            <p className="font-medium text-white">{lesson?.title}</p>
            <p className="text-sm text-white/50">
              {lesson?.duration_mins} min · ${((lesson?.price_cents ?? 0) / 100).toFixed(2)}
            </p>
          </div>

          <div className="pb-5 border-b border-white/[0.06]">
            <p className="text-xs text-white/40 mb-1">Teacher</p>
            <p className="font-medium text-white">{teacher?.full_name}</p>
          </div>

          <div className={`pb-5 ${step === 'review' ? 'border-b border-white/[0.06]' : ''}`}>
            <p className="text-xs text-white/40 mb-1">Time</p>
            <p className="font-medium text-white">
              {slot ? new Date(slot.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : '—'}
            </p>
            <p className="text-sm text-white/50">
              {slot
                ? `${new Date(slot.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} – ${new Date(slot.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                : '—'}
            </p>
          </div>

          {step === 'review' && (
            <>
              <div>
                <label className="text-xs text-white/40 mb-2 block">Message to teacher (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Any questions or special requests?"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#C9A84C]/40 resize-none"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                onClick={startCheckout}
                disabled={booking}
                className="btn-primary w-full py-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {booking ? 'Reserving slot…' : `Continue to payment — $${((lesson?.price_cents ?? 0) / 100).toFixed(2)}`}
              </button>

              <p className="text-xs text-white/30 text-center">
                Your slot is reserved when you start checkout and released if payment fails or expires. Platform fee: 1%.
              </p>
            </>
          )}

          {step === 'pay' && clientSecret && (
            <>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Elements
                stripe={getStripe()}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'night',
                    variables: {
                      colorPrimary: '#C9A84C',
                      colorBackground: '#0a0a0f',
                      colorText: '#ffffff',
                      colorDanger: '#f87171',
                      borderRadius: '12px',
                    },
                  },
                }}
              >
                <CheckoutForm
                  amountCents={lesson?.price_cents ?? 0}
                  onSuccess={() => setStep('done')}
                  onError={(msg) => setError(msg)}
                />
              </Elements>
              {bookingId && (
                <p className="text-[11px] text-white/20 text-center">Booking ref: {bookingId.slice(0, 8)}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BookPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050508]" />}>
      <BookPageContent />
    </Suspense>
  )
}
