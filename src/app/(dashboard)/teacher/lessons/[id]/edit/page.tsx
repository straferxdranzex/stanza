'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function EditLessonPage() {
  const params = useParams()
  const lessonId = params.id as string
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    duration_mins: 60,
    price_cents: 6000,
    level: 'all_levels',
    category: 'piano',
    is_active: true,
  })

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/lessons/${lessonId}`)
        if (!res.ok) {
          setError(res.status === 403 ? 'You don\'t have permission to edit this lesson.' : 'Lesson not found.')
          setLoading(false)
          return
        }
        const data = await res.json()
        const lesson = data.lesson
        setForm({
          title: lesson.title ?? '',
          description: lesson.description ?? '',
          duration_mins: lesson.duration_mins ?? 60,
          price_cents: lesson.price_cents ?? 6000,
          level: lesson.level ?? 'all_levels',
          category: lesson.category ?? 'piano',
          is_active: lesson.is_active ?? true,
        })
      } catch (e) {
        setError('Failed to load lesson.')
      }
      setLoading(false)
    }
    load()
  }, [lessonId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const res = await fetch(`/api/lessons/${lessonId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, duration_mins: Number(form.duration_mins) }),
    })

    if (res.ok) {
      router.push('/teacher/lessons')
    } else {
      const data = await res.json()
      setError(data.error ?? 'Failed to save lesson')
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this lesson? This cannot be undone.')) return
    setDeleting(true)
    await fetch(`/api/lessons/${lessonId}`, { method: 'DELETE' })
    router.push('/teacher/lessons')
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="h-8 w-48 bg-white/10 rounded-xl animate-pulse mb-8" />
      <div className="glass rounded-2xl p-7 space-y-5">
        {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-white/10 rounded-xl animate-pulse" />)}
      </div>
    </div>
  )

  if (error && !form.title) return (
    <div className="max-w-2xl mx-auto px-6 py-10 text-center">
      <p className="text-red-400 mb-4">{error}</p>
      <Link href="/teacher/lessons" className="text-[#C9A84C] hover:text-[#E8C87A] text-sm">← Back to lessons</Link>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Edit lesson</h1>
          <p className="text-white/40 text-sm mt-1">Changes are saved immediately</p>
        </div>
        <Link href="/teacher/lessons" className="text-sm text-white/40 hover:text-white transition-colors">
          ← Back
        </Link>
      </div>

      <form onSubmit={handleSave} className="glass rounded-2xl p-7 space-y-5">
        <div>
          <label className="block text-xs text-white/40 mb-1.5">Title</label>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required minLength={5} maxLength={100}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#C9A84C]/40"
          />
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#C9A84C]/40 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Duration</label>
            <select
              value={form.duration_mins}
              onChange={e => setForm(f => ({ ...f, duration_mins: Number(e.target.value) }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C9A84C]/40"
            >
              {[30, 45, 60, 90].map(d => <option key={d} value={d}>{d} min</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Price ($)</label>
            <input
              type="number" min={1} step={0.01}
              value={form.price_cents / 100}
              onChange={e => setForm(f => ({ ...f, price_cents: Math.round(parseFloat(e.target.value) * 100) }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C9A84C]/40"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C9A84C]/40"
            >
              {[['piano','Piano'],['violin','Violin'],['cello','Cello'],['animation','Animation'],['2d_art','2D Art']].map(([v,l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Level</label>
            <select
              value={form.level}
              onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C9A84C]/40"
            >
              {[['beginner','Beginner'],['intermediate','Intermediate'],['advanced','Advanced'],['all_levels','All levels']].map(([v,l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
              className={`w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-[#C9A84C]' : 'bg-white/10'} relative`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-white/70">Lesson is active (visible to students)</span>
          </label>
        </div>

        {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete lesson'}
          </button>
          <div className="flex gap-3">
            <Link href="/teacher/lessons" className="btn-ghost px-5 py-2.5 text-sm">Cancel</Link>
            <button type="submit" disabled={saving} className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
