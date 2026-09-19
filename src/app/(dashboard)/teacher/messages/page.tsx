import { redirect } from 'next/navigation'
import { getAuthenticatedUser, isSupabaseConfigured } from '@/lib/supabase/server'
import { MessagesPage } from '@/components/shared/MessagesPage'

export default async function TeacherMessagesPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold text-white">Messages</h1>
        <p className="text-white/50 mt-2">Connect Supabase to use messaging.</p>
      </div>
    )
  }

  const user = await getAuthenticatedUser()
  if (!user) redirect('/login')
  if (user.role !== 'teacher') redirect('/student')

  return <MessagesPage role="teacher" currentUserId={user.id} />
}
