'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  Sparkles,
  Layers,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  X,
  Smile,
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
  '🐺', '🌟', '🎖️', '👑', '🏅', '🏆', '⚓', '🌿', '🪵', '🔦', '📷', '🛠️', '🎵'
]

const SPECIALTY_BADGE_PRESETS = [
  { name: 'العقّاد (Al 3akkad)', icon: '🪢' },
  { name: 'المسعف (Al Mosa3ef)', icon: '🚑' },
  { name: 'الدليل (Al Dalil)', icon: '🧭' },
  { name: 'المخيّم (Al Mokhayyem)', icon: '⛺' },
  { name: 'الطبّاخ (Al Tabakh)', icon: '🍳' },
  { name: 'السبّاح (Al Sabeeh)', icon: '🏊‍♂️' },
  { name: 'رجل النار (Al Naar)', icon: '🔥' },
  { name: 'حارس الغابة (Al Ghaba)', icon: '🌲' },
  { name: 'الفنّان (Al Fannan)', icon: '🎨' },
]

export default function ProgressionConfigurator({ sections }: Props) {
  const [selectedSectionId, setSelectedSectionId] = useState<string>(sections[0]?.id || '')
  const [curriculumView, setCurriculumView] = useState<'rank' | 'specialty'>('rank')
  const [classes, setClasses] = useState<ProgressionClass[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

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

  // Group current class requirements by category
  const requirementsByCategory = useMemo(() => {
    if (!currentClass || !currentClass.progression_requirements) return {}
    const grouped: Record<string, ProgressionRequirement[]> = {}
    currentClass.progression_requirements
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .forEach((r) => {
        const cat = r.category || 'General'
        if (!grouped[cat]) grouped[cat] = []
        grouped[cat].push(r)
      })
    return grouped
  }, [currentClass])

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
            badge_icon: classIconInput,
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
            badge_icon: classIconInput,
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
    if (!confirm(`Are you sure you want to delete class "${name}" and all its requirements?`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/configurator/progression/classes?id=${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete class')
      showStatus(`Class "${name}" deleted.`, 'success')
      fetchClasses(selectedSectionId)
    } catch (err: any) {
      showStatus(err.message || 'Error deleting class.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ── Requirement Form Handlers ──
  const handleOpenAddReq = (prefillCategory?: string) => {
    if (!currentClass) return
    setEditingReq(null)
    setReqCategoryInput(prefillCategory || existingCategories[0] || 'Scouting')
    setReqTitleInput('')
    setReqDescInput('')
    setReqSortInput((currentClass.progression_requirements?.length || 0) + 1)
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

  return (
    <div className="space-y-6">
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
              Configure ranks, stages, categories & requirements bound to section types
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
                      <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-lg shrink-0">
                        {cls.badge_icon || '⚜️'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {cls.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          Stage {idx + 1} • {reqCount} {reqCount === 1 ? 'requirement' : 'requirements'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
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

        {/* Right Column: Selected Class Requirements & Categories */}
        <div className="lg:col-span-8 space-y-4">
          {currentClass ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-2xl flex items-center justify-center shrink-0">
                    {currentClass.badge_icon || '⚜️'}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <span>{currentClass.name}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {currentClass.progression_requirements?.length || 0} Total Requirements
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Configure category tests for this rank (e.g. Sports, Scouting, Religion)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenAddReq()}
                  className="bg-teal-800 hover:bg-teal-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Requirement</span>
                </button>
              </div>

              {/* Requirement Groups by Category */}
              {Object.keys(requirementsByCategory).length === 0 ? (
                <div className="py-10 text-center space-y-3">
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
              ) : (
                <div className="space-y-5">
                  {Object.entries(requirementsByCategory).map(([category, reqs]) => (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/80">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                          <h4 className="font-black text-xs text-slate-800 uppercase tracking-wide">
                            {category}
                          </h4>
                          <span className="text-[10px] font-bold bg-white text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                            {reqs.length}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenAddReq(category)}
                          className="text-[11px] font-bold text-teal-800 hover:text-teal-900 flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Add to {category}</span>
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {reqs.map((req) => (
                          <div
                            key={req.id}
                            className="bg-white p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors flex items-start justify-between gap-3"
                          >
                            <div className="space-y-1 min-w-0">
                              <p className="font-bold text-xs text-slate-900 leading-snug">
                                {req.title}
                              </p>
                              {req.description && (
                                <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed">
                                  {req.description}
                                </p>
                              )}
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
                    </div>
                  ))}
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

      {/* ── MODAL: ADD / EDIT CLASS ── */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-900 flex items-center justify-center font-bold">
                  {classIconInput}
                </div>
                <h3 className="font-bold text-sm text-slate-900">
                  {editingClass ? 'Edit Progression Stage' : 'New Progression Stage'}
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
                  placeholder={classTypeInput === 'rank' ? 'e.g. Kouboul, Moubtada2...' : 'e.g. العقّاد (Al 3akkad)...'}
                  value={classNameInput}
                  onChange={(e) => setClassNameInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-teal-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Badge Icon / Emoji
                </label>
                <div className="flex items-center gap-1.5 flex-wrap p-2 bg-slate-50 rounded-xl border border-slate-200">
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

      {/* ── MODAL: ADD / EDIT REQUIREMENT ── */}
      {isReqModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-5 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-900 flex items-center justify-center font-bold">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {editingReq ? 'Edit Requirement' : 'New Requirement'}
                  </h3>
                  <p className="text-[10px] text-slate-500">For {currentClass?.name}</p>
                </div>
              </div>
              <button onClick={() => setIsReqModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReq} className="space-y-3.5">
              {/* Category (Dynamic Autocomplete or Free Text) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Category * (Free text or select existing)
                </label>
                <input
                  type="text"
                  required
                  list="category-suggestions"
                  placeholder="e.g. Sports, Scouts, Religion, Service..."
                  value={reqCategoryInput}
                  onChange={(e) => setReqCategoryInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-teal-700"
                />
                <datalist id="category-suggestions">
                  {existingCategories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>

                {existingCategories.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap mt-1.5">
                    <span className="text-[10px] text-slate-400 font-bold">Suggestions:</span>
                    {existingCategories.slice(0, 5).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setReqCategoryInput(cat)}
                        className="text-[10px] bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-600 px-2 py-0.5 rounded-md font-bold transition-colors"
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
                  Requirement Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Run 10 km, Attend 10 masses, Tie 6 knots..."
                  value={reqTitleInput}
                  onChange={(e) => setReqTitleInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-teal-700"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Description / Verification Details (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Additional context or pass criteria..."
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
