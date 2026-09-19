'use client'

import { useState, FormEvent } from 'react'
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

interface Props {
  amountCents: number
  onSuccess: () => void
  onError: (message: string) => void
}

export function CheckoutForm({ amountCents, onSuccess, onError }: Props) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setSubmitting(true)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        return_url: `${window.location.origin}/student/bookings?paid=1`,
      },
    })

    if (error) {
      onError(error.message ?? 'Payment failed. Please try again.')
      setSubmitting(false)
      return
    }

    if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
      onSuccess()
      return
    }

    onError(`Unexpected payment status: ${paymentIntent?.status ?? 'unknown'}`)
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="btn-primary w-full py-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting
          ? 'Processing payment…'
          : `Pay $${(amountCents / 100).toFixed(2)}`}
      </button>

      <p className="text-xs text-white/30 text-center">
        Secured by Stripe. Your card is never stored on our servers.
      </p>
    </form>
  )
}
