'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
    Menu, Plus, Calendar, ChevronLeft, AlertTriangle, ClipboardList, Users,
} from 'lucide-react'
import DashboardSidebar from '../DashboardSidebar'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Troop { id: string; name: string; sectionName: string }
interface Patrol { id: string; name: string; troop_id: string }
interface Member { id: string; first_name: string; last_name: string; troop_id: string; patrol_id: string | null; current_rank: string | null }
interface Leader { id: string; fullName: string; roleName: string }
interface AttEvent { id: string; title: string; event_type: string; start_time: string; scope: string; troop_id: string | null; group_id: string }
interface AttSession { id: string; event_id: string; troop_id: string | null; date: string }
interface AttRecord { id: string; attendance_id: string; member_id: string; status: string; excuse_reason: string | null }

interface Props {
    groupId: string
    groupName: string
    currentRole: string
    userTroopId: string | null
    troops: Troop[]
    patrols: Patrol[]
    members: Member[]
    leaders: Leader[]
    initialEvents: AttEvent[]
    initialSessions: AttSession[]
    initialRecords: AttRecord[]
    userName?: string
}

const STANDARD_ABSENCE_REASONS = [
    'Sick / Unwell',
    'Family obligation',
    'Travel / Out of town',
    'School exam or studies',
    'Work',
    'No reason given / Unknown',
    'Weather conditions',
    'Disciplinary',
]
const ABSENCE_REASONS = [...STANDARD_ABSENCE_REASONS, 'Other']

const DAY_MS = 86400000

// ─── Component ────────────────────────────────────────────────────────────────

