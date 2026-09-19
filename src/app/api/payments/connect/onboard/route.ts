// src/app/api/payments/connect/onboard/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { createConnectAccountLink } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user || user.role !== 'teacher') {
    return NextResponse.json({ error: 'Only teachers can connect Stripe' }, { status: 403 })
  }

  try {
    const { url } = await createConnectAccountLink({
      teacherId: user.id,
      teacherEmail: user.email,
    })
    return NextResponse.json({ url })
  } catch (error) {
    console.error('[Stripe Connect Onboard]', error)
    return NextResponse.json({ error: 'Failed to create onboarding link' }, { status: 500 })
  }
}
