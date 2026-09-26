import Link from 'next/link'
import { BrandLogo } from '@/components/shared/BrandLogo'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-8">
          <BrandLogo size="lg" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-white/50 text-sm mb-8">
          That link doesn&apos;t exist or may have moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="btn-primary px-5 py-2.5 text-sm">
            Home
          </Link>
          <Link href="/teachers" className="px-5 py-2.5 text-sm rounded-xl border border-white/10 text-white/70 hover:text-white">
            Browse teachers
          </Link>
        </div>
      </div>
    </div>
  )
}
