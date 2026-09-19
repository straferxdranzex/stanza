import { redirect } from 'next/navigation'
import { getAuthenticatedUser, isSupabaseConfigured } from '@/lib/supabase/server'
import { AdminDisputesClient } from '@/components/admin/AdminDisputesClient'
import { UnconfiguredBanner } from '@/components/shared/UnconfiguredBanner'

export default async function AdminDisputesPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="px-6 py-8">
        <UnconfiguredBanner />
      </div>
    )
  }
  const user = await getAuthenticatedUser()
  if (!user || user.role !== 'admin') redirect('/login')
  return <AdminDisputesClient />
}
