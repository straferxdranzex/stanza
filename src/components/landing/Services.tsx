'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'

const services = [
  {
    name: 'Piano',
    emoji: '🎹',
    description: 'Classical, Jazz, Pop & Contemporary. From beginner scales to concert-level repertoire.',
    accent: '#a855f7',
    color: 'from-purple-500/20 to-purple-900/5',
  },
  {
    name: 'Violin',
    emoji: '🎻',
    description: 'Classical technique, chamber music, and orchestral preparation with verified specialists.',
    accent: '#3b82f6',
    color: 'from-blue-500/20 to-blue-900/5',
  },
  {
    name: 'Cello',
    emoji: '🎸',
    description: 'Bach Suites to modern repertoire. One-on-one lessons tailored to your pace and goals.',
    accent: '#f59e0b',
    color: 'from-amber-500/20 to-amber-900/5',
  },
  {
    name: 'Animation',
    emoji: '✏️',
    description: 'Frame-by-frame, motion design, and storyboarding with professional studio animators.',
    accent: '#10b981',
    color: 'from-emerald-500/20 to-emerald-900/5',
  },
  {
    name: '2D Art',
    emoji: '🎨',
    description: 'Character design, digital illustration, manga, and concept art for all skill levels.',
    accent: '#f43f5e',
    color: 'from-rose-500/20 to-rose-900/5',
  },
]

export function Services() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    async function animate() {
      const gsapModule = await import('gsap')
      const gsap = gsapModule.gsap
      const ScrollTriggerModule = await import('gsap/dist/ScrollTrigger')
      const ScrollTrigger = ScrollTriggerModule.ScrollTrigger
      gsap.registerPlugin(ScrollTrigger)
      if (!sectionRef.current) return

      gsap.fromTo(
        sectionRef.current.querySelectorAll('.service-card'),
        { opacity: 0, y: 40, scale: 0.96 },
        {
          opacity: 1, y: 0, scale: 1,
          duration: 0.7, stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 72%' },
        }
      )
    }
    animate()
  }, [])

  return (
    <section id="services" ref={sectionRef} className="relative py-28 px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-[#050508] via-[#07070d] to-[#050508]" />

      <div className="relative max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs text-[#C9A84C] font-medium tracking-[0.2em] uppercase mb-4">What we teach</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Five <span className="gradient-text">disciplines</span>
          </h2>
          <p className="text-white/50 max-w-lg mx-auto">
            One platform, five creative disciplines. Book expert-led lessons for any subject, any level.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {services.map(service => (
            <div key={service.name} className="service-card opacity-0">
              <Link href={`/teachers?category=${service.name.toLowerCase().replace(' ', '_')}`}>
                <div
                  className="glass rounded-2xl p-6 h-full card-hover group cursor-pointer relative overflow-hidden"
                >
                  {/* Glow */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `radial-gradient(circle at 50% 0%, ${service.accent}15, transparent 70%)` }}
                  />

                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.color} border border-white/10 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform duration-300`}
                  >
                    {service.emoji}
                  </div>

                  <h3 className="font-bold text-white text-lg mb-2">{service.name}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{service.description}</p>

                  <div
                    className="mt-5 text-xs font-medium flex items-center gap-1 group-hover:gap-2 transition-all"
                    style={{ color: service.accent }}
                  >
                    Browse teachers <span>→</span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