export default function AttendanceManagement({
    groupId, groupName, currentRole, userTroopId,
    troops, patrols, members, leaders,
    initialEvents, initialSessions, initialRecords,
    userName,
}: Props) {
    const router = useRouter()
    const supabase = createClient()

    const isTroopLeader = currentRole === 'ka2ed_fer2a' || currentRole === 'mouse3ed_ka2ed_fer2a'
    const isGroupAdmin = !isTroopLeader

    // ── Nav state ──
    const [isMobileOpen, setIsMobileOpen] = useState(false)

    // ── Data state ──
    const [events, setEvents] = useState<AttEvent[]>(initialEvents)
    const [sessions, setSessions] = useState<AttSession[]>(initialSessions)
    const [records, setRecords] = useState<AttRecord[]>(initialRecords)

    // ── UI state ──
    const [loading, setLoading] = useState(false)
    const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
    const showStatus = (text: string, type: 'success' | 'error') => {
        setStatusMsg({ text, type })
        setTimeout(() => setStatusMsg(null), 5000)
    }

    // ── View state: null = list, 'new' = create form, session.id = open sheet ──
    const [view, setView] = useState<'list' | 'new' | string>('list')
    const [sheetMode, setSheetMode] = useState<'troop' | 'leadership'>('troop')

    // ── New session form ──
    const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10))
    const [newTroopId, setNewTroopId] = useState(isTroopLeader ? (userTroopId || '') : (troops[0]?.id || ''))
    const [newSessionType, setNewSessionType] = useState<'weekly_meeting' | 'leadership_meeting'>('weekly_meeting')

    // ── Active sheet state: map of member_id/leader_id → {status, reason} ──
    const [sheetData, setSheetData] = useState<Record<string, { status: string; reason: string }>>({})
    const [activeSession, setActiveSession] = useState<AttSession | null>(null)
    const [activeEvent, setActiveEvent] = useState<AttEvent | null>(null)
    const [patrolFilter, setPatrolFilter] = useState<string>('all')

    // ── Logout ──
    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    // ── Combined sessions list (event + session merged) sorted by date desc ──
    const sessionsList = useMemo(() => {
        return sessions
            .map((s) => {
                const ev = events.find((e) => e.id === s.event_id)
                if (!ev) return null
                const troop = troops.find((t) => t.id === s.troop_id)
                const recs = records.filter((r) => r.attendance_id === s.id)
                const presentCount = recs.filter((r) => r.status === 'present').length
                const absentCount = recs.filter((r) => r.status !== 'present').length
                return { session: s, event: ev, troop, presentCount, absentCount, totalRecords: recs.length }
            })
            .filter(Boolean)
            .sort((a, b) => new Date(b!.session.date).getTime() - new Date(a!.session.date).getTime())
    }, [sessions, events, troops, records])

    // Filter based on role
    const visibleSessions = useMemo(() => {
        if (isTroopLeader) {
            return sessionsList.filter(
                (s) => s!.event.event_type === 'weekly_meeting' && s!.session.troop_id === userTroopId
            )
        }
        return sessionsList
    }, [sessionsList, isTroopLeader, userTroopId])

    // ── Open a session sheet ──
    const openSheet = (session: AttSession, event: AttEvent) => {
        setActiveSession(session)
        setActiveEvent(event)
        setPatrolFilter('all')
        setSheetMode(event.event_type === 'leadership_meeting' ? 'leadership' : 'troop')

        // Build initial sheetData: all present by default, then override with saved records
        const existingRecs = records.filter((r) => r.attendance_id === session.id)

        if (event.event_type === 'leadership_meeting') {
            const init: Record<string, { status: string; reason: string }> = {}
            for (const l of leaders) {
                const saved = existingRecs.find((r) => r.member_id === l.id)
                init[l.id] = { status: saved?.status || 'present', reason: saved?.excuse_reason || '' }
            }
            setSheetData(init)
        } else {
            const troopMembers = members.filter((m) => m.troop_id === session.troop_id)
            const init: Record<string, { status: string; reason: string }> = {}
            for (const m of troopMembers) {
                const saved = existingRecs.find((r) => r.member_id === m.id)
                init[m.id] = { status: saved?.status || 'present', reason: saved?.excuse_reason || '' }
            }
            setSheetData(init)
        }
        setView(session.id)
    }

    // ── Create new session ──
    const handleCreateSession = async () => {
        if (!newDate) return showStatus('Please select a date.', 'error')
        const targetTroopId = newSessionType === 'weekly_meeting'
            ? (isTroopLeader ? userTroopId : newTroopId)
            : null

        if (newSessionType === 'weekly_meeting' && !targetTroopId) {
            return showStatus('Please select a troop unit.', 'error')
        }

        setLoading(true)

        // Create placeholder event
        const troopObj = troops.find((t) => t.id === targetTroopId)
        const eventTitle = newSessionType === 'weekly_meeting'
            ? `Weekly Meeting — ${troopObj?.name || 'Troop'}`
            : `Leadership Meeting — ${groupName}`
        const startTime = new Date(`${newDate}T09:00:00`).toISOString()
        const endTime = new Date(`${newDate}T11:00:00`).toISOString()

        const { data: eventRow, error: evErr } = await supabase
            .from('events')
            .insert({
                title: eventTitle,
                event_type: newSessionType,
                start_time: startTime,
                end_time: endTime,
                scope: newSessionType === 'weekly_meeting' ? 'troop' : 'group',
                group_id: groupId,
                troop_id: targetTroopId || null,
            })
            .select()
            .single()

        if (evErr || !eventRow) {
            setLoading(false)
            return showStatus(evErr?.message || 'Failed to create event.', 'error')
        }

        const { data: sessionRow, error: sessErr } = await supabase
            .from('attendance')
            .insert({ event_id: eventRow.id, troop_id: targetTroopId || null, date: newDate })
            .select()
            .single()

        setLoading(false)

        if (sessErr || !sessionRow) {
            return showStatus(sessErr?.message || 'Failed to create session.', 'error')
        }

        setEvents((prev) => [eventRow, ...prev])
        setSessions((prev) => [sessionRow, ...prev])
        showStatus('Session created!', 'success')
        openSheet(sessionRow, eventRow)
    }

    // ── Save attendance sheet ──
    const handleSaveSheet = async () => {
        if (!activeSession) return
        setLoading(true)

        const ids = Object.keys(sheetData)
        const upserts = ids.map((id) => ({
            attendance_id: activeSession.id,
            member_id: id,
            status: sheetData[id].status,
            excuse_reason: sheetData[id].status !== 'present' ? (sheetData[id].reason || null) : null,
        }))

        // Delete old records for this session, then insert fresh batch
        await supabase.from('attendance_records').delete().eq('attendance_id', activeSession.id)
        const { data: newRecs, error } = await supabase
            .from('attendance_records')
            .insert(upserts)
            .select()

        setLoading(false)

        if (error) {
            return showStatus(error.message, 'error')
        }

        // Update local records
        setRecords((prev) => [
            ...prev.filter((r) => r.attendance_id !== activeSession.id),
            ...(newRecs || []),
        ])
        showStatus('Attendance saved!', 'success')
    }

    // ── Sheet helpers ──
    const setStatus = (id: string, status: string) => {
        setSheetData((prev) => ({
            ...prev,
            [id]: { status, reason: status === 'present' ? '' : (prev[id]?.reason || '') },
        }))
    }
    const setReason = (id: string, reason: string) => {
        setSheetData((prev) => ({ ...prev, [id]: { ...prev[id], reason } }))
    }

    // Is this session older than 7 days?
    const isOldSession = activeSession
        ? Date.now() - new Date(activeSession.date).getTime() > 7 * DAY_MS
        : false

    // Troop members grouped by patrol
    const troopMembersForSheet = useMemo(() => {
        if (!activeSession || activeEvent?.event_type !== 'weekly_meeting') return []
        return members.filter((m) => m.troop_id === activeSession.troop_id)
    }, [activeSession, activeEvent, members])

    const patrolsForSheet = useMemo(() => {
        if (!activeSession) return []
        return patrols.filter((p) => p.troop_id === activeSession.troop_id)
    }, [activeSession, patrols])

    const filteredMembersForSheet = useMemo(() => {
        if (patrolFilter === 'all') return troopMembersForSheet
        if (patrolFilter === 'none') return troopMembersForSheet.filter((m) => !m.patrol_id)
        return troopMembersForSheet.filter((m) => m.patrol_id === patrolFilter)
    }, [troopMembersForSheet, patrolFilter])

