'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must be at least 8 characters with an uppercase letter and a number.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: dbUser } = await supabase.from('users').select('role').eq('id', user.id).single()
      const map: Record<string, string> = { student: '/student', teacher: '/teacher', admin: '/admin' }
      router.push(map[dbUser?.role ?? 'student'] ?? '/student')
      return
    }
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center px-6 relative">
      <div className="absolute inset-0 bg-gradient-radial from-[#15111f] to-[#050508]" />
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <BrandLogo size="xl" priority />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1.5">Choose a new password</h1>
          <p className="text-white/40 text-sm">Use at least 8 characters, one uppercase, one number</p>
        </div>

        <div className="glass rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs text-white/50 mb-2 font-medium">New password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#C9A84C]/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-2 font-medium">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                minLength={8}
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
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
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
