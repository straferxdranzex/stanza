'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'

export function Pricing() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    async function animate() {
      const gsapModule = await import('gsap'); const gsap = gsapModule.gsap
      const ScrollTriggerModule = await import('gsap/dist/ScrollTrigger'); const ScrollTrigger = ScrollTriggerModule.ScrollTrigger
      gsap.registerPlugin(ScrollTrigger)
      if (!sectionRef.current) return
      gsap.fromTo(
        sectionRef.current.querySelectorAll('.price-card'),
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 70%' } }
      )
    }
    animate()
  }, [])

  return (
    <section id="pricing" ref={sectionRef} className="relative py-28 px-6">
      <div className="absolute inset-0 bg-[#080810]" />
      <div className="relative max-w-5xl mx-auto">

        <div className="text-center mb-16">
          <p className="text-xs text-[#C9A84C] font-medium tracking-[0.2em] uppercase mb-4">Transparent pricing</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Pay only for <span className="gradient-text">lessons</span>
          </h2>
          <p className="text-white/50 max-w-xl mx-auto">
            No subscriptions. No hidden fees. Students pay per lesson — teachers set their own rates and keep 99%.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Student card */}
          <div className="price-card opacity-0 glass rounded-2xl p-7 card-hover">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
                <path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-1">For students</h3>
            <p className="text-3xl font-bold mt-3 mb-1">Free <span className="text-base font-normal text-white/40">to join</span></p>
            <p className="text-sm text-white/40 mb-6">Pay only for lessons you book</p>
            <ul className="space-y-3 mb-8">
              {[
                'Browse all teachers',
                'Timezone-aware booking',
                'Secure Stripe payments',
                'Auto Zoom meetings',
                'Leave reviews',
                'Cancel anytime',
              ].map(f => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-white/70">
                  <span className="text-[#C9A84C] flex-shrink-0">✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/register?role=student" className="btn-primary block py-3 text-center text-sm w-full">
              Sign up free
            </Link>
          </div>

          {/* Teacher card — featured */}
          <div className="price-card opacity-0 relative rounded-2xl p-7 card-hover"
            style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.08), rgba(201,168,76,0.02))', border: '1px solid rgba(201,168,76,0.2)' }}>
            {/* Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#C9A84C] rounded-full text-black text-xs font-bold whitespace-nowrap">
              Most popular
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/20 border border-[#C9A84C]/30 flex items-center justify-center text-[#C9A84C] mb-5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-1">For teachers</h3>
            <p className="text-3xl font-bold mt-3 mb-1">1% <span className="text-base font-normal text-white/40">platform fee</span></p>
            <p className="text-sm text-white/40 mb-6">You keep 99% of every lesson</p>
            <ul className="space-y-3 mb-8">
              {[
                'Set your own rates',
                'Manage your availability',
                'Instant Stripe payouts',
                'Auto Zoom creation',
                'Verified teacher badge',
                'Student messaging',
                'Review management',
              ].map(f => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-white/70">
                  <span className="text-[#C9A84C] flex-shrink-0">✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/register?role=teacher" className="btn-primary block py-3 text-center text-sm w-full">
              Start teaching
            </Link>
          </div>

          {/* Platform card */}
          <div className="price-card opacity-0 glass rounded-2xl p-7 card-hover">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-1">How we earn</h3>
            <p className="text-3xl font-bold mt-3 mb-1">1% <span className="text-base font-normal text-white/40">only</span></p>
            <p className="text-sm text-white/40 mb-6">On completed transactions</p>
            <ul className="space-y-3 mb-8">
              {[
                'No monthly fees',
                'No listing fees',
                'No signup fees',
                'Free cancellations',
                '24/7 dispute support',
                'Platform keeps 1¢ per $1',
              ].map(f => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-white/70">
                  <span className="text-white/30 flex-shrink-0">→</span> {f}
                </li>
              ))}
            </ul>
            <div className="py-3 text-center text-sm text-white/40 border border-white/10 rounded-xl">
              No action needed
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
