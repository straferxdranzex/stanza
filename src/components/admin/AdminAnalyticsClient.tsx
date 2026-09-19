'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

interface Analytics {
  period: string
  overview: {
    gmv_cents: number
    platform_earnings_cents: number
    teacher_payouts_cents: number
    total_transactions: number
  }
  bookings: { total: number; by_status: Record<string, number> }
  users: { new_students: number; new_teachers: number; active_students: number }
  top_teachers: { teacher_id: string; name: string; total: number }[]
  revenue_by_day: { day: string; gmv_cents: number; fee_cents: number }[]
}

export function AdminAnalyticsClient() {
  const [period, setPeriod] = useState('30d')
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/analytics?period=${period}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [period])

  const maxDay = Math.max(1, ...(data?.revenue_by_day.map(d => d.gmv_cents) ?? [1]))

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-white">Analytics</h1>
          <p className="text-white/50 mt-1">Platform performance</p>
        </div>
        <div className="flex gap-2">
          {['7d', '30d', '90d', 'all'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs border ${
                period === p
                  ? 'border-[#C9A84C]/40 bg-[#C9A84C]/10 text-[#C9A84C]'
                  : 'border-white/10 text-white/40 hover:text-white'
              }`}
            >
              {p === 'all' ? 'All time' : p}
            </button>
          ))}
        </div>
      </div>

      {loading || !data?.overview ? (
        <p className="text-white/30 text-sm">Loading analytics…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="glass rounded-2xl p-5">
              <p className="text-2xl font-bold text-white">{formatCurrency(data.overview.gmv_cents)}</p>
              <p className="text-xs text-white/40 mt-1">GMV</p>
            </div>
            <div className="glass rounded-2xl p-5">
              <p className="text-2xl font-bold text-[#C9A84C]">{formatCurrency(data.overview.platform_earnings_cents)}</p>
              <p className="text-xs text-white/40 mt-1">Platform earnings</p>
            </div>
            <div className="glass rounded-2xl p-5">
              <p className="text-2xl font-bold text-white">{formatCurrency(data.overview.teacher_payouts_cents)}</p>
              <p className="text-xs text-white/40 mt-1">Teacher payouts</p>
            </div>
            <div className="glass rounded-2xl p-5">
              <p className="text-2xl font-bold text-white">{data.overview.total_transactions}</p>
              <p className="text-xs text-white/40 mt-1">Transactions</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="glass rounded-2xl p-6">
              <h2 className="text-sm font-medium text-white mb-4">Bookings by status</h2>
              <div className="space-y-2">
                {Object.entries(data.bookings.by_status).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-white/50">{status}</span>
                    <span className="text-white font-medium">{count}</span>
                  </div>
                ))}
                {Object.keys(data.bookings.by_status).length === 0 && (
                  <p className="text-white/30 text-sm">No bookings in this period</p>
                )}
              </div>
              <p className="text-xs text-white/30 mt-4">Total: {data.bookings.total}</p>
            </div>

            <div className="glass rounded-2xl p-6">
              <h2 className="text-sm font-medium text-white mb-4">Users</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">New students</span>
                  <span className="text-white">{data.users.new_students}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">New teachers</span>
                  <span className="text-white">{data.users.new_teachers}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Active students (booked)</span>
                  <span className="text-white">{data.users.active_students}</span>
                </div>
              </div>
              <Link href="/admin/users" className="inline-block mt-4 text-xs text-[#C9A84C] hover:underline">
                Manage users →
              </Link>
            </div>
          </div>

          <div className="glass rounded-2xl p-6 mb-8">
            <h2 className="text-sm font-medium text-white mb-4">Revenue by day</h2>
            {data.revenue_by_day.length === 0 ? (
              <p className="text-white/30 text-sm">No revenue data yet</p>
            ) : (
              <div className="flex items-end gap-1 h-40">
                {data.revenue_by_day.map(d => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-[#C9A84C]/80 to-[#E8C87A]/40"
                      style={{ height: `${Math.max(4, (d.gmv_cents / maxDay) * 100)}%` }}
                      title={`${d.day}: ${formatCurrency(d.gmv_cents)}`}
                    />
                    <span className="text-[9px] text-white/25 truncate w-full text-center">
                      {d.day.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass rounded-2xl p-6">
            <h2 className="text-sm font-medium text-white mb-4">Top teachers</h2>
            {data.top_teachers.length === 0 ? (
              <p className="text-white/30 text-sm">No teacher earnings yet</p>
            ) : (
              <div className="space-y-3">
                {data.top_teachers.map((t, i) => (
                  <div key={t.teacher_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-white/30 w-4">{i + 1}</span>
                      <span className="text-sm text-white">{t.name}</span>
                    </div>
                    <span className="text-sm text-emerald-400">{formatCurrency(t.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
