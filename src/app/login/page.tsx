'use client'
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [demoMode, setDemoMode] = useState(false)
  const router = useRouter()

  const isConfigured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co"
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    if (!isConfigured) {
      setError("Supabase is not configured. Fill in .env.local to enable auth.")
      setLoading(false)
      return
    }

    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) { setError(authError.message); setLoading(false); return }
      const { data: user } = await supabase.from("users").select("role").eq("id", data.user.id).single()
      const roleMap: Record<string, string> = { student: "/student", teacher: "/teacher", admin: "/admin" }
      router.push(roleMap[user?.role ?? "student"] ?? "/student")
    } catch {
      setError("Something went wrong. Check your connection.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center px-6 relative">
      <div className="absolute inset-0 bg-gradient-radial from-[#15111f] to-[#050508]" />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(201,168,76,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.5) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E8C87A] to-[#C9A84C] flex items-center justify-center shadow-lg shadow-[#C9A84C]/20">
              <span className="text-black font-bold">S</span>
            </div>
            <span className="font-semibold text-white text-lg">Stanza</span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-1.5">Welcome back</h1>
          <p className="text-white/40 text-sm">Sign in to your account</p>
        </div>

        {!isConfigured && (
          <div className="mb-4 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-400 text-center">
            ⚠ Demo mode — Supabase not configured.{" "}
            <Link href="/student" className="underline text-amber-300">Preview dashboard →</Link>
          </div>
        )}

        <div className="glass rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs text-white/50 mb-2 font-medium">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#C9A84C]/50 focus:bg-white/[0.07] transition-all" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-white/50 font-medium">Password</label>
                <a href="#" className="text-xs text-[#C9A84C] hover:text-[#E8C87A]">Forgot?</a>
              </div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#C9A84C]/50 focus:bg-white/[0.07] transition-all" />
            </div>
            {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {!isConfigured && (
            <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
              <p className="text-xs text-white/30 text-center mb-2">Preview dashboards without auth:</p>
              <div className="grid grid-cols-3 gap-2">
                {[["Student","/student"],["Teacher","/teacher"],["Admin","/admin"]].map(([label, href]) => (
                  <Link key={href} href={href} className="text-xs py-2 text-center rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all">{label}</Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-white/40 mt-6">
          No account?{" "}
          <Link href="/register" className="text-[#C9A84C] hover:text-[#E8C87A] transition-colors">Get started free</Link>
        </p>
      </div>
    </div>
  )
}
