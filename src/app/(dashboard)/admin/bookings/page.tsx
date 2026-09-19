import { redirect } from 'next/navigation'
import { getAuthenticatedUser, createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import Link from 'next/link'
import { UnconfiguredBanner } from '@/components/shared/UnconfiguredBanner'

const statusClass: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400',
  confirmed: 'bg-blue-500/10 text-blue-400',
  completed: 'bg-emerald-500/10 text-emerald-400',
  cancelled: 'bg-red-500/10 text-red-400',
  refunded: 'bg-white/5 text-white/40',
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  if (!isSupabaseConfigured) {
    return (
      <div className="px-6 py-8">
        <UnconfiguredBanner />
      </div>
    )
  }

  const user = await getAuthenticatedUser()
  if (!user || user.role !== 'admin') redirect('/login')

  const supabase = createServiceClient()
  let query = supabase
    .from('bookings')
    .select(`
      id, status, scheduled_at, ends_at, created_at,
      student:users!bookings_student_id_fkey(full_name, email),
      teacher:users!bookings_teacher_id_fkey(full_name, email),
      lesson:lessons(title, price_cents, duration_mins),
      payment:payments(amount_cents, status, platform_fee_cents)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (searchParams.status) {
    query = query.eq('status', searchParams.status)
  }

  const { data: bookings } = await query

  const filters = ['', 'pending', 'confirmed', 'completed', 'cancelled', 'refunded']

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Bookings</h1>
        <p className="text-white/50 mt-1">All platform lesson bookings</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {filters.map(f => (
          <Link
            key={f || 'all'}
            href={f ? `/admin/bookings?status=${f}` : '/admin/bookings'}
            className={`px-3 py-1.5 rounded-lg text-xs capitalize border transition-colors ${
              (searchParams.status ?? '') === f
                ? 'border-[#C9A84C]/40 bg-[#C9A84C]/10 text-[#C9A84C]'
                : 'border-white/10 text-white/40 hover:text-white'
            }`}
          >
            {f || 'all'}
          </Link>
        ))}
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-white/40">
              <th className="text-left py-3 px-4 font-normal">Lesson</th>
              <th className="text-left py-3 px-4 font-normal">Student</th>
              <th className="text-left py-3 px-4 font-normal">Teacher</th>
              <th className="text-left py-3 px-4 font-normal">When</th>
              <th className="text-left py-3 px-4 font-normal">Amount</th>
              <th className="text-left py-3 px-4 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {(bookings ?? []).map(b => {
              const student = Array.isArray(b.student) ? b.student[0] : b.student
              const teacher = Array.isArray(b.teacher) ? b.teacher[0] : b.teacher
              const lesson = Array.isArray(b.lesson) ? b.lesson[0] : b.lesson
              const payment = Array.isArray(b.payment) ? b.payment[0] : b.payment
              return (
                <tr key={b.id} className="border-b border-white/[0.04]">
                  <td className="py-3 px-4 text-white font-medium">{lesson?.title ?? '—'}</td>
                  <td className="py-3 px-4 text-white/60">{student?.full_name}</td>
                  <td className="py-3 px-4 text-white/60">{teacher?.full_name}</td>
                  <td className="py-3 px-4 text-white/40 text-xs">
                    {new Date(b.scheduled_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-white/60">
                    {payment?.amount_cents != null
                      ? formatCurrency(payment.amount_cents)
                      : lesson?.price_cents != null
                        ? formatCurrency(lesson.price_cents)
                        : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass[b.status] ?? ''}`}>
                      {b.status}
                    </span>
                    <p className="text-[10px] text-white/25 mt-1">{formatRelativeTime(b.created_at)}</p>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {(bookings ?? []).length === 0 && (
          <p className="p-10 text-center text-white/30 text-sm">No bookings found</p>
        )}
      </div>
    </div>
  )
}
