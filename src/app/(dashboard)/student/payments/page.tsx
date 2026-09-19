import { redirect } from 'next/navigation'
import { getAuthenticatedUser, createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/server'
import Link from 'next/link'
import type { DBPayment, PaymentStatus } from '@/types'

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function statusStyles(status: string) {
  switch (status) {
    case 'succeeded': return 'text-emerald-400 bg-emerald-500/10'
    case 'pending': return 'text-amber-400 bg-amber-500/10'
    case 'failed': return 'text-red-400 bg-red-500/10'
    case 'refunded':
    case 'partially_refunded': return 'text-blue-400 bg-blue-500/10'
    default: return 'text-white/50 bg-white/5'
  }
}

type PaymentRow = Pick<
  DBPayment,
  'id' | 'amount_cents' | 'platform_fee_cents' | 'status' | 'currency' | 'refund_amount_cents' | 'created_at'
> & {
  booking: {
    id: string
    scheduled_at: string
    lesson: { title: string } | null
    teacher: { full_name: string } | null
  } | null
}

export default async function StudentPaymentsPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold text-white mb-2">Payments</h1>
        <p className="text-white/50">Connect Supabase to view payment history.</p>
      </div>
    )
  }

  const user = await getAuthenticatedUser()
  if (!user) redirect('/login')
  if ((user as { role: string }).role !== 'student') redirect('/student')

  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('payments')
    .select(`
      id,
      amount_cents,
      platform_fee_cents,
      status,
      currency,
      refund_amount_cents,
      created_at,
      booking:bookings(
        id,
        scheduled_at,
        lesson:lessons(title),
        teacher:users!bookings_teacher_id_fkey(full_name)
      )
    `)
    .eq('student_id', (user as { id: string }).id)
    .order('created_at', { ascending: false })
    .limit(50)

  const rows = (data ?? []) as unknown as PaymentRow[]
  const totalSpent = rows
    .filter(p => p.status === 'succeeded' || p.status === 'partially_refunded')
    .reduce((sum, p) => sum + (p.amount_cents - (p.refund_amount_cents ?? 0)), 0)

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Payments</h1>
        <p className="text-white/50 mt-1">Your billing history</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="glass rounded-2xl p-5">
          <p className="text-2xl font-bold text-white">{formatMoney(totalSpent)}</p>
          <p className="text-xs text-white/40 mt-1">Total spent</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-2xl font-bold text-white">{rows.length}</p>
          <p className="text-xs text-white/40 mt-1">Transactions</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <h2 className="text-white font-medium mb-2">No payments yet</h2>
          <p className="text-white/40 text-sm mb-6">Your payment history will appear here after booking a lesson.</p>
          <Link href="/teachers" className="btn-primary px-5 py-2.5 text-sm inline-block">Book a lesson</Link>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden divide-y divide-white/[0.06]">
          {rows.map((payment) => {
            const booking = payment.booking
            const lesson = booking?.lesson
            const teacher = booking?.teacher

            return (
              <div key={payment.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {lesson?.title ?? 'Lesson'}
                    {teacher?.full_name ? ` · ${teacher.full_name}` : ''}
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {new Date(payment.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                    {booking?.scheduled_at
                      ? ` · Lesson ${new Date(booking.scheduled_at).toLocaleDateString()}`
                      : ''}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-white">{formatMoney(payment.amount_cents)}</p>
                  <span className={`inline-block mt-1 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${statusStyles(payment.status as PaymentStatus)}`}>
                    {String(payment.status).replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
