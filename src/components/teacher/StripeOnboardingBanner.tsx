'use client'
import { useState } from 'react'

interface StripeStatus {
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  requirements: string[]
}

interface Props {
  teacherId: string
  status: StripeStatus | null
  className?: string
}

export function StripeOnboardingBanner({ status, className = '' }: Props) {
  const [loading, setLoading] = useState(false)

  const isNotStarted = !status?.detailsSubmitted
  const isPending = !!(status?.detailsSubmitted && !status.chargesEnabled)

  async function startOnboarding() {
    setLoading(true)
    try {
      const res = await fetch('/api/payments/connect/onboard', { method: 'POST' })
      const { url } = await res.json()
      if (url) window.location.href = url
    } finally {
      setLoading(false)
    }
  }

  if (!isNotStarted && !isPending) return null

  return (
    <div className={`glass-gold rounded-2xl p-5 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <p className="font-medium text-[#E8C87A] text-sm">
            {isNotStarted ? 'Set up payouts to accept bookings' : 'Complete your payout setup'}
          </p>
          <p className="text-white/45 text-xs mt-1.5 leading-relaxed">
            {isNotStarted
              ? 'Connect your bank account via Stripe Express to receive student payments automatically.'
              : 'Your Stripe account is under review. You may need to provide additional information.'}
          </p>
          {isPending && status?.requirements && status.requirements.length > 0 && (
            <ul className="mt-3 space-y-1">
              {status.requirements.slice(0, 3).map(r => (
                <li key={r} className="text-xs text-white/40 flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-[#C9A84C] rounded-full" />
                  {r.replace(/_/g, ' ')}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          onClick={startOnboarding}
          disabled={loading}
          className="btn-primary flex-shrink-0 px-4 py-2.5 text-sm disabled:opacity-50"
        >
          {loading ? 'Opening…' : isNotStarted ? 'Connect Stripe' : 'Continue setup'}
        </button>
      </div>
    </div>
  )
}
