'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import EventCalendar from './EventCalendar'
import {
    Menu, X, Plus, Calendar, MapPin, DollarSign, Users, FileText,
    CheckCircle2, XCircle, Clock, ShieldCheck, Trash2, Edit, ExternalLink, AlertTriangle, Layers,
    Smartphone, Copy, Check, Grid, Loader2
} from 'lucide-react'
import DashboardShell from '../DashboardShell'
import DashboardSidebar from '../DashboardSidebar'
import { toLocalDatetimeInputValue, formatDateDisplay, formatTimeDisplay } from '@/utils/dateTimeUtils'
import { triggerRoleNotification, triggerNotification } from '@/utils/notifications'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Leader {
    id: string
    fullName: string
    email: string
    rank: string
}

interface Troop {
    id: string
    name: string
}

interface Member {
    id: string
    first_name: string
    last_name: string
    troop_id: string
    current_rank?: string | null
}

interface EventStaff {
    id?: string
    event_id?: string
    profile_id: string
    event_role: string
    profiles?: { full_name: string }
}

interface EventParticipant {
    id?: string
    event_id?: string
    member_id: string
    attendance_status: string // 'present', 'absent'
    parent_consent: string // 'yes', 'pending', 'no'
    fee_paid: number
    payment_status: string // 'paid', 'partial', 'unpaid'
    notes?: string | null
    members?: Member
}

interface EventExpense {
    id?: string
    event_id?: string
    category: string // 'food', 'transport', 'equipment', 'location', 'program', 'misc'
    description: string
    amount: number
    logged_by?: string | null
    created_at?: string
}

interface EventDocument {
    id?: string
    event_id?: string
    title: string
    file_url: string
    created_at?: string
}

interface EventItem {
    id: string
    title: string
    description?: string | null
    event_type: string
    start_time: string
    end_time: string
    location?: string | null
    scope: string
    group_id: string
    troop_id?: string | null
    participant_fee: number
    status: string
    event_staff?: EventStaff[]
    event_participants?: EventParticipant[]
    event_expenses?: EventExpense[]
    event_documents?: EventDocument[]
}

interface Props {
    initialEvents: EventItem[]
    troops: Troop[]
    leaders: Leader[]
    members: Member[]
    currentRole: string
    groupId: string
    groupName: string
    userTroopId: string | null
    userProfileId: string
    userName: string
}

const EVENT_STAFF_ROLES = [
    { key: 'ka2ed_mouskhayyam', label: 'Camp Leader (قائد المخيِّم)' },
    { key: 'mousa3ed_ka2ed_mouskhayyam', label: 'Assistant Camp Leader (مساعد قائد مخيِّم)' },
    { key: 'amin_serr_mouskhayyam', label: 'Camp Secretary (امين سرّ المخيِّم)' },
    { key: 'amin_sandou2_mouskhayyam', label: 'Camp Treasurer (امين صندوق)' },
    { key: 'amin_tejhizet', label: 'Logistics & Equipment (امين تجهيزات)' },
    { key: 'mas2oul_matbakh', label: 'Kitchen Responsible (مسؤول مطبخ)' },
    { key: 'mas2oul_khedmet', label: 'Services Responsible (مسؤول خدمات)' },
    { key: 'mas2oul_saharat', label: 'Campfire & Evenings (مسؤول سهرات)' },
    { key: 'ka2ed_jaramiz', label: 'Cubs Unit Chief (قائد قطيع الجراميز)' },
    { key: 'mas2oul_riyada_jaramiz', label: 'Cubs Morning Gym (مسؤول رياضه صباحية جراميز)' },
    { key: 'ka2ed_zaharat', label: 'Brownies Unit Chief (قائدة دائرة الزهرات)' },
    { key: 'mas2oul_riyada_zaharat', label: 'Brownies Morning Gym (مسؤول رياضه صباحية زهرات)' },
    { key: 'ka2ed_kechefe', label: 'Scouts Troop Chief (قائد فرقة الكشافة)' },
    { key: 'mas2oul_riyada_kechefe', label: 'Scouts Morning Gym (مسؤول رياضه صباحية كشافة)' },
    { key: 'ka2ed_mourchidet', label: 'Guides Troop Chief (قائدة فرقة المرشدات)' },
    { key: 'mas2oul_riyada_mourchidet', label: 'Guides Morning Gym (مسؤول رياضه صباحية المرشدات)' },
    { key: 'ka2ed_mounjidet', label: 'Senior Guides Chief (قائدة فرقة المرشدة متقدمة)' },
    { key: 'mas2oul_taw2it', label: 'Schedule / Timekeeper (مسؤول توقيت ثابت)' },
    { key: 'mas2oul_is3afat', label: 'First Aid / Medical (مسؤول اسعافات أوّلية)' },
    { key: 'mas2oul_al3ab_layliya', label: 'Night Games (مسؤول العاب ليليّة)' },
    { key: 'ka2ed_haras', label: 'Guard / Security Chief (قائد حرس)' },
]

