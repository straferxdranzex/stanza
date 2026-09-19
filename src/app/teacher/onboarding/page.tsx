'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BrandLogo } from '@/components/shared/BrandLogo'

export default function TeacherOnboardingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center px-6">
      <div className="max-w-lg w-full">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-5">
            <BrandLogo size="xl" href={null} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to Stanza! 🎉</h1>
          <p className="text-white/50">Let's get your teacher profile set up in 3 steps.</p>
        </div>

        <div className="space-y-3 mb-10">
          {[
            { step: '1', title: 'Create your first lesson', desc: 'Add a lesson with pricing, duration, and skill level.', href: '/teacher/lessons', label: 'Go to Lessons →' },
            { step: '2', title: 'Set your availability', desc: 'Add time slots so students can book with you.', href: '/teacher/availability', label: 'Set Availability →' },
            { step: '3', title: 'Complete your profile', desc: 'Add a bio, headline, and specialties to attract students.', href: '/teacher/settings', label: 'Edit Profile →' },
          ].map(({ step, title, desc, href, label }) => (
            <div key={step} className="glass rounded-2xl p-5 flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-bold text-[#C9A84C]">{step}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white">{title}</p>
                <p className="text-sm text-white/40 mt-0.5">{desc}</p>
              </div>
              <Link href={href} className="text-sm text-[#C9A84C] hover:text-[#E8C87A] whitespace-nowrap transition-colors">
                {label}
              </Link>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link href="/teacher" className="text-sm text-white/30 hover:text-white transition-colors">
            Skip for now → Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
