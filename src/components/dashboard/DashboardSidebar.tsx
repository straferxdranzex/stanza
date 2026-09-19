'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { AuthUser } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { BrandLogo } from '@/components/shared/BrandLogo'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

function getNavItems(role: string): NavItem[] {
  const studentNav: NavItem[] = [
    { label: 'Overview', href: '/student', icon: <GridIcon /> },
    { label: 'Bookings', href: '/student/bookings', icon: <CalIcon /> },
    { label: 'Payments', href: '/student/payments', icon: <CardIcon /> },
    { label: 'Messages', href: '/student/messages', icon: <ChatIcon /> },
    { label: 'Reviews', href: '/student/reviews', icon: <StarIconNav /> },
  ]
  const teacherNav: NavItem[] = [
    { label: 'Overview', href: '/teacher', icon: <GridIcon /> },
    { label: 'Lessons', href: '/teacher/lessons', icon: <MusicIcon /> },
    { label: 'Availability', href: '/teacher/availability', icon: <CalIcon /> },
    { label: 'Bookings', href: '/teacher/bookings', icon: <CheckIcon /> },
    { label: 'Earnings', href: '/teacher/earnings', icon: <ChartIcon /> },
    { label: 'Messages', href: '/teacher/messages', icon: <ChatIcon /> },
    { label: 'Settings', href: '/teacher/settings', icon: <GearIcon /> },
  ]
  const adminNav: NavItem[] = [
    { label: 'Overview', href: '/admin', icon: <GridIcon /> },
    { label: 'Users', href: '/admin/users', icon: <UsersIcon /> },
    { label: 'Bookings', href: '/admin/bookings', icon: <CalIcon /> },
    { label: 'Transactions', href: '/admin/transactions', icon: <CardIcon /> },
    { label: 'Analytics', href: '/admin/analytics', icon: <ChartIcon /> },
    { label: 'Disputes', href: '/admin/disputes', icon: <AlertIcon /> },
  ]
  return role === 'teacher' ? teacherNav : role === 'admin' ? adminNav : studentNav
}

export function DashboardSidebar({ user }: { user: AuthUser }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navItems = getNavItems(user.role)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const roleColors: Record<string, string> = {
    student: 'from-blue-500/20 to-blue-900/5 text-blue-400',
    teacher: 'from-[#C9A84C]/20 to-[#C9A84C]/5 text-[#C9A84C]',
    admin: 'from-violet-500/20 to-violet-900/5 text-violet-300',
  }

  const sidebar = (
    <aside
      className={`flex flex-col border-r border-white/[0.06] bg-[#07070C] transition-all duration-300 h-full ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/[0.06]">
        <BrandLogo size="sm" />
        <button
          onClick={() => setCollapsed(v => !v)}
          className="ml-auto text-white/30 hover:text-white p-1 rounded transition-colors hidden lg:block"
          aria-label="Collapse sidebar"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
            {collapsed
              ? <path d="M4 8h8M4 4h8M4 12h8" />
              : <path d="M2 8h12M2 4h12M2 12h12" />}
          </svg>
        </button>
        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto text-white/40 hover:text-white p-1 lg:hidden"
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>

      {!collapsed && (
        <div className="px-4 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${roleColors[user.role]} flex items-center justify-center text-xs font-bold flex-shrink-0`}>
              {user.full_name[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
              <p className="text-xs text-white/40 capitalize">{user.role}</p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const active = pathname === item.href || (item.href !== `/${user.role}` && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? 'bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span className={`flex-shrink-0 w-4 h-4 ${active ? 'text-[#C9A84C]' : 'text-current'}`}>
                {item.icon}
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="px-2 py-4 border-t border-white/[0.06] space-y-0.5">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/[0.04] transition-all"
          title={collapsed ? 'Home' : undefined}
        >
          <span className="flex-shrink-0 w-4 h-4"><HomeIcon /></span>
          {!collapsed && 'Home'}
        </Link>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-all"
          title={collapsed ? 'Sign out' : undefined}
        >
          <span className="flex-shrink-0 w-4 h-4"><LogoutIcon /></span>
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-[#07070C]/95 backdrop-blur border-b border-white/[0.06] flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-1 text-white/60 hover:text-white"
          aria-label="Open menu"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
            <path d="M2 4h12M2 8h12M2 12h12" />
          </svg>
        </button>
        <BrandLogo size="sm" />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative w-56 h-full shadow-2xl animate-[fadeInUp_0.2s_ease]">
            {sidebar}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex sticky top-0 h-screen flex-shrink-0">
        {sidebar}
      </div>
    </>
  )
}

const ic = (d: string) => () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-full h-full">
    <path d={d} />
  </svg>
)

const GridIcon = ic('M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z')
const CalIcon = ic('M1 4h14v10a1 1 0 01-1 1H2a1 1 0 01-1-1V4zm4-3v3M11 1v3M1 7h14')
const CardIcon = ic('M1 3h14v10H1zM1 7h14')
const ChatIcon = ic('M14 2H2a1 1 0 00-1 1v8a1 1 0 001 1h4l2 2 2-2h4a1 1 0 001-1V3a1 1 0 00-1-1z')
const StarIconNav = ic('M8 1l1.8 4H14l-3.5 2.8 1.3 4.2L8 9.5l-3.8 2.5 1.3-4.2L2 5h4.2z')
const MusicIcon = ic('M6 14V3l8-2v11M6 11a2 2 0 11-4 0 2 2 0 014 0zM14 9a2 2 0 11-4 0 2 2 0 014 0z')
const CheckIcon = ic('M1 9l4 4L15 3')
const ChartIcon = ic('M1 15V7l4-4 4 4 4-6v14H1z')
const GearIcon = ic('M8 10a2 2 0 100-4 2 2 0 000 4zM8 1v2M8 13v2M1 8H3M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M3 13l1.4-1.4M11.6 4.4L13 3')
const UsersIcon = ic('M5 8a3 3 0 100-6 3 3 0 000 6zM1 15a5 5 0 019.5-2M12 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM15 15a4 4 0 00-4-4')
const AlertIcon = ic('M8 1L1 13h14L8 1zM8 6v4M8 11.5v.5')
const HomeIcon = ic('M1 8L8 1l7 7M3 6v8a1 1 0 001 1h8a1 1 0 001-1V6')
const LogoutIcon = ic('M11 10l3-3-3-3M14 7H6M8 1H2a1 1 0 00-1 1v12a1 1 0 001 1h6')
