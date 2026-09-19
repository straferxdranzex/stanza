'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { BrandLogo } from '@/components/shared/BrandLogo'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<{ role: string; full_name: string } | null>(null)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    async function loadUser(session: any) {
      if (!session) { setUser(null); return }
      // Immediately show something — don't wait for DB
      setUser({ role: 'student', full_name: session.user.email?.split('@')[0] ?? '' })
      // Then enrich with real DB data
      try {
        const { data } = await supabase.from('users').select('role, full_name').eq('id', session.user.id).single()
        if (data) setUser(data)
      } catch {}
    }

    supabase.auth.getSession().then(({ data: { session } }) => loadUser(session))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => loadUser(session))
    return () => subscription.unsubscribe()
  }, [])

  const dashboardHref = user?.role === 'teacher' ? '/teacher' : user?.role === 'admin' ? '/admin' : '/student'

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled ? 'py-3 bg-[#050508]/80 backdrop-blur-xl border-b border-white/5' : 'py-6'
    }`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <BrandLogo size="md" priority />

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {[['Services','/#services'],['How it works','/#how-it-works'],['Teachers','/teachers'],['Pricing','/#pricing'],['FAQ','/#faq']].map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="text-sm text-white/60 hover:text-white transition-colors duration-200"
            >
              {label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <Link href={dashboardHref} className="flex items-center gap-2 btn-primary px-5 py-2 text-sm">
              <span className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[10px] font-bold">
                {user.full_name?.[0] ?? '?'}
              </span>
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost px-4 py-2 text-sm">Sign in</Link>
              <Link href="/register" className="btn-primary px-5 py-2 text-sm">Get started free</Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button className="md:hidden p-2 text-white/70 hover:text-white" onClick={() => setMenuOpen(v => !v)} aria-label="Toggle menu">
          <div className="space-y-1.5">
            <span className={`block w-5 h-0.5 bg-current transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-0.5 bg-current transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-current transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden glass border-t border-white/5 px-6 py-4 space-y-4">
          {[['Services','/#services'],['How it works','/#how-it-works'],['Teachers','/teachers'],['Pricing','/#pricing'],['FAQ','/#faq']].map(([label, href]) => (
            <a key={label} href={href} className="block text-white/70 hover:text-white text-sm" onClick={() => setMenuOpen(false)}>
              {label}
            </a>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            {user ? (
              <Link href={dashboardHref} className="btn-primary px-4 py-2.5 text-sm text-center">Dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="btn-ghost px-4 py-2.5 text-sm text-center">Sign in</Link>
                <Link href="/register" className="btn-primary px-4 py-2.5 text-sm text-center">Get started free</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
