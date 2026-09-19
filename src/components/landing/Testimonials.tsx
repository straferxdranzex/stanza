'use client'
import { useEffect, useRef } from 'react'

const testimonials = [
  {
    quote: "I went from never touching a piano to playing Für Elise in 3 months. My teacher's patience and structured approach made all the difference.",
    name: 'Aisha Kamara',
    role: 'Piano Student — Beginner',
    avatar: 'AK',
    rating: 5,
  },
  {
    quote: "The booking system is seamless. I found a violin specialist, booked a trial, and paid in under 5 minutes. The Zoom integration is rock solid.",
    name: 'Tom Wilder',
    role: 'Violin Student — Intermediate',
    avatar: 'TW',
    rating: 5,
  },
  {
    quote: "As a cello teacher, Stanza handles everything — scheduling, payments, Zoom meetings. I just focus on teaching. My earnings are up 40%.",
    name: 'Dr. Claire Novak',
    role: 'Cello Teacher',
    avatar: 'CN',
    rating: 5,
  },
  {
    quote: "I tried other platforms but nothing compared. The 1% fee is shockingly fair. My 2D Art students love how professional the experience feels.",
    name: 'Ravi Shankar',
    role: '2D Art Instructor',
    avatar: 'RS',
    rating: 5,
  },
  {
    quote: "My daughter's animation skills have taken off since she joined Stanza. Her teacher uses the platform perfectly — reminders, lesson notes, everything organised.",
    name: 'Maria González',
    role: "Animation Student's Parent",
    avatar: 'MG',
    rating: 5,
  },
  {
    quote: "The video quality and reliability are unmatched for my online art lessons. I've had zero dropped sessions in 8 months. Worth every penny.",
    name: 'Daniel Park',
    role: '2D Art Student — Advanced',
    avatar: 'DP',
    rating: 5,
  },
]

export function Testimonials() {
  const trackRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    async function animate() {
      const gsapModule = await import('gsap'); const gsap = gsapModule.gsap
      const ScrollTriggerModule = await import('gsap/dist/ScrollTrigger'); const ScrollTrigger = ScrollTriggerModule.ScrollTrigger
      gsap.registerPlugin(ScrollTrigger)

      if (!sectionRef.current || !trackRef.current) return

      // Header fade in
      gsap.fromTo(
        sectionRef.current.querySelector('.testimonials-header'),
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.9, scrollTrigger: { trigger: sectionRef.current, start: 'top 75%' } }
      )

      // Cards fade in
      gsap.fromTo(
        trackRef.current.querySelectorAll('.t-card'),
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 0.7, stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 65%' },
        }
      )

      // Horizontal scroll on larger screens
      const mm = gsap.matchMedia()
      mm.add('(min-width: 1024px)', () => {
        const tl = gsap.to(trackRef.current, {
          x: () => -(trackRef.current!.scrollWidth - window.innerWidth * 0.85),
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: () => `+=${trackRef.current!.scrollWidth}`,
            scrub: 1,
            pin: true,
          },
        })
        return () => tl.kill()
      })
    }
    animate()
  }, [])

  return (
    <section id="testimonials" ref={sectionRef} className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#050508] via-[#07070d] to-[#050508]" />

      <div className="relative max-w-7xl mx-auto px-6 mb-16">
        <div className="testimonials-header text-center">
          <p className="text-xs text-[#C9A84C] font-medium tracking-[0.2em] uppercase mb-4">Real stories</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Loved by <span className="gradient-text">thousands</span>
          </h2>
          <p className="text-white/50 max-w-lg mx-auto">
            Students and teachers from around the world.
          </p>
        </div>
      </div>

      {/* Scrolling track */}
      <div className="relative px-6 max-w-7xl mx-auto lg:overflow-visible overflow-x-auto">
        <div
          ref={trackRef}
          className="flex gap-5 lg:flex-nowrap pb-4"
          style={{ width: 'max-content' }}
        >
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="t-card opacity-0 flex-shrink-0 w-80 lg:w-96 glass rounded-2xl p-6 card-hover"
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {[1,2,3,4,5].map(s => (
                  <span key={s} className="text-[#C9A84C] text-sm">★</span>
                ))}
              </div>

              <p className="text-white/75 text-sm leading-relaxed mb-6">"{t.quote}"</p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C9A84C]/30 to-[#C9A84C]/10 flex items-center justify-center text-xs font-bold text-[#C9A84C] flex-shrink-0">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{t.name}</p>
                  <p className="text-xs text-white/40">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#050508] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#050508] to-transparent" />
    </section>
  )
}
