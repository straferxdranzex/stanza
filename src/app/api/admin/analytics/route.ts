// src/app/api/admin/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') ?? '30d'

  const supabase = createServiceClient()
  const cutoff = new Date()
  if (period !== 'all') {
    const days = parseInt(period, 10) || 30
    cutoff.setDate(cutoff.getDate() - days)
  }

  const sinceDate = period !== 'all' ? cutoff.toISOString() : '1970-01-01'

  const [
    gmvResult,
    bookingStatsResult,
    userStatsResult,
    topTeachersResult,
  ] = await Promise.all([
    supabase
      .from('payments')
      .select('amount_cents, platform_fee_cents, teacher_payout_cents, status, created_at, teacher_id')
      .eq('status', 'succeeded')
      .gte('created_at', sinceDate),

    supabase
      .from('bookings')
      .select('status, created_at')
      .gte('created_at', sinceDate),

    supabase
      .from('users')
      .select('role, is_active, created_at')
      .gte('created_at', sinceDate),

    supabase
      .from('payments')
      .select(`
        teacher_id,
        teacher_payout_cents,
        users!payments_teacher_id_fkey(full_name, avatar_url)
      `)
      .eq('status', 'succeeded')
      .gte('created_at', sinceDate),
  ])

  const payments = gmvResult.data ?? []
  const gmv = payments.reduce((sum, p) => sum + p.amount_cents, 0)
  const platformEarnings = payments.reduce((sum, p) => sum + p.platform_fee_cents, 0)
  const teacherPayouts = payments.reduce((sum, p) => sum + p.teacher_payout_cents, 0)

  const bookings = bookingStatsResult.data ?? []
  const bookingCounts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const users = userStatsResult.data ?? []
  const newStudents = users.filter(u => u.role === 'student').length
  const newTeachers = users.filter(u => u.role === 'teacher').length

  const { count: activeStudents } = await supabase
    .from('bookings')
    .select('student_id', { count: 'exact', head: true })
    .gte('created_at', sinceDate)
    .neq('status', 'cancelled')

  const teacherMap = new Map<string, { name: string; avatar: string | null; total: number }>()
  for (const p of topTeachersResult.data ?? []) {
    const existing = teacherMap.get(p.teacher_id)
    const userJoin = Array.isArray(p.users) ? p.users[0] : p.users
    if (existing) {
      existing.total += p.teacher_payout_cents
    } else {
      teacherMap.set(p.teacher_id, {
        name: (userJoin as any)?.full_name ?? 'Unknown',
        avatar: (userJoin as any)?.avatar_url ?? null,
        total: p.teacher_payout_cents,
      })
    }
  }
  const topTeachers = Array.from(teacherMap.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)
    .map(([id, data]) => ({ teacher_id: id, ...data }))

  // Build revenue_by_day from payments (no missing RPC)
  const byDay = new Map<string, { gmv_cents: number; fee_cents: number }>()
  for (const p of payments) {
    const day = p.created_at.slice(0, 10)
    const cur = byDay.get(day) ?? { gmv_cents: 0, fee_cents: 0 }
    cur.gmv_cents += p.amount_cents
    cur.fee_cents += p.platform_fee_cents
    byDay.set(day, cur)
  }
  const revenue_by_day = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({ day, ...v }))

  return NextResponse.json({
    period,
    overview: {
      gmv_cents: gmv,
      platform_earnings_cents: platformEarnings,
      teacher_payouts_cents: teacherPayouts,
      total_transactions: payments.length,
    },
    bookings: {
      total: bookings.length,
      by_status: bookingCounts,
    },
    users: {
      new_students: newStudents,
      new_teachers: newTeachers,
      active_students: activeStudents ?? 0,
    },
    top_teachers: topTeachers,
    revenue_by_day,
  })
}
