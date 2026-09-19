'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Slot {
  id: string
  start_time: string
  end_time: string
  is_booked: boolean
  is_recurring: boolean
  recurring_freq: string | null
}

export default function AvailabilityPage() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
    isRecurring: false,
    recurringFreq: 'weekly' as 'weekly' | 'biweekly' | 'monthly',
  })
  const supabase = createClient()

  useEffect(() => {
    fetchSlots()
  }, [])

  async function fetchSlots() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('availability_slots')
      .select('*')
      .eq('teacher_id', user.id)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(50)

    setSlots(data ?? [])
    setLoading(false)
  }

  async function addSlot(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)

    const start = new Date(`${form.date}T${form.startTime}:00`).toISOString()
    const end = new Date(`${form.date}T${form.endTime}:00`).toISOString()

    const res = await fetch('/api/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slots: [{
          start_time: start,
          end_time: end,
          is_recurring: form.isRecurring,
          recurring_freq: form.isRecurring ? form.recurringFreq : undefined,
        }],
      }),
    })

    if (res.ok) {
      setForm({ date: '', startTime: '', endTime: '', isRecurring: false, recurringFreq: 'weekly' })
      fetchSlots()
    }
    setAdding(false)
  }

  async function deleteSlot(id: string) {
    await supabase.from('availability_slots').delete().eq('id', id)
    setSlots(prev => prev.filter(s => s.id !== id))
  }

  const formatSlot = (slot: Slot) => {
    const start = new Date(slot.start_time)
    const end = new Date(slot.end_time)
    return {
      date: start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      time: `${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
    }
  }

  return (
    <div className="px-6 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-2">Manage availability</h1>
      <p className="text-white/40 text-sm mb-8">Add time slots when you're available for lessons.</p>

      {/* Add slot form */}
      <div className="glass rounded-2xl p-6 mb-8">
        <h2 className="font-semibold text-white mb-5">Add availability</h2>
        <form onSubmit={addSlot} className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-white/50 mb-2">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A84C]/40 transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-2">Start time</label>
              <input
                type="time"
                value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A84C]/40 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-2">End time</label>
              <input
                type="time"
                value={form.endTime}
                onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A84C]/40 transition-all"
              />
            </div>
          </div>

          <div className="sm:col-span-2 flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isRecurring}
                onChange={e => setForm(f => ({ ...f, isRecurring: e.target.checked }))}
                className="w-4 h-4 rounded accent-[#C9A84C]"
              />
              <span className="text-sm text-white/60">Recurring slot</span>
            </label>

            {form.isRecurring && (
              <select
                value={form.recurringFreq}
                onChange={e => setForm(f => ({ ...f, recurringFreq: e.target.value as any }))}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/70 focus:outline-none focus:border-[#C9A84C]/40"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            )}

            <button
              type="submit"
              disabled={adding}
              className="btn-primary px-6 py-2 text-sm ml-auto disabled:opacity-60"
            >
              {adding ? 'Adding…' : '+ Add slot'}
            </button>
          </div>
        </form>
      </div>

      {/* Existing slots */}
      <h2 className="font-semibold text-white mb-4">Upcoming slots</h2>
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 glass rounded-xl animate-pulse" />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
          <p className="text-white/30">No slots added yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {slots.map(slot => {
            const { date, time } = formatSlot(slot)
            return (
              <div
                key={slot.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  slot.is_booked
                    ? 'bg-[#C9A84C]/5 border-[#C9A84C]/20'
                    : 'glass border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-medium text-white">{date}</p>
                    <p className="text-xs text-white/40 mt-0.5">{time}</p>
                  </div>
                  <div className="flex gap-2">
                    {slot.is_booked && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20">
                        Booked
                      </span>
                    )}
                    {slot.is_recurring && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        ↻ {slot.recurring_freq}
                      </span>
                    )}
                  </div>
                </div>
                {!slot.is_booked && (
                  <button
                    onClick={() => deleteSlot(slot.id)}
                    className="text-xs text-white/30 hover:text-red-400 transition-colors px-2 py-1"
                  >
                    Remove
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
