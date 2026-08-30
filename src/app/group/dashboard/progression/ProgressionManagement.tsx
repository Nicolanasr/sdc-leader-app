'use client'

import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import DashboardShell from '../DashboardShell'
import {
  GraduationCap,
  Search,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Upload,
  X,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Check,
  Eye,
  FileText,
  User,
  Layers,
  Award,
  ArrowLeft,
  Filter,
} from 'lucide-react'

interface Troop {
  id: string
  name: string
  sectionTypeId: string
  sectionName: string
}

interface Member {
  id: string
  firstName: string
  lastName: string
  troopId: string
  patrolId: string | null
  patrolName: string
  currentRank: string
}

interface ProgressionRequirement {
  id: string
  classId: string
  category: string
  title: string
  description?: string | null
  sortOrder: number
}

interface ProgressionClass {
  id: string
  sectionTypeId: string
  name: string
  badgeIcon: string
  sortOrder: number
  classType?: 'rank' | 'specialty'
  requirements: ProgressionRequirement[]
}

interface ProgressionRecord {
  id: string
  memberId: string
  requirementId: string
  completedAt: string
  validatedBy?: string | null
  validatorName?: string
  notes?: string | null
  evidenceFileUrl?: string | null
  evidenceDriveFileId?: string | null
}

interface Props {
  groupId: string
  groupName: string
  currentRole: string
  userName: string
  userId: string
  userTroopId: string | null
  isTroopLeader: boolean
  troops: Troop[]
  members: Member[]
  classes: ProgressionClass[]
  initialRecords: ProgressionRecord[]
}

