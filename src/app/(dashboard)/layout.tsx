import { getAuthenticatedUser, isSupabaseConfigured } from '@/lib/supabase/server'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { redirect } from 'next/navigation'

const DEMO_USER: any = {
  id: 'demo',
  role: 'student',
  full_name: 'Demo User',
  email: 'demo@example.com',
  avatar_url: null,
  timezone: 'UTC',
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isProduction = process.env.NODE_ENV === 'production'

  if (!isSupabaseConfigured) {
    if (isProduction) {
      redirect('/login?reason=misconfigured')
    }
    return (
      <div className="min-h-screen bg-[#060609] flex">
        <DashboardSidebar user={DEMO_USER} />
        <main className="flex-1 min-w-0 overflow-y-auto pt-14 lg:pt-0">
          <div className="max-w-6xl mx-auto animate-[fadeInUp_0.35s_ease]">{children}</div>
        </main>
      </div>
    )
  }

  const user = await getAuthenticatedUser()
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#060609] flex">
      <DashboardSidebar user={user} />
      <main className="flex-1 min-w-0 overflow-y-auto pt-14 lg:pt-0">
        <div className="max-w-6xl mx-auto animate-[fadeInUp_0.35s_ease]">{children}</div>
      </main>
    </div>
  )
}
