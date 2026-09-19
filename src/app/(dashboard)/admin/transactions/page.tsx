import { redirect } from 'next/navigation'
import { getAuthenticatedUser, createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import { UnconfiguredBanner } from '@/components/shared/UnconfiguredBanner'

const statusClass: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400',
  succeeded: 'bg-emerald-500/10 text-emerald-400',
  failed: 'bg-red-500/10 text-red-400',
  refunded: 'bg-blue-500/10 text-blue-400',
  partially_refunded: 'bg-blue-500/10 text-blue-300',
}

export default async function AdminTransactionsPage() {
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
  const { data: payments } = await supabase
    .from('payments')
    .select(`
      id, amount_cents, platform_fee_cents, teacher_payout_cents, status,
      refund_amount_cents, currency, created_at,
      student:users!payments_student_id_fkey(full_name, email),
      teacher:users!payments_teacher_id_fkey(full_name),
      booking:bookings(id, lesson:lessons(title))
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  const rows = payments ?? []
  const succeeded = rows.filter(p => p.status === 'succeeded' || p.status === 'partially_refunded')
  const gmv = succeeded.reduce((s, p) => s + p.amount_cents, 0)
  const fees = succeeded.reduce((s, p) => s + p.platform_fee_cents, 0)

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Transactions</h1>
        <p className="text-white/50 mt-1">Payment history across Stanza</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="glass rounded-2xl p-5">
          <p className="text-2xl font-bold text-white">{formatCurrency(gmv)}</p>
          <p className="text-xs text-white/40 mt-1">GMV (this page)</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-2xl font-bold text-[#C9A84C]">{formatCurrency(fees)}</p>
          <p className="text-xs text-white/40 mt-1">Platform fees</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-2xl font-bold text-white">{rows.length}</p>
          <p className="text-xs text-white/40 mt-1">Transactions shown</p>
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-white/40">
              <th className="text-left py-3 px-4 font-normal">Lesson</th>
              <th className="text-left py-3 px-4 font-normal">Student</th>
              <th className="text-left py-3 px-4 font-normal">Teacher</th>
              <th className="text-left py-3 px-4 font-normal">Amount</th>
              <th className="text-left py-3 px-4 font-normal">Fee</th>
              <th className="text-left py-3 px-4 font-normal">Status</th>
              <th className="text-left py-3 px-4 font-normal">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(p => {
              const student = Array.isArray(p.student) ? p.student[0] : p.student
              const teacher = Array.isArray(p.teacher) ? p.teacher[0] : p.teacher
              const booking = Array.isArray(p.booking) ? p.booking[0] : p.booking
              const lesson = booking?.lesson
                ? (Array.isArray(booking.lesson) ? booking.lesson[0] : booking.lesson)
                : null
              return (
                <tr key={p.id} className="border-b border-white/[0.04]">
                  <td className="py-3 px-4 text-white font-medium">{lesson?.title ?? '—'}</td>
                  <td className="py-3 px-4 text-white/60">{student?.full_name}</td>
                  <td className="py-3 px-4 text-white/60">{teacher?.full_name}</td>
                  <td className="py-3 px-4 text-white">{formatCurrency(p.amount_cents)}</td>
                  <td className="py-3 px-4 text-[#C9A84C]">{formatCurrency(p.platform_fee_cents)}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass[p.status] ?? ''}`}>
                      {String(p.status).replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white/35 text-xs">{formatRelativeTime(p.created_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-10 text-center text-white/30 text-sm">No transactions yet</p>
        )}
      </div>
    </div>
  )
}
