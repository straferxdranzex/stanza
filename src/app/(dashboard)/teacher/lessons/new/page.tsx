// Redirect /teacher/lessons/new → /teacher/lessons (form is inline there)
import { redirect } from 'next/navigation'

export default function NewLessonRedirect() {
  redirect('/teacher/lessons')
}
