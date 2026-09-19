'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function TeacherSettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    bio: '',
    headline: '',
    experience_years: 0,
    is_accepting_students: true,
    timezone: 'UTC',
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: dbUser } = await supabase.from('users').select('full_name, bio, timezone').eq('id', user.id).single()
      const { data: profile } = await supabase.from('teacher_profiles').select('headline, experience_years, is_accepting_students').eq('user_id', user.id).single()
      if (dbUser) setForm(f => ({ ...f, full_name: dbUser.full_name ?? '', bio: dbUser.bio ?? '', timezone: dbUser.timezone ?? 'UTC' }))
      if (profile) setForm(f => ({ ...f, headline: profile.headline ?? '', experience_years: profile.experience_years ?? 0, is_accepting_students: profile.is_accepting_students ?? true }))
    }
    load()
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await Promise.all([
      supabase.from('users').update({ full_name: form.full_name, bio: form.bio, timezone: form.timezone }).eq('id', user.id),
      supabase.from('teacher_profiles').update({ headline: form.headline, experience_years: form.experience_years, is_accepting_students: form.is_accepting_students }).eq('user_id', user.id),
    ])
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const field = (label: string, key: keyof typeof form, type = 'text') => (
    <div key={key}>
      <label className="block text-xs text-white/40 mb-1.5">{label}</label>
      {type === 'textarea' ? (
        <textarea
          value={form[key] as string}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          rows={4}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#C9A84C]/40 resize-none"
        />
      ) : (
        <input
          type={type}
          value={form[key] as string | number}
          onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? +e.target.value : e.target.value }))}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#C9A84C]/40"
        />
      )}
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-white/50 mt-1">Manage your teacher profile</p>
      </div>

      <form onSubmit={save} className="glass rounded-2xl p-7 space-y-5">
        {field('Full name', 'full_name')}
        {field('Headline', 'headline')}
        {field('Bio', 'bio', 'textarea')}
        {field('Years of experience', 'experience_years', 'number')}
        {field('Timezone', 'timezone')}

        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setForm(f => ({ ...f, is_accepting_students: !f.is_accepting_students }))}
              className={`w-10 h-5 rounded-full transition-colors ${form.is_accepting_students ? 'bg-[#C9A84C]' : 'bg-white/10'} relative`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_accepting_students ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-white/70">Accepting new students</span>
          </label>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {saved && <span className="text-sm text-emerald-400">✓ Saved</span>}
        </div>
      </form>

      <div className="glass rounded-2xl p-7 mt-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-white">Payouts (Stripe)</p>
          <p className="text-xs text-white/40 mt-1">Connect or manage your bank account for lesson payouts.</p>
        </div>
        <a href="/teacher/settings/stripe" className="btn-primary px-4 py-2 text-sm">
          Manage
        </a>
      </div>
    </div>
  )
}
