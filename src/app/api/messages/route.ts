// src/app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'
import { SendMessageSchema } from '@/lib/validators'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const parsed = SendMessageSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { receiver_id, content, booking_id } = parsed.data

    if (receiver_id === user.id) {
      return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: receiver } = await supabase
      .from('users')
      .select('id, is_active, role, full_name')
      .eq('id', receiver_id)
      .single()

    if (!receiver || !receiver.is_active) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
    }

    // Students may only message teachers; teachers may message students
    if (user.role === 'student' && receiver.role !== 'teacher') {
      return NextResponse.json({ error: 'Students can only message teachers' }, { status: 403 })
    }
    if (user.role === 'teacher' && receiver.role !== 'student') {
      return NextResponse.json({ error: 'Teachers can only message students' }, { status: 403 })
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id,
        content,
        booking_id: booking_id ?? null,
      })
      .select()
      .single()

    if (error) throw error

    const serviceSupabase = createServiceClient()
    await serviceSupabase.from('notifications').insert({
      user_id: receiver_id,
      type: 'message_received' as const,
      title: 'New message',
      body: `${user.full_name}: ${content.substring(0, 60)}${content.length > 60 ? '…' : ''}`,
      data: { sender_id: user.id, message_id: message.id },
    })

    return NextResponse.json({ message }, { status: 201 })

  } catch (error) {
    console.error('[POST /api/messages]', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const withUserId = searchParams.get('with')
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
    const offset = (page - 1) * limit

    const supabase = await createServerSupabaseClient()

    if (withUserId) {
      const { data, error, count } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(id, full_name, avatar_url)
        `, { count: 'exact' })
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${withUserId}),and(sender_id.eq.${withUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1)

      if (error) throw error

      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('receiver_id', user.id)
        .eq('sender_id', withUserId)
        .eq('is_read', false)

      return NextResponse.json({ messages: data, total: count ?? 0 })
    }

    // Conversation list without missing RPC — latest message per counterpart
    const { data: recent, error } = await supabase
      .from('messages')
      .select(`
        id, content, created_at, is_read, sender_id, receiver_id,
        sender:users!messages_sender_id_fkey(id, full_name, avatar_url),
        receiver:users!messages_receiver_id_fkey(id, full_name, avatar_url)
      `)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw error

    const byPeer = new Map<string, {
      peer: { id: string; full_name: string; avatar_url: string | null }
      last_message: string
      last_message_at: string
      unread_count: number
    }>()

    for (const msg of recent ?? []) {
      const isSender = msg.sender_id === user.id
      const peerRaw = isSender ? msg.receiver : msg.sender
      const peer = Array.isArray(peerRaw) ? peerRaw[0] : peerRaw
      if (!peer?.id) continue

      const existing = byPeer.get(peer.id)
      if (!existing) {
        byPeer.set(peer.id, {
          peer: {
            id: peer.id,
            full_name: peer.full_name,
            avatar_url: peer.avatar_url ?? null,
          },
          last_message: msg.content,
          last_message_at: msg.created_at,
          unread_count: !isSender && !msg.is_read ? 1 : 0,
        })
      } else if (!isSender && !msg.is_read) {
        existing.unread_count += 1
      }
    }

    const conversations = Array.from(byPeer.values())
      .sort((a, b) => +new Date(b.last_message_at) - +new Date(a.last_message_at))

    return NextResponse.json({ conversations })

  } catch (error) {
    console.error('[GET /api/messages]', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}
