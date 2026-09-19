'use client'
import { useState, useEffect, useCallback } from 'react'
import type { DBAvailabilitySlot, DBLesson } from '@/types'

interface Slot extends DBAvailabilitySlot {
  isBooked?: boolean
}

interface Props {
  teacherId: string
  teacherTimezone?: string
  viewerTimezone: string
  selectedLesson?: DBLesson | null
  onSelectSlot?: (slot: Slot) => void
  mode: 'book' | 'manage'
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export function AvailabilityCalendar({
  teacherId, viewerTimezone, selectedLesson, onSelectSlot, mode
}: Props) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)

  const fetchSlots = useCallback(async () => {
    setLoading(true)
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

    try {
      const params = new URLSearchParams({
        teacher_id: teacherId,
        start: monthStart.toISOString(),
        end: monthEnd.toISOString(),
        ...(mode === 'book' ? { available_only: 'true' } : {}),
      })

      const res = await fetch(`/api/availability?${params}`)
      const data = await res.json()
      setSlots(data.slots ?? [])
    } catch {
      setSlots([])
    } finally {
      setLoading(false)
    }
  }, [teacherId, currentDate, mode])

  useEffect(() => { fetchSlots() }, [fetchSlots])

  const datesWithSlots = new Set(
    slots.map(s => {
      const d = new Date(s.start_time)
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    })
  )

  const slotsForSelectedDate = selectedDate
    ? slots.filter(s => {
        const d = new Date(s.start_time)
        return (
          d.getFullYear() === selectedDate.getFullYear() &&
          d.getMonth() === selectedDate.getMonth() &&
          d.getDate() === selectedDate.getDate()
        )
      })
    : []

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  function formatSlotTime(slot: Slot): string {
    const start = new Date(slot.start_time)
    const end = new Date(slot.end_time)
    const fmt = (d: Date) => d.toLocaleTimeString('en-US', {
      timeZone: viewerTimezone,
      hour: '2-digit',
      minute: '2-digit',
    })
    return `${fmt(start)} – ${fmt(end)}`
  }

  function navigateMonth(dir: 1 | -1) {
    setCurrentDate(d => {
      const next = new Date(d)
      next.setMonth(next.getMonth() + dir)
      return next
    })
    setSelectedDate(null)
    setSelectedSlot(null)
  }

  function handleSelectSlot(slot: Slot) {
    setSelectedSlot(slot)
    onSelectSlot?.(slot)
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <button
          onClick={() => navigateMonth(-1)}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-white/50"
          disabled={loading}
        >
          ←
        </button>
        <span className="text-sm font-medium text-white">
          {MONTHS[month]} {year}
        </span>
        <button
          onClick={() => navigateMonth(1)}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-white/50"
          disabled={loading}
        >
          →
        </button>
      </div>

      <div className="px-4 py-2 bg-white/[0.02] text-xs text-white/35 border-b border-white/[0.06]">
        Times shown in {viewerTimezone.replace(/_/g, ' ')}
      </div>

      <div className="grid grid-cols-7 border-b border-white/[0.06]">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs text-white/30 py-2">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 p-1">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="h-10" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const date = new Date(year, month, day)
          const dateKey = `${year}-${month}-${day}`
          const hasSlots = datesWithSlots.has(dateKey)
          const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate())
          const isSelected = selectedDate?.getDate() === day &&
            selectedDate?.getMonth() === month &&
            selectedDate?.getFullYear() === year
          const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year

          return (
            <button
              key={day}
              onClick={() => !isPast && hasSlots && setSelectedDate(date)}
              disabled={isPast || (!hasSlots && mode === 'book')}
              className={`
                h-10 flex flex-col items-center justify-center text-sm relative transition-colors rounded-lg
                ${isPast ? 'text-white/15 cursor-not-allowed' : ''}
                ${isSelected ? 'bg-[#C9A84C] text-black font-medium' : ''}
                ${!isPast && hasSlots && !isSelected ? 'hover:bg-white/5 cursor-pointer text-white' : ''}
                ${!hasSlots && !isPast ? 'text-white/25' : ''}
                ${isToday && !isSelected ? 'font-semibold text-[#E8C87A]' : ''}
              `}
            >
              {day}
              {hasSlots && !isSelected && (
                <span className="absolute bottom-1 w-1 h-1 bg-[#C9A84C] rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {selectedDate && (
        <div className="border-t border-white/[0.06] p-4">
          <p className="text-xs text-white/40 mb-3">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>

          {loading ? (
            <div className="text-sm text-white/35 text-center py-4">Loading slots…</div>
          ) : slotsForSelectedDate.length === 0 ? (
            <p className="text-sm text-white/35 text-center py-4">No available slots</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {slotsForSelectedDate.map(slot => (
                <button
                  key={slot.id}
                  onClick={() => handleSelectSlot(slot)}
                  disabled={slot.is_booked && mode === 'book'}
                  className={`
                    p-2.5 border rounded-xl text-sm text-left transition-colors
                    ${selectedSlot?.id === slot.id
                      ? 'border-[#C9A84C]/50 bg-[#C9A84C]/15 text-white'
                      : slot.is_booked
                        ? 'border-white/5 bg-white/[0.02] text-white/25 cursor-not-allowed'
                        : 'border-white/10 hover:border-[#C9A84C]/40 text-white/70'
                    }
                  `}
                >
                  <span className="font-medium">{formatSlotTime(slot)}</span>
                  {slot.is_booked && (
                    <span className="block text-xs mt-0.5 text-white/25">Booked</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {selectedSlot && mode === 'book' && selectedLesson && (
            <div className="mt-4 p-4 glass-gold rounded-xl">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/45">Selected slot</span>
                <span className="font-medium text-white">{formatSlotTime(selectedSlot)}</span>
              </div>
              <div className="flex justify-between text-sm mb-4">
                <span className="text-white/45">{selectedLesson.title}</span>
                <span className="font-medium text-[#E8C87A]">
                  ${(selectedLesson.price_cents / 100).toFixed(2)}
                </span>
              </div>
              <button
                onClick={() => onSelectSlot?.(selectedSlot)}
                className="btn-primary w-full py-2.5 text-sm"
              >
                Continue to payment
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
