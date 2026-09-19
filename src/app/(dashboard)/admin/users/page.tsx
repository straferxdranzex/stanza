import { redirect } from 'next/navigation'
import { getAuthenticatedUser, isSupabaseConfigured } from '@/lib/supabase/server'
import { AdminUsersClient } from '@/components/admin/AdminUsersClient'
import { UnconfiguredBanner } from '@/components/shared/UnconfiguredBanner'

export default async function AdminUsersPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="px-6 py-8">
        <UnconfiguredBanner />
        <p className="text-white/40 text-sm mt-4">Connect Supabase to manage users.</p>
      </div>
    )
  }
  const user = await getAuthenticatedUser()
  if (!user || user.role !== 'admin') redirect('/login')
  return <AdminUsersClient />
}
