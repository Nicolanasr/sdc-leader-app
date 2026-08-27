'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Menu, X, Plus, Search, Eye, Edit, Trash2, Calendar, Heart, ShieldAlert, Award } from 'lucide-react'
import DashboardSidebar from '../DashboardSidebar'

interface Member {
    id: string
    first_name: string
    last_name: string
    birth_date: string | null
    blood_type: string | null
    medical_info: string | null
    emergency_contact_name: string
    emergency_contact_relation: string
    emergency_contact_phone: string
    emergency_contacts?: { name: string; relation: string; phone: string }[] | null
    photo_url: string | null
    promise_date: string | null
    current_rank: string | null
    patrol_role: string | null
    group_id: string
    troop_id: string
    patrol_id: string | null
    is_active: boolean
    troops: any
    patrols: any
    member_phone?: string | null
    school?: string | null
    hobbies?: string | null
    father_name?: string | null
    father_blood_type?: string | null
    father_birth_date?: string | null
    father_phone?: string | null
    father_job?: string | null
    mother_name?: string | null
    mother_blood_type?: string | null
    mother_birth_date?: string | null
    mother_phone?: string | null
    mother_job?: string | null
    address?: string | null
    registry_place?: string | null
    registry_number?: string | null
    join_date?: string | null
}

const getRanksForSection = (sectionName: string): string[] => {
    const norm = (sectionName || '').toLowerCase()
    if (norm === 'jaramiz') {
        return ['None', 'mse3ed sadous', 'sadous', 'sadous awwal']
    }
    if (norm === 'zaharat') {
        return ['None', 'mse3det ra2iset ba2a', 'ra2iset ba2a', 'ra2iset rou2asa bakat']
    }
    if (norm === 'kechefe' || norm === 'mourchidet') {
        return ['None', 'mse3e 3arif(e)', '3arif(e)', '3arif awwal']
    }
    if (norm === 'jouwele' || norm === 'mounjidet') {
        return ['None', 'mse3ed ra2ed rahet', 'ra2ed rahet', 'ra2ed akbar', 'mou3ewen']
    }
    return ['None', 'mse3e 3arif(e)', '3arif(e)', '3arif awwal']
}

interface Troop {
    id: string
    name: string
    sectionName: string
}

interface Patrol {
    id: string
    name: string
    troop_id: string
}

interface HistoryLog {
    id: string
    member_id: string
    event_type: string
    old_value: string
    new_value: string
    created_at: string
}

interface Props {
    initialMembers: Member[]
    troops: Troop[]
    patrols: Patrol[]
    historyMap: Record<string, HistoryLog[]>
    groupName: string
    groupId: string
    currentRole: string
    userTroopId: string | null
    userName?: string
}

