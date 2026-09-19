'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatRelativeTime } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface Peer {
  id: string
  full_name: string
  avatar_url: string | null
}

interface Conversation {
  peer: Peer
  last_message: string
  last_message_at: string
  unread_count: number
}

interface Message {
  id: string
  content: string
  created_at: string
  sender_id: string
  is_read: boolean
}

interface Props {
  role: 'student' | 'teacher'
  currentUserId: string
}

function MessagesClient({ role, currentUserId }: Props) {
  const params = useSearchParams()
  const toParam = params.get('to')

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activePeerId, setActivePeerId] = useState<string | null>(toParam)
  const [activePeer, setActivePeer] = useState<Peer | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadConversations = useCallback(async () => {
    const res = await fetch('/api/messages')
    const data = await res.json()
    if (res.ok) setConversations(data.conversations ?? [])
    setLoadingList(false)
  }, [])

  const loadThread = useCallback(async (peerId: string) => {
    setLoadingThread(true)
    setError('')
    try {
      const res = await fetch(`/api/messages?with=${peerId}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to load messages')
        return
      }
      setMessages(data.messages ?? [])

      const fromList = conversations.find(c => c.peer.id === peerId)?.peer
      if (fromList) {
        setActivePeer(fromList)
      } else {
        const supabase = createClient()
        const { data: peerUser } = await supabase
          .from('users')
          .select('id, full_name, avatar_url')
          .eq('id', peerId)
          .single()
        setActivePeer(
          peerUser
            ? { id: peerUser.id, full_name: peerUser.full_name, avatar_url: peerUser.avatar_url }
            : { id: peerId, full_name: 'Conversation', avatar_url: null }
        )
      }
    } finally {
      setLoadingThread(false)
    }
  }, [conversations])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    if (toParam) {
      setActivePeerId(toParam)
    }
  }, [toParam])

  useEffect(() => {
    if (activePeerId) loadThread(activePeerId)
  }, [activePeerId, loadThread])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!activePeerId || !draft.trim()) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver_id: activePeerId, content: draft.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to send')
        return
      }
      setDraft('')
      setMessages(prev => [...prev, data.message])
      await loadConversations()
    } finally {
      setSending(false)
    }
  }

  // Resolve peer name from conversations when available
  useEffect(() => {
    if (!activePeerId) return
    const found = conversations.find(c => c.peer.id === activePeerId)
    if (found) setActivePeer(found.peer)
  }, [conversations, activePeerId])

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Messages</h1>
        <p className="text-white/50 mt-1">
          {role === 'student' ? 'Conversations with your teachers' : 'Conversations with your students'}
        </p>
      </div>

      <div className="glass rounded-2xl overflow-hidden grid md:grid-cols-[280px_1fr] min-h-[480px]">
        {/* Conversation list */}
        <aside className="border-b md:border-b-0 md:border-r border-white/[0.06]">
          {loadingList ? (
            <div className="p-6 text-sm text-white/30">Loading…</div>
          ) : conversations.length === 0 && !activePeerId ? (
            <div className="p-6 text-center">
              <p className="text-sm text-white/40 mb-3">No conversations yet</p>
              {role === 'student' && (
                <Link href="/teachers" className="text-sm text-[#C9A84C] hover:underline">
                  Find a teacher
                </Link>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.06] max-h-[480px] overflow-y-auto">
              {activePeerId && !conversations.some(c => c.peer.id === activePeerId) && (
                <li>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 bg-[#C9A84C]/10"
                  >
                    <p className="text-sm font-medium text-white truncate">New conversation</p>
                    <p className="text-xs text-white/35 mt-0.5">Start typing below</p>
                  </button>
                </li>
              )}
              {conversations.map(c => (
                <li key={c.peer.id}>
                  <button
                    type="button"
                    onClick={() => setActivePeerId(c.peer.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-white/[0.03] transition-colors ${
                      activePeerId === c.peer.id ? 'bg-white/[0.05]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-white truncate">{c.peer.full_name}</p>
                      {c.unread_count > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#C9A84C] text-black font-medium">
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/35 mt-0.5 truncate">{c.last_message}</p>
                    <p className="text-[10px] text-white/25 mt-1">{formatRelativeTime(c.last_message_at)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Thread */}
        <div className="flex flex-col min-h-[480px]">
          {!activePeerId ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="text-sm text-white/35">Select a conversation</p>
            </div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-white/[0.06]">
                <p className="text-sm font-medium text-white">
                  {activePeer?.full_name ?? 'Conversation'}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 max-h-[360px]">
                {loadingThread ? (
                  <p className="text-sm text-white/30">Loading messages…</p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-white/35 text-center py-10">
                    No messages yet. Say hello!
                  </p>
                ) : (
                  messages.map(m => {
                    const mine = m.sender_id === currentUserId
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                            mine
                              ? 'bg-[#C9A84C]/20 text-white border border-[#C9A84C]/25'
                              : 'bg-white/[0.06] text-white/80 border border-white/[0.06]'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.content}</p>
                          <p className={`text-[10px] mt-1 ${mine ? 'text-white/40' : 'text-white/30'}`}>
                            {formatRelativeTime(m.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={sendMessage} className="p-4 border-t border-white/[0.06] flex gap-2">
                <input
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="Type a message…"
                  maxLength={2000}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#C9A84C]/40"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="btn-primary px-4 py-2.5 text-sm disabled:opacity-50"
                >
                  {sending ? '…' : 'Send'}
                </button>
              </form>
              {error && <p className="px-4 pb-3 text-xs text-red-400">{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function MessagesPage({ role, currentUserId }: Props) {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto px-6 py-10 text-white/40">Loading…</div>}>
      <MessagesClient role={role} currentUserId={currentUserId} />
    </Suspense>
  )
}
