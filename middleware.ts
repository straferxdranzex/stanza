// middleware.ts — runs on EVERY request before rendering
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { UserRole } from '@/types'

const ROUTE_ROLES: Record<string, UserRole[]> = {
  '/student': ['student'],
  '/teacher': ['teacher'],
  '/admin': ['admin'],
}

const PROTECTED_PREFIXES = [
  '/student',
  '/teacher',
  '/admin',
  '/api/bookings',
  '/api/payments',
  '/api/reviews',
  '/api/messages',
  '/api/admin',
  '/api/disputes',
]

const PUBLIC_API_EXCEPTIONS = [
  '/api/payments/webhook',
  '/api/bookings/expire-pending',
  '/api/bookings/maintenance',
  '/api/bookings/send-reminders',
]

const AUTH_ROUTES = ['/login', '/register', '/forgot-password']

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function dashboardForRole(role: string): string {
  if (role === 'teacher') return '/teacher'
  if (role === 'admin') return '/admin'
  return '/student'
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Production must have Supabase configured — never open dashboards without auth
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    if (IS_PRODUCTION && PROTECTED_PREFIXES.some(p => matchesPrefix(pathname, p))) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Service not configured' }, { status: 503 })
      }
      return NextResponse.redirect(new URL('/login?reason=misconfigured', request.url))
    }
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request: { headers: request.headers } })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (PUBLIC_API_EXCEPTIONS.some(p => pathname === p || pathname.startsWith(`${p}/`))) {
    return response
  }

  // Logged-in users leaving auth pages → their role dashboard
  if (user && AUTH_ROUTES.some(r => matchesPrefix(pathname, r))) {
    const { data: dbUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    return NextResponse.redirect(
      new URL(dashboardForRole(dbUser?.role ?? 'student'), request.url)
    )
  }

  const isProtected = PROTECTED_PREFIXES.some(p => matchesPrefix(pathname, p))
  if (!isProtected) return response

  // /teachers (marketplace) must stay public — matchesPrefix('/teacher') must not catch it
  // Already handled because we use exact prefix matching with trailing slash.

  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname + request.nextUrl.search)
    return NextResponse.redirect(redirectUrl)
  }

  for (const [routePrefix, allowedRoles] of Object.entries(ROUTE_ROLES)) {
    if (matchesPrefix(pathname, routePrefix)) {
      const { data: dbUser } = await supabase
        .from('users')
        .select('role, is_active')
        .eq('id', user.id)
        .single()

      if (!dbUser || !dbUser.is_active) {
        return NextResponse.redirect(new URL('/login?reason=inactive', request.url))
      }

      if (!allowedRoles.includes(dbUser.role as UserRole)) {
        return NextResponse.redirect(
          new URL(dashboardForRole(dbUser.role), request.url)
        )
      }

      response.headers.set('x-user-id', user.id)
      response.headers.set('x-user-role', dbUser.role)
      break
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
