'use client'
import { useState } from 'react'
import type { AuthUser, DBTeacherProfile, DBLesson } from '@/types'
import { StripeOnboardingBanner } from '@/components/teacher/StripeOnboardingBanner'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import Link from 'next/link'
import { StatCard, BookingCard, StarRating } from '@/components/shared'

interface StripeStatus {
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  requirements: string[]
}

interface Props {
  user: AuthUser
  profile: DBTeacherProfile | null
  stripeStatus: StripeStatus | null
  upcomingBookings: any[]
  lessons: DBLesson[]
  recentReviews: any[]
  stats: {
    monthlyEarnings: number
    allTimeEarnings: number
    totalLessonsTaught: number
    averageRating: number
    totalReviews: number
  }
}

export function TeacherDashboardClient({
  user, profile, stripeStatus, upcomingBookings, lessons, recentReviews, stats
}: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'lessons' | 'reviews'>('overview')
  const stripeReady = stripeStatus?.chargesEnabled && stripeStatus?.payoutsEnabled

  return (
    <div className="px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-wider text-[#C9A84C]/70 mb-1">Teacher</p>
          <h1 className="text-2xl font-semibold text-white">{user.full_name}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {profile?.is_verified ? (
              <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                ✓ Verified
              </span>
            ) : (
              <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                Pending verification
              </span>
            )}
            {stats.totalReviews > 0 && (
              <span className="flex items-center gap-1.5 text-sm text-white/50">
                <StarRating rating={stats.averageRating} size="sm" />
                {stats.averageRating.toFixed(1)} ({stats.totalReviews})
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/teacher/availability" className="btn-ghost px-4 py-2 text-sm">
            Availability
          </Link>
          <Link href="/teacher/lessons" className="btn-primary px-4 py-2 text-sm">
            + New lesson
          </Link>
        </div>
      </div>

      {!stripeReady && (
        <StripeOnboardingBanner
          teacherId={user.id}
          status={stripeStatus}
          className="mb-6"
        />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="This month" value={formatCurrency(stats.monthlyEarnings)} />
        <StatCard label="All-time earnings" value={formatCurrency(stats.allTimeEarnings)} />
        <StatCard label="Lessons taught" value={stats.totalLessonsTaught.toString()} />
        <StatCard label="Upcoming" value={upcomingBookings.length.toString()} />
      </div>

      <div className="border-b border-white/[0.06] mb-6">
        <nav className="flex gap-6 -mb-px">
          {(['overview', 'lessons', 'reviews'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm capitalize font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[#C9A84C] text-[#C9A84C]'
                  : 'border-transparent text-white/40 hover:text-white/70'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider">Upcoming lessons</h2>
            <Link href="/teacher/bookings" className="text-sm text-[#C9A84C] hover:underline">View all →</Link>
          </div>
          {upcomingBookings.length === 0 ? (
            <EmptyState
              message="No upcoming lessons"
              hint="Open your calendar so students can book you."
              action={{ href: '/teacher/availability', label: 'Add availability' }}
            />
          ) : (
            <div className="space-y-3">
              {upcomingBookings.map(booking => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  role="teacher"
                  timezone={user.timezone}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'lessons' && (
        <div className="space-y-3">
          {lessons.map(lesson => (
            <div
              key={lesson.id}
              className="flex items-center justify-between gap-4 p-4 glass rounded-2xl"
            >
              <div className="min-w-0">
                <p className="font-medium text-white truncate">{lesson.title}</p>
                <p className="text-sm text-white/40 mt-0.5">
                  {lesson.duration_mins} min · {formatCurrency(lesson.price_cents)} · {lesson.level.replace('_', ' ')}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  lesson.is_active
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-white/5 text-white/40'
                }`}>
                  {lesson.is_active ? 'Active' : 'Inactive'}
                </span>
                <Link
                  href={`/teacher/lessons/${lesson.id}/edit`}
                  className="text-sm text-white/40 hover:text-white px-3 py-1.5 border border-white/10 rounded-lg"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
          {lessons.length === 0 && (
            <EmptyState
              message="No lessons yet"
              hint="Create an offering so students can book you."
              action={{ href: '/teacher/lessons', label: 'Create your first lesson' }}
            />
          )}
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="space-y-3">
          {recentReviews.map(review => (
            <div key={review.id} className="p-5 glass rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-white/60">
                  {(review.student as any)?.full_name?.[0] ?? '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    {(review.student as any)?.full_name}
                  </p>
                  <StarRating rating={review.rating} size="sm" />
                </div>
                <span className="ml-auto text-xs text-white/30">
                  {formatRelativeTime(review.created_at)}
                </span>
              </div>
              {review.comment && (
                <p className="text-sm text-white/55 leading-relaxed">{review.comment}</p>
              )}
            </div>
          ))}
          {recentReviews.length === 0 && (
            <EmptyState message="No reviews yet" hint="Reviews appear after students complete lessons." />
          )}
        </div>
      )}
    </div>
  )
}

function EmptyState({
  message,
  hint,
  action,
}: {
  message: string
  hint?: string
  action?: { href: string; label: string }
}) {
  return (
    <div className="text-center py-12 glass rounded-2xl border border-dashed border-white/10">
      <p className="text-white/50 font-medium mb-1">{message}</p>
      {hint && <p className="text-white/30 text-sm mb-4">{hint}</p>}
      {action && (
        <Link href={action.href} className="btn-primary px-5 py-2.5 text-sm inline-block">
          {action.label}
        </Link>
      )}
    </div>
  )
}
