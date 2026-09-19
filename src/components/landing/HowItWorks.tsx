'use client'
import { useEffect, useRef } from 'react'

const steps = [
  {
    number: '01',
    title: 'Find your teacher',
    description: 'Browse verified teachers and instructors filtered by subject, style, price, level, and availability. Read real student reviews.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Book a slot',
    description: 'Pick from your teacher\'s live calendar. Your timezone is auto-detected. Instant confirmation, no back-and-forth.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Pay securely',
    description: 'Stripe-powered checkout. Your card is never stored. Platform fee is just 1% — teachers keep 99%.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
      </svg>
    ),
  },
  {
    number: '04',
    title: 'Learn via Zoom',
    description: 'A Zoom meeting is auto-created and shared privately. Join with one click when it\'s time to play.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="m15 10 4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.889L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
      </svg>
    ),
  },
]

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    async function setupAnimations() {
      const gsapModule = await import('gsap'); const gsap = gsapModule.gsap
      const ScrollTriggerModule = await import('gsap/dist/ScrollTrigger'); const ScrollTrigger = ScrollTriggerModule.ScrollTrigger
      gsap.registerPlugin(ScrollTrigger)

      const section = sectionRef.current
      if (!section) return

      gsap.fromTo(
        section.querySelectorAll('.step-card'),
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 70%',
          },
        }
      )

      gsap.fromTo(
        section.querySelector('.section-header'),
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 75%',
          },
        }
      )

      // Animate the connector line
      gsap.fromTo(
        section.querySelector('.connector-line'),
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1.5,
          ease: 'power2.inOut',
          scrollTrigger: {
            trigger: section,
            start: 'top 60%',
          },
        }
      )
    }
    setupAnimations()
  }, [])

  return (
    <section id="how-it-works" ref={sectionRef} className="relative py-28 px-6">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050508] via-[#080810] to-[#050508]" />

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="section-header text-center mb-20">
          <p className="text-xs text-[#C9A84C] font-medium tracking-[0.2em] uppercase mb-4">Simple process</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            How it <span className="gradient-text">works</span>
          </h2>
          <p className="text-white/50 max-w-lg mx-auto">
            From browsing to playing in under 5 minutes.
          </p>
        </div>

        {/* Steps */}
        <div className="relative grid md:grid-cols-4 gap-6">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-12 left-[12%] right-[12%] h-px">
            <div
              className="connector-line h-full origin-left"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4), rgba(201,168,76,0.4), transparent)',
              }}
            />
          </div>

          {steps.map((step, i) => (
            <div key={step.number} className="step-card opacity-0 relative">
              <div className="glass rounded-2xl p-6 h-full card-hover group">
                {/* Number + icon */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C9A84C]/20 to-[#C9A84C]/5 border border-[#C9A84C]/20 flex items-center justify-center text-[#C9A84C] group-hover:border-[#C9A84C]/40 transition-colors">
                      {step.icon}
                    </div>
                    {/* Number badge */}
                    <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#C9A84C] text-black text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>
                </div>

                <h3 className="font-semibold text-lg mb-2 text-white">{step.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
