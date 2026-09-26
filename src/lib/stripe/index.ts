// src/lib/stripe/index.ts
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'

// Stripe only initialised when key is present — API routes check this before use
const stripeKey = process.env.STRIPE_SECRET_KEY

if (!stripeKey || stripeKey === 'sk_test_placeholder') {
  console.warn('[Stripe] STRIPE_SECRET_KEY is missing or placeholder — payment APIs will fail')
}

export const stripe = new Stripe(stripeKey || 'sk_test_placeholder', {
  apiVersion: '2024-06-20',
  typescript: true,
})

export function assertStripeConfigured() {
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder') {
    throw new Error('Stripe is not configured')
  }
}

// Platform fee: 1% (100 basis points)
export const PLATFORM_FEE_BPS = 100 // 1%

export function calculateFees(amountCents: number) {
  const platformFeeCents = Math.round(amountCents * (PLATFORM_FEE_BPS / 10000))
  const teacherPayoutCents = amountCents - platformFeeCents
  return { platformFeeCents, teacherPayoutCents }
}

// ============================================================
// Payment Intent
// ============================================================
export async function createPaymentIntent({
  bookingId,
  amountCents,
  currency = 'usd',
  teacherStripeAccountId,
  idempotencyKey,
  studentEmail,
}: {
  bookingId: string
  amountCents: number
  currency?: string
  teacherStripeAccountId: string
  idempotencyKey: string
  studentEmail: string
}) {
  assertStripeConfigured()
  const { platformFeeCents } = calculateFees(amountCents)

  const intent = await stripe.paymentIntents.create(
    {
      amount: amountCents,
      currency,
      payment_method_types: ['card'],
      transfer_data: {
        destination: teacherStripeAccountId,
      },
      application_fee_amount: platformFeeCents,
      metadata: {
        booking_id: bookingId,
        platform: 'stanza',
      },
      receipt_email: studentEmail,
      description: `Lesson booking #${bookingId}`,
    },
    {
      idempotencyKey,
    }
  )

  return intent
}

// ============================================================
// Teacher Onboarding (Connect Express)
// ============================================================
export async function createConnectAccountLink({
  teacherId,
  teacherEmail,
}: {
  teacherId: string
  teacherEmail: string
}) {
  assertStripeConfigured()
  // Create or retrieve existing connected account
  let accountId: string

  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('teacher_profiles')
    .select('stripe_account_id')
    .eq('user_id', teacherId)
    .single()

  if (profile?.stripe_account_id) {
    accountId = profile.stripe_account_id
  } else {
    const account = await stripe.accounts.create({
      type: 'express',
      email: teacherEmail,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: { teacher_id: teacherId, platform: 'stanza' },
    })
    accountId = account.id

    await supabase
      .from('teacher_profiles')
      .update({ stripe_account_id: accountId })
      .eq('user_id', teacherId)
  }

  // Generate onboarding link
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/teacher/settings/stripe?refresh=true`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/teacher/settings/stripe?success=true`,
    type: 'account_onboarding',
  })

  return { url: link.url, accountId }
}

// Check if teacher's Stripe account is fully onboarded
export async function checkStripeAccountStatus(accountId: string) {
  const account = await stripe.accounts.retrieve(accountId)
  return {
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
    requirements: account.requirements?.currently_due ?? [],
  }
}

// Teacher dashboard link
export async function getStripeDashboardLink(accountId: string) {
  const link = await stripe.accounts.createLoginLink(accountId)
  return link.url
}

// ============================================================
// Refunds
// ============================================================
export async function processRefund({
  paymentIntentId,
  amountCents,
  reason = 'requested_by_customer',
}: {
  paymentIntentId: string
  amountCents?: number
  reason?: Stripe.RefundCreateParams['reason']
}) {
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    ...(amountCents ? { amount: amountCents } : {}),
    reason,
  })
  return refund
}

// ============================================================
// Webhook Signature Verification
// ============================================================
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, secret)
}

// ============================================================
// Refund calculation based on cancellation policy
// ============================================================
export function calculateRefundAmount(
  amountCents: number,
  scheduledAt: Date,
  policy: {
    full_refund_hours: number
    partial_refund_pct: number
    partial_refund_hours: number
  }
): { refundCents: number; refundPct: number } {
  const hoursUntilLesson =
    (scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60)

  if (hoursUntilLesson >= policy.full_refund_hours) {
    return { refundCents: amountCents, refundPct: 100 }
  }

  if (hoursUntilLesson >= policy.partial_refund_hours) {
    const refundCents = Math.round(amountCents * policy.partial_refund_pct / 100)
    return { refundCents, refundPct: policy.partial_refund_pct }
  }

  return { refundCents: 0, refundPct: 0 }
}
