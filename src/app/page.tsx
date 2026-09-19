import { Navbar } from '@/components/landing/Navbar'
import { Hero } from '@/components/landing/Hero'
import { Services } from '@/components/landing/Services'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { FeaturedTeachers } from '@/components/landing/FeaturedTeachers'
import { Testimonials } from '@/components/landing/Testimonials'
import { Pricing } from '@/components/landing/Pricing'
import { FAQ, Footer } from '@/components/landing/FAQ'

export default function HomePage() {
  return (
    <main className="noise">
      <Navbar />
      <Hero />
      <Services />
      <HowItWorks />
      <FeaturedTeachers />
      <Testimonials />
      <Pricing />
      <FAQ />
      <Footer />
    </main>
  )
}
