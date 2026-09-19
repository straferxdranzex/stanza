'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DBLesson } from '@/types'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

export default function TeacherLessonsPage() {
  const [lessons, setLessons] = useState<DBLesson[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', duration_mins: 60, price_cents: 6000, level: 'all_levels', category: 'piano',
  })
  const supabase = createClient()

  useEffect(() => { fetchLessons() }, [])

  async function fetchLessons() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('lessons').select('*').eq('teacher_id', user.id).order('created_at', { ascending: false })
    setLessons(data ?? [])
    setLoading(false)
  }

  async function saveLesson(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    const payload = { ...form, duration_mins: Number(form.duration_mins) }
    const res = await fetch('/api/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      setShowForm(false)
      setForm({ title: '', description: '', duration_mins: 60, price_cents: 6000, level: 'all_levels', category: 'piano' })
      fetchLessons()
    } else {
      const data = await res.json()
      const fieldErrors = data.details?.fieldErrors
      if (fieldErrors) {
        const msgs = Object.entries(fieldErrors).map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`).join(' | ')
        setFormError(msgs)
      } else {
        setFormError(data.error ?? 'Failed to create lesson')
      }
    }
    setSaving(false)
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('lessons').update({ is_active: !current }).eq('id', id)
    setLessons(prev => prev.map(l => l.id === id ? { ...l, is_active: !current } : l))
  }

  const categoryBadge: Record<string, string> = {
    piano: 'text-purple-400 bg-purple-500/10',
    violin: 'text-blue-400 bg-blue-500/10',
    cello: 'text-amber-400 bg-amber-500/10',
    animation: 'text-emerald-400 bg-emerald-500/10',
    '2d_art': 'text-rose-400 bg-rose-500/10',
  }

  const categoryLabel: Record<string, string> = {
    piano: '🎹 Piano', violin: '🎻 Violin', cello: '🎸 Cello',
    animation: '✏️ Animation', '2d_art': '🎨 2D Art',
  }

  return (
    <div className="px-6 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">My lessons</h1>
        <button onClick={() => setShowForm(v => !v)} className="btn-primary px-5 py-2 text-sm">
          {showForm ? 'Cancel' : '+ New lesson'}
        </button>
      </div>

      {/* New lesson form */}
      {showForm && (
        <div className="glass rounded-2xl p-6 mb-8">
          <h2 className="font-semibold text-white mb-5">Create lesson</h2>
          <form onSubmit={saveLesson} className="space-y-4">
            <div>
              <label className="block text-xs text-white/50 mb-2">Title</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Classical Technique for Beginners" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#C9A84C]/40 transition-all" />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-2">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="What will students learn?" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#C9A84C]/40 transition-all resize-none" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-white/50 mb-2">Duration</label>
                <select value={form.duration_mins} onChange={e => setForm(f => ({ ...f, duration_mins: Number(e.target.value) }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A84C]/40">
                  {[30, 45, 60, 90].map(d => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-2">Price ($)</label>
                <input type="number" value={form.price_cents / 100} onChange={e => setForm(f => ({ ...f, price_cents: Math.round(parseFloat(e.target.value) * 100) }))} min={1} step={0.01} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A84C]/40 transition-all" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-2">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A84C]/40">
                  {[['piano','Piano'],['violin','Violin'],['cello','Cello'],['animation','Animation'],['2d_art','2D Art']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-2">Level</label>
                <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A84C]/40">
                  {[['beginner','Beginner'],['intermediate','Intermediate'],['advanced','Advanced'],['all_levels','All levels']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {formError}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost px-5 py-2 text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary px-6 py-2 text-sm disabled:opacity-60">{saving ? 'Saving…' : 'Create lesson'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Lessons list */}
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 glass rounded-xl animate-pulse" />)}</div>
      ) : lessons.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
          <p className="text-white/30 mb-2">No lessons yet</p>
          <p className="text-white/20 text-sm">Create your first lesson to start accepting bookings</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map(lesson => (
            <div key={lesson.id} className="flex items-center justify-between glass rounded-xl p-5 hover:border-white/10 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-white">{lesson.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                    lesson.category ? ({
                      piano: 'text-purple-400 bg-purple-500/10',
                      violin: 'text-blue-400 bg-blue-500/10',
                      cello: 'text-amber-400 bg-amber-500/10',
                      animation: 'text-emerald-400 bg-emerald-500/10',
                      '2d_art': 'text-rose-400 bg-rose-500/10',
                    } as any)[lesson.category] : 'text-[#C9A84C] bg-[#C9A84C]/10'
                  }`}>
                    {lesson.category ? ({ piano: '🎹 Piano', violin: '🎻 Violin', cello: '🎸 Cello', animation: '✏️ Animation', '2d_art': '🎨 2D Art' } as any)[lesson.category] : ''}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize text-white/50 bg-white/5`}>
                    {lesson.level.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-white/40 mt-1">{lesson.duration_mins} min · {formatCurrency(lesson.price_cents)}</p>
                {lesson.description && <p className="text-xs text-white/30 mt-1 line-clamp-1">{lesson.description}</p>}
              </div>
              <div className="flex items-center gap-3 ml-4">
                <Link
                  href={`/teacher/lessons/${lesson.id}/edit`}
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
                >
                  Edit
                </Link>
                <button
                  onClick={() => toggleActive(lesson.id, lesson.is_active)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${lesson.is_active ? 'text-green-400 border-green-500/20 bg-green-500/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20' : 'text-white/40 border-white/10 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/20'}`}
                >
                  {lesson.is_active ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
