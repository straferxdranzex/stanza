'use client'
import { useState, useEffect } from 'react'
import { Navbar } from '@/components/landing/Navbar'
import { AvailabilityCalendar } from '@/components/booking/AvailabilityCalendar'
import { StarRating } from '@/components/shared'
import { formatRelativeTime } from '@/lib/utils'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Props {
  teacher: any
  reviews: any[]
}

export function TeacherProfileClient({ teacher, reviews }: Props) {
  const [selectedLesson, setSelectedLesson] = useState<any>(null)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true) // optimistic default
  const profile = teacher.profile

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session)
    })
  }, [])

  const levelBadge: Record<string, string> = {
    beginner: 'bg-green-500/10 text-green-400 border-green-500/20',
    intermediate: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    advanced: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    all_levels: 'bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/20',
  }

  return (
    <div className="min-h-screen bg-[#050508]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 pt-28 pb-20">
        <div className="grid lg:grid-cols-3 gap-8">

          {/* Left: Profile info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header card */}
            <div className="glass rounded-2xl p-7">
              <div className="flex items-start gap-5">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#C9A84C]/20 to-[#C9A84C]/5 border border-[#C9A84C]/20 flex items-center justify-center text-2xl font-bold text-[#C9A84C] flex-shrink-0">
                  {teacher.full_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-white">{teacher.full_name}</h1>
                    {profile?.is_verified && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20">
                        ✓ Verified
                      </span>
                    )}
                  </div>
                  {profile?.headline && (
                    <p className="text-white/60 mt-1">{profile.headline}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                    {profile?.total_reviews > 0 && (
                      <div className="flex items-center gap-1.5">
                        <StarRating rating={profile.average_rating} size="sm" />
                        <span className="text-sm font-medium text-white">{profile.average_rating.toFixed(1)}</span>
                        <span className="text-sm text-white/40">({profile.total_reviews} reviews)</span>
                      </div>
                    )}
                    {profile?.total_lessons_taught > 0 && (
                      <span className="text-sm text-white/40">{profile.total_lessons_taught.toLocaleString()} lessons taught</span>
                    )}
                    {profile?.experience_years > 0 && (
                      <span className="text-sm text-white/40">{profile.experience_years} years experience</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio */}
              {(profile?.bio || teacher.bio) && (
                <div className="mt-5 pt-5 border-t border-white/5">
                  <p className="text-white/60 leading-relaxed text-sm">
                    {profile?.bio || teacher.bio}
                  </p>
                </div>
              )}

              {/* Tags */}
              <div className="mt-4 flex flex-wrap gap-2">
                {profile?.specialties?.map((s: string) => (
                  <span key={s} className="text-xs px-3 py-1 rounded-full glass border border-white/10 text-white/50">
                    {s}
                  </span>
                ))}
                {profile?.languages?.map((l: string) => (
                  <span key={l} className="text-xs px-3 py-1 rounded-full bg-[#C9A84C]/5 border border-[#C9A84C]/15 text-[#C9A84C]/70 capitalize">
                    {l}
                  </span>
                ))}
              </div>
            </div>

            {/* Lessons */}
            <div className="glass rounded-2xl p-6">
              <h2 className="font-semibold text-lg mb-4">Lessons offered</h2>
              <div className="space-y-3">
                {teacher.lessons?.map((lesson: any) => (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLesson(lesson)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedLesson?.id === lesson.id
                        ? 'border-[#C9A84C]/40 bg-[#C9A84C]/5'
                        : 'border-white/5 hover:border-white/15 bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white">{lesson.title}</p>
                        {lesson.description && (
                          <p className="text-sm text-white/40 mt-1 line-clamp-2">{lesson.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-xs text-white/40">{lesson.duration_mins} min</span>
                          <span className="text-xs text-white/20">·</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${levelBadge[lesson.level] ?? ''}`}>
                            {lesson.level.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xl font-bold text-white">${(lesson.price_cents / 100).toFixed(0)}</p>
                        <p className="text-xs text-white/35">per lesson</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Reviews */}
            {reviews.length > 0 && (
              <div className="glass rounded-2xl p-6">
                <h2 className="font-semibold text-lg mb-4">
                  Student reviews
                  <span className="text-sm font-normal text-white/40 ml-2">({reviews.length})</span>
                </h2>
                <div className="space-y-4">
                  {reviews.map(review => (
                    <div key={review.id} className="pb-4 border-b border-white/5 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-white/60">
                          {(review.student as any)?.full_name?.[0] ?? '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{(review.student as any)?.full_name}</p>
                          <div className="flex items-center gap-1.5">
                            <StarRating rating={review.rating} size="sm" />
                            <span className="text-xs text-white/35">{formatRelativeTime(review.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-white/55 ml-11 leading-relaxed">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Booking widget */}
          <div className="space-y-4">
            {!profile?.is_accepting_students ? (
              <div className="glass rounded-2xl p-6 text-center">
                <p className="text-white/50 text-sm">This teacher is not currently accepting new students.</p>
              </div>
            ) : !selectedLesson ? (
              <div className="glass rounded-2xl p-6 text-center">
                <p className="text-[#C9A84C] text-sm mb-1">← Select a lesson</p>
                <p className="text-white/35 text-xs">Choose a lesson type to see available slots</p>
              </div>
            ) : (
              <div className="glass rounded-2xl p-5">
                <div className="mb-4 p-3 bg-[#C9A84C]/5 border border-[#C9A84C]/15 rounded-xl">
                  <p className="text-sm font-medium text-white">{selectedLesson.title}</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {selectedLesson.duration_mins} min · ${(selectedLesson.price_cents / 100).toFixed(0)}
                  </p>
                </div>
                <AvailabilityCalendar
                  teacherId={teacher.id}
                  viewerTimezone={Intl.DateTimeFormat().resolvedOptions().timeZone}
                  selectedLesson={selectedLesson}
                  mode="book"
                  onSelectSlot={(slot) => {
                    // Always go to booking page — it handles auth check server-side
                    window.location.href = `/student/book?slot=${slot.id}&lesson=${selectedLesson.id}&teacher=${teacher.id}`
                  }}
                />
              </div>
            )}

            {/* Contact */}
            <div className="glass rounded-2xl p-5">
              <p className="text-sm font-medium text-white mb-3">Have a question?</p>
              <Link
                href={isLoggedIn ? `/student/messages?to=${teacher.id}` : `/login?redirect=/student/messages?to=${teacher.id}`}
                className="btn-ghost block py-2.5 text-sm text-center w-full"
              >
                Message {teacher.full_name.split(' ')[0]}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
