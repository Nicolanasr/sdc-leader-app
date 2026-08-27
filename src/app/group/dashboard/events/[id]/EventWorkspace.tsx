'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import {
  Menu, X, ArrowLeft, Calendar, MapPin, DollarSign, Users, FileText,
  CheckCircle2, XCircle, Clock, ShieldAlert, Trash2, Plus, ExternalLink, Filter, Layers, Award, Edit, Loader2, UploadCloud, FileSpreadsheet, Paperclip
} from 'lucide-react'
import DashboardShell from '../../DashboardShell'
import DashboardSidebar from '../../DashboardSidebar'

interface Leader {
  id: string
  fullName: string
  email: string
  rank: string
}

interface Member {
  id: string
  first_name: string
  last_name: string
  troop_id: string
  current_rank?: string | null
}

interface Troop {
  id: string
  name: string
}

interface EventStaff {
  id?: string
  event_id?: string
  profile_id: string
  event_role: string
  attendance_status?: string
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
  members?: {
    id: string
    first_name: string
    last_name: string
    troop_id: string
    current_rank?: string | null
  }
}

interface EventExpense {
  id?: string
  event_id?: string
  category: string
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
  event: EventItem
  troops: Troop[]
  leaders: Leader[]
  allMembers: Member[]
  currentRole: string
  groupId: string
  groupName: string
  userProfileId: string
  userName: string
}
const BASE_STAFF_ROLES = [
  { key: 'ka2ed_mouskhayyam', campLabel: 'Camp Leader (قائد المخيِّم)', actLabel: 'Activity Leader (قائد النشاط)' },
  { key: 'mousa3ed_ka2ed_mouskhayyam', campLabel: 'Assistant Leader (مساعد قائد المخيِّم)', actLabel: 'Assistant Leader (مساعد قائد النشاط)' },
  { key: 'amin_serr_mouskhayyam', campLabel: 'Secretary (أمين سرّ المخيِّم)', actLabel: 'Secretary (أمين سرّ النشاط)' },
  { key: 'amin_sandou2_mouskhayyam', campLabel: 'Treasurer (أمين صندوق المخيِّم)', actLabel: 'Treasurer (أمين صندوق النشاط)' },
  { key: 'amin_tejhizet', campLabel: 'Logistics & Equipment (أمين تجهيزات)', actLabel: 'Logistics & Equipment (أمين تجهيزات)' },
  { key: 'mas2oul_matbakh', campLabel: 'Kitchen & Supplies (مسؤول المؤونة والتموين)', actLabel: 'Kitchen & Supplies (مسؤول المؤونة والتموين)' },
  { key: 'mas2oul_khedmet', campLabel: 'Services & First Aid (مسؤول الخدمات والخدمة)', actLabel: 'Services & First Aid (مسؤول الخدمات والخدمة)' },
  { key: 'mas2oul_saharat', campLabel: 'Campfire & Evenings (مسؤول السهرات والأنشطة)', actLabel: 'Campfire & Evenings (مسؤول السهرات والأنشطة)' },
]

function getRoleLabel(roleKey: string, eventType: string): string {
  const isCamp = eventType === 'camp'
  const found = BASE_STAFF_ROLES.find((r) => r.key === roleKey)
  if (found) return isCamp ? found.campLabel : found.actLabel
  return roleKey
}

const EXPENSE_CATEGORIES = [
  { key: 'food', label: 'Food & Kitchen (المطبخ والتغذية)' },
  { key: 'transport', label: 'Transportation (النقل والمواصلات)' },
  { key: 'equipment', label: 'Equipment Rental & Supplies (التجهيزات)' },
  { key: 'location', label: 'Location / Land Fee (بدل أرض المخيم)' },
  { key: 'program', label: 'Activities & Awards (البرنامج والجوائز)' },
  { key: 'misc', label: 'Miscellaneous (مصاريف متفرقة)' },
]

