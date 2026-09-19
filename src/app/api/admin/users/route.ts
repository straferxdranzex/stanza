// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const admin = await getAuthenticatedUser()
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role')
  const query = searchParams.get('q')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const offset = (page - 1) * limit

  const supabase = createServiceClient()

  let dbQuery = supabase
    .from('users')
    .select('*, teacher_profiles(*)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (role) dbQuery = dbQuery.eq('role', role)
  if (query) dbQuery = dbQuery.ilike('full_name', `%${query}%`)

  const { data, error, count } = await dbQuery

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }

  return NextResponse.json({ users: data, total: count ?? 0, page, limit })
}
