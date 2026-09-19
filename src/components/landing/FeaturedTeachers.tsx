'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'

const teachers = [
  {
    name: 'Dr. Sofia Marchetti',
    title: 'Classical Piano',
    category: 'Piano',
    rating: 4.98,
    reviews: 312,
    price: 85,
    level: 'All levels',
    tags: ['Chopin', 'Bach', 'Music Theory'],
    avatar: 'SM',
    color: 'from-purple-500/20 to-purple-900/5',
    accent: '#a855f7',
    lessons: 1240,
  },
  {
    name: 'James Okafor',
    title: 'Violin & Chamber Music',
    category: 'Violin',
    rating: 4.95,
    reviews: 218,
    price: 70,
    level: 'Intermediate–Advanced',
    tags: ['Classical', 'Jazz', 'Orchestral'],
    avatar: 'JO',
    color: 'from-blue-500/20 to-blue-900/5',
    accent: '#3b82f6',
    lessons: 890,
  },
  {
    name: 'Yuki Tanaka',
    title: '2D Art & Illustration',
    category: '2D Art',
    rating: 4.97,
    reviews: 445,
    price: 60,
    level: 'Beginner–Intermediate',
    tags: ['Character Design', 'Digital Art', 'Manga'],
    avatar: 'YT',
    color: 'from-rose-500/20 to-rose-900/5',
    accent: '#f43f5e',
    lessons: 2100,
  },
  {
    name: 'Marco Reyes',
    title: 'Cello & Composition',
    category: 'Cello',
    rating: 4.92,
    reviews: 178,
    price: 95,
    level: 'All levels',
    tags: ['Bach Suites', 'Technique', 'Sight-reading'],
    avatar: 'MR',
    color: 'from-amber-500/20 to-amber-900/5',
    accent: '#f59e0b',
    lessons: 670,
  },
  {
    name: 'Priya Nair',
    title: '2D Animation & Motion',
    category: 'Animation',
    rating: 4.96,
    reviews: 203,
    price: 75,
    level: 'All levels',
    tags: ['Frame-by-Frame', 'After Effects', 'Storyboarding'],
    avatar: 'PN',
    color: 'from-emerald-500/20 to-emerald-900/5',
    accent: '#10b981',
    lessons: 540,
  },
]

const categoryIcon: Record<string, string> = {
  Piano: '🎹',
  Violin: '🎻',
  Cello: '🎸',
  '2D Art': '🎨',
  Animation: '✏️',
}

export function FeaturedTeachers() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    async function animate() {
      const gsapModule = await import('gsap'); const gsap = gsapModule.gsap
      const ScrollTriggerModule = await import('gsap/dist/ScrollTrigger'); const ScrollTrigger = ScrollTriggerModule.ScrollTrigger
      gsap.registerPlugin(ScrollTrigger)
      if (!sectionRef.current) return

      gsap.fromTo(
        sectionRef.current.querySelectorAll('.teacher-card'),
        { opacity: 0, y: 60, scale: 0.95 },
        {
          opacity: 1, y: 0, scale: 1,
          duration: 0.7, stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 70%' },
        }
      )
    }
    animate()
  }, [])

  return (
    <section id="teachers" ref={sectionRef} className="relative py-28 px-6">
      <div className="absolute inset-0 bg-[#080810]" />

      <div className="relative max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <p className="text-xs text-[#C9A84C] font-medium tracking-[0.2em] uppercase mb-4">Top rated</p>
            <h2 className="text-4xl md:text-5xl font-bold">
              Meet our <span className="gradient-text">teachers</span>
            </h2>
            <p className="text-white/40 text-sm mt-3 max-w-md">Piano · Violin · Cello · Animation · 2D Art</p>
          </div>
          <Link
            href="/teachers"
            className="btn-ghost px-6 py-2.5 text-sm self-start md:self-auto whitespace-nowrap"
          >
            View all teachers →
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-5">
          {teachers.map(t => (
            <div key={t.name} className="teacher-card opacity-0">
              <div className="glass rounded-2xl p-5 h-full card-hover group cursor-pointer">
                {/* Category badge */}
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="text-[10px] px-2.5 py-1 rounded-full border font-medium"
                    style={{ borderColor: `${t.accent}40`, color: t.accent, background: `${t.accent}15` }}
                  >
                    {categoryIcon[t.category]} {t.category}
                  </span>
                </div>

                {/* Avatar */}
                <div className="relative mb-4">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${t.color} flex items-center justify-center text-lg font-bold border border-white/10`}
                    style={{ color: t.accent }}
                  >
                    {t.avatar}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-[#0C0C12]" />
                </div>

                <h3 className="font-semibold text-base mb-0.5 leading-tight">{t.name}</h3>
                <p className="text-xs text-white/50 mb-3">{t.title}</p>

                {/* Rating */}
                <div className="flex items-center gap-1.5 mb-4">
                  <div className="flex">
                    {[1,2,3,4,5].map(s => (
                      <span key={s} className="text-[#C9A84C] text-xs">★</span>
                    ))}
                  </div>
                  <span className="text-sm font-medium text-white">{t.rating}</span>
                  <span className="text-xs text-white/40">({t.reviews})</span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {t.tags.slice(0, 2).map(tag => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-full border"
                      style={{ borderColor: `${t.accent}30`, color: t.accent, background: `${t.accent}10` }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-white">${t.price}</span>
                    <span className="text-xs text-white/40"> / lesson</span>
                  </div>
                  <Link
                    href="/register?role=student"
                    className="text-xs px-3 py-1.5 rounded-lg transition-all"
                    style={{ background: `${t.accent}20`, color: t.accent, border: `1px solid ${t.accent}30` }}
                  >
                    Book
                  </Link>
                </div>

                <p className="text-[10px] text-white/30 mt-2">{t.lessons.toLocaleString()} lessons · {t.level}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
