'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
    })

    setLoading(false)
    if (resetError) {
      setError(resetError.message)
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center px-6 relative">
      <div className="absolute inset-0 bg-gradient-radial from-[#15111f] to-[#050508]" />
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <BrandLogo size="xl" priority />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1.5">Reset password</h1>
          <p className="text-white/40 text-sm">We&apos;ll email you a secure reset link</p>
        </div>

        <div className="glass rounded-2xl p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-white/70">
                If an account exists for <strong className="text-white">{email}</strong>, you&apos;ll
                receive a reset link shortly.
              </p>
              <Link href="/login" className="btn-primary inline-block px-5 py-2.5 text-sm">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#C9A84C]/50 transition-all"
                />
              </div>
              {error && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-sm disabled:opacity-60"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-white/40 mt-6">
          <Link href="/login" className="text-[#C9A84C] hover:text-[#E8C87A]">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
