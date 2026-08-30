'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardShell from '../DashboardShell'
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Copy,
  Printer,
  Share2,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Users,
  Search,
  BookOpen,
  Check,
  MapPin,
  Flame,
  Music,
  Tent,
  Smile,
  Hammer,
  Shield,
  FileText,
  ExternalLink,
  MessageSquare
} from 'lucide-react'

// ── Types ──
export interface ScheduleBlock {
  id: string
  category: 'ceremony' | 'game' | 'workshop' | 'snack' | 'council' | 'song' | 'closing'
  title: string
  description?: string
  durationMin: number
  leadLeaderId?: string
  leadLeaderName?: string
  materials?: string
}

export interface MaterialItem {
  id: string
  itemName: string
  quantity?: string
  assignedLeader?: string
  isReady: boolean
}

export interface MeetingPlan {
  id: string
  group_id: string
  troop_id: string
  event_id?: string | null
  title: string
  theme?: string | null
  objectives?: string | null
  meeting_date: string
  start_time: string
  end_time: string
  location?: string | null
  schedule_blocks: ScheduleBlock[]
  materials_checklist: MaterialItem[]
  is_published?: boolean
  created_at?: string
  troops?: { id: string; name: string }
  profiles?: { id: string; full_name: string }
}

interface TroopOption {
  id: string
  name: string
  sectionName: string
}

interface LeaderOption {
  id: string
  fullName: string
  role: string
  troopId?: string | null
}

interface Props {
  groupName: string
  groupId: string
  currentRole: string
  userName: string
  userId: string
  userTroopId: string | null
  troops: TroopOption[]
  leaders: LeaderOption[]
  initialPlans: MeetingPlan[]
}

// ── Standard Category Configs ──
const CATEGORIES: Record<
  ScheduleBlock['category'],
  { label: string; icon: string; bg: string; text: string; border: string }
