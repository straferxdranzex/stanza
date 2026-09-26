import Link from 'next/link'
import { BrandLogo } from '@/components/shared/BrandLogo'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#050508] text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <BrandLogo size="md" className="mb-10" />
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-white/40 text-sm mb-10">Last updated: {new Date().toLocaleDateString('en-US')}</p>

        <div className="space-y-8 text-white/70 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">1. Platform</h2>
            <p>
              Stanza is a marketplace connecting students with independent teachers for online art and
              classical music lessons. Stanza facilitates booking, payment, and video links; teachers
              deliver instruction as independent providers.
            </p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">2. Accounts</h2>
            <p>
              You must provide accurate information and keep your login secure. You are responsible for
              activity under your account. We may suspend accounts that violate these terms or applicable law.
            </p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">3. Bookings &amp; payments</h2>
            <p>
              Students pay via Stripe at booking. Teachers receive payouts through Stripe Connect after
              platform fees. Cancellation and refund amounts follow each teacher&apos;s cancellation policy
              (or Stanza defaults when none is set).
            </p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">4. Lessons &amp; Zoom</h2>
            <p>
              Lessons are conducted via Zoom. Join links are available through your Stanza dashboard near
              lesson time. Teachers and students must not share join links with unauthorized parties.
            </p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">5. Conduct</h2>
            <p>
              Harassment, fraud, copyright infringement, or misuse of the platform is prohibited. Disputes
              may be reviewed by Stanza admins; resolution may include refunds or account action.
            </p>
          </section>
          <section>
            <h2 className="text-white font-semibold text-lg mb-2">6. Contact</h2>
            <p>
              Questions about these terms: use the support channels listed on the site or email the address
              published in your account communications.
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
