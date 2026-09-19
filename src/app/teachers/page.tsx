'use client'

const DEMO_TEACHERS: Teacher[] = [
  { id: "1", user_id: "t1", bio: "Concert pianist with 15 years of teaching experience. Trained at the Royal Academy of Music.", headline: "Classical Piano", category: "piano", average_rating: 4.98, total_reviews: 312, languages: ["english"], specialties: ["Chopin", "Bach", "Music Theory"], is_verified: true, user: { id: "t1", full_name: "Dr. Sofia Marchetti", avatar_url: null }, lessons: [{ id: "l1", title: "Classical Foundations", duration_mins: 60, price_cents: 8500, level: "beginner" }] },
  { id: "2", user_id: "t2", bio: "Violin soloist and chamber musician. Performed with leading orchestras across Europe.", headline: "Violin & Chamber Music", category: "violin", average_rating: 4.95, total_reviews: 218, languages: ["english"], specialties: ["Classical", "Orchestral", "Jazz"], is_verified: true, user: { id: "t2", full_name: "James Okafor", avatar_url: null }, lessons: [{ id: "l2", title: "Violin Fundamentals", duration_mins: 60, price_cents: 7000, level: "beginner" }] },
  { id: "3", user_id: "t3", bio: "Digital illustrator and character designer. Published in 3 manga magazines and 2 game studios.", headline: "2D Art & Illustration", category: "2d_art", average_rating: 4.97, total_reviews: 445, languages: ["english"], specialties: ["Character Design", "Digital Art", "Manga"], is_verified: true, user: { id: "t3", full_name: "Yuki Tanaka", avatar_url: null }, lessons: [{ id: "l3", title: "Art Fundamentals", duration_mins: 45, price_cents: 6000, level: "beginner" }] },
  { id: "4", user_id: "t4", bio: "Professional cellist with competition preparation experience. Students have won national prizes.", headline: "Cello & Composition", category: "cello", average_rating: 4.92, total_reviews: 178, languages: ["english","spanish"], specialties: ["Bach Suites", "Technique", "Sight-reading"], is_verified: true, user: { id: "t4", full_name: "Marco Reyes", avatar_url: null }, lessons: [{ id: "l4", title: "Cello Technique", duration_mins: 90, price_cents: 9500, level: "all_levels" }] },
  { id: "5", user_id: "t5", bio: "2D animator with 8 years in the industry. Credits include studio shorts and indie games.", headline: "2D Animation & Motion Design", category: "animation", average_rating: 4.96, total_reviews: 203, languages: ["english"], specialties: ["Frame-by-Frame", "After Effects", "Storyboarding"], is_verified: true, user: { id: "t5", full_name: "Priya Nair", avatar_url: null }, lessons: [{ id: "l5", title: "Animation Basics", duration_mins: 60, price_cents: 7500, level: "beginner" }] },
]

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/landing/Navbar'
import Link from 'next/link'

interface Teacher {
  id: string
  user_id: string
  bio: string | null
  headline: string | null
  category?: string
  average_rating: number
  total_reviews: number
  languages: string[]
  specialties: string[] | null
  is_verified: boolean
  user: {
    id: string
    full_name: string
    avatar_url: string | null
  }
  lessons: Array<{
    id: string
    title: string
    duration_mins: number
    price_cents: number
    level: string
  }>
}

const levelColors: Record<string, string> = {
  beginner: 'text-green-400 bg-green-500/10 border-green-500/20',
  intermediate: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  advanced: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  all_levels: 'text-[#C9A84C] bg-[#C9A84C]/10 border-[#C9A84C]/20',
}

