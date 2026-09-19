'use client'
// src/components/shared/UnconfiguredBanner.tsx
// Shown when .env is not filled in — previews UI without errors

export function UnconfiguredBanner() {
  return (
    <div className="mb-6 flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
      <span className="text-amber-400 text-lg flex-shrink-0 mt-0.5">⚠</span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-amber-300">Demo mode — Supabase not configured</p>
        <p className="text-xs text-amber-400/70 mt-1 leading-relaxed">
          You're seeing sample data. To enable real auth, bookings, and payments, copy{' '}
          <code className="bg-amber-500/10 px-1 rounded font-mono">.env.example</code> to{' '}
          <code className="bg-amber-500/10 px-1 rounded font-mono">.env.local</code> and fill in your Supabase keys.
        </p>
      </div>
    </div>
  )
}
