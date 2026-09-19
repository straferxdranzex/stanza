// middleware.ts — runs on EVERY request before rendering
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { UserRole } from '@/types'

const ROUTE_ROLES: Record<string, UserRole[]> = {
  '/student':  ['student'],
  '/teacher':  ['teacher'],
  '/admin':    ['admin'],
}

const PROTECTED_PREFIXES = ['/student', '/teacher', '/admin', '/api/bookings', '/api/payments', '/api/zoom', '/api/reviews', '/api/messages', '/api/admin', '/api/disputes']
// Public machine endpoints (Stripe / cron) — must NOT require a user session
const PUBLIC_API_EXCEPTIONS = [
  '/api/payments/webhook',
  '/api/bookings/expire-pending',
  '/api/bookings/maintenance',
]
const AUTH_ROUTES = ['/login', '/register']

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function middleware(request: NextRequest) {
  // If Supabase is not configured, let all requests through so UI is visible
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  if (PUBLIC_API_EXCEPTIONS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return response
  }

  if (user && AUTH_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p))
  if (!isProtected) return response

  if (!user) {
    // API routes should return 401 JSON, not an HTML login redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  for (const [routePrefix, allowedRoles] of Object.entries(ROUTE_ROLES)) {
    if (pathname.startsWith(routePrefix)) {
      const { data: dbUser } = await supabase
        .from('users')
        .select('role, is_active')
        .eq('id', user.id)
        .single()

      if (!dbUser || !dbUser.is_active) {
        return NextResponse.redirect(new URL('/login?reason=inactive', request.url))
      }

      if (!allowedRoles.includes(dbUser.role as UserRole)) {
        const dashboardMap: Record<UserRole, string> = {
          student: '/student', teacher: '/teacher', admin: '/admin',
        }
        return NextResponse.redirect(
          new URL(dashboardMap[dbUser.role as UserRole] || '/login', request.url)
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