> = {
  ceremony: {
    label: 'Rassemblement & Prière',
    icon: '⚜️',
    bg: 'bg-indigo-50',
    text: 'text-indigo-800',
    border: 'border-indigo-200',
  },
  game: {
    label: 'Grand Jeu / Animation',
    icon: '🏃',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
  workshop: {
    label: 'Atelier / Technique',
    icon: '🛠️',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
  },
  snack: {
    label: 'Goûter / Pause',
    icon: '🍪',
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-200',
  },
  council: {
    label: 'Conseil de Patrouille',
    icon: '⛺',
    bg: 'bg-teal-50',
    text: 'text-teal-800',
    border: 'border-teal-200',
  },
  song: {
    label: 'Chant / Expression',
    icon: '🎵',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
  },
  closing: {
    label: 'Rassemblement Final',
    icon: '🏁',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
  },
}

// ── Preset Templates ──
const PRESET_TEMPLATES = [
  {
    id: 'meute-2h',
    title: 'Louveteaux & Meute (2h Standard)',
    section: 'meute',
    durationMin: 120,
    startTime: '14:00',
    endTime: '16:00',
    theme: 'Chasse au Rocher du Conseil',
    objectives: 'Cohésion de sizaine, apprentissage du noeud plat, et jeu d’agilité.',
    blocks: [
      {
        id: 'b1',
        category: 'ceremony' as const,
        title: 'Rassemblement & Cri de Meute',
        description: 'Inspection des uniformes, prière de saint François, salut au mât.',
        durationMin: 15,
        materials: 'Drapeau de Meute, carnets',
      },
      {
        id: 'b2',
        category: 'game' as const,
        title: 'Grand Jeu de Chasse (Relais & Agilité)',
        description: 'Jeu des 4 coins dans la forêt avec obstacles par sizaine.',
        durationMin: 35,
        materials: 'Foulards de jeu, 4 balises, sifflet',
      },
      {
        id: 'b3',
        category: 'workshop' as const,
        title: 'Atelier Étoiles & Nœuds',
        description: 'Apprentissage du nœud plat et nœud de vache pour la 1ère étoile.',
        durationMin: 35,
        materials: 'Cordes individuelles (1 par louveteau)',
      },
      {
        id: 'b4',
        category: 'snack' as const,
        title: 'Goûter & Conseil de Sizaine',
        description: 'Partage du goûter et bilan des points de sizaine.',
        durationMin: 20,
        materials: 'Biscuits, jus de fruits, poubelle',
      },
      {
        id: 'b5',
        category: 'closing' as const,
        title: 'Rassemblement Final & Clôture',
        description: 'Attribution du gibier d’honneur, prière scoute et départ.',
        durationMin: 15,
        materials: '',
      },
    ],
  },
  {
    id: 'troupe-2h30',
    title: 'Éclaireurs & Troupe (2h30 Technique & Patrouille)',
    section: 'troupe',
    durationMin: 150,
    startTime: '14:00',
    endTime: '16:30',
    theme: 'Pionniers & Froissartage',
    objectives: 'Maîtrise des brelages carrés et travail autonome des patrouilles.',
    blocks: [
      {
        id: 'b1',
        category: 'ceremony' as const,
        title: 'Rassemblement & Inspection de Troupe',
        description: 'Alignement par patrouille, inspection des tenues, prière scoute.',
        durationMin: 15,
        materials: 'Étendard de Troupe, staff de patrouille',
      },
      {
        id: 'b2',
        category: 'game' as const,
        title: 'Grand Jeu Stratégique de Troupe',
        description: 'Jeu de prise d’étendard et repérage topographique.',
        durationMin: 45,
        materials: 'Boussoles, fanions de patrouille, sifflet',
      },
      {
        id: 'b3',
        category: 'workshop' as const,
        title: 'Atelier Froissartage & Brelages',
        description: 'Construction d’une table à feu miniature en bois de perche.',
        durationMin: 45,
        materials: 'Perches de bois, ficelle sisal, scies',
      },
      {
        id: 'b4',
        category: 'council' as const,
        title: 'Conseil de Patrouille & Goûter',
        description: 'Préparation du prochain camp de patrouille et goûter.',
        durationMin: 25,
        materials: 'Carnet de patrouille',
      },
      {
        id: 'b5',
        category: 'closing' as const,
        title: 'Rassemblement Final & Chant de Troupe',
        description: 'Proclamation des points de la semaine, prière scoute.',
        durationMin: 20,
        materials: '',
      },
    ],
  },
]

export default function PlannerManagement({
  groupName,
  groupId,
  currentRole,
  userName,
  userId,
  userTroopId,
  troops,
  leaders,
  initialPlans,
}: Props) {
  const router = useRouter()

  // Permissions
  const isCouncil =
    currentRole === 'chef_groupe' ||
    currentRole === 'assistant_chef_groupe' ||
    currentRole === 'amin_serr_group'
  const isTroopLeader =
    currentRole === 'ka2ed_fer2a' || currentRole === 'mouse3ed_ka2ed_fer2a'
  const canEditAny = isCouncil
  const effectiveTroopId = isTroopLeader ? userTroopId || troops[0]?.id : null

  // State
  const [plans, setPlans] = useState<MeetingPlan[]>(initialPlans)
  const [selectedTroopFilter, setSelectedTroopFilter] = useState<string>(
    effectiveTroopId || 'all'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [statusMessage, setStatusMessage] = useState<{
    text: string
    type: 'success' | 'error'
  } | null>(null)
  const [loading, setLoading] = useState(false)

  // Active View: 'list' | 'editor'
  const [activeView, setActiveView] = useState<'list' | 'editor'>('list')
  const [editingPlan, setEditingPlan] = useState<MeetingPlan | null>(null)
  const [isNewPlan, setIsNewPlan] = useState(false)

  // Modals
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false)
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false)
  const [duplicateTargetDate, setDuplicateTargetDate] = useState('')
  const [duplicateTargetTroop, setDuplicateTargetTroop] = useState('')
  const [planToDuplicate, setPlanToDuplicate] = useState<MeetingPlan | null>(null)
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false)

  // Real-time ticking for current block
  const [currentTimeStr, setCurrentTimeStr] = useState('')
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      setCurrentTimeStr(`${hh}:${mm}`)
    }
    updateTime()
    const timer = setInterval(updateTime, 30000)
    return () => clearInterval(timer)
  }, [])

  const showStatus = (text: string, type: 'success' | 'error') => {
    setStatusMessage({ text, type })
    setTimeout(() => setStatusMessage(null), 5000)
  }

  // ── Helper: Format Time Computations ──
  const addMinutesToTime = (timeStr: string, minutes: number): string => {
    const [hh, mm] = (timeStr || '14:00').split(':').map(Number)
    const totalMin = (hh || 0) * 60 + (mm || 0) + minutes
    const newH = Math.floor(totalMin / 60) % 24
    const newM = totalMin % 60
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
  }

  // Compute block time spans dynamically
  const computedBlockTimes = useMemo(() => {
    if (!editingPlan) return []
    let currentStart = editingPlan.start_time || '14:00'
    return (editingPlan.schedule_blocks || []).map((b) => {
      const start = currentStart
      const end = addMinutesToTime(start, Number(b.durationMin) || 15)
      currentStart = end
      return { id: b.id, start, end }
    })
  }, [editingPlan?.start_time, editingPlan?.schedule_blocks])

  // Total computed duration of current meeting
  const totalMeetingDuration = useMemo(() => {
    if (!editingPlan?.schedule_blocks) return 0
    return editingPlan.schedule_blocks.reduce(
      (acc, b) => acc + (Number(b.durationMin) || 0),
      0
    )
  }, [editingPlan?.schedule_blocks])

  // Live "On-Duty" block computation
  const liveActiveBlock = useMemo(() => {
    if (!editingPlan || !currentTimeStr) return null
    const todayStr = new Date().toISOString().split('T')[0]
    if (editingPlan.meeting_date !== todayStr) return null

    for (let i = 0; i < (editingPlan.schedule_blocks || []).length; i++) {
      const block = editingPlan.schedule_blocks[i]
      const timing = computedBlockTimes[i]
      if (
        timing &&
        currentTimeStr >= timing.start &&
        currentTimeStr < timing.end
      ) {
        // Calculate minutes remaining
        const [currH, currM] = currentTimeStr.split(':').map(Number)
        const [endH, endM] = timing.end.split(':').map(Number)
        const rem = endH * 60 + endM - (currH * 60 + currM)
        return {
          block,
          timing,
          minutesLeft: Math.max(1, rem),
          nextBlock: editingPlan.schedule_blocks[i + 1] || null,
        }
      }
    }
    return null
  }, [editingPlan, currentTimeStr, computedBlockTimes])

  // ── Handlers: Create & Edit Plan ──
  const handleOpenNewPlan = (template?: (typeof PRESET_TEMPLATES)[0]) => {
    const targetTroop = effectiveTroopId || troops[0]?.id || ''
    const todayStr = new Date().toISOString().split('T')[0]

    let initialBlocks: ScheduleBlock[] = []
    let theme = ''
    let objectives = ''
    let start = '14:00'
    let end = '16:30'

    if (template) {
      theme = template.theme
      objectives = template.objectives
      start = template.startTime
      end = template.endTime
      initialBlocks = template.blocks.map((b, i) => ({
        id: `blk-${Date.now()}-${i}`,
        category: b.category,
        title: b.title,
        description: b.description,
        durationMin: b.durationMin,
        leadLeaderId: userId,
        leadLeaderName: userName,
        materials: b.materials,
      }))
    } else {
      initialBlocks = [
        {
          id: `blk-${Date.now()}-1`,
          category: 'ceremony',
          title: 'Rassemblement & Prière',
          description: 'Inspection des tenues et prière scoute.',
          durationMin: 15,
          leadLeaderId: userId,
          leadLeaderName: userName,
        },
        {
          id: `blk-${Date.now()}-2`,
          category: 'game',
          title: 'Grand Jeu de Troupe',
          description: 'Jeu dynamique de plein air.',
          durationMin: 45,
          leadLeaderId: userId,
          leadLeaderName: userName,
        },
        {
          id: `blk-${Date.now()}-3`,
          category: 'closing',
          title: 'Rassemblement Final & Clôture',
          description: 'Bilan de la séance et prière finale.',
          durationMin: 15,
          leadLeaderId: userId,
          leadLeaderName: userName,
        },
      ]
    }

    const newPlanObj: MeetingPlan = {
      id: `draft-${Date.now()}`,
      group_id: groupId,
      troop_id: targetTroop,
      title: template ? template.title : 'Séance Hebdomadaire (Canevas)',
      theme: theme || 'Progression & Esprit Scout',
      objectives: objectives || 'Cohésion de patrouille et techniques scoutes.',
      meeting_date: todayStr,
      start_time: start,
      end_time: end,
      location: 'Local du Groupe',
      schedule_blocks: initialBlocks,
      materials_checklist: [],
      is_published: true,
    }

    setEditingPlan(newPlanObj)
    setIsNewPlan(true)
    setIsTemplateModalOpen(false)
    setActiveView('editor')
  }

  const handleOpenEditPlan = (plan: MeetingPlan) => {
    setEditingPlan({ ...plan })
    setIsNewPlan(false)
    setActiveView('editor')
  }

  // ── Block Mutations in Editor ──
  const handleAddBlock = () => {
    if (!editingPlan) return
    const newBlock: ScheduleBlock = {
      id: `blk-${Date.now()}`,
      category: 'workshop',
      title: 'Nouvelle Activité / Atelier',
      description: '',
      durationMin: 20,
      leadLeaderId: userId,
      leadLeaderName: userName,
      materials: '',
    }
    const updated = [...(editingPlan.schedule_blocks || []), newBlock]
    const newEndTime = addMinutesToTime(
      editingPlan.start_time,
      updated.reduce((acc, b) => acc + (Number(b.durationMin) || 0), 0)
    )
    setEditingPlan({
      ...editingPlan,
      schedule_blocks: updated,
      end_time: newEndTime,
    })
  }

  const handleUpdateBlock = (
    index: number,
    field: keyof ScheduleBlock,
    val: any
  ) => {
    if (!editingPlan) return
    const blocks = [...editingPlan.schedule_blocks]
    blocks[index] = { ...blocks[index], [field]: val }

    // If duration changed, recompute meeting end time
    let newEndTime = editingPlan.end_time
    if (field === 'durationMin') {
      const totalMin = blocks.reduce(
        (acc, b) => acc + (Number(b.durationMin) || 0),
        0
      )
      newEndTime = addMinutesToTime(editingPlan.start_time, totalMin)
    }

    setEditingPlan({
      ...editingPlan,
      schedule_blocks: blocks,
      end_time: newEndTime,
    })
  }

  const handleRemoveBlock = (index: number) => {
    if (!editingPlan) return
    const blocks = editingPlan.schedule_blocks.filter((_, i) => i !== index)
    const totalMin = blocks.reduce(
      (acc, b) => acc + (Number(b.durationMin) || 0),
      0
    )
    const newEndTime = addMinutesToTime(editingPlan.start_time, totalMin)
    setEditingPlan({
      ...editingPlan,
      schedule_blocks: blocks,
      end_time: newEndTime,
    })
  }

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    if (!editingPlan) return
    const blocks = [...editingPlan.schedule_blocks]
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= blocks.length) return
    const temp = blocks[index]
    blocks[index] = blocks[targetIdx]
    blocks[targetIdx] = temp
    setEditingPlan({ ...editingPlan, schedule_blocks: blocks })
  }

  // ── Materials Checklist Mutations ──
  const handleAddMaterialItem = () => {
    if (!editingPlan) return
    const newItem: MaterialItem = {
      id: `mat-${Date.now()}`,
      itemName: '',
      quantity: '1',
      assignedLeader: userName,
      isReady: false,
    }
    setEditingPlan({
      ...editingPlan,
      materials_checklist: [...(editingPlan.materials_checklist || []), newItem],
    })
  }

  const handleUpdateMaterialItem = (
    index: number,
    field: keyof MaterialItem,
    val: any
  ) => {
    if (!editingPlan) return
    const list = [...(editingPlan.materials_checklist || [])]
    list[index] = { ...list[index], [field]: val }
    setEditingPlan({ ...editingPlan, materials_checklist: list })
  }

  const handleRemoveMaterialItem = (index: number) => {
    if (!editingPlan) return
    const list = (editingPlan.materials_checklist || []).filter(
      (_, i) => i !== index
    )
    setEditingPlan({ ...editingPlan, materials_checklist: list })
  }

  // ── Save Plan (POST / PUT) ──
  const handleSavePlan = async () => {
    if (!editingPlan) return
    if (!editingPlan.title.trim()) {
      return showStatus('Please enter a meeting title.', 'error')
    }
    if (!editingPlan.troop_id) {
      return showStatus('Please select a target Troop unit.', 'error')
    }

    setLoading(true)
    try {
      if (isNewPlan) {
        const res = await fetch('/api/group/planner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupId,
            troopId: editingPlan.troop_id,
            eventId: editingPlan.event_id,
            title: editingPlan.title,
            theme: editingPlan.theme,
            objectives: editingPlan.objectives,
            meetingDate: editingPlan.meeting_date,
            startTime: editingPlan.start_time,
            endTime: editingPlan.end_time,
            location: editingPlan.location,
            scheduleBlocks: editingPlan.schedule_blocks,
            materialsChecklist: editingPlan.materials_checklist,
            isPublished: true,
          }),
        })
        const data = await res.json()
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to save')
        setPlans((prev) => [data.plan, ...prev])
        setEditingPlan(data.plan)
        setIsNewPlan(false)
        showStatus('Meeting plan (Canevas) created successfully!', 'success')
      } else {
        const res = await fetch('/api/group/planner', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingPlan.id,
            eventId: editingPlan.event_id,
            title: editingPlan.title,
            theme: editingPlan.theme,
            objectives: editingPlan.objectives,
            meetingDate: editingPlan.meeting_date,
            startTime: editingPlan.start_time,
            endTime: editingPlan.end_time,
            location: editingPlan.location,
            scheduleBlocks: editingPlan.schedule_blocks,
            materialsChecklist: editingPlan.materials_checklist,
            isPublished: editingPlan.is_published ?? true,
          }),
        })
        const data = await res.json()
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to update')
        setPlans((prev) =>
          prev.map((p) => (p.id === editingPlan.id ? { ...p, ...data.plan } : p))
        )
        showStatus('Meeting plan updated successfully!', 'success')
      }
    } catch (err: any) {
      showStatus(err.message || 'Error saving plan.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ── Delete Plan ──
  const handleDeletePlan = async (id: string) => {
    if (!confirm('Are you sure you want to delete this meeting canevas?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/group/planner?id=${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
      setPlans((prev) => prev.filter((p) => p.id !== id))
      showStatus('Meeting plan deleted.', 'success')
      if (editingPlan?.id === id) {
        setActiveView('list')
        setEditingPlan(null)
      }
    } catch (err: any) {
      showStatus(err.message || 'Error deleting plan.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ── Duplicate Plan ──
  const handleOpenDuplicate = (plan: MeetingPlan) => {
    setPlanToDuplicate(plan)
    // Default next week
    const curr = new Date(plan.meeting_date)
    curr.setDate(curr.getDate() + 7)
    setDuplicateTargetDate(curr.toISOString().split('T')[0])
    setDuplicateTargetTroop(plan.troop_id)
    setIsDuplicateModalOpen(true)
  }

  const handleExecuteDuplicate = async () => {
    if (!planToDuplicate || !duplicateTargetDate) return
    setLoading(true)
    try {
      const res = await fetch('/api/group/planner/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePlanId: planToDuplicate.id,
          targetDate: duplicateTargetDate,
          targetTroopId: duplicateTargetTroop,
          targetTitle: `${planToDuplicate.title} (Next Week)`,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to duplicate')
      setPlans((prev) => [data.plan, ...prev])
      setIsDuplicateModalOpen(false)
      showStatus('Meeting plan duplicated for next week!', 'success')
      handleOpenEditPlan(data.plan)
    } catch (err: any) {
      showStatus(err.message || 'Error duplicating plan.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ── WhatsApp Briefing Formatter ──
  const formattedWhatsAppMessage = useMemo(() => {
    if (!editingPlan) return ''
    const troopObj = troops.find((t) => t.id === editingPlan.troop_id)
    const formattedDate = new Date(editingPlan.meeting_date).toLocaleDateString(
      'fr-FR',
      { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    )

    let msg = `⚜️ *${groupName.toUpperCase()} — CANEVAS DE RÉUNION* ⚜️\n`
    msg += `📅 *Date:* ${formattedDate}\n`
    msg += `🎯 *Unité:* ${troopObj?.name || 'Scouts'}\n`
    if (editingPlan.theme) msg += `📌 *Thème:* ${editingPlan.theme}\n`
    if (editingPlan.objectives) msg += `🎯 *Objectif:* ${editingPlan.objectives}\n`
    msg += `📍 *Lieu:* ${editingPlan.location || 'Local du Groupe'}\n`
    msg += `⏰ *Horaire:* ${editingPlan.start_time} – ${editingPlan.end_time} (${totalMeetingDuration} min)\n\n`

    msg += `📋 *DÉROULEMENT DU CANEVAS:*\n`
    ;(editingPlan.schedule_blocks || []).forEach((b, i) => {
      const timing = computedBlockTimes[i]
      const catConfig = CATEGORIES[b.category] || CATEGORIES.workshop
      const timeStr = timing ? `${timing.start} - ${timing.end}` : `${b.durationMin}m`
      msg += `• *${timeStr}* (${b.durationMin}m) | ${catConfig.icon} *${b.title}*\n`
      if (b.leadLeaderName) msg += `   👤 Resp: ${b.leadLeaderName}\n`
      if (b.description) msg += `   📝 ${b.description}\n`
      if (b.materials) msg += `   🎒 Matériel: ${b.materials}\n`
    })

    if ((editingPlan.materials_checklist || []).length > 0) {
      msg += `\n🎒 *MATÉRIEL & ÉQUIPEMENT REQUIS:*\n`
      editingPlan.materials_checklist.forEach((m) => {
        msg += `☑️ ${m.itemName} ${m.quantity ? `(${m.quantity})` : ''} — ${m.assignedLeader || 'Responsable'}\n`
      })
    }

    msg += `\n⚜️ *Soyons Prêts!*`
    return msg
  }, [editingPlan, computedBlockTimes, totalMeetingDuration, groupName, troops])

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(formattedWhatsAppMessage)
    setCopiedWhatsApp(true)
    setTimeout(() => setCopiedWhatsApp(false), 3000)
  }

  // ── Filtered Plans List ──
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (selectedTroopFilter !== 'all' && p.troop_id !== selectedTroopFilter) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = (p.title || '').toLowerCase().includes(q)
        const matchTheme = (p.theme || '').toLowerCase().includes(q)
        const matchDate = (p.meeting_date || '').includes(q)
        if (!matchTitle && !matchTheme && !matchDate) return false
      }
      return true
    })
  }, [plans, selectedTroopFilter, searchQuery])

  return (
    <DashboardShell
      groupName={groupName}
      currentRole={currentRole}
      userName={userName}
    >
      <div className="w-full pb-24 space-y-3">
        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-2xs animate-in fade-in ${
              statusMessage.type === 'success'
                ? 'bg-teal-900 text-white'
                : 'bg-rose-600 text-white'
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
            <button
              onClick={() => setStatusMessage(null)}
              className="opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── TOP HEADER CARD (Unified Minimalist Standard) ── */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0 shadow-2xs">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight truncate">
                Session Planner (Canevas)
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                Weekly meeting schedules, duties & gear
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {activeView === 'editor' ? (
              <button
                onClick={() => setActiveView('list')}
                className="bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold px-2.5 py-1.5 rounded-xl border border-slate-300 transition-all text-xs flex items-center gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-900 font-bold px-2.5 py-1.5 rounded-xl border border-amber-200 transition-all text-xs flex items-center gap-1 shadow-2xs"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-700" />
                  <span className="hidden sm:inline">Templates</span>
                </button>
                <button
                  onClick={() => handleOpenNewPlan()}
                  className="bg-teal-800 hover:bg-teal-700 active:scale-95 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-2xs transition-all flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Canevas</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            VIEW 1: LIST / DIRECTORY OF CANEVAS
        ══════════════════════════════════════════════════════════ */}
        {activeView === 'list' && (
          <>
            {/* Filter & Search Bar */}
            <div className="bg-white border border-slate-200/90 p-2.5 sm:p-3 rounded-2xl shadow-2xs space-y-2">
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by theme, title, or date…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium focus:border-teal-700 focus:outline-none"
                  />
                </div>

                {/* Troop Selector Chips (Mobile scrollable) */}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
                  <button
                    onClick={() => setSelectedTroopFilter('all')}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 transition-all ${
                      selectedTroopFilter === 'all'
                        ? 'bg-teal-800 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All Units ({plans.length})
                  </button>
                  {troops.map((t) => {
                    const count = plans.filter((p) => p.troop_id === t.id).length
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTroopFilter(t.id)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 transition-all ${
                          selectedTroopFilter === t.id
                            ? 'bg-teal-800 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {t.name} ({count})
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Plans List Grid */}
            {filteredPlans.length === 0 ? (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center space-y-3 shadow-2xs">
                <Clock className="h-10 w-10 text-slate-300 mx-auto" />
                <div>
                  <h3 className="text-sm font-bold text-slate-700">
                    No meeting plans found
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Prepare your troop meeting schedule with pre-built templates.
                  </p>
                </div>
                <button
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="bg-teal-800 hover:bg-teal-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-2xs inline-flex items-center gap-1.5 active:scale-95"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>Choose a Pre-Built Template</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {filteredPlans.map((plan) => {
                  const troopObj = troops.find((t) => t.id === plan.troop_id)
                  const blocksCount = (plan.schedule_blocks || []).length
                  const isToday =
                    plan.meeting_date ===
                    new Date().toISOString().split('T')[0]

                  return (
                    <div
                      key={plan.id}
                      className={`bg-white border rounded-2xl p-3.5 shadow-2xs transition-all space-y-2.5 flex flex-col justify-between ${
                        isToday
                          ? 'border-teal-400 ring-2 ring-teal-600/10'
                          : 'border-slate-200/90'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200">
                              {troopObj?.name || 'Unit'}
                            </span>
                            {isToday && (
                              <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-emerald-500 text-white animate-pulse">
                                TODAY
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-bold text-slate-500 font-mono">
                            {plan.start_time} - {plan.end_time}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-sm font-black text-slate-900 leading-tight">
                            {plan.title}
                          </h3>
                          {plan.theme && (
                            <p className="text-[11px] text-teal-900 font-medium mt-0.5 flex items-center gap-1">
                              <span>🎯</span>
                              <span className="truncate">{plan.theme}</span>
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(plan.meeting_date).toLocaleDateString(
                              'en-GB',
                              {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                              }
                            )}
                          </span>
                          <span>•</span>
                          <span>{blocksCount} activities</span>
                        </div>
                      </div>

                      {/* Action Strip */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenDuplicate(plan)}
                            className="p-1.5 text-slate-500 hover:text-teal-800 hover:bg-teal-50 rounded-lg transition-colors"
                            title="Duplicate for next week"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingPlan(plan)
                              setIsWhatsAppModalOpen(true)
                            }}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Share on WhatsApp"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </button>
                          {(canEditAny || plan.troop_id === effectiveTroopId) && (
                            <button
                              onClick={() => handleDeletePlan(plan.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete plan"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => handleOpenEditPlan(plan)}
                          className="bg-teal-800 hover:bg-teal-700 active:scale-95 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-2xs transition-all flex items-center gap-1"
                        >
                          <span>Open Canevas</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════
            VIEW 2: CANEVAS INTERACTIVE EDITOR
        ══════════════════════════════════════════════════════════ */}
        {activeView === 'editor' && editingPlan && (
          <div className="space-y-3">
            {/* LIVE ON-DUTY TICKER (If active meeting today) */}
            {liveActiveBlock && (
              <div className="bg-emerald-900 text-white p-3 rounded-2xl border border-emerald-700 shadow-sm flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                      Active Now • {liveActiveBlock.timing.start} –{' '}
                      {liveActiveBlock.timing.end}
                    </p>
                    <h4 className="text-xs sm:text-sm font-black truncate">
                      {liveActiveBlock.block.title}
                    </h4>
                    <p className="text-[10px] text-emerald-200">
                      Lead: {liveActiveBlock.block.leadLeaderName || 'Leader'}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm sm:text-base font-black px-2 py-0.5 rounded-lg bg-emerald-800 border border-emerald-600">
                    {liveActiveBlock.minutesLeft}m left
                  </span>
                </div>
              </div>
            )}

            {/* Meeting Meta Header Card */}
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Meeting Title / Subject
                  </label>
                  <input
                    type="text"
                    value={editingPlan.title}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, title: e.target.value })
                    }
                    placeholder="e.g. Séance Froissartage & Noeuds"
                    className="w-full mt-0.5 px-3 py-1.5 text-xs sm:text-sm font-black rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Scout Unit / Troop
                  </label>
                  <select
                    value={editingPlan.troop_id}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, troop_id: e.target.value })
                    }
                    className="w-full mt-0.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:border-teal-700 focus:outline-none"
                  >
                    {troops.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editingPlan.meeting_date}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        meeting_date: e.target.value,
                      })
                    }
                    className="w-full mt-0.5 px-2.5 py-1 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={editingPlan.start_time}
                    onChange={(e) => {
                      const newStart = e.target.value
                      const newEnd = addMinutesToTime(
                        newStart,
                        totalMeetingDuration
                      )
                      setEditingPlan({
                        ...editingPlan,
                        start_time: newStart,
                        end_time: newEnd,
                      })
                    }}
                    className="w-full mt-0.5 px-2.5 py-1 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    End Time ({totalMeetingDuration}m)
                  </label>
                  <input
                    type="time"
                    value={editingPlan.end_time}
                    readOnly
                    className="w-full mt-0.5 px-2.5 py-1 text-xs font-bold rounded-xl border border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Location
                  </label>
                  <input
                    type="text"
                    value={editingPlan.location || ''}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        location: e.target.value,
                      })
                    }
                    placeholder="Local du Groupe"
                    className="w-full mt-0.5 px-2.5 py-1 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Theme / Thème
                  </label>
                  <input
                    type="text"
                    value={editingPlan.theme || ''}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, theme: e.target.value })
                    }
                    placeholder="e.g. Aventure dans la Jungle"
                    className="w-full mt-0.5 px-2.5 py-1 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Educational Objectives / Pédagogie
                  </label>
                  <input
                    type="text"
                    value={editingPlan.objectives || ''}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        objectives: e.target.value,
                      })
                    }
                    placeholder="e.g. Noeuds de cabestan & esprit d'équipe"
                    className="w-full mt-0.5 px-2.5 py-1 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* ── SCHEDULE BLOCKS TIMELINE ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <span>Timeline Blocks</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-teal-50 text-teal-800">
                    {editingPlan.schedule_blocks.length} steps •{' '}
                    {totalMeetingDuration} mins
                  </span>
                </h3>

                <button
                  onClick={handleAddBlock}
                  className="bg-teal-800 hover:bg-teal-700 active:scale-95 text-white font-bold px-2.5 py-1 rounded-xl text-xs shadow-2xs flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Step</span>
                </button>
              </div>

              <div className="space-y-2">
                {editingPlan.schedule_blocks.map((block, idx) => {
                  const timing = computedBlockTimes[idx]
                  const catConfig =
                    CATEGORIES[block.category] || CATEGORIES.workshop

                  return (
                    <div
                      key={block.id}
                      className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs space-y-2 relative group"
                    >
                      {/* Top Row: Time badge + Category selector + Duration stepper + Actions */}
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[11px] font-black font-mono text-slate-800 px-2 py-0.5 rounded-lg bg-slate-100 shrink-0">
                            {timing ? `${timing.start} – ${timing.end}` : `${block.durationMin}m`}
                          </span>

                          <select
                            value={block.category}
                            onChange={(e) =>
                              handleUpdateBlock(
                                idx,
                                'category',
                                e.target.value as any
                              )
                            }
                            className={`text-xs font-black px-2 py-0.5 rounded-lg border focus:outline-none ${catConfig.bg} ${catConfig.text} ${catConfig.border}`}
                          >
                            {Object.entries(CATEGORIES).map(([key, cfg]) => (
                              <option key={key} value={key}>
                                {cfg.icon} {cfg.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Duration Fast Stepper & Reordering */}
                        <div className="flex items-center gap-1">
                          <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                            <button
                              onClick={() =>
                                handleUpdateBlock(
                                  idx,
                                  'durationMin',
                                  Math.max(5, Number(block.durationMin) - 5)
                                )
                              }
                              className="px-1.5 py-0.5 text-xs font-bold text-slate-600 hover:text-slate-900"
                            >
                              -
                            </button>
                            <span className="px-1 text-[11px] font-black text-slate-800 min-w-8 text-center">
                              {block.durationMin}m
                            </span>
                            <button
                              onClick={() =>
                                handleUpdateBlock(
                                  idx,
                                  'durationMin',
                                  Number(block.durationMin) + 5
                                )
                              }
                              className="px-1.5 py-0.5 text-xs font-bold text-slate-600 hover:text-slate-900"
                            >
                              +
                            </button>
                          </div>

                          <button
                            disabled={idx === 0}
                            onClick={() => handleMoveBlock(idx, 'up')}
                            className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30"
                            title="Move Up"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            disabled={
                              idx === editingPlan.schedule_blocks.length - 1
                            }
                            onClick={() => handleMoveBlock(idx, 'down')}
                            className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30"
                            title="Move Down"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => handleRemoveBlock(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Delete Step"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Middle: Title & Leader */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            value={block.title}
                            onChange={(e) =>
                              handleUpdateBlock(idx, 'title', e.target.value)
                            }
                            placeholder="Activity / Game Title..."
                            className="w-full px-2.5 py-1 text-xs font-black rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-700 focus:outline-none"
                          />
                        </div>

                        <div>
                          <select
                            value={block.leadLeaderId || ''}
                            onChange={(e) => {
                              const sel = leaders.find(
                                (l) => l.id === e.target.value
                              )
                              handleUpdateBlock(
                                idx,
                                'leadLeaderId',
                                e.target.value
                              )
                              handleUpdateBlock(
                                idx,
                                'leadLeaderName',
                                sel?.fullName || ''
                              )
                            }}
                            className="w-full px-2 py-1 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:border-teal-700 focus:outline-none"
                          >
                            <option value="">-- Assign Lead --</option>
                            {leaders.map((l) => (
                              <option key={l.id} value={l.id}>
                                👤 {l.fullName}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Bottom Row: Description & Gear */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <input
                          type="text"
                          value={block.description || ''}
                          onChange={(e) =>
                            handleUpdateBlock(idx, 'description', e.target.value)
                          }
                          placeholder="Instructions, rules or song title..."
                          className="w-full px-2.5 py-1 text-[11px] rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-700"
                        />
                        <input
                          type="text"
                          value={block.materials || ''}
                          onChange={(e) =>
                            handleUpdateBlock(idx, 'materials', e.target.value)
                          }
                          placeholder="🎒 Required materials (e.g. 4 ropes, ball)..."
                          className="w-full px-2.5 py-1 text-[11px] rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-700"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── MATERIALS & GEAR CHECKLIST ── */}
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <span>🎒 Gear & Materials Checklist</span>
                </h3>
                <button
                  onClick={handleAddMaterialItem}
                  className="bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold px-2 py-0.5 rounded-lg text-[11px] border border-slate-300 transition-all flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Add Item
                </button>
              </div>

              {(editingPlan.materials_checklist || []).length === 0 ? (
                <p className="text-[11px] text-slate-400 italic py-1">
                  No materials added yet. Click &quot;Add Item&quot; to assign ropes, balls, or kits to leaders.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {editingPlan.materials_checklist.map((mat, mIdx) => (
                    <div
                      key={mat.id}
                      className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200"
                    >
                      <button
                        onClick={() =>
                          handleUpdateMaterialItem(mIdx, 'isReady', !mat.isReady)
                        }
                        className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                          mat.isReady
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white border border-slate-300 text-transparent'
                        }`}
                      >
                        ✓
                      </button>

                      <input
                        type="text"
                        value={mat.itemName}
                        onChange={(e) =>
                          handleUpdateMaterialItem(mIdx, 'itemName', e.target.value)
                        }
                        placeholder="Item name (e.g. 5x Ropes)"
                        className="flex-1 px-2 py-0.5 text-xs font-bold bg-white rounded-lg border border-slate-200"
                      />

                      <input
                        type="text"
                        value={mat.quantity || ''}
                        onChange={(e) =>
                          handleUpdateMaterialItem(mIdx, 'quantity', e.target.value)
                        }
                        placeholder="Qty"
                        className="w-14 px-1.5 py-0.5 text-xs text-center bg-white rounded-lg border border-slate-200"
                      />

                      <input
                        type="text"
                        value={mat.assignedLeader || ''}
                        onChange={(e) =>
                          handleUpdateMaterialItem(
                            mIdx,
                            'assignedLeader',
                            e.target.value
                          )
                        }
                        placeholder="Leader responsible"
                        className="w-28 px-2 py-0.5 text-xs bg-white rounded-lg border border-slate-200"
                      />

                      <button
                        onClick={() => handleRemoveMaterialItem(mIdx)}
                        className="p-1 text-slate-400 hover:text-rose-600 shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── MOBILE STICKY ACTION BAR ── */}
            <div className="sticky bottom-3 z-30 bg-white/95 backdrop-blur-md p-2.5 rounded-2xl border border-slate-200/90 shadow-lg flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsWhatsAppModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-3 py-2 rounded-xl text-xs shadow-2xs flex items-center gap-1.5 transition-all"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">WhatsApp</span> Briefing
                </button>

                <button
                  onClick={() => window.print()}
                  className="bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold px-3 py-2 rounded-xl text-xs border border-slate-300 flex items-center gap-1.5 transition-all"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print A4</span>
                </button>
              </div>

              <button
                onClick={handleSavePlan}
                disabled={loading}
                className="bg-teal-800 hover:bg-teal-700 active:scale-95 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                <span>{loading ? 'Saving…' : 'Save Canevas'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            MODAL 1: PRE-BUILT TEMPLATES SELECTOR
        ══════════════════════════════════════════════════════════ */}
        {isTemplateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
            <div className="bg-white w-full max-w-lg p-4 sm:p-5 rounded-2xl shadow-xl space-y-3 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <h3 className="text-sm font-black text-slate-900">
                    Pre-Built Meeting Templates
                  </h3>
                </div>
                <button
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Choose a pre-filled scout meeting structure to jumpstart your weekly canevas:
              </p>

              <div className="space-y-2">
                {PRESET_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => handleOpenNewPlan(tmpl)}
                    className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-teal-700 hover:bg-teal-50/50 transition-all group space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-teal-900">
                        {tmpl.title}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-teal-100 text-teal-800">
                        {tmpl.durationMin} mins
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {tmpl.theme} • {tmpl.objectives}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 pt-1">
                      <span>{tmpl.blocks.length} timeline blocks:</span>
                      <span className="text-slate-600 font-bold truncate">
                        {tmpl.blocks.map((b) => b.title).join(' → ')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            MODAL 2: WHATSAPP STAFF BRIEFING
        ══════════════════════════════════════════════════════════ */}
        {isWhatsAppModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
            <div className="bg-white w-full max-w-lg p-4 sm:p-5 rounded-2xl shadow-xl space-y-3 max-h-[88vh] flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-black text-slate-900">
                    WhatsApp Staff Briefing
                  </h3>
                </div>
                <button
                  onClick={() => setIsWhatsAppModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Copy this formatted message to send directly to your leadership WhatsApp group:
              </p>

              <div className="flex-1 overflow-y-auto bg-slate-900 text-emerald-300 font-mono text-[11px] p-3 rounded-xl whitespace-pre-wrap select-all leading-relaxed">
                {formattedWhatsAppMessage}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsWhatsAppModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Close
                </button>
                <button
                  onClick={handleCopyWhatsApp}
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-2xs flex items-center gap-1.5"
                >
                  {copiedWhatsApp ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copy WhatsApp Briefing</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            MODAL 3: DUPLICATE TO NEXT WEEK
        ══════════════════════════════════════════════════════════ */}
        {isDuplicateModalOpen && planToDuplicate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
            <div className="bg-white w-full max-w-md p-4 sm:p-5 rounded-2xl shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Copy className="h-4 w-4 text-teal-800" />
                  <h3 className="text-sm font-black text-slate-900">
                    Duplicate Meeting Canevas
                  </h3>
                </div>
                <button
                  onClick={() => setIsDuplicateModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Clone all activities, durations, and materials from &ldquo;{planToDuplicate.title}&rdquo; to a new date.
              </p>

              <div className="space-y-2 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={duplicateTargetDate}
                    onChange={(e) => setDuplicateTargetDate(e.target.value)}
                    className="w-full mt-0.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Target Unit
                  </label>
                  <select
                    value={duplicateTargetTroop}
                    onChange={(e) => setDuplicateTargetTroop(e.target.value)}
                    className="w-full mt-0.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                  >
                    {troops.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsDuplicateModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteDuplicate}
                  disabled={loading}
                  className="bg-teal-800 hover:bg-teal-700 active:scale-95 text-white font-bold px-4 py-1.5 rounded-xl text-xs shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loading ? 'Duplicating…' : 'Duplicate & Open'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