// ── Top-level StatusToggle & ReasonSelector components (outside parent component to maintain DOM focus) ──
function StatusToggle({ status, onChange }: { status: string; onChange: (st: string) => void }) {
    const s = status || 'present'
    return (
        <div className="flex gap-1">
            <button
                type="button"
                onClick={() => onChange('present')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${s === 'present'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
            >
                Attended
            </button>
            <button
                type="button"
                onClick={() => onChange('absent')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${s === 'absent'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
            >
                Absent
            </button>
        </div>
    )
}

function ReasonSelector({ reason, onChange }: { reason: string; onChange: (r: string) => void }) {
    const personReason = reason || ''
    const isStandard = STANDARD_ABSENCE_REASONS.includes(personReason)
    const selectValue = isStandard ? personReason : (personReason === '' ? '' : 'Other')

    return (
        <div className="flex gap-2 flex-col sm:flex-row">
            <select
                value={selectValue}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 focus:border-teal-500 focus:outline-none"
            >
                <option value="">-- Select reason / excuse --</option>
                {ABSENCE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            {selectValue === 'Other' && (
                <input
                    type="text"
                    value={personReason === 'Other' ? '' : personReason}
                    placeholder="Specify custom reason…"
                    className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    onChange={(e) => onChange(e.target.value || 'Other')}
                />
            )}
        </div>
    )
}

    // ─── RENDER ───────────────────────────────────────────────────────────────

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden relative">
            {/* Mobile overlay */}
            {isMobileOpen && (
                <div onClick={() => setIsMobileOpen(false)} className="fixed inset-0 z-30 bg-black/40 md:hidden" />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-40 w-64 bg-teal-900 text-white flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                    }`}
            >
                <DashboardSidebar
                    groupName={groupName}
                    currentRole={currentRole}
                    onClose={() => setIsMobileOpen(false)}
                    onLogout={handleLogout}
                />
            </aside>

            {/* Main */}
            <main className="flex-1 overflow-y-auto flex flex-col">
                {/* Mobile header */}
                <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between md:justify-end">
                    <button className="md:hidden text-teal-900 p-1" onClick={() => setIsMobileOpen(true)}>
                        <Menu className="h-6 w-6" />
                    </button>
                    <div className="text-right">
                        <span className="text-xs text-slate-400 font-semibold block uppercase">Logged in as</span>
                        <span className="text-sm font-bold text-teal-700">{userName || currentRole.replace(/_/g, ' ')}</span>
                    </div>
                </header>

                <div className="p-6 md:p-8 flex-1 flex flex-col">
                    {/* Status banner */}
                    {statusMsg && (
                        <div className={`mb-4 p-3 rounded-xl text-sm text-center border ${statusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'
                            }`}>
                            {statusMsg.text}
                        </div>
                    )}

                    {/* ─── LIST VIEW ───────────────────────────────────────────────── */}
                    {view === 'list' && (
                        <>
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Attendance</h2>
                                    <p className="text-sm text-slate-500 mt-1">Track weekly meeting and leadership attendance in {groupName}.</p>
                                </div>
                                <button
                                    onClick={() => setView('new')}
                                    className="inline-flex items-center gap-2 bg-teal-700 hover:bg-teal-600 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors text-sm"
                                >
                                    <Plus className="h-4 w-4" /> New Session
                                </button>
                            </div>

                            {visibleSessions.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center py-20 text-slate-400 gap-3">
                                    <ClipboardList className="h-12 w-12 text-slate-300" />
                                    <p className="text-lg font-semibold text-slate-500">No attendance sessions yet</p>
                                    <p className="text-sm">Click &ldquo;New Session&rdquo; to take your first attendance.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {visibleSessions.map((item) => {
                                        if (!item) return null
                                        const { session, event, troop, presentCount, absentCount, totalRecords } = item
                                        const dateObj = new Date(session.date)
                                        const isOld = Date.now() - dateObj.getTime() > 7 * DAY_MS
                                        return (
                                            <button
                                                key={session.id}
                                                onClick={() => openSheet(session, event)}
                                                className="w-full text-left bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm hover:shadow-md hover:border-teal-200 transition-all group"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex gap-3 items-start min-w-0">
                                                        <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${event.event_type === 'leadership_meeting' ? 'bg-violet-100 text-violet-700' : 'bg-teal-100 text-teal-700'
                                                            }`}>
                                                            {event.event_type === 'leadership_meeting' ? <Users className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-slate-800 truncate">{event.title}</p>
                                                            <p className="text-xs text-slate-500 mt-0.5">
                                                                {dateObj.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                                                {troop && <span className="ml-1">· {troop.name}</span>}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="shrink-0 text-right">
                                                        {totalRecords > 0 ? (
                                                            <div className="flex gap-2 text-xs font-semibold">
                                                                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{presentCount} ✓</span>
                                                                {absentCount > 0 && <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">{absentCount} ✗</span>}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-400 italic">Not yet taken</span>
                                                        )}
                                                        {isOld && <p className="text-[10px] text-amber-600 mt-1">Older than 7 days</p>}
                                                    </div>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {/* ─── NEW SESSION FORM ─────────────────────────────────────────── */}
                    {view === 'new' && (
                        <div className="max-w-lg w-full mx-auto">
                            <button onClick={() => setView('list')} className="flex items-center gap-1 text-sm text-teal-700 font-semibold mb-6 hover:underline">
                                <ChevronLeft className="h-4 w-4" /> Back to sessions
                            </button>
                            <h2 className="text-2xl font-extrabold text-slate-900 mb-1">New Attendance Session</h2>
                            <p className="text-sm text-slate-500 mb-6">Create a session for today or log a past date.</p>

                            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-sm">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Session Type</label>
                                    <select
                                        value={newSessionType}
                                        onChange={(e) => setNewSessionType(e.target.value as any)}
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none sm:text-sm"
                                    >
                                        <option value="weekly_meeting">Weekly Troop Meeting</option>
                                        {isGroupAdmin && <option value="leadership_meeting">Leadership Meeting</option>}
                                    </select>
                                </div>

                                {newSessionType === 'weekly_meeting' && !isTroopLeader && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Troop Unit</label>
                                        <select
                                            value={newTroopId}
                                            onChange={(e) => setNewTroopId(e.target.value)}
                                            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none sm:text-sm"
                                        >
                                            <option value="">-- Select Troop --</option>
                                            {troops.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                {newSessionType === 'weekly_meeting' && isTroopLeader && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400">Troop Unit</label>
                                        <input disabled value={troops.find((t) => t.id === userTroopId)?.name || 'Your Troop'} className="mt-1 block w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-slate-500 sm:text-sm" />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Session Date</label>
                                    <input
                                        type="date"
                                        value={newDate}
                                        onChange={(e) => setNewDate(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none sm:text-sm"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setView('list')} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors">
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        disabled={loading}
                                        onClick={handleCreateSession}
                                        className="flex-1 px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-lg text-sm font-semibold shadow disabled:bg-slate-300 transition-colors"
                                    >
                                        {loading ? 'Creating…' : 'Start Taking Attendance'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── ATTENDANCE SHEET ─────────────────────────────────────────── */}
                    {view !== 'list' && view !== 'new' && activeSession && activeEvent && (
                        <div className="flex flex-col flex-1 min-h-0">
                            {/* Sheet header */}
                            <div className="flex items-start justify-between mb-4 gap-4">
                                <div className="flex items-start gap-3 min-w-0">
                                    <button onClick={() => setView('list')} className="mt-0.5 text-teal-700 hover:text-teal-900 shrink-0">
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>
                                    <div className="min-w-0">
                                        <h2 className="text-xl font-extrabold text-slate-900 truncate">{activeEvent.title}</h2>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {new Date(activeSession.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleSaveSheet}
                                    disabled={loading}
                                    className="shrink-0 px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-xl text-sm font-bold shadow disabled:bg-slate-300 transition-colors"
                                >
                                    {loading ? 'Saving…' : 'Save'}
                                </button>
                            </div>

                            {/* Old session warning */}
                            {isOldSession && (
                                <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium px-4 py-3 rounded-xl">
                                    <AlertTriangle className="h-4 w-4 shrink-0" />
                                    This session is older than 7 days — editing may affect historical records.
                                </div>
                            )}

                            {/* Quick stats */}
                            <div className="flex gap-3 mb-4 flex-wrap">
                                {(['present', 'absent'] as const).map((st) => {
                                    const count = Object.values(sheetData).filter((v) => st === 'present' ? v.status === 'present' : v.status !== 'present').length
                                    const colors = { present: 'bg-emerald-50 text-emerald-700 border-emerald-100', absent: 'bg-rose-50 text-rose-700 border-rose-100' }
                                    const labels = { present: 'Attended', absent: 'Absent' }
                                    return (
                                        <div key={st} className={`px-3 py-1.5 rounded-xl border text-xs font-semibold ${colors[st]}`}>
                                            {labels[st]}: {count}
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Patrol filter (troop meetings only) */}
                            {sheetMode === 'troop' && patrolsForSheet.length > 0 && (
                                <div className="flex gap-2 flex-wrap mb-4">
                                    {[{ id: 'all', name: 'All Scouts' }, ...patrolsForSheet, { id: 'none', name: 'No Patrol' }].map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => setPatrolFilter(p.id)}
                                            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${patrolFilter === p.id ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                                                }`}
                                        >
                                            {p.name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Scout / Leader rows */}
                            <div className="flex-1 overflow-y-auto space-y-2 pb-6">
                                {sheetMode === 'leadership' ? (
                                    leaders.map((l) => (
                                        <div key={l.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-col gap-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-slate-800 text-sm truncate">{l.fullName}</p>
                                                    <p className="text-xs text-slate-400">{l.roleName}</p>
                                                </div>
                                                <StatusToggle status={sheetData[l.id]?.status || 'present'} onChange={(st) => setStatus(l.id, st)} />
                                            </div>
                                            {sheetData[l.id]?.status !== 'present' && (
                                                <ReasonSelector reason={sheetData[l.id]?.reason || ''} onChange={(r) => setReason(l.id, r)} />
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    filteredMembersForSheet.map((m) => (
                                        <div key={m.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-col gap-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-slate-800 text-sm truncate">{m.first_name} {m.last_name}</p>
                                                    {m.current_rank && m.current_rank !== 'None' && (
                                                        <p className="text-xs text-slate-400">{m.current_rank}</p>
                                                    )}
                                                </div>
                                                <StatusToggle status={sheetData[m.id]?.status || 'present'} onChange={(st) => setStatus(m.id, st)} />
                                            </div>
                                            {sheetData[m.id]?.status !== 'present' && (
                                                <ReasonSelector reason={sheetData[m.id]?.reason || ''} onChange={(r) => setReason(m.id, r)} />
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Sticky save button on mobile */}
                            <div className="pt-4 border-t border-slate-100">
                                <button
                                    onClick={handleSaveSheet}
                                    disabled={loading}
                                    className="w-full py-3 bg-teal-700 hover:bg-teal-600 text-white rounded-xl text-sm font-bold shadow disabled:bg-slate-300 transition-colors"
                                >
                                    {loading ? 'Saving…' : 'Save Attendance'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
