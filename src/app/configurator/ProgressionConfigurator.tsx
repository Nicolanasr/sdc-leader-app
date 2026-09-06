'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Layers,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  X,
  Smile,
  Copy,
  Search,
  Check,
  ChevronsUpDown,
} from 'lucide-react'

interface SectionType {
  id: string
  name: string
  min_age: number | null
  max_age: number | null
}

interface ProgressionRequirement {
  id: string
  class_id: string
  category: string
  title: string
  description?: string | null
  sort_order: number
}

interface ProgressionClass {
  id: string
  section_type_id: string
  name: string
  badge_icon: string
  sort_order: number
  class_type?: 'rank' | 'specialty'
  progression_requirements?: ProgressionRequirement[]
}

interface Props {
  sections: SectionType[]
}

const BADGE_ICONS = [
  '⚜️', '🪢', '🚑', '🧭', '⛺', '🍳', '🏊‍♂️', '🎨', '🌲', '🔥', '🏹', '🧗',
  '🐺', '🌟', '🎖️', '👑', '🏅', '🏆', '⚓', '🌿', '🪵', '🔦', '📷', '🛠️', '🎵',
  '🗺️', '🥋', '🤿', '🎯', '📻', '⛵', '🧑‍💻', '🚲', '⚽', '🏃‍♂️', '🩺', '🌍'
]

const SPECIALTY_BADGE_PRESETS = [
  { name: 'العقّاد (Al 3akkad - Knotter)', icon: '🪢' },
  { name: 'المسعف (Al Mosa3ef - First Aid)', icon: '🚑' },
  { name: 'الدليل (Al Dalil - Navigator)', icon: '🧭' },
  { name: 'المخيّم (Al Mokhayyem - Camper)', icon: '⛺' },
  { name: 'الطبّاخ (Al Tabakh - Camp Chef)', icon: '🍳' },
  { name: 'السبّاح (Al Sabeeh - Swimmer)', icon: '🏊‍♂️' },
  { name: 'رجل النار (Al Naar - Firecraft)', icon: '🔥' },
  { name: 'حارس الغابة (Al Ghaba - Forestry)', icon: '🌲' },
  { name: 'الفنّان (Al Fannan - Artist)', icon: '🎨' },
  { name: 'المنشد (Al Mounched - Song Leader)', icon: '🎵' },
  { name: 'الرائد (Al Raed - Pioneer)', icon: '🪵' },
  { name: 'المصور (Al Mosawwer - Photographer)', icon: '📷' },
]

