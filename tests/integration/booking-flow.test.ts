// tests/integration/booking-flow.test.ts
// Integration tests for the booking creation + payment flow
// Run with: npx vitest run tests/integration/booking-flow.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calculateFees, calculateRefundAmount } from '@/lib/stripe'
import { CreateBookingSchema, CreateReviewSchema } from '@/lib/validators'

// ─── Unit tests: Fee calculation ──────────────────────────────
describe('Stripe fee calculation', () => {
  it('calculates 1% platform fee correctly', () => {
    const { platformFeeCents, teacherPayoutCents } = calculateFees(10000) // $100
    expect(platformFeeCents).toBe(100) // $1.00
    expect(teacherPayoutCents).toBe(9900) // $99.00
  })

  it('rounds fractional cents correctly', () => {
    const { platformFeeCents, teacherPayoutCents } = calculateFees(999) // $9.99
    expect(platformFeeCents).toBe(10) // rounds to nearest cent
    expect(platformFeeCents + teacherPayoutCents).toBe(999) // no money lost
  })

  it('handles minimum amount', () => {
    const { platformFeeCents } = calculateFees(100) // $1.00
    expect(platformFeeCents).toBe(1)
  })
})

// ─── Unit tests: Refund calculation ───────────────────────────
describe('Refund calculation', () => {
  const policy = {
    full_refund_hours: 24,
    partial_refund_pct: 50,
    partial_refund_hours: 2,
  }

  it('gives full refund when cancelling > 24h before', () => {
    const scheduledAt = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48h from now
    const { refundCents, refundPct } = calculateRefundAmount(10000, scheduledAt, policy)
    expect(refundPct).toBe(100)
    expect(refundCents).toBe(10000)
  })

  it('gives partial refund between 2h and 24h', () => {
    const scheduledAt = new Date(Date.now() + 12 * 60 * 60 * 1000) // 12h from now
    const { refundCents, refundPct } = calculateRefundAmount(10000, scheduledAt, policy)
    expect(refundPct).toBe(50)
    expect(refundCents).toBe(5000)
  })

  it('gives no refund when cancelling < 2h before', () => {
    const scheduledAt = new Date(Date.now() + 60 * 60 * 1000) // 1h from now
    const { refundCents, refundPct } = calculateRefundAmount(10000, scheduledAt, policy)
    expect(refundPct).toBe(0)
    expect(refundCents).toBe(0)
  })

  it('gives no refund for past lessons', () => {
    const scheduledAt = new Date(Date.now() - 60 * 60 * 1000) // 1h ago
    const { refundCents } = calculateRefundAmount(10000, scheduledAt, policy)
    expect(refundCents).toBe(0)
  })
})

// ─── Unit tests: Validators ────────────────────────────────────
describe('CreateBookingSchema', () => {
  it('validates a correct booking input', () => {
    const result = CreateBookingSchema.safeParse({
      slot_id: '123e4567-e89b-12d3-a456-426614174000',
      lesson_id: '123e4567-e89b-12d3-a456-426614174001',
      notes: 'I am a beginner',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid UUIDs', () => {
    const result = CreateBookingSchema.safeParse({
      slot_id: 'not-a-uuid',
      lesson_id: '123e4567-e89b-12d3-a456-426614174001',
    })
    expect(result.success).toBe(false)
  })

  it('rejects notes over 500 chars', () => {
    const result = CreateBookingSchema.safeParse({
      slot_id: '123e4567-e89b-12d3-a456-426614174000',
      lesson_id: '123e4567-e89b-12d3-a456-426614174001',
      notes: 'a'.repeat(501),
    })
    expect(result.success).toBe(false)
  })
})

describe('CreateReviewSchema', () => {
  it('validates correct review', () => {
    const result = CreateReviewSchema.safeParse({
      booking_id: '123e4567-e89b-12d3-a456-426614174000',
      rating: 5,
      comment: 'Excellent teacher, very patient!',
    })
    expect(result.success).toBe(true)
  })

  it('rejects rating outside 1-5', () => {
    const result = CreateReviewSchema.safeParse({
      booking_id: '123e4567-e89b-12d3-a456-426614174000',
      rating: 6,
    })
    expect(result.success).toBe(false)
  })

  it('allows review without comment', () => {
    const result = CreateReviewSchema.safeParse({
      booking_id: '123e4567-e89b-12d3-a456-426614174000',
      rating: 4,
    })
    expect(result.success).toBe(true)
  })
})

// ─── Integration test: Booking flow (mocked) ──────────────────
describe('Booking flow (mocked)', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
  })

  it('returns booking ID and payment intent on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        bookingId: 'test-booking-123',
        paymentIntentClientSecret: 'pi_test_secret_abc',
        amount: 10000,
        currency: 'usd',
      }),
    })

    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slot_id: '123e4567-e89b-12d3-a456-426614174000',
        lesson_id: '123e4567-e89b-12d3-a456-426614174001',
      }),
    })

    const data = await response.json()
    expect(response.ok).toBe(true)
    expect(data.bookingId).toBe('test-booking-123')
    expect(data.paymentIntentClientSecret).toMatch(/^pi_test_/)
  })

  it('returns 409 on double-booking attempt', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'This time slot was just booked by someone else.' }),
    })

    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slot_id: '123e4567-e89b-12d3-a456-426614174000',
        lesson_id: '123e4567-e89b-12d3-a456-426614174001',
      }),
    })

    expect(response.status).toBe(409)
    const data = await response.json()
    expect(data.error).toContain('booked')
  })
})
