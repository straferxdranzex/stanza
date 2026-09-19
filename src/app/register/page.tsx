'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function RegisterForm() {
  const searchParams = useSearchParams()
  const initialRole = (searchParams.get('role') ?? 'student') as 'student' | 'teacher'

  const [role, setRole] = useState<'student' | 'teacher'>(initialRole)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const isConfigured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co'
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!isConfigured) {
      setError('Supabase is not configured. Fill in .env.local to enable auth.')
      setLoading(false)
      return
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    router.push(role === 'teacher' ? '/teacher/onboarding' : '/student')
  }

  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center px-6 relative">
      <div className="absolute inset-0 bg-gradient-radial from-[#15111f] to-[#050508]" />
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(201,168,76,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.5) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <BrandLogo size="xl" priority />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1.5">Create your account</h1>
          <p className="text-white/40 text-sm">Join thousands of learners and creators</p>
        </div>

        <div className="glass rounded-2xl p-8">
          {/* Role toggle */}
          <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-xl">
            {(['student', 'teacher'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 py-2 text-sm rounded-lg font-medium transition-all capitalize ${
                  role === r
                    ? 'bg-gradient-to-r from-[#E8C87A] to-[#C9A84C] text-black shadow'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {r === 'student' ? '🎓 Student' : '🎨 Teacher'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-white/50 mb-2 font-medium">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Jane Smith"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#C9A84C]/50 focus:bg-white/[0.07] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-2 font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#C9A84C]/50 focus:bg-white/[0.07] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-2 font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                minLength={8}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#C9A84C]/50 focus:bg-white/[0.07] transition-all"
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
              className="btn-primary w-full py-3 text-sm mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account…' : `Create ${role} account`}
            </button>
          </form>

          <p className="text-center text-xs text-white/30 mt-4">
            By continuing you agree to our{' '}
            <a href="#" className="text-white/50 hover:text-white">Terms</a> and{' '}
            <a href="#" className="text-white/50 hover:text-white">Privacy Policy</a>
          </p>
        </div>

        <p className="text-center text-sm text-white/40 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-[#C9A84C] hover:text-[#E8C87A] transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
