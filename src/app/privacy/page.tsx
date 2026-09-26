import Link from 'next/link'
import { BrandLogo } from '@/components/shared/BrandLogo'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#050508] text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <BrandLogo size="md" className="mb-10" />
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-white/40 text-sm mb-10">Last updated: {new Date().toLocaleDateString('en-US')}</p>

        <div className="space-y-8 text-white/70 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">1. What we collect</h2>
            <p>
              Account details (name, email), profile content, booking history, messages between students and
              teachers, payment metadata from Stripe (we do not store full card numbers), and technical logs
              needed to operate the service.
            </p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">2. How we use data</h2>
            <p>
              To provide bookings, payments, Zoom lesson access, messaging, support, fraud prevention, and
              product improvement. We send transactional emails (confirmations, reminders, cancellations).
            </p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">3. Processors</h2>
            <p>
              We use trusted processors including Supabase (auth/database), Stripe (payments), Zoom (video),
              and Resend (email). Each processes data under their own terms and our agreements with them.
            </p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">4. Retention &amp; rights</h2>
            <p>
              We retain account and booking records as needed for the service, legal, and accounting
              purposes. You may request access or deletion of personal data subject to legal holds and
              legitimate business needs.
            </p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">5. Contact</h2>
            <p>
              For privacy requests, contact us through the support channels listed on the site.
            </p>
          </section>
        </div>

        <Link href="/" className="inline-block mt-12 text-sm text-[#C9A84C] hover:text-[#E8C87A]">
          ← Back to home
        </Link>
      </div>
    </div>
  )
}
