'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Clock } from 'lucide-react'
import { formatLocalDateKey, formatTimeDisplay } from '@/utils/dateTimeUtils'

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
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => formatLocalDateKey(new Date()))

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Month navigation handlers
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDateStr(formatLocalDateKey(today))
  }

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
      const dateStr = formatLocalDateKey(ev.start_time)
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

  const getDotColor = (type: string) => {
    switch (type) {
      case 'camp':
        return 'bg-teal-600'
      case 'hike':
        return 'bg-amber-600'
      case 'activity':
        return 'bg-sky-600'
      case 'training':
        return 'bg-purple-600'
      default:
        return 'bg-slate-600'
    }
  }

  const selectedDayEvents = eventsByDay[selectedDateStr] || []

  return (
    <div className="space-y-4">
      {/* Calendar Header Toolbar */}
      <div className="flex items-center justify-between gap-3 bg-slate-100 p-3 sm:p-4 rounded-xl border border-slate-200">
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

      {/* ── UNIFIED APPLE-STYLE CALENDAR GRID (Mobile & Desktop) ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs space-y-2">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 text-center font-extrabold text-xs text-slate-400 uppercase tracking-wider py-1">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {calendarDays.map(({ date, isCurrentMonth, isToday }, idx) => {
            const dayKey = formatLocalDateKey(date)
            const dayEvents = eventsByDay[dayKey] || []
            const isSelected = selectedDateStr === dayKey

            return (
              <div
                key={idx}
                onClick={() => setSelectedDateStr(dayKey)}
                className={`min-h-12 sm:min-h-24 p-1 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-teal-50 border-teal-600 ring-2 ring-teal-600/30'
                    : isCurrentMonth
                    ? 'bg-white border-slate-200 hover:border-teal-300'
                    : 'bg-slate-50/50 border-slate-100 text-slate-300'
                }`}
              >
                <div className="flex justify-between items-center text-xs">
                  <span
                    className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-extrabold ${
                      isToday
                        ? 'bg-teal-800 text-white'
                        : isSelected
                        ? 'bg-teal-200 text-teal-900'
                        : isCurrentMonth
                        ? 'text-slate-800'
                        : 'text-slate-300'
                    }`}
                  >
                    {date.getDate()}
                  </span>

                  {dayEvents.length > 0 && (
                    <span className="hidden sm:inline-flex text-[10px] text-teal-800 font-bold bg-teal-100 px-1.5 py-0.2 rounded-full">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {/* Event Dots/Pills in Calendar Cell */}
                <div className="space-y-1 mt-1">
                  {dayEvents.slice(0, 2).map((ev) => (
                    <div
                      key={ev.id}
                      className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100/90 rounded px-1 py-0.5 truncate hover:bg-slate-200"
                    >
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${getDotColor(ev.event_type)}`} />
                      <span className="truncate">{ev.title}</span>
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="hidden sm:block text-[9px] font-bold text-slate-400 pl-1">
                      +{dayEvents.length - 2} more
                    </span>
                  )}

                  {/* Mobile Indicator Dot */}
                  {dayEvents.length > 0 && (
                    <div className="sm:hidden flex justify-center gap-0.5 mt-1">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <span key={ev.id} className={`h-1.5 w-1.5 rounded-full ${getDotColor(ev.event_type)}`} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── EXPANDABLE DAY AGENDA PANEL (Selected Date Events) ── */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-teal-700" />
            Events for {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </h4>
          <span className="text-xs font-bold text-teal-800 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full shadow-2xs">
            {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'Event' : 'Events'}
          </span>
        </div>

        {selectedDayEvents.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-4">No events scheduled on this date.</p>
        ) : (
          <div className="space-y-2">
            {selectedDayEvents.map((ev) => {
              const timeStr = formatTimeDisplay(ev.start_time)
              return (
                <div
                  key={ev.id}
                  onClick={() => onEventClick(ev.id)}
                  className="bg-white border border-slate-200 hover:border-teal-400 rounded-xl p-3.5 shadow-2xs flex justify-between items-center gap-3 cursor-pointer transition-all group"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${getEventTypeBadge(ev.event_type)}`}>
                        {ev.event_type}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {ev.scope === 'group' ? 'Group' : 'Troop'}
                      </span>
                    </div>
                    <h5 className="font-extrabold text-slate-900 text-sm group-hover:text-teal-700 transition-colors truncate">
                      {ev.title}
                    </h5>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-teal-600" /> {timeStr}</span>
                      {ev.location && <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3 text-teal-600" /> {ev.location}</span>}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100 shrink-0">
                    Open →
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