export default function TeachersPage() {
  const isConfigured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co'
  )
  const [teachers, setTeachers] = useState<Teacher[]>(isConfigured ? [] : DEMO_TEACHERS)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [minRating, setMinRating] = useState('')
  const [level, setLevel] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  useEffect(() => {
    fetchTeachers()
  }, [search, category, minRating, level, maxPrice])

  async function fetchTeachers() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('query', search)
    if (category) params.set('category', category)
    if (minRating) params.set('minRating', minRating)
    if (level) params.set('level', level)
    if (maxPrice) params.set('maxPrice', maxPrice)

    if (!isConfigured) {
      // Supabase not set up — use demo data directly, no network call
      let filtered = DEMO_TEACHERS
      if (category) filtered = filtered.filter(t => t.category === category)
      if (search) filtered = filtered.filter(t =>
        t.user.full_name.toLowerCase().includes(search.toLowerCase()) ||
        t.headline?.toLowerCase().includes(search.toLowerCase())
      )
      setTeachers(filtered)
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/teachers?${params}`)
      const data = await res.json()
      console.log('[teachers] status:', res.status, '| teachers count:', data.teachers?.length, '| error:', data.error)
      if (!res.ok) console.error('[teachers] API error body:', JSON.stringify(data))
      setTeachers(data.teachers ?? [])
    } catch (err) {
      console.error('[teachers] fetch error:', err)
      setTeachers([])
    } finally {
      setLoading(false)
    }
  }

  const avatarColors = ['from-purple-500/30 to-purple-900/10', 'from-blue-500/30 to-blue-900/10', 'from-rose-500/30 to-rose-900/10', 'from-amber-500/30 to-amber-900/10', 'from-teal-500/30 to-teal-900/10']

  return (
    <div className="min-h-screen bg-[#050508]">
      <Navbar />

      {/* Hero bar */}
      <div className="pt-24 pb-12 px-6 border-b border-white/[0.06]" style={{ background: 'linear-gradient(to bottom, #0e0c18, #050508)' }}>
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            Find your <span className="gradient-text">teacher</span>
          </h1>
          <p className="text-white/50 mb-8 max-w-xl">
            Browse {teachers.length || '180+'} verified teachers across Piano, Violin, Cello, Animation &amp; 2D Art.
          </p>

          {/* Category tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {[['', 'All subjects'], ['piano', '🎹 Piano'], ['violin', '🎻 Violin'], ['cello', '🎸 Cello'], ['animation', '✏️ Animation'], ['2d_art', '🎨 2D Art']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setCategory(val)}
                className={`px-4 py-1.5 rounded-full text-sm border transition-all ${
                  category === val
                    ? 'bg-[#C9A84C] text-black border-[#C9A84C] font-medium'
                    : 'bg-white/5 text-white/60 border-white/10 hover:border-white/30 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search + filters */}
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or style…"
              className="flex-1 min-w-48 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#C9A84C]/40 transition-all"
            />
            <select
              value={level}
              onChange={e => setLevel(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/70 focus:outline-none focus:border-[#C9A84C]/40 transition-all"
            >
              <option value="">All levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <select
              value={minRating}
              onChange={e => setMinRating(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/70 focus:outline-none focus:border-[#C9A84C]/40 transition-all"
            >
              <option value="">Any rating</option>
              <option value="4.5">4.5+</option>
              <option value="4.8">4.8+</option>
              <option value="5">5.0 only</option>
            </select>
            <select
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/70 focus:outline-none focus:border-[#C9A84C]/40 transition-all"
            >
              <option value="">Any price</option>
              <option value="50">Under $50</option>
              <option value="75">Under $75</option>
              <option value="100">Under $100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass rounded-2xl p-6 animate-pulse h-64">
                <div className="w-14 h-14 rounded-2xl bg-white/5 mb-4" />
                <div className="h-4 bg-white/5 rounded mb-2 w-3/4" />
                <div className="h-3 bg-white/5 rounded mb-4 w-1/2" />
                <div className="h-3 bg-white/5 rounded w-full" />
              </div>
            ))}
          </div>
        ) : teachers.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-white/20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <p className="text-white/50 text-lg mb-2">No teachers yet</p>
            <p className="text-white/25 text-sm mb-6">Be the first to join Stanza as a teacher</p>
            <a href="/register?role=teacher" className="btn-primary px-5 py-2.5 text-sm inline-block">Sign up as a teacher</a>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {teachers.map((teacher, i) => {
              const lowestPrice = teacher.lessons?.reduce((min, l) => Math.min(min, l.price_cents), Infinity) ?? 0
              const colorClass = avatarColors[i % avatarColors.length]

              return (
                <Link key={teacher.id} href={`/teachers/${teacher.user_id}`}>
                  <div className="glass rounded-2xl p-6 card-hover cursor-pointer group h-full">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-lg font-bold border border-white/10 flex-shrink-0`}>
                        {teacher.user?.full_name?.[0] ?? '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white truncate">{teacher.user?.full_name}</h3>
                          {teacher.is_verified && (
                            <span className="flex-shrink-0 text-[#C9A84C] text-xs">✓</span>
                          )}
                        </div>
                        <p className="text-xs text-white/50 truncate mt-0.5">{teacher.headline ?? 'Teacher'}</p>
                        {teacher.total_reviews > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[#C9A84C] text-xs">★</span>
                            <span className="text-xs font-medium text-white">{teacher.average_rating.toFixed(1)}</span>
                            <span className="text-xs text-white/35">({teacher.total_reviews})</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bio */}
                    {teacher.bio && (
                      <p className="text-sm text-white/50 leading-relaxed line-clamp-2 mb-4">{teacher.bio}</p>
                    )}

                    {/* Lessons preview */}
                    {teacher.lessons && teacher.lessons.length > 0 && (
                      <div className="space-y-1.5 mb-4">
                        {teacher.lessons.slice(0, 2).map(lesson => (
                          <div key={lesson.id} className="flex items-center justify-between text-xs text-white/50">
                            <span className="truncate mr-2">{lesson.title}</span>
                            <span className="flex-shrink-0 font-medium text-white/70">${(lesson.price_cents / 100).toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Specialties */}
                    {teacher.specialties && teacher.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {teacher.specialties.slice(0, 3).map(s => (
                          <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/10">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                      <div>
                        <span className="text-white/40 text-xs">From </span>
                        <span className="font-bold text-white">
                          ${lowestPrice === Infinity ? '—' : (lowestPrice / 100).toFixed(0)}
                        </span>
                        <span className="text-white/40 text-xs">/lesson</span>
                      </div>
                      <span className="text-xs text-[#C9A84C] group-hover:underline">View profile →</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