export default function MembersManagement({
    initialMembers,
    troops,
    patrols,
    historyMap,
    groupName,
    groupId,
    currentRole,
    userTroopId,
    userName,
}: Props) {
    const router = useRouter()
    const supabase = createClient()

    // Layout navigation controls
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const [members, setMembers] = useState<Member[]>(initialMembers)

    // UI filter controls
    const [searchQuery, setSearchQuery] = useState('')
    const [troopFilter, setTroopFilter] = useState('')
    const [rankFilter, setRankFilter] = useState('')

    // Details drawer controls
    const [selectedMember, setSelectedMember] = useState<Member | null>(null)

    // Add/Edit modal controls
    const [showModal, setShowModal] = useState(false)
    const [isEdit, setIsEdit] = useState(false)
    const [editMemberId, setEditMemberId] = useState<string | null>(null)

    // Onboarding / Form fields state
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [birthDate, setBirthDate] = useState('')
    const [bloodType, setBloodType] = useState('O+')
    const [medicalInfo, setMedicalInfo] = useState('')
    const [emergencyName, setEmergencyName] = useState('')
    const [emergencyRelation, setEmergencyRelation] = useState('')
    const [emergencyPhone, setEmergencyPhone] = useState('')
    const [promiseDate, setPromiseDate] = useState('')
    const [currentRank, setCurrentRank] = useState('Jaramiz')
    const [patrolRole, setPatrolRole] = useState('')
    const [selectedTroopId, setSelectedTroopId] = useState('')
    const [selectedPatrolId, setSelectedPatrolId] = useState('')
    const [isActive, setIsActive] = useState(true)

    // Patrol Creation Modal states
    const [showPatrolModal, setShowPatrolModal] = useState(false)
    const [newPatrolName, setNewPatrolName] = useState('')
    const [newPatrolTroopId, setNewPatrolTroopId] = useState('')

    // Manual History Log fields state
    const [historyType, setHistoryType] = useState('rank_change')
    const [historyDescription, setHistoryDescription] = useState('')
    const [historyDate, setHistoryDate] = useState('')

    // Editing an existing history log entry
    const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null)

    // Local mutable copy of historyMap so changes within the modal are reflected immediately
    const [localHistoryMap, setLocalHistoryMap] = useState<Record<string, HistoryLog[]>>(historyMap)

    // Status/Loading states
    const [loading, setLoading] = useState(false)
    const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

    const showStatus = (text: string, type: 'success' | 'error') => {
        setStatusMessage({ text, type })
        setTimeout(() => setStatusMessage(null), 6000)
    }

    // Determine permissions
    const isTroopLeader = currentRole === 'ka2ed_fer2a' || currentRole === 'mouse3ed_ka2ed_fer2a'
    const canWrite = currentRole === 'chef_groupe' || currentRole === 'assistant_chef_groupe' || currentRole === 'amin_serr_group' || isTroopLeader

    // Toggle sidebar list
    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    // Filter patrols cascadingly
    const activeTroopIdForForms = isTroopLeader ? (userTroopId || '') : selectedTroopId
    const availablePatrolsForForms = patrols.filter((p) => p.troop_id === activeTroopIdForForms)

    // Filter ranks dynamically based on troop unit section
    const selectedTroopObj = troops.find((t) => t.id === activeTroopIdForForms)
    const availableRanksForForms = getRanksForSection(selectedTroopObj?.sectionName || '')

    // Open creation modal
  // Emergency Contacts state
  const [emergencyContacts, setEmergencyContacts] = useState<{ name: string; relation: string; phone: string }[]>([
    { name: '', relation: '', phone: '' },
  ])

  const addEmergencyContactField = () => {
    setEmergencyContacts((prev) => [...prev, { name: '', relation: '', phone: '' }])
  }

  const removeEmergencyContactField = (index: number) => {
    setEmergencyContacts((prev) => prev.filter((_, i) => i !== index))
  }

  const updateEmergencyContactField = (index: number, field: 'name' | 'relation' | 'phone', value: string) => {
    setEmergencyContacts((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  // Open add modal
  const openAddModal = () => {
    setIsEdit(false)
    setEditMemberId(null)

    // Clear inputs
    setFirstName('')
    setLastName('')
    setBirthDate('')
    setBloodType('O+')
    setMedicalInfo('')
    setEmergencyName('')
    setEmergencyRelation('')
    setEmergencyPhone('')
    setEmergencyContacts([{ name: '', relation: '', phone: '' }])
    setPromiseDate('')

    const initialTroopId = isTroopLeader ? (userTroopId || '') : troops[0]?.id || ''
    setSelectedTroopId(initialTroopId)
    setSelectedPatrolId('')

    const initialTroopObj = troops.find((t) => t.id === initialTroopId)
    const initialRanks = getRanksForSection(initialTroopObj?.sectionName || '')
    setCurrentRank(initialRanks[0] || 'mse3e 3arif(e)')

    setPatrolRole('')
    setIsActive(true)

    // Reset manual history inputs
    setHistoryType('rank_change')
    setHistoryDescription('')
    setHistoryDate('')
    setEditingHistoryId(null)

    setShowModal(true)
  }

  // Open edit modal
  const openEditModal = (m: Member) => {
    setIsEdit(true)
    setEditMemberId(m.id)

    setFirstName(m.first_name)
    setLastName(m.last_name)
    setBirthDate(m.birth_date || '')
    setBloodType(m.blood_type || 'O+')
    setMedicalInfo(m.medical_info || '')
    setEmergencyName(m.emergency_contact_name || '')
    setEmergencyRelation(m.emergency_contact_relation || '')
    setEmergencyPhone(m.emergency_contact_phone || '')
    
    if (m.emergency_contacts && Array.isArray(m.emergency_contacts) && m.emergency_contacts.length > 0) {
      setEmergencyContacts(m.emergency_contacts)
    } else if (m.emergency_contact_name || m.emergency_contact_phone) {
      setEmergencyContacts([
        {
          name: m.emergency_contact_name || '',
          relation: m.emergency_contact_relation || '',
          phone: m.emergency_contact_phone || '',
        },
      ])
    } else {
      setEmergencyContacts([{ name: '', relation: '', phone: '' }])
    }

    setPromiseDate(m.promise_date || '')
    setCurrentRank(m.current_rank || 'Jaramiz')
    setPatrolRole(m.patrol_role || '')
    setSelectedTroopId(m.troop_id)
    setSelectedPatrolId(m.patrol_id || '')
    setIsActive(m.is_active)

    // Reset manual history inputs
    setHistoryType('rank_change')
    setHistoryDescription('')
    setHistoryDate('')
    setEditingHistoryId(null)

    setShowModal(true)
  }

  // Submit add/edit form
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault()
    const primaryContact = emergencyContacts[0] || { name: '', relation: '', phone: '' }
    const validContacts = emergencyContacts.filter((c) => c.name || c.phone)

    if (!firstName || !lastName || (!primaryContact.name && !emergencyName)) {
      return showStatus('Please fill in Scout Name and at least one Emergency Contact.', 'error')
    }

    const targetTroop = isTroopLeader ? userTroopId : selectedTroopId
    if (!targetTroop) {
      return showStatus('Please select a target Troop unit.', 'error')
    }

    setLoading(true)
    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      birth_date: birthDate || null,
      blood_type: bloodType,
      medical_info: medicalInfo || null,
      emergency_contact_name: (primaryContact.name || emergencyName).trim(),
      emergency_contact_relation: (primaryContact.relation || emergencyRelation).trim(),
      emergency_contact_phone: (primaryContact.phone || emergencyPhone).trim(),
      emergency_contacts: validContacts.length > 0 ? validContacts : [primaryContact],
      promise_date: promiseDate || null,
      current_rank: currentRank,
      patrol_role: patrolRole || null,
      group_id: groupId,
      troop_id: targetTroop,
      patrol_id: selectedPatrolId || null,
      is_active: isActive,
    }

        let savedMemberId = editMemberId
        let dbError = null

        if (isEdit && editMemberId) {
            // Update
            const { error } = await supabase
                .from('members')
                .update(payload)
                .eq('id', editMemberId)
            dbError = error
        } else {
            // Insert & select the new row's ID
            const { data, error } = await supabase
                .from('members')
                .insert(payload)
                .select('id')
                .single()

            dbError = error
            if (data) {
                savedMemberId = data.id
            }
        }

        if (dbError) {
            setLoading(false)
            return showStatus(dbError.message, 'error')
        }

        // If the user provided a manual historical milestone, insert it now
        if (savedMemberId && historyDescription.trim()) {
            const { error: histError } = await supabase
                .from('member_history')
                .insert({
                    member_id: savedMemberId,
                    event_type: historyType,
                    old_value: 'Manual Entry',
                    new_value: historyDescription.trim(),
                    created_at: historyDate ? new Date(historyDate).toISOString() : new Date().toISOString(),
                })

            if (histError) {
                console.error('Failed to save historical milestone:', histError)
            }
        }

        setLoading(false)
        setShowModal(false)
        showStatus(
            isEdit ? 'Scout profile updated successfully!' : 'Scout registered successfully!',
            'success'
        )
        router.refresh()
    }

    // Submit new patrol creation
    const handleCreatePatrol = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newPatrolName.trim()) {
            return showStatus('Please enter a patrol name.', 'error')
        }

        const targetTroop = isTroopLeader ? userTroopId : newPatrolTroopId
        if (!targetTroop) {
            return showStatus('Please select a target Troop unit.', 'error')
        }

        setLoading(true)
        const { error } = await supabase
            .from('patrols')
            .insert({
                name: newPatrolName.trim(),
                troop_id: targetTroop,
            })

        setLoading(false)
        if (error) {
            showStatus(error.message, 'error')
        } else {
            setNewPatrolName('')
            setNewPatrolTroopId('')
            setShowPatrolModal(false)
            showStatus('New patrol created successfully!', 'success')
            router.refresh()
        }
    }

    // Save (create or update) a history log entry from within the modal
    const handleSaveHistoryLog = async () => {
        if (!historyDescription.trim() || !editMemberId) return

        setLoading(true)
        if (editingHistoryId) {
            // Update existing entry
            const { error } = await supabase
                .from('member_history')
                .update({
                    event_type: historyType,
                    new_value: historyDescription.trim(),
                    created_at: historyDate ? new Date(historyDate).toISOString() : undefined,
                })
                .eq('id', editingHistoryId)

            if (!error) {
                setLocalHistoryMap((prev) => ({
                    ...prev,
                    [editMemberId]: (prev[editMemberId] || []).map((l) =>
                        l.id === editingHistoryId
                            ? {
                                ...l,
                                event_type: historyType,
                                new_value: historyDescription.trim(),
                                created_at: historyDate ? new Date(historyDate).toISOString() : l.created_at,
                            }
                            : l
                    ),
                }))
                showStatus('Milestone updated.', 'success')
            } else {
                showStatus(error.message, 'error')
            }
        } else {
            // Create new entry
            const { data, error } = await supabase
                .from('member_history')
                .insert({
                    member_id: editMemberId,
                    event_type: historyType,
                    old_value: 'Manual Entry',
                    new_value: historyDescription.trim(),
                    created_at: historyDate ? new Date(historyDate).toISOString() : new Date().toISOString(),
                })
                .select()
                .single()

            if (!error && data) {
                setLocalHistoryMap((prev) => ({
                    ...prev,
                    [editMemberId]: [...(prev[editMemberId] || []), data],
                }))
                showStatus('Milestone added.', 'success')
            } else if (error) {
                showStatus(error.message, 'error')
            }
        }

        // Reset form
        setHistoryType('rank_change')
        setHistoryDescription('')
        setHistoryDate('')
        setEditingHistoryId(null)
        setLoading(false)
    }

    // Delete a history log entry
    const handleDeleteHistoryLog = async (logId: string, memberId: string) => {
        if (!confirm('Delete this milestone log entry?')) return

        setLoading(true)
        const { error } = await supabase.from('member_history').delete().eq('id', logId)
        setLoading(false)

        if (error) {
            showStatus(error.message, 'error')
        } else {
            setLocalHistoryMap((prev) => ({
                ...prev,
                [memberId]: (prev[memberId] || []).filter((l) => l.id !== logId),
            }))
            showStatus('Milestone deleted.', 'success')
        }
    }

    // Delete Member (Soft Delete)
    const handleDeleteMember = async (id: string) => {
        if (!confirm('Are you sure you want to delete this scout?')) return

        setLoading(true)
        const { error } = await supabase
            .from('members')
            .update({ is_deleted: true })
            .eq('id', id)

        setLoading(false)
        if (error) {
            showStatus(error.message, 'error')
        } else {
            setSelectedMember(null)
            showStatus('Scout profile removed.', 'success')
            router.refresh()
        }
    }

    // Friendly log text formatter
    const formatHistoryLog = (log: HistoryLog) => {
        const time = new Date(log.created_at).toLocaleDateString()
        switch (log.event_type) {
            case 'rank_change':
                return `Promoted Rank from ${log.old_value} to ${log.new_value} (on ${time})`
            case 'troop_change':
                return `Transferred Section Unit from ${log.old_value} to ${log.new_value} (on ${time})`
            case 'patrol_change':
                return `Transferred Patrol from ${log.old_value} to ${log.new_value} (on ${time})`
            case 'promise_date_change':
                return `Scout Promise Date set to ${log.new_value} (on ${time})`
            case 'status_change':
                return `Account Status changed to ${log.new_value} (on ${time})`
            default:
                return `Updated member details (on ${time})`
        }
    }

    // Filter list in UI
    const filteredMembers = members.filter((m) => {
        const full = `${m.first_name} ${m.last_name}`.toLowerCase()
        const queryMatch = full.includes(searchQuery.toLowerCase()) || m.current_rank?.toLowerCase().includes(searchQuery.toLowerCase())
        const troopMatch = !troopFilter || m.troop_id === troopFilter
        const rankMatch = !rankFilter || m.current_rank === rankFilter
        return queryMatch && troopMatch && rankMatch
    })

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden relative">
            {/* Mobile Menu Backdrop */}
            {isMobileOpen && (
                <div
                    onClick={() => setIsMobileOpen(false)}
                    className="fixed inset-0 z-30 bg-black/40 md:hidden transition-opacity"
                />
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

            {/* Main dashboard content */}
            <main className="flex-1 overflow-y-auto flex flex-col">
                {/* Header toolbar for Mobile */}
                <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between md:justify-end">
                    <button className="md:hidden text-teal-900 p-1 focus:outline-none" onClick={() => setIsMobileOpen(true)}>
                        <Menu className="h-6 w-6" />
                    </button>
                    <div className="text-right">
                        <span className="text-xs text-slate-400 font-semibold block uppercase">Logged in as</span>
                        <span className="text-sm font-bold text-teal-700">{userName || currentRole.replace(/_/g, ' ')}</span>
                    </div>
                </header>

                <div className="px-3 sm:px-6 py-4 flex-1 flex flex-col space-y-4">
                    {statusMessage && (
                        <div
                            className={`p-3.5 rounded-xl border text-sm text-center ${statusMessage.type === 'success'
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                                    : 'bg-rose-50 border-rose-100 text-rose-800'
                                }`}
                        >
                            {statusMessage.text}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Youth Roster</h2>
                            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                                View dynamic promotions, promise records, and scout details in {groupName}.
                            </p>
                        </div>
                        {canWrite && (
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button
                                    onClick={() => {
                                        setNewPatrolName('')
                                        setNewPatrolTroopId(isTroopLeader ? (userTroopId || '') : troops[0]?.id || '')
                                        setShowPatrolModal(true)
                                    }}
                                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-3 py-2 rounded-xl border border-slate-350 transition-colors text-xs"
                                >
                                    <Plus className="h-4 w-4" />
                                    Create Patrol
                                </button>
                                <button
                                    onClick={openAddModal}
                                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-teal-700 hover:bg-teal-600 text-white font-semibold px-3.5 py-2 rounded-xl shadow-sm transition-colors text-xs"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Scout
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Filters Bar */}
                    <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-xl shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
                        <div className="relative w-full sm:max-w-xs">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 w-full rounded-lg border border-slate-200 bg-white text-xs sm:text-sm focus:border-teal-500 focus:outline-none"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                            {!isTroopLeader && (
                                <select
                                    value={troopFilter}
                                    onChange={(e) => setTroopFilter(e.target.value)}
                                    className="rounded-lg border border-slate-200 bg-white text-xs sm:text-sm px-3 py-2 text-slate-700"
                                >
                                    <option value="">-- All Unit Troops --</option>
                                    {troops.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <select
                                value={rankFilter}
                                onChange={(e) => setRankFilter(e.target.value)}
                                className="rounded-lg border border-slate-200 bg-white text-xs sm:text-sm px-3 py-2 text-slate-700"
                            >
                                <option value="">-- All Ranks --</option>
                                <option value="Jaramiz">Jaramiz</option>
                                <option value="Zaharat">Zaharat</option>
                                <option value="Kechefe">Kechefe</option>
                                <option value="Rovers">Rovers</option>
                            </select>
                        </div>
                    </div>

                    {/* Table Roster Directory */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[500px]">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                                        <th className="px-4 py-3">Scout Name</th>
                                        <th className="px-4 py-3">Rank</th>
                                        <th className="px-4 py-3">Assigned Unit</th>
                                        <th className="px-4 py-3">Patrol Group</th>
                                        <th className="px-4 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm text-slate-700">
                                    {filteredMembers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                                                No scouts matching criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredMembers.map((member) => {
                                            const getNestedName = (val: any) => {
                                                if (!val) return null
                                                if (Array.isArray(val)) return val[0]?.name || null
                                                return val.name || null
                                            }
                                            const troopName = getNestedName(member.troops)
                                            const patrolName = getNestedName(member.patrols)
                                            return (
                                                <tr key={member.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => setSelectedMember(member)}>
                                                    <td className="px-4 py-3">
                                                        <span className="font-bold text-slate-900 block">{member.first_name} {member.last_name}</span>
                                                        <span className={`text-[10px] font-semibold mt-0.5 inline-block px-1.5 py-0.5 rounded ${member.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>
                                                            {member.is_active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-semibold text-teal-800">
                                                        {member.current_rank || 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs">
                                                        {troopName || 'Global (General)'}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-500">
                                                        {patrolName || 'None'}
                                                        {member.patrol_role && (
                                                            <span className="text-[10px] block text-slate-400 font-medium">({member.patrol_role})</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex gap-1.5 justify-end">
                                                            <button
                                                                onClick={() => setSelectedMember(member)}
                                                                className="p-1 hover:text-teal-700 text-slate-400"
                                                                title="View Scout Profile"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </button>
                                                            {canWrite && (
                                                                <>
                                                                    <button
                                                                        onClick={() => openEditModal(member)}
                                                                        className="p-1 hover:text-amber-700 text-slate-400"
                                                                        title="Edit Scout Details"
                                                                    >
                                                                        <Edit className="h-4 w-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteMember(member.id)}
                                                                        className="p-1 hover:text-rose-700 text-slate-400"
                                                                        title="Delete Scout"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Centered Member Profile Detail Modal */}
                    {selectedMember && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
                            <div className="bg-white w-full max-w-xl p-5 sm:p-6 rounded-2xl shadow-2xl space-y-5 max-h-[88vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-150 my-auto">
                                <button
                                    onClick={() => setSelectedMember(null)}
                                    className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>

                                <div>
                                    <h3 className="text-xl font-extrabold text-slate-900">{selectedMember.first_name} {selectedMember.last_name}</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">Scout Registration ID: {selectedMember.id}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <span className="block text-slate-400 uppercase font-bold text-[10px]">Blood Type</span>
                                        <span className="font-extrabold text-rose-600 text-sm mt-0.5 flex items-center gap-1">
                                            <Heart className="h-4 w-4 fill-rose-600" />
                                            {selectedMember.blood_type || 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-slate-400 uppercase font-bold text-[10px]">Birth Date</span>
                                        <span className="font-extrabold text-slate-800 text-sm mt-0.5 block">{selectedMember.birth_date || 'N/A'}</span>
                                    </div>
                                </div>

                                {selectedMember.medical_info && (
                                    <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-xl">
                                        <span className="block text-[10px] text-rose-800 uppercase font-bold tracking-wider flex items-center gap-1.5 mb-1">
                                            <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                                            Medical Constraints
                                        </span>
                                        <p className="text-xs text-rose-900 font-medium leading-relaxed">{selectedMember.medical_info}</p>
                                    </div>
                                )}

                                {/* Multiple Emergency Contacts Display */}
                                <div className="border-t border-slate-100 pt-4 space-y-2">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Emergency Contacts</h4>
                                    <div className="space-y-2">
                                        {((selectedMember.emergency_contacts && selectedMember.emergency_contacts.length > 0)
                                            ? selectedMember.emergency_contacts
                                            : [{ name: selectedMember.emergency_contact_name, relation: selectedMember.emergency_contact_relation, phone: selectedMember.emergency_contact_phone }]
                                        ).map((c: any, i: number) => (
                                            <div key={i} className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs flex items-center justify-between gap-2">
                                                <div>
                                                    <span className="font-bold text-slate-900 block">{c.name || 'Emergency Contact'}</span>
                                                    <span className="text-[11px] text-slate-500 font-medium">{c.relation || 'Contact'}</span>
                                                </div>
                                                {c.phone && (
                                                    <a
                                                        href={`tel:${c.phone}`}
                                                        className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1"
                                                    >
                                                        📞 {c.phone}
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Additional Family & Scout Information */}
                                <div className="border-t border-slate-100 pt-4 space-y-2">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Family & Personal Info</h4>
                                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs space-y-2">
                                        {selectedMember.member_phone && (
                                            <div className="flex justify-between"><span className="text-slate-500">Member Phone:</span><span className="font-semibold text-slate-800">{selectedMember.member_phone}</span></div>
                                        )}
                                        {selectedMember.school && (
                                            <div className="flex justify-between"><span className="text-slate-500">School / Uni:</span><span className="font-semibold text-slate-800">{selectedMember.school}</span></div>
                                        )}
                                        {selectedMember.hobbies && (
                                            <div className="flex justify-between"><span className="text-slate-500">Hobbies:</span><span className="font-semibold text-slate-800">{selectedMember.hobbies}</span></div>
                                        )}
                                        {selectedMember.address && (
                                            <div className="flex justify-between"><span className="text-slate-500">Address:</span><span className="font-semibold text-slate-800">{selectedMember.address}</span></div>
                                        )}
                                        {selectedMember.registry_place && (
                                            <div className="flex justify-between"><span className="text-slate-500">Origin / Nafous:</span><span className="font-semibold text-slate-800">{selectedMember.registry_place} {selectedMember.registry_number ? `(Record #${selectedMember.registry_number})` : ''}</span></div>
                                        )}
                                        {selectedMember.join_date && (
                                            <div className="flex justify-between"><span className="text-slate-500">Scout Join Date:</span><span className="font-semibold text-slate-800">{selectedMember.join_date}</span></div>
                                        )}
                                        {(selectedMember.father_name || selectedMember.father_phone) && (
                                            <div className="pt-2 border-t border-slate-200">
                                                <p className="font-bold text-teal-800 mb-1">Father Information</p>
                                                {selectedMember.father_name && <p><span className="text-slate-500">Name:</span> <span className="font-medium">{selectedMember.father_name}</span> {selectedMember.father_blood_type ? `(${selectedMember.father_blood_type})` : ''}</p>}
                                                {selectedMember.father_phone && <p><span className="text-slate-500">Phone:</span> <span className="font-medium">{selectedMember.father_phone}</span></p>}
                                                {selectedMember.father_job && <p><span className="text-slate-500">Occupation:</span> <span className="font-medium">{selectedMember.father_job}</span></p>}
                                            </div>
                                        )}
                                        {(selectedMember.mother_name || selectedMember.mother_phone) && (
                                            <div className="pt-2 border-t border-slate-200">
                                                <p className="font-bold text-teal-800 mb-1">Mother Information</p>
                                                {selectedMember.mother_name && <p><span className="text-slate-500">Name:</span> <span className="font-medium">{selectedMember.mother_name}</span> {selectedMember.mother_blood_type ? `(${selectedMember.mother_blood_type})` : ''}</p>}
                                                {selectedMember.mother_phone && <p><span className="text-slate-500">Phone:</span> <span className="font-medium">{selectedMember.mother_phone}</span></p>}
                                                {selectedMember.mother_job && <p><span className="text-slate-500">Occupation:</span> <span className="font-medium">{selectedMember.mother_job}</span></p>}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Audit History Timeline */}
                                <div className="border-t border-slate-100 pt-4">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Promotion Log & Timeline</h4>
                                    <div className="space-y-3">
                                        {selectedMember.promise_date && (
                                            <div className="flex gap-3 text-xs items-start">
                                                <div className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mt-0.5 shrink-0">
                                                    ✓
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">Scout Promise Taken</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">Promise Date: {selectedMember.promise_date}</p>
                                                </div>
                                            </div>
                                        )}

                                        {(historyMap[selectedMember.id] || []).length === 0 ? (
                                            <p className="text-xs text-slate-400 italic">No promotions logged yet.</p>
                                        ) : (
                                            (historyMap[selectedMember.id] || []).map((log) => (
                                                <div key={log.id} className="flex gap-3 text-xs items-start">
                                                    <div className="h-6 w-6 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 mt-0.5 shrink-0">
                                                        <Award className="h-3.5 w-3.5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-700 leading-normal">{formatHistoryLog(log)}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-slate-100">
                                    <button
                                        onClick={() => setSelectedMember(null)}
                                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                                    >
                                        Close Profile
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Add / Edit Modal Drawer */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white w-full max-w-2xl p-4 sm:p-6 border border-slate-200 rounded-2xl shadow-xl space-y-4 max-h-[88vh] overflow-y-auto my-auto">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900">
                                {isEdit ? 'Modify Scout Profile' : 'Register New Scout'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveMember} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">First Name</label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                        placeholder="e.g. Peter"
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Last Name</label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                        placeholder="e.g. Pan"
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Birth Date</label>
                                    <input
                                        type="date"
                                        value={birthDate}
                                        onChange={(e) => setBirthDate(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Blood Type</label>
                                    <select
                                        value={bloodType}
                                        onChange={(e) => setBloodType(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none sm:text-sm"
                                    >
                                        <option value="A+">A+</option>
                                        <option value="A-">A-</option>
                                        <option value="B+">B+</option>
                                        <option value="B-">B-</option>
                                        <option value="AB+">AB+</option>
                                        <option value="AB-">AB-</option>
                                        <option value="O+">O+</option>
                                        <option value="O-">O-</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Current Rank</label>
                                    <select
                                        value={currentRank}
                                        onChange={(e) => setCurrentRank(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none sm:text-sm"
                                    >
                                        {availableRanksForForms.map((r) => (
                                            <option key={r} value={r}>
                                                {r}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700">Medical Constraints</label>
                                <textarea
                                    value={medicalInfo}
                                    onChange={(e) => setMedicalInfo(e.target.value)}
                                    placeholder="e.g. Asthma, Peanut Allergy, etc. Leave empty if none."
                                    rows={2}
                                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none sm:text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {!isTroopLeader ? (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Assigned Troop Unit</label>
                                        <select
                                            value={selectedTroopId}
                                            onChange={(e) => {
                                                const newTroopId = e.target.value
                                                setSelectedTroopId(newTroopId)
                                                setSelectedPatrolId('') // reset patrol on troop change
                                                const newTroopObj = troops.find((t) => t.id === newTroopId)
                                                const newRanks = getRanksForSection(newTroopObj?.sectionName || '')
                                                setCurrentRank(newRanks[0] || '')
                                            }}
                                            required
                                            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none sm:text-sm"
                                        >
                                            <option value="">-- Select Unit --</option>
                                            {troops.map((t) => (
                                                <option key={t.id} value={t.id}>
                                                    {t.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400">Assigned Troop Unit</label>
                                        <input
                                            type="text"
                                            disabled
                                            value={troops.find((t) => t.id === userTroopId)?.name || 'Your Assigned Troop'}
                                            className="mt-1 block w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-slate-500 shadow-none sm:text-sm"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Assigned Patrol</label>
                                    <select
                                        value={selectedPatrolId}
                                        onChange={(e) => setSelectedPatrolId(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none sm:text-sm"
                                    >
                                        <option value="">-- No Patrol Assigned --</option>
                                        {availablePatrolsForForms.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Patrol Role / Duty</label>
                                    <select
                                        value={patrolRole}
                                        onChange={(e) => setPatrolRole(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none sm:text-sm"
                                    >
                                        <option value="">-- None --</option>
                                        <option value="amin_serr">Amin Serr (Secretary)</option>
                                        <option value="sandou2">Sandou2 (Treasurer)</option>
                                        <option value="tejhizet">Tejhizet (Quartermaster)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Promise Date</label>
                                    <input
                                        type="date"
                                        value={promiseDate}
                                        onChange={(e) => setPromiseDate(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none sm:text-sm"
                                    />
                                </div>
                            </div>

                            {/* Dynamic Multiple Emergency Contacts Section */}
                            <div className="border-t border-slate-200 pt-4 space-y-3">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider">Emergency Contact Details</h4>
                                    <button
                                        type="button"
                                        onClick={addEmergencyContactField}
                                        className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-600 bg-teal-50 px-2.5 py-1 rounded-lg transition-colors"
                                    >
                                        <Plus className="h-3.5 w-3.5" /> Add Contact
                                    </button>
                                </div>

                                {emergencyContacts.map((contact, idx) => (
                                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative">
                                        {emergencyContacts.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeEmergencyContactField(idx)}
                                                className="absolute top-2 right-2 text-rose-500 hover:text-rose-700 p-1"
                                                title="Remove Contact"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700">Full Name</label>
                                                <input
                                                    type="text"
                                                    value={contact.name}
                                                    onChange={(e) => updateEmergencyContactField(idx, 'name', e.target.value)}
                                                    placeholder="e.g. Papa Pan / Mother"
                                                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700">Relation</label>
                                                <input
                                                    type="text"
                                                    value={contact.relation}
                                                    onChange={(e) => updateEmergencyContactField(idx, 'relation', e.target.value)}
                                                    placeholder="e.g. Father / Mother"
                                                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700">Phone Number</label>
                                                <input
                                                    type="text"
                                                    value={contact.phone}
                                                    onChange={(e) => updateEmergencyContactField(idx, 'phone', e.target.value)}
                                                    placeholder="e.g. +961 70 123 456"
                                                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="border-t border-slate-100 pt-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-slate-800">Milestone Log</h4>
                                    {isEdit && editMemberId && (localHistoryMap[editMemberId] || []).length > 0 && (
                                        <span className="text-xs text-slate-400">{(localHistoryMap[editMemberId] || []).length} record(s)</span>
                                    )}
                                </div>

                                {/* Existing logs — only shown when editing */}
                                {isEdit && editMemberId && (localHistoryMap[editMemberId] || []).length > 0 && (
                                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                                        {(localHistoryMap[editMemberId] || [])
                                            .slice()
                                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                            .map((log) => (
                                                <div
                                                    key={log.id}
                                                    className={`flex items-start gap-3 px-3 py-2.5 text-xs ${editingHistoryId === log.id ? 'bg-teal-50' : 'bg-white hover:bg-slate-50'}`}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-slate-700 truncate">{log.new_value}</p>
                                                        <p className="text-slate-400 mt-0.5">
                                                            {log.event_type.replace(/_/g, ' ')} · {new Date(log.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-1 shrink-0 mt-0.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingHistoryId(log.id)
                                                                setHistoryType(log.event_type)
                                                                setHistoryDescription(log.new_value)
                                                                setHistoryDate(log.created_at.slice(0, 10))
                                                            }}
                                                            className="p-1 rounded text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                                                            title="Edit this milestone"
                                                        >
                                                            <Edit className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteHistoryLog(log.id, editMemberId)}
                                                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                            title="Delete this milestone"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}

                                {/* Add / Edit milestone form */}
                                <p className="text-xs text-slate-400">
                                    {editingHistoryId ? 'Editing an existing milestone — update the fields below and click Save.' : 'Log a past rank elevation, promise event, or section transfer.'}
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Type</label>
                                        <select
                                            value={historyType}
                                            onChange={(e) => setHistoryType(e.target.value)}
                                            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none sm:text-sm"
                                        >
                                            <option value="rank_change">Rank Promotion</option>
                                            <option value="troop_change">Section / Troop Transfer</option>
                                            <option value="patrol_change">Patrol Transfer</option>
                                            <option value="promise_date_change">Scout Promise Taken</option>
                                            <option value="special_achievement">Special Achievement / Note</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700">Note / Description</label>
                                        <input
                                            type="text"
                                            value={historyDescription}
                                            onChange={(e) => setHistoryDescription(e.target.value)}
                                            placeholder="e.g. Promoted to 3arif awwal or Made promise"
                                            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none sm:text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-end gap-3">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-slate-700">Date</label>
                                        <input
                                            type="date"
                                            value={historyDate}
                                            onChange={(e) => setHistoryDate(e.target.value)}
                                            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none sm:text-sm"
                                        />
                                    </div>
                                    {isEdit && editMemberId ? (
                                        <div className="flex gap-2 pb-0.5">
                                            {editingHistoryId && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingHistoryId(null)
                                                        setHistoryType('rank_change')
                                                        setHistoryDescription('')
                                                        setHistoryDate('')
                                                    }}
                                                    className="px-3 py-2 border border-slate-300 rounded-lg text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
                                                >
                                                    Cancel Edit
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                disabled={!historyDescription.trim() || loading}
                                                onClick={handleSaveHistoryLog}
                                                className="px-3 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-lg text-xs font-semibold shadow disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                                            >
                                                {editingHistoryId ? 'Update Milestone' : 'Add Milestone'}
                                            </button>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isActiveCheck"
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                    className="rounded border-slate-300 text-teal-650 focus:ring-teal-500 cursor-pointer"
                                />
                                <label htmlFor="isActiveCheck" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                                    Scout profile is active
                                </label>
                            </div>

                            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-lg text-sm font-semibold shadow disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isEdit ? 'Save Profile Changes' : 'Register Scout'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Patrol Modal */}
            {showPatrolModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white w-full max-w-md p-6 border border-slate-200 rounded-2xl shadow-xl space-y-4 my-8">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900">Create New Patrol</h3>
                            <button onClick={() => setShowPatrolModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreatePatrol} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Patrol Name</label>
                                <input
                                    type="text"
                                    value={newPatrolName}
                                    onChange={(e) => setNewPatrolName(e.target.value)}
                                    required
                                    placeholder="e.g. Eagle Patrol"
                                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none sm:text-sm"
                                />
                            </div>

                            {!isTroopLeader ? (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Assigned Troop Unit</label>
                                    <select
                                        value={newPatrolTroopId}
                                        onChange={(e) => setNewPatrolTroopId(e.target.value)}
                                        required
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none sm:text-sm"
                                    >
                                        <option value="">-- Select Troop --</option>
                                        {troops.map((t) => (
                                            <option key={t.id} value={t.id}>
                                                {t.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-slate-400">Assigned Troop Unit</label>
                                    <input
                                        type="text"
                                        disabled
                                        value={troops.find((t) => t.id === userTroopId)?.name || 'Your Assigned Troop'}
                                        className="mt-1 block w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-slate-500 shadow-none sm:text-sm"
                                    />
                                </div>
                            )}

                            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowPatrolModal(false)}
                                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-lg text-sm font-semibold shadow disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                                >
                                    Create Patrol
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
