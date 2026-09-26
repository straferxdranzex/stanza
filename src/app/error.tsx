'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-white/50 text-sm mb-8">
          An unexpected error occurred. Try again, or return home.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="btn-primary px-5 py-2.5 text-sm">
            Try again
          </button>
          <Link href="/" className="px-5 py-2.5 text-sm rounded-xl border border-white/10 text-white/70 hover:text-white">
            Home
          </Link>
        </div>
      </div>
    </div>
  )
}