export default function EventWorkspace({
  event: initialEvent,
  troops,
  leaders,
  allMembers,
  currentRole,
  groupId,
  groupName,
  userProfileId,
  userName,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [eventItem, setEventItem] = useState<EventItem>(initialEvent)
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const showStatus = (text: string, type: 'success' | 'error') => {
    setStatusMessage({ text, type })
    setTimeout(() => setStatusMessage(null), 7000)
  }

  // Staff Leader Attendance Update Handler
  const updateStaffAttendance = async (staffId: string, status: string) => {
    const { data: updated, error } = await supabase
      .from('event_staff')
      .update({ attendance_status: status })
      .eq('id', staffId)
      .select('*, profiles(full_name)')
      .single()

    if (!error && updated) {
      const updatedStaff = (eventItem.event_staff || []).map((s) =>
        s.id === staffId ? updated : s
      )
      setEventItem((prev) => ({ ...prev, event_staff: updatedStaff }))
    }
  }

  // ── Role & Permission Scoping ────────────────────────────────────────────────
  const isGroupAdmin = ['chef_groupe', 'assistant_chef_groupe', 'amin_serr_group', 'configurator'].includes(currentRole)
  const userAssignedRoles = (eventItem.event_staff || [])
    .filter((s) => s.profile_id === userProfileId)
    .map((s) => s.event_role)

  const isCampLeader = userAssignedRoles.includes('ka2ed_mouskhayyam') || isGroupAdmin
  const isCampSecretary = userAssignedRoles.includes('amin_serr_mouskhayyam') || isCampLeader
  const isCampTreasurer = userAssignedRoles.includes('amin_sandou2_mouskhayyam') || isCampLeader

  // Determine allowed tabs for current user
  const availableTabs = useMemo(() => {
    const tabs: Array<{ key: 'hierarchy' | 'roster' | 'treasury' | 'documents'; label: string; icon: string }> = [
      { key: 'hierarchy', label: 'Staff Hierarchy', icon: '📋' },
    ]

    if (isCampSecretary || isCampLeader) {
      tabs.push({ key: 'roster', label: 'Scout Roster & Consent', icon: '👥' })
    }

    if (isCampTreasurer || isCampLeader) {
      tabs.push({ key: 'treasury', label: 'Camp Treasury & Expenses', icon: '💰' })
    }

    tabs.push({ key: 'documents', label: 'Documents Repository', icon: '📁' })
    return tabs
  }, [isCampLeader, isCampSecretary, isCampTreasurer])

  const [activeTab, setActiveTab] = useState<'hierarchy' | 'roster' | 'treasury' | 'documents'>(availableTabs[0]?.key || 'hierarchy')

  // ── Roster Section Filtering & Splitting ────────────────────────────────────
  const [sectionFilter, setSectionFilter] = useState<string>('all')

  const participantsGroupedByTroop = useMemo(() => {
    const parts = eventItem.event_participants || []
    const map: Record<string, { troopName: string; participants: EventParticipant[] }> = {}

    for (const p of parts) {
      const tId = p.members?.troop_id || 'unassigned'
      const tName = troops.find((t) => t.id === tId)?.name || 'Unassigned Unit'

      if (sectionFilter !== 'all' && tId !== sectionFilter) continue

      if (!map[tId]) {
        map[tId] = { troopName: tName, participants: [] }
      }
      map[tId].participants.push(p)
    }

    return Object.values(map)
  }, [eventItem.event_participants, troops, sectionFilter])

  // Treasury & Transaction states
  const [isFeeCollectionsOpen, setIsFeeCollectionsOpen] = useState(false)
  const [isLogTransactionModalOpen, setIsLogTransactionModalOpen] = useState(false)
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense')
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')

  // Single Role Editing State
  const [singleEditingRoleKey, setSingleEditingRoleKey] = useState<string | null>(null)
  const [singleSelectedProfileId, setSingleSelectedProfileId] = useState<string>('')

  const handleSaveSingleRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!singleEditingRoleKey) return
    setLoading(true)

    // Delete existing staff row for this single role
    await supabase
      .from('event_staff')
      .delete()
      .eq('event_id', eventItem.id)
      .eq('event_role', singleEditingRoleKey)

    // Insert new staff assignment if leader selected
    if (singleSelectedProfileId) {
      await supabase.from('event_staff').insert({
        event_id: eventItem.id,
        profile_id: singleSelectedProfileId,
        event_role: singleEditingRoleKey,
        attendance_status: 'present',
      })
    }

    // Refresh staff
    const { data: updatedStaff } = await supabase
      .from('event_staff')
      .select('*, profiles(full_name)')
      .eq('event_id', eventItem.id)

    if (updatedStaff) {
      setEventItem((prev) => ({ ...prev, event_staff: updatedStaff }))
    }

    setLoading(false)
    setSingleEditingRoleKey(null)
    showStatus('Role updated successfully!', 'success')
  }

  // ── Edit Event Details Controls ───────────────────────────────────────────
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editEventType, setEditEventType] = useState('camp')
  const [editScope, setEditScope] = useState('group')
  const [editTargetTroopId, setEditTargetTroopId] = useState('')
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editParticipantFee, setEditParticipantFee] = useState('0')

  const openEditEventDetailsModal = () => {
    setEditTitle(eventItem.title)
    setEditDescription(eventItem.description || '')
    setEditEventType(eventItem.event_type)
    setEditScope(eventItem.scope)
    setEditTargetTroopId(eventItem.troop_id || '')
    setEditStartTime(eventItem.start_time ? new Date(eventItem.start_time).toISOString().slice(0, 16) : '')
    setEditEndTime(eventItem.end_time ? new Date(eventItem.end_time).toISOString().slice(0, 16) : '')
    setEditLocation(eventItem.location || '')
    setEditParticipantFee(String(eventItem.participant_fee || 0))
    setIsEditEventModalOpen(true)
  }

  const handleSaveEventDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data: updated, error } = await supabase
        .from('events')
        .update({
          title: editTitle,
          description: editDescription || null,
          event_type: editEventType,
          scope: editScope,
          troop_id: editScope === 'troop' ? editTargetTroopId : null,
          start_time: new Date(editStartTime).toISOString(),
          end_time: new Date(editEndTime).toISOString(),
          location: editLocation || null,
          participant_fee: parseFloat(editParticipantFee) || 0,
        })
        .eq('id', eventItem.id)
        .select('*, event_staff(*, profiles(full_name)), event_participants(*, members(first_name, last_name, troop_id, current_rank)), event_expenses(*), event_documents(*)')
        .single()

      if (error || !updated) throw error || new Error('Failed to update event details.')

      setEventItem(updated)
      setIsEditEventModalOpen(false)
      showStatus('Event details updated successfully!', 'success')
    } catch (err: any) {
      showStatus(err.message || 'Failed to update event details.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ── Edit Hierarchy Controls ──────────────────────────────────────────────
  const [isEditHierarchyModalOpen, setIsEditHierarchyModalOpen] = useState(false)
  const [hierarchyAssignments, setHierarchyAssignments] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const openEditHierarchyModal = () => {
    const initialMap: Record<string, string> = {}
    for (const s of eventItem.event_staff || []) {
      initialMap[s.event_role] = s.profile_id
    }
    setHierarchyAssignments(initialMap)
    setIsEditHierarchyModalOpen(true)
  }

  const handleSaveHierarchy = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await supabase.from('event_staff').delete().eq('event_id', eventItem.id)

      const inserts = []
      for (const [roleKey, profileId] of Object.entries(hierarchyAssignments)) {
        if (profileId) {
          inserts.push({
            event_id: eventItem.id,
            profile_id: profileId,
            event_role: roleKey,
          })
        }
      }

      let newStaffList: EventStaff[] = []
      if (inserts.length > 0) {
        const { data: sData, error: sErr } = await supabase
          .from('event_staff')
          .insert(inserts)
          .select('*, profiles(full_name)')

        if (sErr) throw sErr
        newStaffList = sData || []
      }

      setEventItem((prev) => ({ ...prev, event_staff: newStaffList }))
      setIsEditHierarchyModalOpen(false)
      showStatus('Event hierarchy (الهيكلية) updated successfully!', 'success')
    } catch (err: any) {
      showStatus(err.message || 'Failed to update event hierarchy.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ── Roster Edit Controls ──────────────────────────────────────────────────
  const [isEditRosterModalOpen, setIsEditRosterModalOpen] = useState(false)
  const [rosterSearch, setRosterSearch] = useState('')
  const [rosterTroopFilter, setRosterTroopFilter] = useState('all')

  const currentParticipantMemberIds = useMemo(() => {
    return new Set((eventItem.event_participants || []).map((p) => p.member_id))
  }, [eventItem.event_participants])

  const filteredGroupMembers = useMemo(() => {
    return allMembers.filter((m) => {
      if (rosterTroopFilter !== 'all' && m.troop_id !== rosterTroopFilter) {
        return false
      }
      if (rosterSearch.trim()) {
        const full = `${m.first_name} ${m.last_name}`.toLowerCase()
        if (!full.includes(rosterSearch.toLowerCase())) return false
      }
      return true
    })
  }, [allMembers, rosterTroopFilter, rosterSearch])

  const handleToggleMemberRoster = async (member: Member) => {
    const isEnrolled = currentParticipantMemberIds.has(member.id)

    if (isEnrolled) {
      const part = (eventItem.event_participants || []).find((p) => p.member_id === member.id)
      if (part?.id) {
        await supabase.from('event_participants').delete().eq('id', part.id)
        const updatedParts = (eventItem.event_participants || []).filter((p) => p.id !== part.id)
        setEventItem((prev) => ({ ...prev, event_participants: updatedParts }))
      }
    } else {
      const { data: newPart, error } = await supabase
        .from('event_participants')
        .insert({
          event_id: eventItem.id,
          member_id: member.id,
          attendance_status: 'absent',
          parent_consent: 'pending',
          fee_paid: 0,
          payment_status: 'unpaid',
        })
        .select('*, members(id, first_name, last_name, troop_id, current_rank)')
        .single()

      if (!error && newPart) {
        const updatedParts = [...(eventItem.event_participants || []), newPart]
        setEventItem((prev) => ({ ...prev, event_participants: updatedParts }))
      }
    }
  }

  const handleRemoveParticipant = async (participantId: string) => {
    await supabase.from('event_participants').delete().eq('id', participantId)
    const updatedParts = (eventItem.event_participants || []).filter((p) => p.id !== participantId)
    setEventItem((prev) => ({ ...prev, event_participants: updatedParts }))
    showStatus('Scout removed from event roster.', 'success')
  }

  const [updatingParticipantIds, setUpdatingParticipantIds] = useState<Record<string, boolean>>({})

  // Participant updates (Attendance, Consent, Fee) - Optimistic UI + Loading State
  const updateParticipant = async (participantId: string, updates: Partial<EventParticipant>) => {
    // Optimistic UI state update immediately
    setEventItem((prev) => ({
      ...prev,
      event_participants: (prev.event_participants || []).map((p) =>
        p.id === participantId ? { ...p, ...updates } : p
      ),
    }))

    setUpdatingParticipantIds((prev) => ({ ...prev, [participantId]: true }))

    const { data: updated, error } = await supabase
      .from('event_participants')
      .update(updates)
      .eq('id', participantId)
      .select('*, members(id, first_name, last_name, troop_id, current_rank)')
      .single()

    setUpdatingParticipantIds((prev) => {
      const next = { ...prev }
      delete next[participantId]
      return next
    })

    if (!error && updated) {
      setEventItem((prev) => ({
        ...prev,
        event_participants: (prev.event_participants || []).map((p) =>
          p.id === participantId ? updated : p
        ),
      }))
    }
  }

  // ── Treasury Expense Logging ────────────────────────────────────────────────
  const [expCategory, setExpCategory] = useState('food')
  const [expDesc, setExpDesc] = useState('')
  const [expAmount, setExpAmount] = useState('')

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expDesc || !expAmount) return

    const amt = parseFloat(expAmount)
    if (isNaN(amt) || amt <= 0) return showStatus('Please enter a valid amount.', 'error')

    const isIncome = transactionType === 'income'
    const categoryToSave = isIncome ? `income_${paymentMethod}` : expCategory
    const descriptionToSave = isIncome ? `[INCOME: ${paymentMethod.toUpperCase()}] ${expDesc}` : expDesc

    const { data: expData, error } = await supabase
      .from('event_expenses')
      .insert({
        event_id: eventItem.id,
        category: categoryToSave,
        description: descriptionToSave,
        amount: amt,
        logged_by: userProfileId,
      })
      .select()
      .single()

    if (!error && expData) {
      const newExpenses = [expData, ...(eventItem.event_expenses || [])]
      setEventItem((prev) => ({ ...prev, event_expenses: newExpenses }))
      setExpDesc('')
      setExpAmount('')
      setIsLogTransactionModalOpen(false)
      showStatus(isIncome ? 'Income logged successfully!' : 'Expense logged successfully.', 'success')
    }
  }

  const handleDeleteExpense = async (expId: string) => {
    await supabase.from('event_expenses').delete().eq('id', expId)
    const newExpenses = (eventItem.event_expenses || []).filter((x) => x.id !== expId)
    setEventItem((prev) => ({ ...prev, event_expenses: newExpenses }))
  }

  // ── Documents & Direct Storage Upload ──────────────────────────────────────
  const [docTitle, setDocTitle] = useState('')
  const [docUrl, setDocUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploadingFile, setIsUploadingFile] = useState(false)

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docTitle.trim()) return showStatus('Please enter a document title.', 'error')

    let finalFileUrl = docUrl.trim()

    if (selectedFile) {
      setIsUploadingFile(true)
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${eventItem.id}/${Date.now()}_${selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('event-documents')
        .upload(fileName, selectedFile, { upsert: true })

      if (uploadErr) {
        setIsUploadingFile(false)
        console.warn('Storage upload error fallback:', uploadErr)
        if (!finalFileUrl) {
          return showStatus(`Direct storage upload notice: ${uploadErr.message}. Please paste file URL or Google Drive link below.`, 'error')
        }
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('event-documents')
          .getPublicUrl(fileName)

        finalFileUrl = publicUrlData?.publicUrl || finalFileUrl
      }
      setIsUploadingFile(false)
    }

    if (!finalFileUrl) return showStatus('Please select a file to upload or paste a valid link.', 'error')

    const { data: docData, error } = await supabase
      .from('event_documents')
      .insert({
        event_id: eventItem.id,
        title: docTitle.trim(),
        file_url: finalFileUrl,
        uploaded_by: userProfileId,
      })
      .select()
      .single()

    if (!error && docData) {
      const newDocs = [docData, ...(eventItem.event_documents || [])]
      setEventItem((prev) => ({ ...prev, event_documents: newDocs }))
      setDocTitle('')
      setDocUrl('')
      setSelectedFile(null)
      showStatus('Document uploaded and attached successfully!', 'success')
    } else if (error) {
      showStatus(error.message, 'error')
    }
  }

  const handleDeleteDocument = async (docId: string) => {
    const { error } = await supabase.from('event_documents').delete().eq('id', docId)
    if (!error) {
      const newDocs = (eventItem.event_documents || []).filter((x) => x.id !== docId)
      setEventItem((prev) => ({ ...prev, event_documents: newDocs }))
      showStatus('Document removed.', 'success')
    }
  }

  // Handle Logout
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const startDateStr = new Date(eventItem.start_time).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
  const endDateStr = new Date(eventItem.end_time).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  return (
    <DashboardShell groupName={groupName} currentRole={currentRole} userName={userName}>
      {statusMessage && (
            <div
              className={`p-4 rounded-xl border text-sm text-center ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                  : 'bg-rose-50 border-rose-100 text-rose-800'
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          {/* Breadcrumb Back Button */}
          <Link
            href="/group/dashboard/events"
            className="inline-flex items-center gap-2 text-xs font-bold text-teal-800 hover:text-teal-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Events Directory
          </Link>

          {/* Hero Event Banner */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  eventItem.scope === 'group' ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {eventItem.scope === 'group' ? 'Full Group Event' : 'Unit / Troop Event'}
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 uppercase tracking-wider">
                  {eventItem.event_type}
                </span>
                {(isCampLeader || isGroupAdmin || isCampSecretary) && (
                  <button
                    onClick={openEditEventDetailsModal}
                    className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded text-xs transition-colors"
                  >
                    <Edit className="h-3 w-3" /> Edit
                  </button>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">{eventItem.title}</h1>
              {eventItem.description && <p className="text-xs text-slate-500 mt-1">{eventItem.description}</p>}
            </div>

            <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-xs space-y-1.5 w-full md:w-auto md:shrink-0 md:min-w-64">
              <div className="flex justify-between"><span className="text-slate-400 font-semibold">Start:</span><span className="font-bold text-slate-800">{startDateStr}</span></div>
              <div className="flex justify-between"><span className="text-slate-400 font-semibold">End:</span><span className="font-bold text-slate-800">{endDateStr}</span></div>
              {eventItem.location && <div className="flex justify-between"><span className="text-slate-400 font-semibold">Location:</span><span className="font-bold text-teal-800">{eventItem.location}</span></div>}
              <div className="flex justify-between pt-1 border-t border-slate-200"><span className="text-slate-400 font-semibold">Fee per scout:</span><span className="font-extrabold text-teal-700">${eventItem.participant_fee}</span></div>
            </div>
          </div>

          {/* Role Access Notice */}
          {!isCampLeader && userAssignedRoles.length > 0 && (
            <div className="bg-teal-50 border border-teal-200 text-teal-900 text-xs px-4 py-2.5 rounded-xl font-medium flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-teal-700" />
              <span>
                Role Scoped Access Active: You are assigned as <strong>{userAssignedRoles.map((r) => getRoleLabel(r, eventItem.event_type)).join(', ')}</strong>. Tabs have been tailored for your responsibilities.
              </span>
            </div>
          )}

          {/* Workspace Pill Navigation Tabs (Mobile Scrollable Pill Bar) */}
          <div className="bg-slate-200/70 p-1.5 rounded-2xl flex overflow-x-auto gap-1.5 shrink-0 scrollbar-none">
            {availableTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap flex items-center gap-2 ${
                  activeTab === t.key
                    ? 'bg-teal-800 text-white shadow-md'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* ── TAB 1: STAFF HIERARCHY ───────────────────────────────────────────── */}
          {activeTab === 'hierarchy' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Event Staff Hierarchy ({eventItem.event_type === 'camp' ? 'هيكلية المخيّم' : 'هيكلية النشاط'})
                  </h3>
                  <p className="text-xs text-slate-500">Official leaders assigned to perform camp/event management duties.</p>
                </div>
                {isCampLeader && (
                  <button
                    onClick={openEditHierarchyModal}
                    className="inline-flex items-center gap-1.5 bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow transition-colors shrink-0"
                  >
                    <Edit className="h-4 w-4" />
                    Edit All Roles
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {BASE_STAFF_ROLES.map((r) => {
                  const label = getRoleLabel(r.key, eventItem.event_type)
                  const assigned = (eventItem.event_staff || []).find((s) => s.event_role === r.key)
                  return (
                    <div key={r.key} className={`rounded-xl p-4 flex flex-col justify-between border ${assigned ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/50 border-slate-150 opacity-75'}`}>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">{label}</span>
                        {isCampLeader && (
                          <button
                            onClick={() => {
                              setSingleSelectedProfileId(assigned?.profile_id || '')
                              setSingleEditingRoleKey(r.key)
                            }}
                            className="p-1 text-slate-400 hover:text-teal-700 rounded transition-colors"
                            title="Edit this role"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm font-bold text-slate-900 mt-2">
                        {assigned?.profiles?.full_name || <span className="text-slate-400 italic text-xs font-normal">Unassigned</span>}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── EDIT EVENT HIERARCHY MODAL ────────────────────────────────────── */}
          {isEditHierarchyModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Edit Staff Roles ({eventItem.event_type === 'camp' ? 'هيكلية المخيّم' : 'هيكلية النشاط'})
                    </h3>
                    <p className="text-xs text-slate-500">Assign leaders to official staff roles 1-by-1 or for all roles.</p>
                  </div>
                  <button onClick={() => setIsEditHierarchyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveHierarchy} className="space-y-4 flex-1 overflow-y-auto pr-1">
                  <div className="space-y-3">
                    {BASE_STAFF_ROLES.map((r) => (
                      <div key={r.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <label className="text-xs font-bold text-teal-900 sm:w-1/2">{getRoleLabel(r.key, eventItem.event_type)}</label>
                        <select
                          value={hierarchyAssignments[r.key] || ''}
                          onChange={(e) => setHierarchyAssignments((prev) => ({ ...prev, [r.key]: e.target.value }))}
                          className="sm:w-1/2 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none"
                        >
                          <option value="">-- Unassigned --</option>
                          {leaders.map((l) => (
                            <option key={l.id} value={l.id}>{l.fullName}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditHierarchyModalOpen(false)}
                      className="flex-1 py-2 border border-slate-300 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-xl text-xs font-bold shadow disabled:bg-slate-300 transition-colors"
                    >
                      {loading ? 'Saving Hierarchy…' : 'Save Hierarchy Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── EDIT 1 SINGLE ROLE MODAL ────────────────────────────────────── */}
          {singleEditingRoleKey && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Assign {getRoleLabel(singleEditingRoleKey, eventItem.event_type)}
                    </h3>
                    <p className="text-xs text-slate-500">Select a leader specifically for this role.</p>
                  </div>
                  <button onClick={() => setSingleEditingRoleKey(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveSingleRole} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Leader Assignment</label>
                    <select
                      value={singleSelectedProfileId}
                      onChange={(e) => setSingleSelectedProfileId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                    >
                      <option value="">-- Unassigned --</option>
                      {leaders.map((l) => (
                        <option key={l.id} value={l.id}>{l.fullName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setSingleEditingRoleKey(null)}
                      className="flex-1 py-2 border border-slate-300 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2 bg-teal-800 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow transition-colors"
                    >
                      {loading ? 'Saving…' : 'Save Role'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── TAB 2: SCOUT ROSTER & CONSENT ───────────────────────────────────── */}
          {activeTab === 'roster' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              {/* Header & Section Filter Pills */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Scout Participant Roster & Parent Consent</h3>
                  <p className="text-xs text-slate-500">Managed by Camp Secretary ({isCampSecretary ? 'You have edit access' : 'Read-only'}).</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Section / Troop Filter Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1"><Filter className="h-3.5 w-3.5" /> Unit:</span>
                    <button
                      onClick={() => setSectionFilter('all')}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${sectionFilter === 'all' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      All Sections
                    </button>

                    {troops.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSectionFilter(t.id)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${sectionFilter === t.id ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>

                  {isCampSecretary && (
                    <button
                      onClick={() => setIsEditRosterModalOpen(true)}
                      className="inline-flex items-center gap-1.5 bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add / Remove Scouts
                    </button>
                  )}
                </div>
              </div>

              {/* Roster Grouped by Troop / Section */}
              <div className="space-y-6">

                {participantsGroupedByTroop.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs italic">
                    No scout participants found for the selected section filter.
                  </div>
                ) : (
                  participantsGroupedByTroop.map((group) => (
                    <div key={group.troopName} className="border border-slate-200 rounded-xl overflow-hidden">
                      {/* Section Header Banner */}
                      <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
                        <span className="font-extrabold text-xs text-teal-900 uppercase tracking-wider flex items-center gap-2">
                          <Layers className="h-4 w-4 text-teal-700" />
                          Section Unit: {group.troopName} ({group.participants.length} Scouts)
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">
                          Present: {group.participants.filter((p) => p.attendance_status === 'present').length}
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {group.participants.map((p) => (
                          <div key={p.id} className="p-3.5 bg-white flex items-center justify-between gap-3 text-xs">
                            <div>
                              <p className="font-bold text-slate-900 text-sm">
                                {p.members?.first_name} {p.members?.last_name}
                              </p>
                              {p.members?.current_rank && p.members?.current_rank !== 'None' && (
                                <p className="text-[10px] text-slate-400 font-semibold">{p.members.current_rank}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              {/* Attendance Toggle Only */}
                              <div>
                                <button
                                  disabled={!isCampSecretary || updatingParticipantIds[p.id!]}
                                  onClick={() => updateParticipant(p.id!, { attendance_status: p.attendance_status === 'present' ? 'absent' : 'present' })}
                                  className={`px-4 py-1.5 rounded-lg font-bold border text-xs transition-colors inline-flex items-center gap-1.5 ${p.attendance_status === 'present' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                >
                                  {updatingParticipantIds[p.id!] ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      <span>Updating…</span>
                                    </>
                                  ) : p.attendance_status === 'present' ? (
                                    '✓ Attended'
                                  ) : (
                                    '✗ Absent'
                                  )}
                                </button>
                              </div>

                              {isCampSecretary && (
                                <button
                                  onClick={() => handleRemoveParticipant(p.id!)}
                                  className="text-slate-300 hover:text-rose-600 p-1 transition-colors self-end sm:self-center"
                                  title="Remove Scout from Event Roster"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── EDIT EVENT ROSTER MODAL ────────────────────────────────────── */}
          {isEditRosterModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Manage Event Roster</h3>
                    <p className="text-xs text-slate-500">Toggle scouts to add or remove them from this camp/event roster.</p>
                  </div>
                  <button onClick={() => setIsEditRosterModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 border-b border-slate-100">
                  <input
                    type="text"
                    placeholder="Search scout by name..."
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none"
                  />
                  <select
                    value={rosterTroopFilter}
                    onChange={(e) => setRosterTroopFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="all">All Group Sections</option>
                    {troops.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                {/* Scouts List with Checkboxes */}
                <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 p-2 bg-slate-50 space-y-1">
                  {filteredGroupMembers.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">No scouts match your search.</div>
                  ) : (
                    filteredGroupMembers.map((m) => {
                      const isEnrolled = currentParticipantMemberIds.has(m.id)
                      const troopName = troops.find((t) => t.id === m.troop_id)?.name
                      return (
                        <label
                          key={m.id}
                          className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isEnrolled ? 'bg-teal-50 border-teal-200 text-teal-900' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isEnrolled}
                              onChange={() => handleToggleMemberRoster(m)}
                              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                            />
                            <div>
                              <p className="font-bold text-sm">{m.first_name} {m.last_name}</p>
                              <p className="text-[10px] text-slate-400">Unit: {troopName || 'Unassigned'} {m.current_rank && `• ${m.current_rank}`}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isEnrolled ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            {isEnrolled ? '✓ In Roster' : '+ Excluded'}
                          </span>
                        </label>
                      )
                    })
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setIsEditRosterModalOpen(false)}
                    className="bg-teal-700 hover:bg-teal-600 text-white font-bold px-5 py-2 rounded-xl text-xs shadow"
                  >
                    Done Managing Roster
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 3: CAMP TREASURY & EXPENSES ─────────────────────────────────── */}
          {activeTab === 'treasury' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900">Camp Treasury & Categorized Expenses</h3>
                <p className="text-xs text-slate-500">Managed by Camp Treasurer ({isCampTreasurer ? 'You have edit access' : 'Read-only'}).</p>
              </div>

              {/* Financial Balance Summary (Mobile Friendly) */}
              {(() => {
                const scoutFees = (eventItem.event_participants || []).reduce((acc, p) => acc + (p.fee_paid || 0), 0)
                const otherIncome = (eventItem.event_expenses || [])
                  .filter((e) => (e.category && e.category.startsWith('income_')) || (e.description && e.description.startsWith('[INCOME')))
                  .reduce((acc, e) => acc + (e.amount || 0), 0)
                const totalIncome = scoutFees + otherIncome

                const totalExpenses = (eventItem.event_expenses || [])
                  .filter((e) => !(e.category && e.category.startsWith('income_')) && !(e.description && e.description.startsWith('[INCOME')))
                  .reduce((acc, e) => acc + (e.amount || 0), 0)

                const netBalance = totalIncome - totalExpenses

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                    <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl shadow-2xs">
                      <span className="block text-[11px] uppercase font-bold text-emerald-800 tracking-wider">Total Income (إيرادات)</span>
                      <span className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1 block">+${totalIncome}</span>
                    </div>
                    <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl shadow-2xs">
                      <span className="block text-[11px] uppercase font-bold text-rose-800 tracking-wider">Total Expenses (مصروفات)</span>
                      <span className="text-xl sm:text-2xl font-extrabold text-rose-700 mt-1 block">-${totalExpenses}</span>
                    </div>
                    <div className={`p-3.5 border rounded-2xl shadow-2xs ${netBalance >= 0 ? 'bg-teal-50 border-teal-100 text-teal-900' : 'bg-amber-50 border-amber-100 text-amber-900'}`}>
                      <span className="block text-[11px] uppercase font-bold tracking-wider">Net Camp Balance (صافي الصندوق)</span>
                      <span className="text-xl sm:text-2xl font-extrabold mt-1 block">
                        {netBalance >= 0 ? `+$${netBalance}` : `-$${Math.abs(netBalance)}`}
                      </span>
                    </div>
                  </div>
                )
              })()}

              {/* Participant Fee Collections & Scout Payments (Collapsible) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsFeeCollectionsOpen(!isFeeCollectionsOpen)}
                  className="w-full bg-slate-100 px-4 py-3 border-b border-slate-200 flex justify-between items-center text-left hover:bg-slate-150 transition-colors"
                >
                  <span className="font-extrabold text-xs text-teal-900 uppercase tracking-wider flex items-center gap-2">
                    <span>💵 Scout Fee Collections (${eventItem.participant_fee} / scout)</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      ({(eventItem.event_participants || []).filter((p) => p.fee_paid >= eventItem.participant_fee && eventItem.participant_fee > 0).length}/{(eventItem.event_participants || []).length} Paid)
                    </span>
                  </span>
                  <span className="text-xs font-bold text-teal-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    {isFeeCollectionsOpen ? '▲ Hide List' : '▼ Expand Collections'}
                  </span>
                </button>

                {isFeeCollectionsOpen && (
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {(eventItem.event_participants || []).length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">No scouts enrolled in this event roster.</div>
                    ) : (
                      (eventItem.event_participants || []).map((p) => {
                        const isFullyPaid = p.fee_paid >= eventItem.participant_fee && eventItem.participant_fee > 0
                        const isPartial = p.fee_paid > 0 && !isFullyPaid

                        return (
                          <div key={p.id} className="p-3 bg-white flex items-center justify-between gap-3 text-xs">
                            <div>
                              <p className="font-bold text-slate-900 text-sm">
                                {p.members?.first_name} {p.members?.last_name}
                              </p>
                              {p.members?.current_rank && (
                                <p className="text-[10px] text-slate-400 font-semibold">{p.members.current_rank}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${isFullyPaid ? 'bg-emerald-100 text-emerald-800' : isPartial ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                                {isFullyPaid ? 'Paid' : isPartial ? 'Partial' : 'Unpaid'}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400 font-bold">$</span>
                                <input
                                  disabled={!isCampTreasurer}
                                  type="number"
                                  value={p.fee_paid}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0
                                    const status = val >= eventItem.participant_fee ? 'paid' : (val > 0 ? 'partial' : 'unpaid')
                                    updateParticipant(p.id!, { fee_paid: val, payment_status: status })
                                  }}
                                  className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Log Income / Expense Button */}
              {isCampTreasurer && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsLogTransactionModalOpen(true)}
                    className="inline-flex items-center gap-2 bg-teal-800 hover:bg-teal-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow transition-all"
                  >
                    <Plus className="h-4 w-4" /> Log Income / Expense (إضافة إيراد أو مصروف)
                  </button>
                </div>
              )}

              {/* Expenses Table */}
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                <div className="bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-500 uppercase flex justify-between">
                  <span>Category & Description</span>
                  <span>Amount ($)</span>
                </div>
                {(eventItem.event_expenses || []).length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">No financial transactions logged yet.</div>
                ) : (
                  (eventItem.event_expenses || []).map((exp) => {
                    const isIncome = (exp.category && exp.category.startsWith('income_')) || (exp.description && exp.description.startsWith('[INCOME'))
                    return (
                      <div key={exp.id} className="p-3.5 bg-white flex items-center justify-between text-xs gap-3">
                        <div className="min-w-0">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase mr-2.5 ${isIncome ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                            {isIncome ? '🟢 Income' : exp.category}
                          </span>
                          <span className="font-semibold text-slate-900 truncate">{exp.description}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`font-extrabold text-sm ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isIncome ? `+$${exp.amount}` : `-$${exp.amount}`}
                          </span>
                          {isCampTreasurer && (
                            <button onClick={() => handleDeleteExpense(exp.id!)} className="text-slate-400 hover:text-rose-600">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* ── TAB 4: DOCUMENTS REPOSITORY ─────────────────────────────────────── */}
          {activeTab === 'documents' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900">Documents & Event Attachments</h3>
                <p className="text-xs text-slate-500">Store and access location maps, permission slips, program schedules, and official files.</p>
              </div>

              <form onSubmit={handleAddDocument} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <UploadCloud className="h-4 w-4 text-teal-700" />
                  Upload & Attach Document / Google Drive Link
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Document Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Camp Schedule PDF / Consent Forms"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Upload File from Device</label>
                    <input
                      type="file"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) {
                          setSelectedFile(f)
                          if (!docTitle) setDocTitle(f.name.replace(/\.[^/.]+$/, ''))
                        }
                      }}
                      className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-teal-800 hover:file:bg-teal-100 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Or Paste Google Drive / External URL Link</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://drive.google.com/file/d/..."
                      value={docUrl}
                      onChange={(e) => setDocUrl(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-teal-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isUploadingFile}
                      className="bg-teal-700 hover:bg-teal-600 text-white font-bold px-4 py-2 rounded-lg text-xs shrink-0 shadow disabled:bg-slate-300 transition-colors flex items-center gap-1.5"
                    >
                      {isUploadingFile ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Uploading…</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          <span>Attach Document</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                {(eventItem.event_documents || []).length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">No documents attached to this event yet.</div>
                ) : (
                  (eventItem.event_documents || []).map((doc) => (
                    <div key={doc.id} className="p-4 bg-white flex items-center justify-between gap-3 text-xs hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-teal-50 text-teal-800 shrink-0">
                          <Paperclip className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 text-sm truncate block">{doc.title}</span>
                          <span className="text-[10px] text-slate-400 truncate block">{doc.file_url}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 font-bold text-teal-800 bg-teal-50 px-3 py-1.5 rounded-lg hover:bg-teal-100 transition-colors"
                        >
                          Open File <ExternalLink className="h-3.5 w-3.5" />
                        </a>

                        {isCampSecretary && doc.id && (
                          <button
                            type="button"
                            onClick={() => doc.id && handleDeleteDocument(doc.id)}
                            className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors"
                            title="Delete Document"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── EDIT EVENT DETAILS MODAL ──────────────────────────────────── */}
          {isEditEventModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl max-w-xl w-full p-4 sm:p-6 space-y-4 shadow-2xl max-h-[88vh] overflow-y-auto my-auto">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">Edit Event / Camp Details</h3>
                  <button onClick={() => setIsEditEventModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveEventDetails} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Event Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      required
                      className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Description</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={2}
                      className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Event Type</label>
                      <select
                        value={editEventType}
                        onChange={(e) => setEditEventType(e.target.value)}
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
                        value={editScope}
                        onChange={(e) => setEditScope(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                      >
                        <option value="group">Full Group Event (لكل الفوج)</option>
                        <option value="troop">Troop Specific Event (نشاط فرقة)</option>
                      </select>
                    </div>
                  </div>

                  {editScope === 'troop' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Target Troop Unit</label>
                      <select
                        value={editTargetTroopId}
                        onChange={(e) => setEditTargetTroopId(e.target.value)}
                        required={editScope === 'troop'}
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
                        value={editStartTime}
                        onChange={(e) => setEditStartTime(e.target.value)}
                        required
                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">End Time</label>
                      <input
                        type="datetime-local"
                        value={editEndTime}
                        onChange={(e) => setEditEndTime(e.target.value)}
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
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Participant Fee ($)</label>
                      <input
                        type="number"
                        value={editParticipantFee}
                        onChange={(e) => setEditParticipantFee(e.target.value)}
                        min="0"
                        step="1"
                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsEditEventModalOpen(false)}
                      className="flex-1 py-2 border border-slate-300 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-xl text-xs font-bold shadow disabled:bg-slate-300 transition-colors"
                    >
                      {loading ? 'Saving Changes…' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── LOG TRANSACTION MODAL (Income vs Expense) ────────────────────── */}
          {isLogTransactionModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Log Financial Transaction</h3>
                    <p className="text-xs text-slate-500">Log incoming money or outgoing expenses for this event.</p>
                  </div>
                  <button onClick={() => setIsLogTransactionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    handleAddExpense(e)
                    setIsLogTransactionModalOpen(false)
                  }}
                  className="space-y-4 text-xs"
                >
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl font-bold">
                    <button
                      type="button"
                      onClick={() => setTransactionType('expense')}
                      className={`py-2 rounded-lg transition-colors ${transactionType === 'expense' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'}`}
                    >
                      🔻 Expense (مصروفات)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransactionType('income')}
                      className={`py-2 rounded-lg transition-colors ${transactionType === 'income' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'}`}
                    >
                      🟢 Income (إيرادات / دخل)
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method / Source</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none"
                    >
                      <option value="cash">💵 Cash (نقداً)</option>
                      <option value="wish">📱 Wish Money (Wish)</option>
                      <option value="omt">🏦 OMT</option>
                      <option value="bank">🏛️ Bank Transfer (تحويل بنكي)</option>
                      <option value="donation">🎁 External Donation (تبرع غريب)</option>
                      <option value="fees">🎟️ Scout Roster Fees (اشتراكات الأفراد)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      value={expCategory}
                      onChange={(e) => setExpCategory(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none"
                    >
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bus transportation, Food purchase, Wish transfer"
                      value={expDesc}
                      onChange={(e) => setExpDesc(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Amount ($ USD)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsLogTransactionModalOpen(false)}
                      className="flex-1 py-2 border border-slate-300 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-teal-800 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow transition-colors"
                    >
                      Log Transaction
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
    </DashboardShell>
  )
}