export default function ProgressionManagement({
  groupId,
  groupName,
  currentRole,
  userName,
  userId,
  userTroopId,
  isTroopLeader,
  troops,
  members,
  classes,
  initialRecords,
}: Props) {
  const searchParams = useSearchParams()
  const urlSearch = searchParams?.get('search') || ''
  const urlTroop = searchParams?.get('troop') || ''

  // ── Track Switcher ('rank' vs 'specialty') ──
  const [activeTrack, setActiveTrack] = useState<'rank' | 'specialty'>('rank')

  // ── Selected Troop ──
  const initialTroopId = isTroopLeader && userTroopId
    ? userTroopId
    : urlTroop && troops.some((t) => t.id === urlTroop)
    ? urlTroop
    : troops[0]?.id || ''

  const [selectedTroopId, setSelectedTroopId] = useState<string>(initialTroopId)
  const [searchQuery, setSearchQuery] = useState<string>(urlSearch)

  // Current selected Troop object
  const currentTroop = useMemo(() => {
    return troops.find((t) => t.id === selectedTroopId) || troops[0] || null
  }, [troops, selectedTroopId])

  // Classes available for this troop's section type (Rank Stages)
  const rankClasses = useMemo(() => {
    if (!currentTroop) return []
    return classes.filter(
      (c) =>
        c.sectionTypeId === currentTroop.sectionTypeId &&
        (c.classType || 'rank') === 'rank'
    )
  }, [classes, currentTroop])

  // Specialty Badges available for this troop's section type
  const specialtyBadges = useMemo(() => {
    if (!currentTroop) return []
    return classes.filter(
      (c) =>
        c.sectionTypeId === currentTroop.sectionTypeId &&
        c.classType === 'specialty'
    )
  }, [classes, currentTroop])

  // Selected Rank Class ID
  const [selectedRankClassId, setSelectedRankClassId] = useState<string>(rankClasses[0]?.id || '')

  // Selected Specialty Badge (for active badge inspection/awarding)
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null)

  // Specialty Badge Search Filter
  const [badgeSearchQuery, setBadgeSearchQuery] = useState('')

  // Effective selected class (either current rank stage or active specialty badge)
  const effectiveClass = useMemo(() => {
    if (activeTrack === 'rank') {
      const found = rankClasses.find((c) => c.id === selectedRankClassId)
      return found || rankClasses[0] || null
    } else {
      if (!selectedBadgeId) return null
      return specialtyBadges.find((b) => b.id === selectedBadgeId) || null
    }
  }, [activeTrack, rankClasses, selectedRankClassId, selectedBadgeId, specialtyBadges])

  // Filtered Specialty Badges based on search query
  const filteredSpecialtyBadges = useMemo(() => {
    const q = badgeSearchQuery.toLowerCase().trim()
    if (!q) return specialtyBadges
    return specialtyBadges.filter((b) => {
      const nameMatch = b.name.toLowerCase().includes(q)
      const reqMatch = b.requirements.some((r) => r.title.toLowerCase().includes(q) || r.category.toLowerCase().includes(q))
      return nameMatch || reqMatch
    })
  }, [specialtyBadges, badgeSearchQuery])

  // Category Filter
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Records state (optimistic fast updates)
  const [records, setRecords] = useState<ProgressionRecord[]>(initialRecords)
  const [togglingReqKey, setTogglingReqKey] = useState<string | null>(null)

  // Evidence Modal state
  const [evidenceModalTarget, setEvidenceModalTarget] = useState<{
    member: Member
    requirement: ProgressionRequirement
    record?: ProgressionRecord
  } | null>(null)
  const [evidenceNotes, setEvidenceNotes] = useState('')
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false)

  // Status message toast
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const showStatus = (text: string, type: 'success' | 'error') => {
    setStatusMessage({ text, type })
    setTimeout(() => setStatusMessage(null), 4000)
  }

  // Filtered Scouts for the selected troop
  const troopMembers = useMemo(() => {
    return members.filter((m) => m.troopId === selectedTroopId)
  }, [members, selectedTroopId])

  // Map of completed requirements: recordMap[`${memberId}_${requirementId}`] = ProgressionRecord
  const recordMap = useMemo(() => {
    const map: Record<string, ProgressionRecord> = {}
    records.forEach((r) => {
      map[`${r.memberId}_${r.requirementId}`] = r
    })
    return map
  }, [records])

  // Categories in the current effective class
  const classCategories = useMemo(() => {
    if (!effectiveClass) return []
    const cats = new Set<string>()
    effectiveClass.requirements.forEach((r) => {
      if (r.category) cats.add(r.category)
    })
    return Array.from(cats)
  }, [effectiveClass])

  // Filtered Requirements in current class
  const filteredRequirements = useMemo(() => {
    if (!effectiveClass) return []
    return effectiveClass.requirements.filter((r) => {
      if (selectedCategory !== 'all' && r.category !== selectedCategory) return false
      return true
    })
  }, [effectiveClass, selectedCategory])

  // Filtered Members matching search
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return troopMembers
    const q = searchQuery.toLowerCase()
    return troopMembers.filter((m) => {
      const fullName = `${m.firstName} ${m.lastName}`.toLowerCase()
      const patrol = m.patrolName.toLowerCase()
      return fullName.includes(q) || patrol.includes(q)
    })
  }, [troopMembers, searchQuery])

  // ── Toggle Requirement Completion ──
  const handleToggleRequirement = async (memberId: string, requirementId: string) => {
    const key = `${memberId}_${requirementId}`
    const existingRecord = recordMap[key]
    const willBeCompleted = !existingRecord

    setTogglingReqKey(key)

    // Optimistic UI Update
    if (willBeCompleted) {
      const optimisticRecord: ProgressionRecord = {
        id: `temp_${Date.now()}`,
        memberId,
        requirementId,
        completedAt: new Date().toISOString(),
        validatedBy: userId,
        validatorName: userName,
      }
      setRecords((prev) => [...prev, optimisticRecord])
    } else {
      setRecords((prev) => prev.filter((r) => !(r.memberId === memberId && r.requirementId === requirementId)))
    }

    try {
      const res = await fetch('/api/group/progression/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          requirement_id: requirementId,
          is_completed: willBeCompleted,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update requirement.')
      }

      if (data.record) {
        setRecords((prev) =>
          prev.map((r) =>
            r.memberId === memberId && r.requirementId === requirementId
              ? {
                  ...r,
                  id: data.record.id,
                  completedAt: data.record.completed_at,
                  validatorName: data.record.profiles?.full_name || userName,
                }
              : r
          )
        )
      }
    } catch (err: any) {
      console.error('[Progression Toggle Error]:', err)
      if (willBeCompleted) {
        setRecords((prev) => prev.filter((r) => !(r.memberId === memberId && r.requirementId === requirementId)))
      } else if (existingRecord) {
        setRecords((prev) => [...prev, existingRecord])
      }
      showStatus(err.message || 'Error updating status.', 'error')
    } finally {
      setTogglingReqKey(null)
    }
  }

  // ── Open Evidence Modal ──
  const handleOpenEvidence = (member: Member, requirement: ProgressionRequirement) => {
    const key = `${member.id}_${requirement.id}`
    const rec = recordMap[key]
    setEvidenceModalTarget({ member, requirement, record: rec })
    setEvidenceNotes(rec?.notes || '')
    setEvidenceFile(null)
  }

  // ── Save Evidence & Notes ──
  const handleSaveEvidence = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!evidenceModalTarget) return

    setIsUploadingEvidence(true)
    const { member, requirement } = evidenceModalTarget
    const scoutName = `${member.firstName} ${member.lastName}`

    try {
      const fd = new FormData()
      fd.append('memberId', member.id)
      fd.append('requirementId', requirement.id)
      fd.append('notes', evidenceNotes)
      fd.append('groupName', groupName)
      fd.append('scoutName', scoutName)
      if (evidenceFile) {
        fd.append('file', evidenceFile)
      }

      const res = await fetch('/api/group/progression/evidence', {
        method: 'POST',
        body: fd,
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save evidence.')
      }

      const updatedRec = data.record
      setRecords((prev) => {
        const filtered = prev.filter(
          (r) => !(r.memberId === member.id && r.requirementId === requirement.id)
        )
        return [
          ...filtered,
          {
            id: updatedRec.id,
            memberId: updatedRec.member_id,
            requirementId: updatedRec.requirement_id,
            completedAt: updatedRec.completed_at,
            validatedBy: updatedRec.validated_by,
            validatorName: updatedRec.profiles?.full_name || userName,
            notes: updatedRec.notes,
            evidenceFileUrl: updatedRec.evidence_file_url,
            evidenceDriveFileId: updatedRec.evidence_drive_file_id,
          },
        ]
      })

      showStatus('Evidence & notes saved successfully!', 'success')
      setEvidenceModalTarget(null)
    } catch (err: any) {
      console.error('[Save Evidence Error]:', err)
      showStatus(err.message || 'Error saving evidence.', 'error')
    } finally {
      setIsUploadingEvidence(false)
    }
  }

  return (
    <DashboardShell groupName={groupName} currentRole={currentRole} userName={userName}>
      <div className="w-full pb-24 space-y-4">
        {/* Toast Alert */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in ${
              statusMessage.type === 'success' ? 'bg-teal-900 text-white' : 'bg-rose-600 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="opacity-70 hover:opacity-100">
              ✕
            </button>
          </div>
        )}

        {/* ── TOP HEADER CARD ── */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Progression & Badges</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  {records.length} Validated
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Track and validate scout ranks, milestones & evidence in the field
              </p>
            </div>
          </div>

          {/* Troop Selector (Locked if Troop Leader) */}
          <div className="flex items-center gap-2">
            {isTroopLeader || troops.length <= 1 ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-900 border border-teal-200 text-xs font-bold shadow-2xs">
                <Layers className="h-3.5 w-3.5 text-teal-700" />
                <span>Unit: {currentTroop?.name || 'Assigned Troop'}</span>
                {currentTroop?.sectionName && (
                  <span className="text-[10px] bg-teal-200/60 px-1.5 py-0.2 rounded font-black text-teal-950">
                    {currentTroop.sectionName}
                  </span>
                )}
              </div>
            ) : (
              <div className="w-full sm:w-56">
                <select
                  value={selectedTroopId}
                  onChange={(e) => {
                    setSelectedTroopId(e.target.value)
                    setSelectedCategory('all')
                    setSelectedBadgeId(null)
                  }}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:outline-none focus:border-teal-700"
                >
                  {troops.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.sectionName})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ── TRACK SWITCHER: RANKS VS SPECIALTY BADGES ── */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 flex gap-1.5 max-w-md shadow-2xs">
          <button
            type="button"
            onClick={() => {
              setActiveTrack('rank')
              setSelectedCategory('all')
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTrack === 'rank'
                ? 'bg-teal-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            <span>Rank Stages (المراحل)</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                activeTrack === 'rank' ? 'bg-teal-700 text-teal-100' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {rankClasses.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTrack('specialty')
              setSelectedCategory('all')
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTrack === 'specialty'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Specialty Badges (الأوسمة)</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                activeTrack === 'specialty' ? 'bg-amber-700 text-amber-100' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {specialtyBadges.length}
            </span>
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* ── MODE 1: RANK STAGES (Horizontal Stage Tabs Flow) ──   */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTrack === 'rank' && (
          <>
            {rankClasses.length > 0 ? (
              <div className="space-y-3">
                {/* Horizontal Rank Stages Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {rankClasses.map((cls) => {
                    const isSelected = effectiveClass?.id === cls.id
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => {
                          setSelectedRankClassId(cls.id)
                          setSelectedCategory('all')
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                          isSelected
                            ? 'bg-teal-800 text-white shadow-xs scale-100'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-base leading-none">{cls.badgeIcon || '⚜️'}</span>
                        <span>{cls.name}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                            isSelected ? 'bg-teal-700 text-teal-100' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {cls.requirements.length}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Search & Category Filter Bar */}
                <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search scouts by name, patrol..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 font-medium"
                    />
                  </div>

                  {classCategories.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 scrollbar-none border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setSelectedCategory('all')}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                          selectedCategory === 'all'
                            ? 'bg-teal-800 text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        All Categories ({effectiveClass?.requirements.length || 0})
                      </button>

                      {classCategories.map((cat) => {
                        const catReqs = (effectiveClass?.requirements || []).filter((r) => r.category === cat)
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                              selectedCategory === cat
                                ? 'bg-teal-800 text-white shadow-2xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                            }`}
                          >
                            <span>{cat}</span>
                            <span
                              className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                                selectedCategory === cat ? 'bg-teal-700 text-teal-100' : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {catReqs.length}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Scouts Cards Grid */}
                <ScoutsProgressionGrid
                  members={filteredMembers}
                  requirements={filteredRequirements}
                  effectiveClass={effectiveClass}
                  recordMap={recordMap}
                  togglingReqKey={togglingReqKey}
                  onToggleRequirement={handleToggleRequirement}
                  onOpenEvidence={handleOpenEvidence}
                />
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center mx-auto">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900">No Rank Stages Configured Yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  The Configurator hasn&apos;t defined progression rank stages for this unit&apos;s section ({currentTroop?.sectionName || 'Section'}).
                </p>
              </div>
            )}
          </>
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* ── MODE 2: SPECIALTY BADGES (Search-First Catalog & Award) ──   */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {activeTrack === 'specialty' && (
          <>
            {/* If a Badge is actively selected, show its Award Matrix */}
            {selectedBadgeId && effectiveClass ? (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Active Badge Header */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBadgeId(null)
                        setSelectedCategory('all')
                      }}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>All Badges</span>
                    </button>

                    <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-2xl flex items-center justify-center shrink-0">
                      {effectiveClass.badgeIcon || '🪢'}
                    </div>

                    <div>
                      <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                        <span>{effectiveClass.name}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                          {effectiveClass.requirements.length} Tasks
                        </span>
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        Award this specialty badge to scouts who complete all required skills
                      </p>
                    </div>
                  </div>

                  <div className="w-full sm:w-64">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search scouts in unit..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-amber-600 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Scouts Cards Grid for this Badge */}
                <ScoutsProgressionGrid
                  members={filteredMembers}
                  requirements={effectiveClass.requirements}
                  effectiveClass={effectiveClass}
                  recordMap={recordMap}
                  togglingReqKey={togglingReqKey}
                  onToggleRequirement={handleToggleRequirement}
                  onOpenEvidence={handleOpenEvidence}
                  badgeMode
                />
              </div>
            ) : (
              /* Searchable Badge Catalog Grid */
              <div className="space-y-4">
                {/* Search Bar for Badges */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search specialty badges (e.g. Knotter, 3akkad, First Aid, المسعف, Chef, طبّاخ)..."
                      value={badgeSearchQuery}
                      onChange={(e) => setBadgeSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-amber-600 font-medium"
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-500 shrink-0 px-1">
                    Showing {filteredSpecialtyBadges.length} of {specialtyBadges.length} badges
                  </span>
                </div>

                {/* Badges Cards Grid */}
                {filteredSpecialtyBadges.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-base text-slate-900">
                      {specialtyBadges.length === 0
                        ? 'No Specialty Badges Configured'
                        : `No badges match "${badgeSearchQuery}"`}
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      {specialtyBadges.length === 0
                        ? `The Configurator hasn't added specialty badges for ${currentTroop?.sectionName || 'this section'} yet.`
                        : 'Try searching with a different name or keyword.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
                    {filteredSpecialtyBadges.map((badge) => {
                      // Calculate how many scouts in this troop have 100% earned this badge
                      const totalBadgeReqs = badge.requirements.length
                      const awardedCount = troopMembers.filter((m) => {
                        if (totalBadgeReqs === 0) return false
                        const completedCount = badge.requirements.filter((r) => !!recordMap[`${m.id}_${r.id}`]).length
                        return completedCount === totalBadgeReqs
                      }).length

                      return (
                        <div
                          key={badge.id}
                          onClick={() => {
                            setSelectedBadgeId(badge.id)
                            setSelectedCategory('all')
                          }}
                          className="bg-white rounded-2xl border border-slate-200 hover:border-amber-400 hover:ring-2 hover:ring-amber-400/20 p-4 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              {badge.badgeIcon || '🪢'}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-sm text-slate-900 truncate group-hover:text-amber-700 transition-colors">
                                {badge.name}
                              </h3>
                              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                {badge.requirements.length} {badge.requirements.length === 1 ? 'task' : 'tasks'}
                              </p>
                            </div>
                          </div>

                          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                awardedCount > 0
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              ⭐ {awardedCount} {awardedCount === 1 ? 'Scout' : 'Scouts'} Awarded
                            </span>

                            <button
                              type="button"
                              className="text-xs font-bold text-amber-700 group-hover:text-amber-800 flex items-center gap-1"
                            >
                              <span>Award</span>
                              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── EVIDENCE & NOTES MODAL ── */}
        {evidenceModalTarget && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-900 flex items-center justify-center font-bold">
                    <Paperclip className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Progression Evidence</h3>
                    <p className="text-[11px] text-slate-500">
                      {evidenceModalTarget.member.firstName} {evidenceModalTarget.member.lastName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEvidenceModalTarget(null)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Requirement Summary */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                  {evidenceModalTarget.requirement.category}
                </span>
                <h4 className="font-bold text-xs text-slate-900">
                  {evidenceModalTarget.requirement.title}
                </h4>
                {evidenceModalTarget.requirement.description && (
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {evidenceModalTarget.requirement.description}
                  </p>
                )}
              </div>

              {/* Existing Evidence File View & Inline Preview */}
              {evidenceModalTarget.record?.evidenceFileUrl && (
                <div className="p-3 bg-teal-50/70 rounded-2xl border border-teal-200 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="h-4 w-4 text-teal-800 shrink-0" />
                      <span className="text-xs font-bold text-teal-950 truncate">Google Drive Synced Proof</span>
                    </div>
                    <a
                      href={evidenceModalTarget.record.evidenceFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-teal-800 hover:bg-teal-700 text-white rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 shrink-0"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>View Original</span>
                    </a>
                  </div>

                  {/* Inline preview */}
                  <div className="rounded-xl overflow-hidden border border-teal-200/80 bg-white p-2 flex items-center justify-center">
                    <img
                      src={evidenceModalTarget.record.evidenceFileUrl}
                      alt="Proof"
                      className="max-h-48 rounded-lg object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none'
                      }}
                    />
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveEvidence} className="space-y-3.5">
                {/* Upload File to Google Drive */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Upload Photo / Document (Google Drive Synced)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-teal-800 hover:file:bg-teal-100 border border-slate-200 rounded-xl p-1"
                  />
                </div>

                {/* Field Notes */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Leader Verification Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Completed during Baskinta hike. Displayed great mastery..."
                    value={evidenceNotes}
                    onChange={(e) => setEvidenceNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-teal-700"
                  />
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEvidenceModalTarget(null)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-700 hover:bg-slate-100"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={isUploadingEvidence}
                    className="flex-1 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    {isUploadingEvidence ? (
                      <span>Uploading to Drive...</span>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" />
                        <span>Save Evidence</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}

// ── SUBCOMPONENT: SCOUTS PROGRESSION CHECKLIST MATRIX ──
interface ScoutsGridProps {
  members: Member[]
  requirements: ProgressionRequirement[]
  effectiveClass: ProgressionClass | null
  recordMap: Record<string, ProgressionRecord>
  togglingReqKey: string | null
  onToggleRequirement: (memberId: string, requirementId: string) => void
  onOpenEvidence: (member: Member, requirement: ProgressionRequirement) => void
  badgeMode?: boolean
}

function ScoutsProgressionGrid({
  members,
  requirements,
  effectiveClass,
  recordMap,
  togglingReqKey,
  onToggleRequirement,
  onOpenEvidence,
  badgeMode = false,
}: ScoutsGridProps) {
  if (members.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
        <User className="h-8 w-8 mx-auto text-slate-300" />
        <h4 className="font-bold text-sm text-slate-800">No active scouts found</h4>
        <p className="text-xs text-slate-500">No scouts found matching your filter criteria in this unit.</p>
      </div>
    )
  }

  if (requirements.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
        <GraduationCap className="h-8 w-8 mx-auto text-slate-300" />
        <h4 className="font-bold text-sm text-slate-800">No requirements in this category</h4>
        <p className="text-xs text-slate-500">Configure requirements in the Configurator panel.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {members.map((scout) => {
        const totalClassReqs = requirements.length
        const completedClassReqs = requirements.filter(
          (r) => !!recordMap[`${scout.id}_${r.id}`]
        ).length
        const percent = totalClassReqs > 0 ? Math.round((completedClassReqs / totalClassReqs) * 100) : 0
        const isFullyCompleted = totalClassReqs > 0 && completedClassReqs === totalClassReqs

        return (
          <div
            key={scout.id}
            className={`bg-white rounded-2xl border transition-all p-4 space-y-3 shadow-xs ${
              isFullyCompleted
                ? badgeMode
                  ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/15'
                  : 'border-emerald-400 ring-2 ring-emerald-400/20 bg-emerald-50/10'
                : 'border-slate-200'
            }`}
          >
            {/* Scout Header */}
            <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 text-teal-800 font-black text-sm flex items-center justify-center shrink-0">
                  {scout.firstName.charAt(0)}
                  {scout.lastName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm text-slate-900 truncate">
                      {scout.firstName} {scout.lastName}
                    </h3>
                    <Link
                      href={`/group/dashboard/members?search=${encodeURIComponent(`${scout.firstName} ${scout.lastName}`)}`}
                      className="text-slate-400 hover:text-teal-800 transition-colors p-0.5"
                      title="View Scout Profile Dossier"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate">
                    {scout.patrolName} • {scout.currentRank}
                  </p>
                </div>
              </div>

              {/* Progress Badge */}
              <div className="text-right shrink-0">
                <div
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-black ${
                    isFullyCompleted
                      ? badgeMode
                        ? 'bg-amber-500 text-slate-950 shadow-2xs'
                        : 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-teal-50 text-teal-900 border border-teal-200'
                  }`}
                >
                  <span>{completedClassReqs}/{totalClassReqs}</span>
                  <span className="text-[10px] opacity-85">({percent}%)</span>
                </div>
                {isFullyCompleted && (
                  <span className={`block text-[9px] font-black uppercase tracking-tight mt-0.5 ${badgeMode ? 'text-amber-800' : 'text-emerald-700'}`}>
                    ⭐ {badgeMode ? 'Badge Earned!' : 'Ready for Rank'}
                  </span>
                )}
              </div>
            </div>

            {/* Requirements Checklist */}
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5 scrollbar-thin">
              {requirements.map((req) => {
                const key = `${scout.id}_${req.id}`
                const record = recordMap[key]
                const isDone = !!record
                const hasEvidence = !!(record?.evidenceFileUrl || record?.notes)
                const isToggling = togglingReqKey === key

                return (
                  <div
                    key={req.id}
                    className={`p-2 rounded-xl border transition-all flex items-start justify-between gap-2 ${
                      isDone
                        ? 'bg-emerald-50/60 border-emerald-200 text-slate-900'
                        : 'bg-slate-50/70 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <button
                        type="button"
                        disabled={isToggling}
                        onClick={() => onToggleRequirement(scout.id, req.id)}
                        className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold transition-all shrink-0 mt-0.5 ${
                          isDone
                            ? 'bg-emerald-600 text-white shadow-2xs scale-105'
                            : 'border border-slate-300 bg-white hover:border-teal-600'
                        }`}
                      >
                        {isDone && <Check className="h-3 w-3" />}
                      </button>

                      <div className="min-w-0">
                        <p
                          className={`text-xs leading-snug ${
                            isDone ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                          }`}
                        >
                          {req.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[9px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-100">
                            {req.category}
                          </span>
                          {hasEvidence && (
                            <button
                              type="button"
                              onClick={() => onOpenEvidence(scout, req)}
                              className="inline-flex items-center gap-1 text-[9px] font-bold text-teal-800 bg-teal-100/90 hover:bg-teal-200 px-1.5 py-0.2 rounded border border-teal-300 transition-colors"
                            >
                              <Paperclip className="h-2.5 w-2.5" />
                              <span>Proof Attached</span>
                            </button>
                          )}
                          {isDone && record?.validatorName && (
                            <span className="text-[9px] text-slate-400 truncate">
                              ✓ by {record.validatorName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Evidence / Notes Button */}
                    <button
                      type="button"
                      onClick={() => onOpenEvidence(scout, req)}
                      className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                        hasEvidence
                          ? 'bg-teal-800 text-white shadow-2xs'
                          : 'text-slate-400 hover:text-teal-800 hover:bg-teal-50'
                      }`}
                      title={hasEvidence ? 'View attached evidence & notes' : 'Attach photo evidence or notes'}
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
