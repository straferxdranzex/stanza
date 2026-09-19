import { redirect } from 'next/navigation'
import { getAuthenticatedUser, createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/server'
import Link from 'next/link'
import type { DBPayment } from '@/types'

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

type PaymentRow = Pick<
  DBPayment,
  | 'id'
  | 'amount_cents'
  | 'platform_fee_cents'
  | 'teacher_payout_cents'
  | 'status'
  | 'refund_amount_cents'
  | 'created_at'
> & {
  booking: {
    id: string
    scheduled_at: string
    lesson: { title: string } | null
    student: { full_name: string } | null
  } | null
}

export default async function TeacherEarningsPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold text-white mb-2">Earnings</h1>
        <p className="text-white/50">Connect Supabase to view earnings.</p>
      </div>
    )
  }

  const user = await getAuthenticatedUser()
  if (!user) redirect('/login')
  if ((user as { role: string }).role !== 'teacher') redirect('/student')

  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('payments')
    .select(`
      id,
      amount_cents,
      platform_fee_cents,
      teacher_payout_cents,
      status,
      refund_amount_cents,
      created_at,
      booking:bookings(
        id,
        scheduled_at,
        lesson:lessons(title),
        student:users!bookings_student_id_fkey(full_name)
      )
    `)
    .eq('teacher_id', (user as { id: string }).id)
    .order('created_at', { ascending: false })
    .limit(50)

  const rows = (data ?? []) as unknown as PaymentRow[]
  const succeeded = rows.filter(p => p.status === 'succeeded' || p.status === 'partially_refunded')
  const pending = rows.filter(p => p.status === 'pending')

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const totalEarned = succeeded.reduce((sum, p) => {
    const refundShare = p.refund_amount_cents
      ? Math.round((p.refund_amount_cents / p.amount_cents) * p.teacher_payout_cents)
      : 0
    return sum + Math.max(0, p.teacher_payout_cents - refundShare)
  }, 0)

  const thisMonth = succeeded
    .filter(p => new Date(p.created_at) >= monthStart)
    .reduce((sum, p) => sum + p.teacher_payout_cents, 0)

  const pendingPayout = pending.reduce((sum, p) => sum + p.teacher_payout_cents, 0)

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Earnings</h1>
          <p className="text-white/50 mt-1">Your payouts and revenue history</p>
        </div>
        <Link href="/teacher/settings/stripe" className="text-sm text-[#C9A84C] hover:underline">
          Stripe settings
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          ['Total earned', formatMoney(totalEarned)],
          ['This month', formatMoney(thisMonth)],
          ['Pending', formatMoney(pendingPayout)],
        ].map(([label, val]) => (
          <div key={label} className="glass rounded-2xl p-5">
            <p className="text-2xl font-bold text-white">{val}</p>
            <p className="text-xs text-white/40 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <h2 className="text-white font-medium mb-2">No earnings yet</h2>
          <p className="text-white/40 text-sm mb-6">Earnings appear here after students pay for lessons.</p>
          <Link href="/teacher/availability" className="btn-primary px-5 py-2.5 text-sm inline-block">
            Set availability
          </Link>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden divide-y divide-white/[0.06]">
          {rows.map((payment) => {
            const booking = payment.booking
            const lesson = booking?.lesson
            const student = booking?.student

            return (
              <div key={payment.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {lesson?.title ?? 'Lesson'}
                    {student?.full_name ? ` · ${student.full_name}` : ''}
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {new Date(payment.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                    {' · '}
                    Fee {formatMoney(payment.platform_fee_cents)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-emerald-400">
                    +{formatMoney(payment.teacher_payout_cents)}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-white/40 mt-1">
                    {String(payment.status).replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
