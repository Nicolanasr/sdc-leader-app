'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Clock } from 'lucide-react'

interface EventItem {
  id: string
  title: string
  event_type: string
  start_time: string
  end_time: string
  location?: string | null
  scope: string
  participant_fee: number
}

interface EventCalendarProps {
  events: EventItem[]
  onEventClick: (eventId: string) => void
}

export default function EventCalendar({ events, onEventClick }: EventCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Month navigation handlers
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToday = () => setCurrentDate(new Date())

  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Calculate calendar grid days for current month
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)

    const startingDayOfWeek = firstDayOfMonth.getDay() // 0 = Sun
    const totalDays = lastDayOfMonth.getDate()

    const days: { date: Date; isCurrentMonth: boolean; isToday: boolean }[] = []

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
        isToday: false,
      })
    }

    // Current month days
    const today = new Date()
    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(year, month, day)
      const isToday =
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()

      days.push({
        date: d,
        isCurrentMonth: true,
        isToday,
      })
    }

    // Next month padding to fill grid to 35 or 42
    const remaining = 35 - days.length
    const padding = remaining < 0 ? 42 - days.length : remaining
    for (let i = 1; i <= padding; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
        isToday: false,
      })
    }

    return days
  }, [year, month])

  // Map events to day strings YYYY-MM-DD
  const eventsByDay = useMemo(() => {
    const map: Record<string, EventItem[]> = {}
    for (const ev of events) {
      if (!ev.start_time) continue
      const dateStr = new Date(ev.start_time).toISOString().slice(0, 10)
      if (!map[dateStr]) map[dateStr] = []
      map[dateStr].push(ev)
    }
    return map
  }, [events])

  const getEventTypeBadge = (type: string) => {
    switch (type) {
      case 'camp':
        return 'bg-teal-700 text-white'
      case 'hike':
        return 'bg-amber-700 text-white'
      case 'activity':
        return 'bg-sky-700 text-white'
      case 'training':
        return 'bg-purple-700 text-white'
      default:
        return 'bg-slate-700 text-white'
    }
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-100 p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-teal-800" />
          <h3 className="text-base font-extrabold text-slate-900">{monthLabel}</h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 shadow-sm transition-colors"
          >
            Today
          </button>
          <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-sm">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-slate-100 text-slate-700 transition-colors border-r border-slate-200"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-slate-100 text-slate-700 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 text-center font-extrabold text-xs text-slate-500 uppercase tracking-wider py-1">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {calendarDays.map(({ date, isCurrentMonth, isToday }, idx) => {
          const dayKey = date.toISOString().slice(0, 10)
          const dayEvents = eventsByDay[dayKey] || []

          return (
            <div
              key={idx}
              className={`min-h-24 p-1.5 rounded-xl border flex flex-col justify-between transition-colors ${
                isCurrentMonth ? 'bg-white border-slate-200' : 'bg-slate-50/60 border-slate-150 text-slate-400'
              } ${isToday ? 'ring-2 ring-teal-600 font-bold bg-teal-50/30' : ''}`}
            >
              <div className="flex justify-between items-center text-xs mb-1">
                <span
                  className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[11px] font-extrabold ${
                    isToday ? 'bg-teal-700 text-white' : isCurrentMonth ? 'text-slate-800' : 'text-slate-400'
                  }`}
                >
                  {date.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] text-teal-800 font-bold bg-teal-100 px-1.5 py-0.2 rounded-full">
                    {dayEvents.length} event{dayEvents.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Event Pills */}
              <div className="space-y-1 overflow-y-auto max-h-16 flex-1">
                {dayEvents.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => onEventClick(ev.id)}
                    className={`w-full text-left px-2 py-1 rounded-md text-[11px] font-bold shadow-xs truncate transition-transform hover:scale-[1.02] ${getEventTypeBadge(
                      ev.event_type
                    )}`}
                    title={`${ev.title} — ${ev.event_type.toUpperCase()}`}
                  >
                    {ev.title}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