const EXPENSE_CATEGORIES = [
    { key: 'food', label: 'Food & Kitchen (المطبخ والتغذية)' },
    { key: 'transport', label: 'Transportation (النقل والمواصلات)' },
    { key: 'equipment', label: 'Equipment Rental & Supplies (التجهيزات)' },
    { key: 'location', label: 'Location / Land Fee (بدل أرض المخيم)' },
    { key: 'program', label: 'Activities & Awards (البرنامج والجوائز)' },
    { key: 'misc', label: 'Miscellaneous (مصاريف متفرقة)' },
]

export default function EventsManagement({
    initialEvents,
    troops,
    leaders,
    members,
    currentRole,
    groupId,
    groupName,
    userTroopId,
    userProfileId,
    userName,
}: Props) {
    const router = useRouter()
    const supabase = createClient()

    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const [events, setEvents] = useState<EventItem[]>(initialEvents)
    const [activeEvent, setActiveEvent] = useState<EventItem | null>(null)
    const [activeTab, setActiveTab] = useState<'hierarchy' | 'roster' | 'treasury' | 'documents'>('hierarchy')

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [openingEventId, setOpeningEventId] = useState<string | null>(null)
    const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

    const handleOpenEvent = (id: string) => {
        if (openingEventId) return
        setOpeningEventId(id)
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('start-navigation'))
        }
        router.push(`/group/dashboard/events/${id}`)
    }

    const isGroupAdmin = ['chef_groupe', 'assistant_chef_groupe', 'amin_serr_group', 'configurator'].includes(currentRole)

    const showStatus = (text: string, type: 'success' | 'error') => {
        setStatusMessage({ text, type })
        setTimeout(() => setStatusMessage(null), 7000)
    }

    // View Mode & Phone Sync States
    const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid')
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
    const [copiedFeed, setCopiedFeed] = useState(false)

    // Map events to FullCalendar format
    const calendarEvents = useMemo(() => {
        return events.map((ev) => ({
            id: ev.id,
            title: ev.title,
            start: ev.start_time,
            end: ev.end_time,
            backgroundColor: ev.event_type === 'camp' ? '#0f766e' : ev.event_type === 'hike' ? '#b45309' : '#0369a1',
            borderColor: 'transparent',
            textColor: '#ffffff',
            extendedProps: { event: ev },
        }))
    }, [events])

    const getICalFeedUrl = () => {
        if (typeof window === 'undefined') return ''
        return `${window.location.origin}/api/events/ical?groupId=${groupId}`
    }

    const getWebcalFeedUrl = () => {
        if (typeof window === 'undefined') return ''
        const origin = window.location.origin.replace(/^https?:\/\//, '')
        return `webcal://${origin}/api/events/ical?groupId=${groupId}`
    }

    // Create Event Form State
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [eventType, setEventType] = useState('camp')
    const [scope, setScope] = useState('group')
    const [targetTroopId, setTargetTroopId] = useState('')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [location, setLocation] = useState('')
    const [participantFee, setParticipantFee] = useState('0')
    const [staffAssignments, setStaffAssignments] = useState<Record<string, string>>({})

    // Reset Create Form
    const resetForm = () => {
        setEditingEventId(null)
        setTitle('')
        setDescription('')
        setEventType('camp')
        setScope('group')
        setTargetTroopId('')
        setStartTime('')
        setEndTime('')
        setLocation('')
        setParticipantFee('0')
        setStaffAssignments({})
    }

    // Edit Event Modal State & Handlers
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editingEventId, setEditingEventId] = useState<string | null>(null)

    // Expense & Document Form States (Declared at top level)
    const [expCategory, setExpCategory] = useState('food')
    const [expDesc, setExpDesc] = useState('')
    const [expAmount, setExpAmount] = useState('')
    const [docTitle, setDocTitle] = useState('')
    const [docUrl, setDocUrl] = useState('')

    const openEditModal = (ev: EventItem) => {
        setEditingEventId(ev.id)
        setTitle(ev.title)
        setDescription(ev.description || '')
        setEventType(ev.event_type)
        setScope(ev.scope)
        setTargetTroopId(ev.troop_id || '')
        setStartTime(toLocalDatetimeInputValue(ev.start_time))
        setEndTime(toLocalDatetimeInputValue(ev.end_time))
        setLocation(ev.location || '')
        setParticipantFee(String(ev.participant_fee || 0))
        setIsEditModalOpen(true)
    }

    const handleSaveEditEvent = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingEventId || !title || !startTime || !endTime) {
            return showStatus('Please enter event title, start time, and end time.', 'error')
        }

        setLoading(true)
        try {
            const { error: uErr } = await supabase
                .from('events')
                .update({
                    title,
                    description: description || null,
                    event_type: eventType,
                    scope,
                    troop_id: scope === 'troop' ? targetTroopId : null,
                    start_time: new Date(startTime).toISOString(),
                    end_time: new Date(endTime).toISOString(),
                    location: location || null,
                    participant_fee: parseFloat(participantFee) || 0,
                })
                .eq('id', editingEventId)

            if (uErr) throw uErr

            const { data: updatedRow, error: fetchErr } = await supabase
                .from('events')
                .select(`
          *,
          event_staff (*, profiles(full_name)),
          event_participants (*, members(first_name, last_name, troop_id, current_rank)),
          event_expenses (*),
          event_documents (*)
        `)
                .eq('id', editingEventId)
                .maybeSingle()

            if (fetchErr || !updatedRow) throw fetchErr || new Error('Failed to retrieve updated event.')

            setEvents((prev: EventItem[]) => prev.map((ev: EventItem) => (ev.id === editingEventId ? updatedRow : ev)))
            setIsEditModalOpen(false)
            showStatus('Event updated successfully!', 'success')
        } catch (err: any) {
            showStatus(err.message || 'Failed to update event.', 'error')
        } finally {
            setLoading(false)
        }
    }

    // Create Event Submit
    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title || !startTime || !endTime) {
            return showStatus('Please enter event title, start time, and end time.', 'error')
        }
        if (scope === 'troop' && !targetTroopId) {
            return showStatus('Please select a target troop for troop scope.', 'error')
        }

        setLoading(true)
        try {
            // 1. Insert Event
            const { data: eventRow, error: evErr } = await supabase
                .from('events')
                .insert({
                    title,
                    description: description || null,
                    event_type: eventType,
                    start_time: new Date(startTime).toISOString(),
                    end_time: new Date(endTime).toISOString(),
                    location: location || null,
                    scope,
                    group_id: groupId,
                    troop_id: scope === 'troop' ? targetTroopId : null,
                    participant_fee: parseFloat(participantFee) || 0,
                    status: 'planned',
                })
                .select()
                .single()

            if (evErr || !eventRow) throw evErr || new Error('Failed to create event.')

            // 2. Insert Staff Assignments
            const staffRows: EventStaff[] = []
            for (const [roleKey, leaderId] of Object.entries(staffAssignments)) {
                if (leaderId) {
                    const { data: sData } = await supabase
                        .from('event_staff')
                        .insert({
                            event_id: eventRow.id,
                            profile_id: leaderId,
                            event_role: roleKey,
                        })
                        .select('*, profiles(full_name)')
                        .single()

                    if (sData) staffRows.push(sData)
                }
            }

            // 3. Auto-populate Participants roster from active members in scope
            const eligibleMembers = members.filter((m) =>
                scope === 'group' ? true : m.troop_id === targetTroopId
            )

            const pInserts = eligibleMembers.map((m) => ({
                event_id: eventRow.id,
                member_id: m.id,
                attendance_status: 'absent',
                parent_consent: 'pending',
                fee_paid: 0,
                payment_status: 'unpaid',
            }))

            let participantRows: EventParticipant[] = []
            if (pInserts.length > 0) {
                const { data: pData } = await supabase
                    .from('event_participants')
                    .insert(pInserts)
                    .select('*, members(first_name, last_name, troop_id, current_rank)')

                participantRows = pData || []
            }

            const fullEvent: EventItem = {
                ...eventRow,
                event_staff: staffRows,
                event_participants: participantRows,
                event_expenses: [],
                event_documents: [],
            }

            setEvents((prev: EventItem[]) => [fullEvent, ...prev])
            setIsCreateModalOpen(false)
            resetForm()

            // Dispatch notification to Troop Leaders / Group Leaders
            triggerRoleNotification(groupId, 'ka2ed_fer2a', {
                title: `New Event Scheduled: ${title}`,
                message: `An event "${title}" (${eventType}) was created for ${new Date(startTime).toLocaleDateString()}. Open the portal to view details and participants.`,
                actionUrl: `/group/dashboard/events/${eventRow.id}`,
                category: 'events',
            })

            showStatus('Event created successfully with full participant roster!', 'success')
        } catch (err: any) {
            showStatus(err.message || 'Failed to create event.', 'error')
        } finally {
            setLoading(false)
        }
    }

    // ── Roster Controls ────────────────────────────────────────────────────────
    const updateParticipant = async (participantId: string, updates: Partial<EventParticipant>) => {
        if (!activeEvent) return
        const { data: updated, error } = await supabase
            .from('event_participants')
            .update(updates)
            .eq('id', participantId)
            .select('*, members(first_name, last_name, troop_id, current_rank)')
            .single()

        if (!error && updated) {
            const newParticipants = (activeEvent.event_participants || []).map((p: EventParticipant) =>
                p.id === participantId ? updated : p
            )
            const updatedEvent = { ...activeEvent, event_participants: newParticipants }
            setActiveEvent(updatedEvent)
            setEvents((prev: EventItem[]) => prev.map((e: EventItem) => (e.id === activeEvent.id ? updatedEvent : e)))
        }
    }

    // ── Expense Controls ───────────────────────────────────────────────────────
    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!activeEvent || !expDesc || !expAmount) return

        const amt = parseFloat(expAmount)
        if (isNaN(amt) || amt <= 0) return showStatus('Enter valid amount.', 'error')

        const { data: expData, error } = await supabase
            .from('event_expenses')
            .insert({
                event_id: activeEvent.id,
                category: expCategory,
                description: expDesc,
                amount: amt,
                logged_by: userProfileId,
            })
            .select()
            .single()

        if (!error && expData) {
            const newExpenses = [expData, ...(activeEvent.event_expenses || [])]
            const updatedEvent = { ...activeEvent, event_expenses: newExpenses }
            setActiveEvent(updatedEvent)
            setEvents((prev: EventItem[]) => prev.map((e: EventItem) => (e.id === activeEvent.id ? updatedEvent : e)))
            setExpDesc('')
            setExpAmount('')
            showStatus('Expense logged.', 'success')
        }
    }

    const handleDeleteExpense = async (expId: string) => {
        if (!activeEvent) return
        await supabase.from('event_expenses').delete().eq('id', expId)
        const newExpenses = (activeEvent.event_expenses || []).filter((x: EventExpense) => x.id !== expId)
        const updatedEvent = { ...activeEvent, event_expenses: newExpenses }
        setActiveEvent(updatedEvent)
        setEvents((prev: EventItem[]) => prev.map((e: EventItem) => (e.id === activeEvent.id ? updatedEvent : e)))
    }

    // ── Document Controls ──────────────────────────────────────────────────────
    const handleAddDocument = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!activeEvent || !docTitle || !docUrl) return

        const { data: docData, error } = await supabase
            .from('event_documents')
            .insert({
                event_id: activeEvent.id,
                title: docTitle,
                file_url: docUrl,
                uploaded_by: userProfileId,
            })
            .select()
            .single()

        if (!error && docData) {
            const newDocs = [docData, ...(activeEvent.event_documents || [])]
            const updatedEvent = { ...activeEvent, event_documents: newDocs }
            setActiveEvent(updatedEvent)
            setEvents((prev: EventItem[]) => prev.map((e: EventItem) => (e.id === activeEvent.id ? updatedEvent : e)))
            setDocTitle('')
            setDocUrl('')
            showStatus('Document added.', 'success')
        }
    }

    // Handle Logout
    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <DashboardShell groupName={groupName} currentRole={currentRole} userName={userName}>
            {statusMessage && (
                <div
                    className={`mb-6 p-4 rounded-xl border text-sm text-center ${statusMessage.type === 'success'
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                        : 'bg-rose-50 border-rose-100 text-rose-800'
                        }`}
                >
                    {statusMessage.text}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Events & Camps Management</h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setIsSyncModalOpen(true)}
                        className="inline-flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-3 py-2 rounded-xl text-xs border border-amber-300 transition-colors shadow-sm"
                    >
                        <Smartphone className="h-4 w-4 text-amber-700" />
                        Sync Live to Phone Calendar
                    </button>

                    <div className="bg-slate-200 p-1 rounded-xl flex items-center gap-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${viewMode === 'grid' ? 'bg-white text-teal-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            <Grid className="h-3.5 w-3.5" /> List
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${viewMode === 'calendar' ? 'bg-white text-teal-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            <Calendar className="h-3.5 w-3.5" /> Calendar View
                        </button>
                    </div>

                    <button
                        onClick={() => { resetForm(); setIsCreateModalOpen(true) }}
                        className="inline-flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Create Event / Camp
                    </button>
                </div>
            </div>

            {/* ── CALENDAR VIEW ── */}
            {viewMode === 'calendar' && (
                <div className="fc-theme-scout">
                    <EventCalendar
                        events={events}
                        onEventClick={(id) => handleOpenEvent(id)}
                    />
                </div>
            )}

            {/* Events Grid */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.length === 0 ? (
                        <div className="col-span-full p-12 bg-white border border-slate-200 rounded-2xl text-center text-slate-400">
                            No events or camps logged yet. Click <strong>Create Event / Camp</strong> above to start!
                        </div>
                    ) : (
                        events.map((ev: EventItem) => {
                            const troopName = troops.find((t: Troop) => t.id === ev.troop_id)?.name
                            const leaderStaff = (ev.event_staff || []).find((s: EventStaff) => s.event_role === 'ka2ed_mouskhayyam')?.profiles?.full_name
                            const startDateStr = formatDateDisplay(ev.start_time)
                            const totalParticipants = (ev.event_participants || []).length
                            const presentCount = (ev.event_participants || []).filter((p: EventParticipant) => p.attendance_status === 'present').length
                            const isGroupLeader = ['chef_groupe', 'assistant_chef_groupe', 'configurator'].includes(currentRole)
                            const isEventLeader = (ev.event_staff || []).some((s: EventStaff) => s.profile_id === userProfileId && s.event_role === 'ka2ed_mouskhayyam')
                            const canEditThisEvent = isGroupLeader || isEventLeader
                            const isThisOpening = openingEventId === ev.id
                            const isAnyOpening = Boolean(openingEventId)

                            return (
                                <div
                                    key={ev.id}
                                    onClick={() => handleOpenEvent(ev.id)}
                                    className={`bg-white border rounded-2xl p-6 shadow-sm transition-all flex flex-col justify-between ${
                                        isThisOpening
                                            ? 'border-teal-600 ring-2 ring-teal-500/20 shadow-md cursor-wait'
                                            : isAnyOpening
                                            ? 'border-slate-200 opacity-50 pointer-events-none'
                                            : 'border-slate-200 hover:border-teal-500 hover:shadow-md cursor-pointer'
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-3">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${ev.scope === 'group' ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'
                                                    }`}>
                                                    {ev.scope === 'group' ? 'Group Event' : `Unit: ${troopName || 'Troop'}`}
                                                </span>
                                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                                                    {ev.event_type}
                                                </span>
                                            </div>
                                            {canEditThisEvent && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); openEditModal(ev) }}
                                                    className="text-slate-400 hover:text-teal-800 p-1 transition-colors rounded-lg hover:bg-slate-100"
                                                    title="Edit Event Details"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>

                                        <h3 className="text-lg font-bold text-slate-900 mb-2">{ev.title}</h3>
                                        {ev.description && <p className="text-xs text-slate-500 line-clamp-2 mb-4">{ev.description}</p>}

                                        <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-3.5 w-3.5 text-teal-700" />
                                                <span>{startDateStr}</span>
                                            </div>
                                            {ev.location && (
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="h-3.5 w-3.5 text-teal-700" />
                                                    <span>{ev.location}</span>
                                                </div>
                                            )}
                                            {leaderStaff && (
                                                <div className="flex items-center gap-2">
                                                    <Users className="h-3.5 w-3.5 text-teal-700" />
                                                    <span>Leader: <strong>{leaderStaff}</strong></span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        {isThisOpening && (
                                            <div className="mb-3 py-2 px-3 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center gap-2 text-xs font-bold text-teal-800 animate-pulse">
                                                <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
                                                <span>Opening Event Workspace…</span>
                                            </div>
                                        )}
                                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                                            <span className="text-slate-500">Scouts: <strong>{presentCount}/{totalParticipants}</strong></span>
                                            <span className="font-bold text-teal-700">Fee: ${ev.participant_fee}</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            )}

            {/* ── CREATE EVENT MODAL ───────────────────────────────────────────────── */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl max-w-xl w-full p-4 sm:p-6 space-y-4 shadow-2xl max-h-[88vh] overflow-y-auto my-auto">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <h3 className="text-lg font-bold text-slate-900">Create New Event / Camp</h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateEvent} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Event Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                    placeholder="e.g. Annual Summer Camp 2026"
                                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Event Type</label>
                                    <select
                                        value={eventType}
                                        onChange={(e) => setEventType(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                                    >
                                        <option value="camp">Camp (مخيم)</option>
                                        <option value="hike">Hike (مسيرة / رحلة)</option>
                                        <option value="activity">Activity / Special Event (نشاط)</option>
                                        <option value="training">Training (تدريب)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Scope</label>
                                    <select
                                        value={scope}
                                        onChange={(e) => setScope(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                                    >
                                        <option value="group">Full Group Event</option>
                                        <option value="troop">Troop / Unit Event</option>
                                    </select>
                                </div>
                            </div>

                            {scope === 'troop' && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Target Troop Unit</label>
                                    <select
                                        value={targetTroopId}
                                        onChange={(e) => setTargetTroopId(e.target.value)}
                                        required
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                                    >
                                        <option value="">-- Select Unit --</option>
                                        {troops.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Start Time</label>
                                    <input
                                        type="datetime-local"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        required
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">End Time</label>
                                    <input
                                        type="datetime-local"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        required
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Location</label>
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="e.g. Ehden Forest"
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Participant Fee ($)</label>
                                    <input
                                        type="number"
                                        value={participantFee}
                                        onChange={(e) => setParticipantFee(e.target.value)}
                                        min="0"
                                        step="1"
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Staff Assignments Section */}
                            <div className="pt-2 border-t border-slate-200">
                                <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-2">Assign Event Hierarchy & Staff</h4>
                                <div className="space-y-2">
                                    {EVENT_STAFF_ROLES.map((r: { key: string; label: string }) => (
                                        <div key={r.key} className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-medium text-slate-700 min-w-44">{r.label}</span>
                                            <select
                                                value={staffAssignments[r.key] || ''}
                                                onChange={(e) => setStaffAssignments((prev: Record<string, string>) => ({ ...prev, [r.key]: e.target.value }))}
                                                className="flex-1 rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-800 focus:border-teal-500 focus:outline-none"
                                            >
                                                <option value="">-- Assign Leader --</option>
                                                {leaders.map((l) => (
                                                    <option key={l.id} value={l.id}>{l.fullName}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 py-2 border border-slate-300 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-xl text-xs font-bold shadow disabled:bg-slate-300 transition-colors flex items-center justify-center gap-1.5"
                                >
                                    {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    <span>{loading ? 'Creating…' : 'Create Event'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── EDIT EVENT MODAL ─────────────────────────────────────────────────── */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl max-w-xl w-full p-4 sm:p-6 space-y-4 shadow-2xl max-h-[88vh] overflow-y-auto my-auto">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <h3 className="text-lg font-bold text-slate-900">Edit Event / Camp Details</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEditEvent} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Event Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={2}
                                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Event Type</label>
                                    <select
                                        value={eventType}
                                        onChange={(e) => setEventType(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                                    >
                                        <option value="camp">⛺ Camp (مخيم)</option>
                                        <option value="hike">🥾 Hike (نشاط خلاء / مسير)</option>
                                        <option value="activity">🎯 General Activity (نشاط)</option>
                                        <option value="training">🏅 Training Course (دراسة / دراسة أطراس)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Scope</label>
                                    <select
                                        value={scope}
                                        onChange={(e) => setScope(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                                    >
                                        <option value="group">Full Group Event (لكل الفوج)</option>
                                        <option value="troop">Troop Specific Event (نشاط فرقة)</option>
                                    </select>
                                </div>
                            </div>

                            {scope === 'troop' && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Target Troop Unit</label>
                                    <select
                                        value={targetTroopId}
                                        onChange={(e) => setTargetTroopId(e.target.value)}
                                        required={scope === 'troop'}
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                                    >
                                        <option value="">-- Select Troop --</option>
                                        {troops.map((t) => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Start Time</label>
                                    <input
                                        type="datetime-local"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        required
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">End Time</label>
                                    <input
                                        type="datetime-local"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        required
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Location</label>
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Participant Fee ($)</label>
                                    <input
                                        type="number"
                                        value={participantFee}
                                        onChange={(e) => setParticipantFee(e.target.value)}
                                        min="0"
                                        step="1"
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 py-2 border border-slate-300 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-xl text-xs font-bold shadow disabled:bg-slate-300 transition-colors flex items-center justify-center gap-1.5"
                                >
                                    {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    <span>{loading ? 'Saving Changes…' : 'Save Changes'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── PHONE CALENDAR LIVE SYNC MODAL ────────────────────────────────────── */}
            {isSyncModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <Smartphone className="h-5 w-5 text-teal-800" />
                                <h3 className="text-lg font-bold text-slate-900">Phone Calendar Live Sync</h3>
                            </div>
                            <button onClick={() => setIsSyncModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4 text-xs text-slate-600">
                            <p className="font-semibold text-slate-800">
                                Subscribe to your Scout Group's Live iCal Feed on your mobile phone (iPhone / Android) or Mac/PC. All camps, hikes, and meetings will automatically appear and update live in your native phone calendar app!
                            </p>

                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                                <span className="font-bold text-amber-900 block text-xs">📱 1-Click Mobile Subscription Link:</span>
                                <a
                                    href={getWebcalFeedUrl()}
                                    className="inline-flex items-center gap-2 bg-amber-800 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow transition-colors w-full justify-center"
                                >
                                    <Smartphone className="h-4 w-4" />
                                    Subscribe on iPhone / Mac (Apple Calendar)
                                </a>
                            </div>

                            <div className="space-y-2">
                                <span className="font-bold text-slate-800 block">🔗 Or Copy iCal Subscription Feed URL (Google Calendar / Outlook):</span>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={getICalFeedUrl()}
                                        className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(getICalFeedUrl())
                                            setCopiedFeed(true)
                                            setTimeout(() => setCopiedFeed(false), 3000)
                                        }}
                                        className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors shrink-0"
                                    >
                                        {copiedFeed ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                                        {copiedFeed ? 'Copied!' : 'Copy Link'}
                                    </button>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                                <p>• <strong>iPhone / iPad:</strong> Tap the button above to auto-add to Apple Calendar.</p>
                                <p>• <strong>Google Calendar:</strong> Go to Google Calendar &gt; Add Calendar &gt; &quot;From URL&quot; &gt; paste copied feed URL.</p>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setIsSyncModalOpen(false)}
                                className="bg-teal-800 hover:bg-teal-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardShell>
    )
}
