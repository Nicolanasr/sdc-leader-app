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
    User,
    Layers,
    Award,
    ArrowLeft,
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

            showStatus('Evidence saved!', 'success')
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
            <div className="w-full pb-20 space-y-3">
                {/* Toast Alert */}
                {statusMessage && (
                    <div
                        className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in ${statusMessage.type === 'success' ? 'bg-teal-900 text-white' : 'bg-rose-600 text-white'
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

                {/* ── STREAMLINED MINIMALIST TOP HEADER ── */}
                <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-lg">⚜️</span>
                            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                                Progression & Badges
                            </h1>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                                {records.length} done
                            </span>
                        </div>

                        {/* Locked Troop Badge (Mobile display) */}
                        {isTroopLeader || troops.length <= 1 ? (
                            <span className="sm:hidden text-[11px] font-bold px-2 py-0.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 shrink-0">
                                {currentTroop?.name}
                            </span>
                        ) : null}
                    </div>

                    {/* Desktop Troop Selector / Badge */}
                    <div className="sm:flex items-center gap-2">
                        {isTroopLeader || troops.length <= 1 ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-teal-50 text-teal-900 border border-teal-200 text-xs font-bold">
                                <Layers className="h-3.5 w-3.5 text-teal-700" />
                                <span>Unit: {currentTroop?.name}</span>
                                {currentTroop?.sectionName && (
                                    <span className="text-[10px] bg-teal-200/60 px-1 py-0.2 rounded font-black text-teal-950">
                                        {currentTroop.sectionName}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <select
                                value={selectedTroopId}
                                onChange={(e) => {
                                    setSelectedTroopId(e.target.value)
                                    setSelectedCategory('all')
                                    setSelectedBadgeId(null)
                                }}
                                className="px-2.5 py-1 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:outline-none focus:border-teal-700"
                            >
                                {troops.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name} ({t.sectionName})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* ── STREAMLINED TRACK SWITCHER (RANKS VS SPECIALTY) ── */}
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/70">
                    <button
                        type="button"
                        onClick={() => {
                            setActiveTrack('rank')
                            setSelectedCategory('all')
                        }}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTrack === 'rank'
                                ? 'bg-white text-teal-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        <GraduationCap className="h-3.5 w-3.5" />
                        <span>Rank Stages</span>
                        <span className="text-[10px] px-1 rounded bg-slate-100 text-slate-600 font-bold">
                            {rankClasses.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setActiveTrack('specialty')
                            setSelectedCategory('all')
                        }}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTrack === 'specialty'
                                ? 'bg-white text-amber-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                        <span>Specialty Badges</span>
                        <span className="text-[10px] px-1 rounded bg-amber-50 text-amber-800 font-bold">
                            {specialtyBadges.length}
                        </span>
                    </button>
                </div>

                {/* ══════════════════════════════════════════════════════════ */}
                {/* ── MODE 1: RANK STAGES ──                                 */}
                {/* ══════════════════════════════════════════════════════════ */}
                {activeTrack === 'rank' && (
                    <>
                        {rankClasses.length > 0 ? (
                            <div className="space-y-2.5">
                                {/* Horizontal Rank Stages Tabs */}
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
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
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${isSelected
                                                        ? 'bg-teal-800 text-white shadow-2xs'
                                                        : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <span>{cls.badgeIcon || '⚜️'}</span>
                                                <span>{cls.name}</span>
                                                <span
                                                    className={`text-[9px] px-1 rounded font-bold ${isSelected ? 'bg-teal-700 text-teal-100' : 'bg-slate-100 text-slate-500'
                                                        }`}
                                                >
                                                    {cls.requirements.length}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>

                                {/* Compact Search & Category Filter Bar */}
                                <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-2">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search scouts..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-7 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-teal-700 font-medium"
                                        />
                                    </div>

                                    {classCategories.length > 0 && (
                                        <div className="flex items-center gap-1 overflow-x-auto pt-1 pb-0.5 scrollbar-none border-t border-slate-100">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedCategory('all')}
                                                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${selectedCategory === 'all'
                                                        ? 'bg-teal-800 text-white'
                                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                                    }`}
                                            >
                                                All ({effectiveClass?.requirements.length || 0})
                                            </button>

                                            {classCategories.map((cat) => {
                                                const catReqs = (effectiveClass?.requirements || []).filter((r) => r.category === cat)
                                                return (
                                                    <button
                                                        key={cat}
                                                        type="button"
                                                        onClick={() => setSelectedCategory(cat)}
                                                        className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap flex items-center gap-1 ${selectedCategory === cat
                                                                ? 'bg-teal-800 text-white'
                                                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                                            }`}
                                                    >
                                                        <span>{cat}</span>
                                                        <span className="text-[9px] opacity-75">({catReqs.length})</span>
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
                            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 space-y-2">
                                <GraduationCap className="h-6 w-6 mx-auto text-slate-300" />
                                <h3 className="font-bold text-sm text-slate-900">No Rank Stages Configured</h3>
                                <p className="text-xs text-slate-500">Configure progression stages in the Configurator.</p>
                            </div>
                        )}
                    </>
                )}

                {/* ═════════════════════════════════════════════════════════════════ */}
                {/* ── MODE 2: SPECIALTY BADGES ──                                    */}
                {/* ═════════════════════════════════════════════════════════════════ */}
                {activeTrack === 'specialty' && (
                    <>
                        {/* If a Badge is actively selected: Clean, Minimalist Award Sub-Header */}
                        {selectedBadgeId && effectiveClass ? (
                            <div className="space-y-2.5 animate-in fade-in duration-150">
                                <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedBadgeId(null)
                                                setSelectedCategory('all')
                                            }}
                                            className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1 shrink-0"
                                        >
                                            <ArrowLeft className="h-3.5 w-3.5" />
                                            <span className="hidden sm:inline">Badges</span>
                                        </button>

                                        <span className="text-xl shrink-0">{effectiveClass.badgeIcon || '🪢'}</span>

                                        <div className="min-w-0">
                                            <h2 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                                                {effectiveClass.name}
                                            </h2>
                                        </div>

                                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 shrink-0">
                                            {effectiveClass.requirements.length} Tasks
                                        </span>
                                    </div>

                                    <div className="w-36 sm:w-52 shrink-0">
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-1.5 h-3 w-3 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Search scouts..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-7 pr-2 py-0.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-amber-600 font-medium"
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
                            /* Searchable Badge Catalog Grid (Sleek 2-col on mobile) */
                            <div className="space-y-2.5">
                                {/* Search Bar for Badges */}
                                <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
                                    <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    <input
                                        type="text"
                                        placeholder="Search badge (e.g. Knotter, 3akkad, First Aid, Chef)..."
                                        value={badgeSearchQuery}
                                        onChange={(e) => setBadgeSearchQuery(e.target.value)}
                                        className="w-full text-xs font-medium focus:outline-none"
                                    />
                                    {badgeSearchQuery && (
                                        <button onClick={() => setBadgeSearchQuery('')} className="text-xs text-slate-400 hover:text-slate-600">
                                            ✕
                                        </button>
                                    )}
                                </div>

                                {/* Badges Cards Grid */}
                                {filteredSpecialtyBadges.length === 0 ? (
                                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 space-y-2">
                                        <Sparkles className="h-6 w-6 mx-auto text-amber-500" />
                                        <h3 className="font-bold text-sm text-slate-900">
                                            {specialtyBadges.length === 0 ? 'No Specialty Badges' : `No badges matching "${badgeSearchQuery}"`}
                                        </h3>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                                        {filteredSpecialtyBadges.map((badge) => {
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
                                                    className="bg-white rounded-xl border border-slate-200 hover:border-amber-400 p-3 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-2 group"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-2xl shrink-0 group-hover:scale-110 transition-transform">
                                                            {badge.badgeIcon || '🪢'}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <h3 className="font-bold text-xs text-slate-900 truncate group-hover:text-amber-700">
                                                                {badge.name}
                                                            </h3>
                                                            <p className="text-[10px] text-slate-400 font-medium">
                                                                {badge.requirements.length} tasks
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                                                        <span
                                                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${awardedCount > 0
                                                                    ? 'bg-amber-100 text-amber-900'
                                                                    : 'bg-slate-100 text-slate-500'
                                                                }`}
                                                        >
                                                            ⭐ {awardedCount}
                                                        </span>

                                                        <span className="text-[10px] font-bold text-amber-700 flex items-center gap-0.5">
                                                            <span>Award</span>
                                                            <ChevronRight className="h-3 w-3" />
                                                        </span>
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
                        <div className="bg-white rounded-2xl p-4 sm:p-5 max-w-md w-full shadow-2xl border border-slate-100 space-y-3.5 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-900 flex items-center justify-center font-bold">
                                        <Paperclip className="h-3.5 w-3.5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-xs sm:text-sm text-slate-900">Task Evidence</h3>
                                        <p className="text-[10px] text-slate-500">
                                            {evidenceModalTarget.member.firstName} {evidenceModalTarget.member.lastName}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setEvidenceModalTarget(null)}
                                    className="p-1 text-slate-400 hover:text-slate-700"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Requirement Summary */}
                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-0.5">
                                <span className="text-[9px] font-bold text-teal-800 uppercase tracking-wider">
                                    {evidenceModalTarget.requirement.category}
                                </span>
                                <h4 className="font-bold text-xs text-slate-900">
                                    {evidenceModalTarget.requirement.title}
                                </h4>
                                {evidenceModalTarget.requirement.description && (
                                    <p className="text-[10px] text-slate-500 leading-relaxed">
                                        {evidenceModalTarget.requirement.description}
                                    </p>
                                )}
                            </div>

                            {/* Existing Evidence File View & Inline Preview */}
                            {evidenceModalTarget.record?.evidenceFileUrl && (
                                <div className="p-2.5 bg-teal-50/70 rounded-xl border border-teal-200 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-teal-800 shrink-0" />
                                            <span className="text-[11px] font-bold text-teal-950 truncate">Google Drive Proof</span>
                                        </div>
                                        <a
                                            href={evidenceModalTarget.record.evidenceFileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-2 py-0.5 bg-teal-800 hover:bg-teal-700 text-white rounded text-[10px] font-bold transition-colors flex items-center gap-1 shrink-0"
                                        >
                                            <ExternalLink className="h-2.5 w-2.5" />
                                            <span>Open File</span>
                                        </a>
                                    </div>

                                    <div className="rounded-lg overflow-hidden border border-teal-200/80 bg-white p-1 flex items-center justify-center">
                                        <img
                                            src={evidenceModalTarget.record.evidenceFileUrl}
                                            alt="Proof"
                                            className="max-h-40 rounded object-contain"
                                            onError={(e) => {
                                                (e.target as HTMLElement).style.display = 'none'
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSaveEvidence} className="space-y-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-700 mb-1">
                                        Upload Photo / Document (Drive Synced)
                                    </label>
                                    <input
                                        type="file"
                                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                        onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                                        className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:font-bold file:bg-teal-50 file:text-teal-800 hover:file:bg-teal-100 border border-slate-200 rounded-lg p-1"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-700 mb-1">
                                        Verification Notes
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="Field notes / feedback..."
                                        value={evidenceNotes}
                                        onChange={(e) => setEvidenceNotes(e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 font-medium focus:outline-none focus:border-teal-700"
                                    />
                                </div>

                                <div className="pt-1.5 border-t border-slate-100 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setEvidenceModalTarget(null)}
                                        className="flex-1 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-bold text-xs text-slate-700 hover:bg-slate-100"
                                    >
                                        Close
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isUploadingEvidence}
                                        className="flex-1 py-1.5 rounded-lg bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1"
                                    >
                                        {isUploadingEvidence ? 'Uploading...' : 'Save'}
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
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 space-y-1">
                <User className="h-6 w-6 mx-auto text-slate-300" />
                <h4 className="font-bold text-xs text-slate-800">No scouts found</h4>
            </div>
        )
    }

    if (requirements.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 space-y-1">
                <GraduationCap className="h-6 w-6 mx-auto text-slate-300" />
                <h4 className="font-bold text-xs text-slate-800">No tasks configured</h4>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
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
                        className={`bg-white rounded-xl border transition-all p-3 space-y-2 shadow-2xs ${isFullyCompleted
                                ? badgeMode
                                    ? 'border-amber-300 bg-amber-50/10'
                                    : 'border-emerald-300 bg-emerald-50/10'
                                : 'border-slate-200'
                            }`}
                    >
                        {/* Minimalist Scout Header */}
                        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
                                    {scout.firstName.charAt(0)}
                                    {scout.lastName.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1">
                                        <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                                            {scout.firstName} {scout.lastName}
                                        </h3>
                                        <Link
                                            href={`/group/dashboard/members?search=${encodeURIComponent(`${scout.firstName} ${scout.lastName}`)}`}
                                            className="text-slate-400 hover:text-teal-800 transition-colors p-0.5"
                                            title="View Dossier"
                                        >
                                            <ExternalLink className="h-2.5 w-2.5" />
                                        </Link>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium truncate">
                                        {scout.patrolName} • {scout.currentRank}
                                    </p>
                                </div>
                            </div>

                            {/* Progress Chip */}
                            <div className="text-right shrink-0">
                                <span
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black ${isFullyCompleted
                                            ? badgeMode
                                                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                                : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                            : 'bg-slate-100 text-slate-600'
                                        }`}
                                >
                                    {completedClassReqs}/{totalClassReqs} ({percent}%)
                                </span>
                            </div>
                        </div>

                        {/* Requirements Checklist */}
                        <div className="space-y-1 max-h-60 overflow-y-auto pr-0.5 scrollbar-thin">
                            {requirements.map((req) => {
                                const key = `${scout.id}_${req.id}`
                                const record = recordMap[key]
                                const isDone = !!record
                                const hasEvidence = !!(record?.evidenceFileUrl || record?.notes)
                                const isToggling = togglingReqKey === key

                                return (
                                    <div
                                        key={req.id}
                                        className={`p-1.5 rounded-lg border transition-all flex items-center justify-between gap-1.5 ${isDone
                                                ? 'bg-emerald-50/50 border-emerald-200'
                                                : 'bg-slate-50/60 border-slate-200/80 hover:border-slate-300'
                                            }`}
                                    >
                                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                            <button
                                                type="button"
                                                disabled={isToggling}
                                                onClick={() => onToggleRequirement(scout.id, req.id)}
                                                className={`w-4 h-4 rounded flex items-center justify-center font-bold transition-all shrink-0 ${isDone
                                                        ? 'bg-emerald-600 text-white'
                                                        : 'border border-slate-300 bg-white hover:border-teal-600'
                                                    }`}
                                            >
                                                {isDone && <Check className="h-2.5 w-2.5" />}
                                            </button>

                                            <div className="min-w-0 flex-1">
                                                <p
                                                    className={`text-[11px] leading-tight truncate ${isDone ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                                                        }`}
                                                >
                                                    {req.title}
                                                </p>
                                            </div>

                                            <span className="text-[9px] font-bold text-teal-800 bg-teal-50 px-1 py-0.2 rounded shrink-0">
                                                {req.category}
                                            </span>
                                        </div>

                                        {/* Evidence / Notes Button */}
                                        <button
                                            type="button"
                                            onClick={() => onOpenEvidence(scout, req)}
                                            className={`p-1 rounded transition-colors shrink-0 ${hasEvidence
                                                    ? 'bg-teal-800 text-white'
                                                    : 'text-slate-400 hover:text-teal-800'
                                                }`}
                                            title={hasEvidence ? 'View attached evidence' : 'Attach evidence'}
                                        >
                                            <Paperclip className="h-3 w-3" />
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
