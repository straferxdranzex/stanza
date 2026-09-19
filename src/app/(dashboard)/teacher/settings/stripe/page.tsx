'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function StripeSettingsContent() {
  const params = useSearchParams()
  const success = params.get('success') === 'true'
  const refresh = params.get('refresh') === 'true'

  const [status, setStatus] = useState<{
    onboarded: boolean
    accountId: string | null
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('teacher_profiles')
        .select('stripe_account_id, stripe_onboarding_complete')
        .eq('user_id', user.id)
        .single()
      setStatus({
        onboarded: !!(data as { stripe_onboarding_complete?: boolean } | null)?.stripe_onboarding_complete,
        accountId: (data as { stripe_account_id?: string | null } | null)?.stripe_account_id ?? null,
      })
      setChecking(false)
    }
    load()
  }, [success])

  async function continueOnboarding() {
    setLoading(true)
    try {
      const res = await fetch('/api/payments/connect/onboard', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-10">
      <Link href="/teacher/settings" className="text-sm text-white/40 hover:text-white mb-6 inline-block">
        ← Back to settings
      </Link>

      <h1 className="text-2xl font-semibold text-white mb-2">Payout setup</h1>
      <p className="text-white/50 text-sm mb-8">
        Connect Stripe to receive student payments automatically.
      </p>

      {checking ? (
        <div className="glass rounded-2xl p-10 flex justify-center">
          <div className="w-6 h-6 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="glass rounded-2xl p-7 space-y-5">
          {success && status?.onboarded && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
              <p className="text-emerald-400 text-sm font-medium">Stripe connected successfully</p>
              <p className="text-white/50 text-xs mt-1">You can now accept paid bookings.</p>
            </div>
          )}

          {success && !status?.onboarded && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
              <p className="text-amber-400 text-sm font-medium">Almost done</p>
              <p className="text-white/50 text-xs mt-1">
                Stripe is still verifying your account. This usually takes a few minutes.
              </p>
            </div>
          )}

          {refresh && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
              <p className="text-amber-400 text-sm font-medium">Setup incomplete</p>
              <p className="text-white/50 text-xs mt-1">
                Your Stripe onboarding session expired. Continue below to finish.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between py-3 border-b border-white/[0.06]">
            <span className="text-sm text-white/50">Status</span>
            <span className={`text-sm font-medium ${status?.onboarded ? 'text-emerald-400' : 'text-amber-400'}`}>
              {status?.onboarded ? 'Ready for payouts' : status?.accountId ? 'Pending verification' : 'Not connected'}
            </span>
          </div>

          {!status?.onboarded && (
            <button
              onClick={continueOnboarding}
              disabled={loading}
              className="btn-primary w-full py-3 text-sm disabled:opacity-50"
            >
              {loading ? 'Opening Stripe…' : status?.accountId ? 'Continue Stripe setup' : 'Connect Stripe'}
            </button>
          )}

          {status?.onboarded && (
            <Link href="/teacher" className="btn-primary w-full py-3 text-sm text-center block">
              Back to dashboard
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

export default function TeacherStripeSettingsPage() {
  return (
    <Suspense fallback={<div className="max-w-lg mx-auto px-6 py-10 text-white/40">Loading…</div>}>
      <StripeSettingsContent />
    </Suspense>
  )
}
