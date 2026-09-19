'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

const faqs = [
  {
    q: 'How does booking work?',
    a: 'Browse teachers and instructors, pick an available slot on their calendar (shown in your timezone), and pay securely via Stripe. A Zoom meeting is automatically created and shared with both you and your teacher.',
  },
  {
    q: 'What is the cancellation policy?',
    a: 'Each teacher sets their own policy. By default: full refund if cancelled 24+ hours before the lesson, 50% refund between 2–24 hours, no refund under 2 hours. Policy details are always shown before you book.',
  },
  {
    q: 'How do teachers get paid?',
    a: 'Teachers connect their bank account via Stripe Express during onboarding. Payouts are processed automatically after each lesson — typically arriving within 2 business days.',
  },
  {
    q: 'Is the 1% fee the only cost?',
    a: "Yes. Students pay the teacher's listed lesson price plus Stripe's standard card processing fees (~2.9% + $0.30). The platform takes 1% — there are no subscription or listing fees.",
  },
  {
    q: 'Can I try a lesson before committing?',
    a: 'Absolutely. Many teachers offer discounted trial lessons — look for the "Trial available" badge on their profile. There is no minimum commitment.',
  },
  {
    q: 'What happens if my teacher cancels?',
    a: 'You receive a full refund automatically and are notified immediately. You can rebook with the same teacher or choose a new one.',
  },
  {
    q: 'Do I need Zoom installed?',
    a: 'Zoom works best with the desktop app, but can also run in your browser. Your meeting link is in your dashboard and emailed to you 1 hour before the lesson.',
  },
  {
    q: 'How are teachers verified?',
    a: 'Teachers and instructors submit credentials (certificates, degrees, portfolios, ID) which our admin team reviews before granting the verified badge. Ratings and reviews from real students are always visible.',
  },
]

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    async function animate() {
      const gsapModule = await import('gsap'); const gsap = gsapModule.gsap
      const ScrollTriggerModule = await import('gsap/dist/ScrollTrigger'); const ScrollTrigger = ScrollTriggerModule.ScrollTrigger
      gsap.registerPlugin(ScrollTrigger)
      if (!sectionRef.current) return
      gsap.fromTo(
        sectionRef.current.querySelectorAll('.faq-item'),
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.6, stagger: 0.07, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 70%' } }
      )
    }
    animate()
  }, [])

  return (
    <section id="faq" ref={sectionRef} className="relative py-28 px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-[#050508] via-[#080810] to-[#050508]" />
      <div className="relative max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs text-[#C9A84C] font-medium tracking-[0.2em] uppercase mb-4">FAQ</p>
          <h2 className="text-4xl md:text-5xl font-bold">
            Common <span className="gradient-text">questions</span>
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="faq-item opacity-0 glass rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <span className="font-medium text-sm pr-4">{faq.q}</span>
                <span
                  className="text-[#C9A84C] text-lg flex-shrink-0 transition-transform duration-300"
                  style={{ transform: open === i ? 'rotate(45deg)' : 'rotate(0)' }}
                >
                  +
                </span>
              </button>
              {open === i && (
                <div className="px-6 pb-5">
                  <div className="h-px bg-white/5 mb-4" />
                  <p className="text-sm text-white/55 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────

export function Footer() {
  return (
    <footer className="relative border-t border-white/5 py-16 px-6">
      <div className="absolute inset-0 bg-[#030306]" />
      <div className="relative max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E8C87A] to-[#C9A84C] flex items-center justify-center">
                <span className="text-black font-bold text-sm">S</span>
              </div>
              <span className="font-semibold text-white">Stanza</span>
            </div>
            <p className="text-sm text-white/40 leading-relaxed mb-4">
              2D Art &amp; Classical Music Lessons Online. Connect, learn, and grow with world-class teachers.
            </p>
            <div className="flex gap-3">
              {['Twitter', 'Instagram', 'YouTube'].map(s => (
                <a key={s} href="#" className="w-8 h-8 rounded-lg glass flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all text-xs">
                  {s[0]}
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {[
            { title: 'Subjects', links: ['Piano', 'Violin', 'Cello', 'Animation', '2D Art'] },
            { title: 'Platform', links: ['Browse teachers', 'How it works', 'Pricing', 'Reviews'] },
            { title: 'Teachers', links: ['Become a teacher', 'Teacher resources', 'Stripe payouts', 'Support'] },
            { title: 'Company', links: ['About', 'Blog', 'Careers', 'Privacy', 'Terms'] },
          ].map(col => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-4">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map(link => (
                  <li key={link}>
                    <a href="#" className="text-sm text-white/40 hover:text-white transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="divider mb-8" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/30">
          <p>© {new Date().getFullYear()} Stanza. All rights reserved.</p>
          <p>Built with Next.js · Supabase · Stripe · Zoom</p>
        </div>
      </div>
    </footer>
  )
}