export default function ProgressionConfigurator({ sections }: Props) {
  const [selectedSectionId, setSelectedSectionId] = useState<string>(sections[0]?.id || '')
  const [curriculumView, setCurriculumView] = useState<'rank' | 'specialty'>('rank')
  const [classes, setClasses] = useState<ProgressionClass[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // 40+ Requirements Navigation & Filtering
  const [reqSearchQuery, setReqSearchQuery] = useState('')
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({})

  // Class Modal State
  const [isClassModalOpen, setIsClassModalOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<ProgressionClass | null>(null)
  const [classNameInput, setClassNameInput] = useState('')
  const [classIconInput, setClassIconInput] = useState('⚜️')
  const [classTypeInput, setClassTypeInput] = useState<'rank' | 'specialty'>('rank')
  const [classSortInput, setClassSortInput] = useState(0)

  // Requirement Modal State
  const [isReqModalOpen, setIsReqModalOpen] = useState(false)
  const [editingReq, setEditingReq] = useState<ProgressionRequirement | null>(null)
  const [reqCategoryInput, setReqCategoryInput] = useState('')
  const [reqTitleInput, setReqTitleInput] = useState('')
  const [reqDescInput, setReqDescInput] = useState('')
  const [reqSortInput, setReqSortInput] = useState(0)

  // Clone / Duplicate Modal State
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false)
  const [cloneTargetSectionId, setCloneTargetSectionId] = useState('')
  const [cloneNewClassName, setCloneNewClassName] = useState('')
  const [isCloning, setIsCloning] = useState(false)

  const showStatus = (text: string, type: 'success' | 'error') => {
    setStatusMessage({ text, type })
    setTimeout(() => setStatusMessage(null), 4000)
  }

  // Fetch classes when selectedSectionId changes
  const fetchClasses = async (sectionId: string) => {
    if (!sectionId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/configurator/progression/classes?sectionTypeId=${sectionId}`)
      const data = await res.json()
      if (data.classes) {
        setClasses(data.classes)
        if (data.classes.length > 0) {
          if (!selectedClassId || !data.classes.some((c: any) => c.id === selectedClassId)) {
            setSelectedClassId(data.classes[0].id)
          }
        } else {
          setSelectedClassId(null)
        }
      }
    } catch (err: any) {
      console.error('[ProgressionConfigurator] Fetch error:', err)
      showStatus('Failed to load curriculum data.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedSectionId) {
      fetchClasses(selectedSectionId)
    }
  }, [selectedSectionId])

  const displayedClasses = useMemo(() => {
    return classes.filter((c) => (c.class_type || 'rank') === curriculumView)
  }, [classes, curriculumView])

  const currentClass = useMemo(() => {
    const found = displayedClasses.find((c) => c.id === selectedClassId)
    return found || displayedClasses[0] || null
  }, [displayedClasses, selectedClassId])

  // Collect all unique categories across this section and current class for autocomplete
  const existingCategories = useMemo(() => {
    const cats = new Set<string>()
    classes.forEach((c) => {
      c.progression_requirements?.forEach((r) => {
        if (r.category) cats.add(r.category.trim())
      })
    })
    return Array.from(cats)
  }, [classes])

  // Filter and group current class requirements (optimized for 40+ items)
  const requirementsByCategory = useMemo(() => {
    if (!currentClass || !currentClass.progression_requirements) return {}
    const grouped: Record<string, ProgressionRequirement[]> = {}
    const q = reqSearchQuery.toLowerCase().trim()

    currentClass.progression_requirements
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .filter((r) => {
        if (!q) return true
        return (
          r.title.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q))
        )
      })
      .forEach((r) => {
        const cat = r.category || 'General'
        if (!grouped[cat]) grouped[cat] = []
        grouped[cat].push(r)
      })
    return grouped
  }, [currentClass, reqSearchQuery])

  // Toggle Category Collapsed state
  const toggleCategoryCollapse = (cat: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }))
  }

  const handleToggleAllCategories = (collapse: boolean) => {
    const next: Record<string, boolean> = {}
    Object.keys(requirementsByCategory).forEach((cat) => {
      next[cat] = collapse
    })
    setCollapsedCategories(next)
  }

  // ── Class Form Handlers ──
  const handleOpenAddClass = (typeOverride?: 'rank' | 'specialty') => {
    const targetType = typeOverride || curriculumView
    setEditingClass(null)
    setClassNameInput('')
    setClassIconInput(targetType === 'specialty' ? '🪢' : '⚜️')
    setClassTypeInput(targetType)
    setClassSortInput(displayedClasses.length)
    setIsClassModalOpen(true)
  }

  const handleOpenEditClass = (cls: ProgressionClass) => {
    setEditingClass(cls)
    setClassNameInput(cls.name)
    setClassIconInput(cls.badge_icon || (cls.class_type === 'specialty' ? '🪢' : '⚜️'))
    setClassTypeInput(cls.class_type || 'rank')
    setClassSortInput(cls.sort_order)
    setIsClassModalOpen(true)
  }

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classNameInput.trim() || !selectedSectionId) return

    setLoading(true)
    try {
      if (editingClass) {
        // Update
        const res = await fetch('/api/configurator/progression/classes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingClass.id,
            name: classNameInput.trim(),
            badge_icon: classIconInput.trim() || '⚜️',
            class_type: classTypeInput,
            sort_order: classSortInput,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to update class')
        showStatus('Saved successfully!', 'success')
      } else {
        // Create
        const res = await fetch('/api/configurator/progression/classes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            section_type_id: selectedSectionId,
            name: classNameInput.trim(),
            badge_icon: classIconInput.trim() || '⚜️',
            class_type: classTypeInput,
            sort_order: classSortInput,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create class')
        showStatus('Created successfully!', 'success')
      }

      setIsClassModalOpen(false)
      fetchClasses(selectedSectionId)
    } catch (err: any) {
      showStatus(err.message || 'Error saving class.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClass = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}" and all its requirements? This action cannot be undone.`)) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/configurator/progression/classes?id=${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete class')
      showStatus(`Deleted "${name}" successfully.`, 'success')
      fetchClasses(selectedSectionId)
    } catch (err: any) {
      showStatus(err.message || 'Error deleting class.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ── Clone / Duplicate Class Handler ──
  const handleOpenCloneModal = (cls: ProgressionClass) => {
    const otherSections = sections.filter((s) => s.id !== selectedSectionId)
    setCloneTargetSectionId(otherSections[0]?.id || '')
    setCloneNewClassName(cls.name)
    setIsCloneModalOpen(true)
  }

  const handleExecuteClone = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentClass || !cloneTargetSectionId) return

    setIsCloning(true)
    try {
      const res = await fetch('/api/configurator/progression/classes/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_class_id: currentClass.id,
          target_section_type_id: cloneTargetSectionId,
          new_class_name: cloneNewClassName.trim() || currentClass.name,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to clone stage.')
      }

      showStatus(data.message || 'Stage and requirements duplicated successfully!', 'success')
      setIsCloneModalOpen(false)
    } catch (err: any) {
      console.error('[Clone Error]:', err)
      showStatus(err.message || 'Error cloning stage.', 'error')
    } finally {
      setIsCloning(false)
    }
  }

  // ── Requirement Form Handlers ──
  const handleOpenAddReq = (prefillCategory?: string) => {
    setEditingReq(null)
    setReqCategoryInput(prefillCategory || '')
    setReqTitleInput('')
    setReqDescInput('')
    const count = currentClass?.progression_requirements?.length || 0
    setReqSortInput(count)
    setIsReqModalOpen(true)
  }

  const handleOpenEditReq = (req: ProgressionRequirement) => {
    setEditingReq(req)
    setReqCategoryInput(req.category)
    setReqTitleInput(req.title)
    setReqDescInput(req.description || '')
    setReqSortInput(req.sort_order)
    setIsReqModalOpen(true)
  }

  const handleSaveReq = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentClass || !reqTitleInput.trim() || !reqCategoryInput.trim()) return

    setLoading(true)
    try {
      if (editingReq) {
        // Update
        const res = await fetch('/api/configurator/progression/requirements', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingReq.id,
            category: reqCategoryInput.trim(),
            title: reqTitleInput.trim(),
            description: reqDescInput.trim() || null,
            sort_order: reqSortInput,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to update requirement')
        showStatus('Requirement updated successfully!', 'success')
      } else {
        // Create
        const res = await fetch('/api/configurator/progression/requirements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            class_id: currentClass.id,
            category: reqCategoryInput.trim(),
            title: reqTitleInput.trim(),
            description: reqDescInput.trim() || null,
            sort_order: reqSortInput,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create requirement')
        showStatus('Requirement added successfully!', 'success')
      }

      setIsReqModalOpen(false)
      fetchClasses(selectedSectionId)
    } catch (err: any) {
      showStatus(err.message || 'Error saving requirement.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteReq = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/configurator/progression/requirements?id=${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete requirement')
      showStatus(`Requirement deleted.`, 'success')
      fetchClasses(selectedSectionId)
    } catch (err: any) {
      showStatus(err.message || 'Error deleting requirement.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const totalCurrentReqs = currentClass?.progression_requirements?.length || 0

  return (
    <div className="space-y-6 pb-12">
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

      {/* Header card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Scout Curriculum & Progression</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800">
                Superadmin
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Configure ranks, specialty badges, categories & requirements bound to section types
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenAddClass('rank')}
            className="bg-teal-800 hover:bg-teal-700 active:scale-95 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add Rank Stage</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenAddClass('specialty')}
            className="bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 shrink-0"
          >
            <Sparkles className="h-4 w-4" />
            <span>Add Specialty Badge</span>
          </button>
        </div>
      </div>

      {/* ── SECTION TYPE TABS ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSelectedSectionId(s.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedSectionId === s.id
                ? 'bg-teal-800 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>{s.name}</span>
            {s.min_age && s.max_age && (
              <span className="text-[10px] opacity-75">
                ({s.min_age}-{s.max_age} yrs)
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TRACK SWITCHER: RANKS VS SPECIALTY BADGES ── */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 flex gap-1.5 max-w-md shadow-2xs">
        <button
          type="button"
          onClick={() => {
            setCurriculumView('rank')
            setSelectedClassId(null)
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            curriculumView === 'rank'
              ? 'bg-teal-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          <span>Rank Stages (المراحل)</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
              curriculumView === 'rank' ? 'bg-teal-700 text-teal-100' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {classes.filter((c) => (c.class_type || 'rank') === 'rank').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setCurriculumView('specialty')
            setSelectedClassId(null)
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            curriculumView === 'specialty'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>Specialty Badges (الأوسمة)</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
              curriculumView === 'specialty' ? 'bg-amber-700 text-amber-100' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {classes.filter((c) => c.class_type === 'specialty').length}
          </span>
        </button>
      </div>

      {/* ── MAIN WORKSPACE: CLASSES LIST & REQUIREMENTS TREE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Classes / Stages / Badges */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {curriculumView === 'rank' ? 'Rank Stages' : 'Specialty Badges'} ({displayedClasses.length})
            </h3>
            <button
              onClick={() => handleOpenAddClass()}
              className="text-xs font-bold text-teal-800 hover:text-teal-900 flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{curriculumView === 'rank' ? 'Add Stage' : 'Add Badge'}</span>
            </button>
          </div>

          {displayedClasses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                {curriculumView === 'rank' ? <GraduationCap className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {curriculumView === 'rank'
                  ? 'No rank stages created for this section yet.'
                  : 'No specialty badges created for this section yet.'}
              </p>
              <button
                type="button"
                onClick={() => handleOpenAddClass()}
                className="px-3.5 py-1.5 rounded-xl bg-teal-50 text-teal-800 hover:bg-teal-100 text-xs font-bold transition-all"
              >
                {curriculumView === 'rank' ? '+ Create First Stage (e.g. Kouboul)' : '+ Create Badge (e.g. Al 3akkad)'}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {displayedClasses.map((cls, idx) => {
                const isSelected = cls.id === selectedClassId
                const reqCount = cls.progression_requirements?.length || 0

                return (
                  <div
                    key={cls.id}
                    onClick={() => setSelectedClassId(cls.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-white border-teal-700 shadow-sm ring-2 ring-teal-700/10'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl shrink-0">
                        {cls.badge_icon || '⚜️'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {cls.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          {reqCount} {reqCount === 1 ? 'requirement' : 'requirements'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleOpenCloneModal(cls)}
                        className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                        title="Duplicate stage to another section"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditClass(cls)}
                        className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                        title="Edit stage"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClass(cls.id, cls.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete stage"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <ChevronRight
                        className={`h-4 w-4 ml-1 transition-transform ${
                          isSelected ? 'text-teal-700 translate-x-0.5' : 'text-slate-300'
                        }`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Class Requirements & Categories (Optimized for 40+ requirements) */}
        <div className="lg:col-span-8 space-y-4">
          {currentClass ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
              {/* Class Header & Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-3xl flex items-center justify-center shrink-0">
                    {currentClass.badge_icon || '⚜️'}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <span>{currentClass.name}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-100">
                        {totalCurrentReqs} {totalCurrentReqs === 1 ? 'Requirement' : 'Requirements'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Manage tests across categories (Sports, Scouting, First Aid, Religion...)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenCloneModal(currentClass)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 shrink-0"
                    title="Clone this entire stage to another section"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Duplicate Stage</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenAddReq()}
                    className="bg-teal-800 hover:bg-teal-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Requirement</span>
                  </button>
                </div>
              </div>

              {/* 40+ Requirements Navigation Bar: Fast Search + Expand/Collapse All */}
              {totalCurrentReqs > 0 && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder={`Search among ${totalCurrentReqs} requirements by keyword, category...`}
                      value={reqSearchQuery}
                      onChange={(e) => setReqSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium focus:outline-none focus:border-teal-700"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleAllCategories(false)}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      Expand All
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleAllCategories(true)}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      Collapse All
                    </button>
                  </div>
                </div>
              )}

              {/* Requirement Groups by Category (Accordion for 40+ scaling) */}
              {totalCurrentReqs === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center mx-auto">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-800">No requirements added yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                    Add requirements for this stage like &quot;Run 10 km&quot; under Sports or &quot;Attend 10 masses&quot; under Religion.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleOpenAddReq()}
                    className="px-4 py-2 rounded-xl bg-teal-800 text-white text-xs font-bold hover:bg-teal-700 transition-all shadow-xs"
                  >
                    + Add First Requirement
                  </button>
                </div>
              ) : Object.keys(requirementsByCategory).length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-bold">
                  No requirements match &quot;{reqSearchQuery}&quot;
                </div>
              ) : (
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin">
                  {Object.entries(requirementsByCategory).map(([category, reqs]) => {
                    const isCollapsed = !!collapsedCategories[category]

                    return (
                      <div key={category} className="space-y-2 border border-slate-200 rounded-2xl p-3 bg-slate-50/50">
                        <div
                          onClick={() => toggleCategoryCollapse(category)}
                          className="flex items-center justify-between cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
                            <h4 className="font-black text-xs text-slate-900 uppercase tracking-wide">
                              {category}
                            </h4>
                            <span className="text-[10px] font-bold bg-teal-100 text-teal-900 px-2 py-0.2 rounded-full">
                              {reqs.length} {reqs.length === 1 ? 'task' : 'tasks'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleOpenAddReq(category)}
                              className="text-[11px] font-bold text-teal-800 hover:text-teal-900 flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-2xs"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Add Task</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleCategoryCollapse(category)}
                              className="p-1 text-slate-400 hover:text-slate-600"
                            >
                              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        {!isCollapsed && (
                          <div className="space-y-1.5 pt-1">
                            {reqs.map((req, idx) => (
                              <div
                                key={req.id}
                                className="bg-white p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors flex items-start justify-between gap-3 shadow-2xs"
                              >
                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <div className="flex items-start gap-2">
                                    <span className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">
                                      #{idx + 1}
                                    </span>
                                    <div>
                                      <p className="font-bold text-xs text-slate-900 leading-snug">
                                        {req.title}
                                      </p>
                                      {req.description && (
                                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">
                                          {req.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditReq(req)}
                                    className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                                    title="Edit requirement"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteReq(req.id, req.title)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="Delete requirement"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
              <GraduationCap className="h-8 w-8 mx-auto text-slate-300" />
              <p className="text-xs font-bold">Select a class on the left to view and configure requirements.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL: ADD / EDIT CLASS (With Custom Emoji Support) ── */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-900 flex items-center justify-center text-xl font-bold">
                  {classIconInput || '⚜️'}
                </div>
                <h3 className="font-bold text-sm text-slate-900">
                  {editingClass
                    ? classTypeInput === 'rank'
                      ? 'Edit Rank Stage'
                      : 'Edit Specialty Badge'
                    : classTypeInput === 'rank'
                    ? 'New Rank Stage'
                    : 'New Specialty Badge'}
                </h3>
              </div>
              <button onClick={() => setIsClassModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-3.5">
              {/* Type Toggle */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setClassTypeInput('rank')
                      if (classIconInput === '🪢') setClassIconInput('⚜️')
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                      classTypeInput === 'rank'
                        ? 'bg-teal-800 text-white border-teal-800 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span>Rank Stage</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setClassTypeInput('specialty')
                      if (classIconInput === '⚜️') setClassIconInput('🪢')
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                      classTypeInput === 'specialty'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Specialty Badge</span>
                  </button>
                </div>
              </div>

              {/* Specialty Presets */}
              {classTypeInput === 'specialty' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    Quick Badge Presets:
                  </label>
                  <div className="flex items-center gap-1 flex-wrap">
                    {SPECIALTY_BADGE_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => {
                          setClassNameInput(p.name)
                          setClassIconInput(p.icon)
                        }}
                        className="text-[10px] bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 px-2 py-0.5 rounded-md font-bold transition-colors flex items-center gap-1"
                      >
                        <span>{p.icon}</span>
                        <span>{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {classTypeInput === 'rank' ? 'Class / Stage Name *' : 'Specialty Badge Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={classTypeInput === 'rank' ? 'e.g. Kouboul, Moubtada2, Daraja Thanya...' : 'e.g. العقّاد (Al 3akkad)...'}
                  value={classNameInput}
                  onChange={(e) => setClassNameInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-teal-700"
                />
              </div>

              {/* ── CUSTOM EMOJI INPUT & PRESETS ── */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-700">
                  Custom Emoji / Badge Icon *
                </label>
                
                {/* Custom input box */}
                <div className="flex items-center gap-2">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                    {classIconInput || '⚜️'}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Type or paste any custom emoji (e.g. 🪢, 🧗, 🎯, 🌲)..."
                    value={classIconInput}
                    onChange={(e) => setClassIconInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold focus:outline-none focus:border-teal-700"
                  />
                </div>

                {/* Preset Suggestions */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">
                    Or pick from suggested icons:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap p-2 bg-slate-50 rounded-xl border border-slate-200 max-h-32 overflow-y-auto">
                    {BADGE_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setClassIconInput(icon)}
                        className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${
                          classIconInput === icon ? 'bg-teal-800 text-white shadow-xs scale-110' : 'hover:bg-slate-200'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={classSortInput}
                  onChange={(e) => setClassSortInput(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-teal-700"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs shadow-xs"
                >
                  {loading ? 'Saving...' : editingClass ? 'Save Changes' : 'Create Stage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: DUPLICATE / CLONE STAGE TO ANOTHER SECTION ── */}
      {isCloneModalOpen && currentClass && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-900 flex items-center justify-center text-xl font-bold">
                  <Copy className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Duplicate Stage</h3>
                  <p className="text-[11px] text-slate-500">
                    Copy {currentClass.name} with {totalCurrentReqs} requirements to another section
                  </p>
                </div>
              </div>
              <button onClick={() => setIsCloneModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteClone} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Target Section Type *
                </label>
                <select
                  required
                  value={cloneTargetSectionId}
                  onChange={(e) => setCloneTargetSectionId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-teal-700"
                >
                  <option value="" disabled>Select target section...</option>
                  {sections
                    .filter((s) => s.id !== selectedSectionId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.min_age || '?'}-{s.max_age || '?'} yrs)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  New Stage Name in Target Section
                </label>
                <input
                  type="text"
                  required
                  value={cloneNewClassName}
                  onChange={(e) => setCloneNewClassName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-teal-700"
                />
              </div>

              <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 text-[11px] text-teal-950 font-medium">
                💡 All <strong>{totalCurrentReqs} requirements</strong>, categories, and criteria will be duplicated seamlessly into the target section!
              </div>

              <div className="pt-2 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCloneModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCloning || !cloneTargetSectionId}
                  className="flex-1 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5"
                >
                  {isCloning ? 'Duplicating...' : 'Duplicate Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD / EDIT REQUIREMENT ── */}
      {isReqModalOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-5 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-900 flex items-center justify-center font-bold text-sm">
                  {editingReq ? '✏️' : '➕'}
                </div>
                <h3 className="font-bold text-sm text-slate-900">
                  {editingReq ? 'Edit Requirement' : 'New Requirement'}
                </h3>
              </div>
              <button onClick={() => setIsReqModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReq} className="space-y-3.5">
              {/* Category with Dynamic Autocomplete & Free-Text */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Category * (Type new or pick existing)
                </label>
                <input
                  type="text"
                  required
                  list="existing-categories-list"
                  placeholder="e.g. Sports, Scouting, Religion, Service, Nature..."
                  value={reqCategoryInput}
                  onChange={(e) => setReqCategoryInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-teal-700"
                />
                <datalist id="existing-categories-list">
                  {existingCategories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>

                {/* Clickable category pills */}
                {existingCategories.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-medium">Suggestions:</span>
                    {existingCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setReqCategoryInput(cat)}
                        className="text-[10px] bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-600 px-2 py-0.5 rounded-md font-medium transition-colors"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Requirement Title */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Requirement Title / Goal *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Run 10 km, Attend 10 masses, Tie 12 scout knots..."
                  value={reqTitleInput}
                  onChange={(e) => setReqTitleInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-teal-700"
                />
              </div>

              {/* Description / Pass Criteria */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Description / Pass Criteria (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Detailed criteria, instructions, or testing guidelines for the leader..."
                  value={reqDescInput}
                  onChange={(e) => setReqDescInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-teal-700"
                />
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={reqSortInput}
                  onChange={(e) => setReqSortInput(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-teal-700"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsReqModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs shadow-xs"
                >
                  {loading ? 'Saving...' : editingReq ? 'Save Changes' : 'Add Requirement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
