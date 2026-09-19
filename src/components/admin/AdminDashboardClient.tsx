'use client'
import { useState } from 'react'
import type { AuthUser } from '@/types'
import { StatCard } from '@/components/shared'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import Link from 'next/link'

interface Props {
  user: AuthUser
  stats: {
    gmv30d: number
    platformEarnings30d: number
    totalUsers: number
    pendingTeachers: number
    openDisputes: number
    transactions30d: number
  }
  recentBookings: any[]
  pendingTeachers: any[]
}

export function AdminDashboardClient({ stats, recentBookings, pendingTeachers }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'teachers' | 'bookings'>('overview')
  const [verifying, setVerifying] = useState<string | null>(null)

  async function verifyTeacher(teacherProfileId: string, approve: boolean) {
    setVerifying(teacherProfileId)
    await fetch('/api/admin/teachers/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacher_profile_id: teacherProfileId, is_verified: approve }),
    })
    setVerifying(null)
    window.location.reload()
  }

  const statusClass: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-400',
    confirmed: 'bg-blue-500/10 text-blue-400',
    completed: 'bg-emerald-500/10 text-emerald-400',
    cancelled: 'bg-red-500/10 text-red-400',
    refunded: 'bg-white/5 text-white/40',
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-white">Admin</h1>
          <p className="text-white/50 text-sm mt-1">Stanza platform control center</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/users" className="btn-ghost px-4 py-2 text-sm">All users</Link>
          <Link href="/admin/analytics" className="btn-primary px-4 py-2 text-sm">Analytics</Link>
        </div>
      </div>

      {(stats.pendingTeachers > 0 || stats.openDisputes > 0) && (
        <div className="flex gap-3 mb-6 flex-wrap">
          {stats.pendingTeachers > 0 && (
            <Link href="/admin?tab=teachers" className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-300">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              {stats.pendingTeachers} teacher{stats.pendingTeachers > 1 ? 's' : ''} awaiting verification
            </Link>
          )}
          {stats.openDisputes > 0 && (
            <Link href="/admin/disputes" className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              {stats.openDisputes} open dispute{stats.openDisputes > 1 ? 's' : ''}
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard label="GMV (30d)" value={formatCurrency(stats.gmv30d)} />
        <StatCard label="Platform (30d)" value={formatCurrency(stats.platformEarnings30d)} />
        <StatCard label="Total users" value={stats.totalUsers.toLocaleString()} />
        <StatCard label="Transactions" value={stats.transactions30d.toString()} />
        <StatCard label="Pending teachers" value={stats.pendingTeachers.toString()} accent={stats.pendingTeachers > 0} />
        <StatCard label="Open disputes" value={stats.openDisputes.toString()} accent={stats.openDisputes > 0} />
      </div>

      <div className="border-b border-white/[0.06] mb-6">
        <nav className="flex gap-6 -mb-px">
          {(['overview', 'teachers', 'bookings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm capitalize font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[#C9A84C] text-[#C9A84C]'
                  : 'border-transparent text-white/40 hover:text-white/70'
              }`}
            >
              {tab === 'teachers' && stats.pendingTeachers > 0
                ? `Teachers (${stats.pendingTeachers})`
                : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3">Quick actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Manage users', href: '/admin/users' },
                { label: 'All bookings', href: '/admin/bookings' },
                { label: 'Transactions', href: '/admin/transactions' },
                { label: 'Disputes', href: '/admin/disputes' },
                { label: 'Analytics', href: '/admin/analytics' },
                { label: 'Teachers', href: '#', onClick: () => setActiveTab('teachers') },
              ].map(({ label, href, onClick }) => (
                onClick ? (
                  <button
                    key={label}
                    onClick={onClick}
                    className="p-3 glass rounded-xl text-sm text-white/70 hover:text-white text-left transition-colors"
                  >
                    {label} →
                  </button>
                ) : (
                  <Link
                    key={href}
                    href={href}
                    className="p-3 glass rounded-xl text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {label} →
                  </Link>
                )
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3">Recent bookings</h2>
            <div className="space-y-2">
              {recentBookings.slice(0, 5).map(b => (
                <div key={b.id} className="flex items-center justify-between p-3 glass rounded-xl text-sm">
                  <div>
                    <p className="text-white font-medium">{(b.lesson as any)?.title}</p>
                    <p className="text-white/40 text-xs">
                      {(b.student as any)?.full_name} → {(b.teacher as any)?.full_name}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass[b.status] ?? ''}`}>
                    {b.status}
                  </span>
                </div>
              ))}
              {recentBookings.length === 0 && (
                <p className="text-white/30 text-sm py-6 text-center">No bookings yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'teachers' && (
        <div>
          <p className="text-sm text-white/40 mb-4">
            Review and verify teacher applications before they can accept bookings.
          </p>
          {pendingTeachers.length === 0 ? (
            <div className="text-center py-12 glass rounded-2xl border border-dashed border-white/10">
              <p className="text-white/40">All caught up — no pending teachers</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingTeachers.map(teacher => (
                <div key={teacher.id} className="p-5 glass rounded-2xl">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-medium text-white/60">
                        {(teacher.user as any)?.full_name?.[0] ?? '?'}
                      </div>
                      <div>
                        <p className="font-medium text-white">{(teacher.user as any)?.full_name}</p>
                        <p className="text-sm text-white/40">{(teacher.user as any)?.email}</p>
                        <p className="text-xs text-white/30 mt-0.5">
                          Applied {formatRelativeTime((teacher.user as any)?.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => verifyTeacher(teacher.id, false)}
                        disabled={verifying === teacher.id}
                        className="px-3 py-1.5 text-sm border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => verifyTeacher(teacher.id, true)}
                        disabled={verifying === teacher.id}
                        className="btn-primary px-3 py-1.5 text-sm disabled:opacity-50"
                      >
                        {verifying === teacher.id ? 'Processing…' : 'Approve'}
                      </button>
                    </div>
                  </div>
                  {teacher.bio && (
                    <p className="text-sm text-white/50 mt-3 line-clamp-2">{teacher.bio}</p>
                  )}
                  {teacher.specialties?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {teacher.specialties.map((s: string) => (
                        <span key={s} className="text-xs bg-white/5 text-white/50 px-2 py-0.5 rounded-full">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'bookings' && (
        <div>
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-white/40">
                  <th className="text-left py-3 px-4 font-normal">Lesson</th>
                  <th className="text-left py-3 px-4 font-normal">Student</th>
                  <th className="text-left py-3 px-4 font-normal">Teacher</th>
                  <th className="text-left py-3 px-4 font-normal">Amount</th>
                  <th className="text-left py-3 px-4 font-normal">Status</th>
                  <th className="text-left py-3 px-4 font-normal">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map(b => (
                  <tr key={b.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-medium text-white">{(b.lesson as any)?.title ?? '—'}</td>
                    <td className="py-3 px-4 text-white/60">{(b.student as any)?.full_name}</td>
                    <td className="py-3 px-4 text-white/60">{(b.teacher as any)?.full_name}</td>
                    <td className="py-3 px-4 text-white/60">
                      {(b.lesson as any)?.price_cents ? formatCurrency((b.lesson as any).price_cents) : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass[b.status] ?? ''}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white/35 text-xs">{formatRelativeTime(b.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-center">
            <Link href="/admin/bookings" className="text-sm text-[#C9A84C] hover:underline">
              View all bookings →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
