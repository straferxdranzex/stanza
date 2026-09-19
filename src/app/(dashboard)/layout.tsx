import { getAuthenticatedUser, isSupabaseConfigured } from "@/lib/supabase/server"
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar"

const DEMO_ADMIN: any = {
  id: "demo", role: "admin", full_name: "Demo User",
  email: "demo@example.com", avatar_url: null, timezone: "UTC",
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let user: any = null

  if (isSupabaseConfigured) {
    user = await getAuthenticatedUser()
    if (!user) {
      const { redirect } = await import("next/navigation")
      redirect("/login")
    }
  } else {
    user = DEMO_ADMIN
  }

  return (
    <div className="min-h-screen bg-[#060609] flex">
      <DashboardSidebar user={user} />
      <main className="flex-1 min-w-0 overflow-y-auto pt-14 lg:pt-0">
        <div className="max-w-6xl mx-auto animate-[fadeInUp_0.35s_ease]">
          {children}
        </div>
      </main>
    </div>
  )
}
