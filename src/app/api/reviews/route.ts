// src/app/api/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'
import { CreateReviewSchema } from '@/lib/validators'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Only students can submit reviews' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = CreateReviewSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { booking_id, rating, comment } = parsed.data
    const supabase = await createServerSupabaseClient()

    // Verify booking belongs to student
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, student_id, teacher_id, status, ends_at')
      .eq('id', booking_id)
      .eq('student_id', user.id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found or not yours' },
        { status: 404 }
      )
    }

    const lessonEnded = new Date(booking.ends_at) <= new Date()
    const isReviewable =
      booking.status === 'completed' ||
      (booking.status === 'confirmed' && lessonEnded)

    if (!isReviewable) {
      return NextResponse.json(
        { error: 'You can only review completed lessons' },
        { status: 400 }
      )
    }

    // Auto-complete via service role — students cannot UPDATE bookings to completed under RLS
    if (booking.status === 'confirmed' && lessonEnded) {
      const service = createServiceClient()
      await service
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', booking_id)
        .eq('status', 'confirmed')
    }

    // Check no existing review (enforced by DB UNIQUE constraint too)
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', booking_id)
      .maybeSingle()

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this lesson' },
        { status: 409 }
      )
    }

    // Insert review — policy requires status=completed; ensure via re-check with service if needed
    const serviceSupabase = createServiceClient()
    const { data: review, error: insertError } = await serviceSupabase
      .from('reviews')
      .insert({
        booking_id,
        student_id: user.id,
        teacher_id: booking.teacher_id,
        rating,
        comment: comment ?? null,
      })
      .select()
      .single()

    if (insertError) throw insertError

    await serviceSupabase.from('notifications').insert({
      user_id: booking.teacher_id,
      type: 'review_received' as const,
      title: 'New review received',
      body: `A student left a ${rating}-star review.`,
      data: { booking_id, review_id: review.id, rating },
    })

    return NextResponse.json({ review }, { status: 201 })

  } catch (error) {
    console.error('[POST /api/reviews]', error)
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const teacherId = searchParams.get('teacher_id')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 50)

  if (!teacherId) {
    return NextResponse.json({ error: 'teacher_id required' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const offset = (page - 1) * limit

  const { data, error, count } = await supabase
    .from('reviews')
    .select(`
      id, rating, comment, created_at,
      student:users!reviews_student_id_fkey(full_name, avatar_url)
    `, { count: 'exact' })
    .eq('teacher_id', teacherId)
    .eq('is_visible', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
  }

  return NextResponse.json({ reviews: data, total: count ?? 0, page, limit })
}
