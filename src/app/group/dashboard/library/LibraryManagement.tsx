'use client'

import { useState, useMemo, useRef } from 'react'
import DashboardShell from '../DashboardShell'
import {
  BookOpen,
  Music,
  GraduationCap,
  Scroll,
  Palette,
  MapPin,
  ShieldAlert,
  FolderArchive,
  Search,
  Upload,
  Play,
  Pause,
  ExternalLink,
  Download,
  Trash2,
  Plus,
  X,
  FileText,
  Video,
  Image as ImageIcon,
  Headphones,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react'

export interface ArchiveItem {
  id: string
  group_id: string
  title: string
  description?: string | null
  category: string
  branch_scope: string
  media_type: string
  file_url?: string | null
  drive_file_id?: string | null
  youtube_url?: string | null
  lyrics_text?: string | null
  chords_text?: string | null
  author_composer?: string | null
  tags: string[]
  file_size_bytes?: number | null
  mime_type?: string | null
  uploaded_by?: string | null
  profiles?: { full_name?: string } | null
  created_at: string
}

interface Props {
  groupId: string
  groupName: string
  currentRole: string
  userName: string
  userId: string
  canManage: boolean
  initialItems: ArchiveItem[]
}

const CATEGORIES = [
  { id: 'all', label: 'All Resources (الكل)', icon: FolderArchive, color: 'text-slate-700 bg-slate-100' },
  { id: 'books_manuals', label: 'Scout Books & Handbooks', ar: 'الكتب والمناهج', icon: BookOpen, color: 'text-teal-900 bg-teal-50 border-teal-200' },
  { id: 'training_materials', label: 'Training & Tech Sheets', ar: 'المواد التدريبية والفنية', icon: GraduationCap, color: 'text-indigo-900 bg-indigo-50 border-indigo-200' },
  { id: 'songs_chansonnier', label: 'Songbook & Chants', ar: 'الأناشيد والصيحات', icon: Music, color: 'text-amber-900 bg-amber-50 border-amber-200' },
  { id: 'ceremonials_prayers', label: 'Ceremonials & Prayers', ar: 'الطقوس والصلوات', icon: Scroll, color: 'text-purple-900 bg-purple-50 border-purple-200' },
  { id: 'brand_assets', label: 'Brand Assets & Logos', ar: 'الشعارات والهوية', icon: Palette, color: 'text-rose-900 bg-rose-50 border-rose-200' },
  { id: 'maps_blueprints', label: 'Camp Blueprints & Maps', ar: 'الخرائط ومخططات المخيم', icon: MapPin, color: 'text-emerald-900 bg-emerald-50 border-emerald-200' },
  { id: 'safety_protocols', label: 'Safety & Medical Guides', ar: 'إرشادات السلامة والطبابة', icon: ShieldAlert, color: 'text-red-900 bg-red-50 border-red-200' },
  { id: 'admin_archives', label: 'Admin Archives', ar: 'الأرشيف الإداري', icon: FolderArchive, color: 'text-cyan-900 bg-cyan-50 border-cyan-200' },
]

const BRANCH_SCOPES = [
  { id: 'all', label: 'All Branches (عام للفوج)' },
  { id: 'meute', label: '🐺 Meute (Louveteaux / الجراميز)' },
  { id: 'troupe', label: '⚜️ Troupe (Éclaireurs / الكشافة)' },
  { id: 'poste', label: '🏹 Poste (Pionniers / الجوالة)' },
  { id: 'clan', label: '🏕️ Clan (Routiers / الرواد)' },
]

export default function LibraryManagement({
  groupName,
  currentRole,
  userName,
  canManage,
  initialItems,
}: Props) {
  const [itemsList, setItemsList] = useState<ArchiveItem[]>(initialItems)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Upload modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [uploadType, setUploadType] = useState<'file' | 'youtube' | 'text'>('file')
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCategory, setFormCategory] = useState('books_manuals')
  const [formBranch, setFormBranch] = useState('all')
  const [formAuthor, setFormAuthor] = useState('')
  const [formYoutubeUrl, setFormYoutubeUrl] = useState('')
  const [formLyrics, setFormLyrics] = useState('')
  const [formChords, setFormChords] = useState('')
  const [formTags, setFormTags] = useState('')
  const [formFile, setFormFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Status message
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Song Lyrics / Details Drawer Modal
  const [viewingSong, setViewingSong] = useState<ArchiveItem | null>(null)
  const [lyricsTab, setLyricsTab] = useState<'lyrics' | 'chords'>('lyrics')
  const [copiedLyrics, setCopiedLyrics] = useState(false)

  // In-App Audio Player state
  const [playingSong, setPlayingSong] = useState<ArchiveItem | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Filtered items
  const filteredItems = useMemo(() => {
    return itemsList.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false
      if (selectedBranch !== 'all' && item.branch_scope !== selectedBranch && item.branch_scope !== 'all') return false
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchTitle = item.title.toLowerCase().includes(query)
        const matchDesc = (item.description || '').toLowerCase().includes(query)
        const matchAuthor = (item.author_composer || '').toLowerCase().includes(query)
        const matchTags = item.tags.some((t) => t.toLowerCase().includes(query))
        const matchLyrics = (item.lyrics_text || '').toLowerCase().includes(query)
        if (!matchTitle && !matchDesc && !matchAuthor && !matchTags && !matchLyrics) return false
      }
      return true
    })
  }, [itemsList, selectedCategory, selectedBranch, searchQuery])

  // Stats
  const stats = useMemo(() => {
    return {
      total: itemsList.length,
      books: itemsList.filter((i) => i.category === 'books_manuals').length,
      training: itemsList.filter((i) => i.category === 'training_materials').length,
      songs: itemsList.filter((i) => i.category === 'songs_chansonnier').length,
      blueprints: itemsList.filter((i) => i.category === 'maps_blueprints').length,
    }
  }, [itemsList])

  // Handle Audio Playback
  const handleTogglePlaySong = (song: ArchiveItem) => {
    if (!song.file_url) return

    if (playingSong?.id === song.id) {
      if (isPlaying) {
        audioRef.current?.pause()
        setIsPlaying(false)
      } else {
        audioRef.current?.play()
        setIsPlaying(true)
      }
    } else {
      setPlayingSong(song)
      setIsPlaying(true)
      setCurrentTime(0)
      if (audioRef.current) {
        audioRef.current.src = song.file_url
        audioRef.current.play().catch((e) => console.warn('Audio playback notice:', e))
      }
    }
  }

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
      setDuration(audioRef.current.duration || 0)
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    setCurrentTime(time)
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  // Handle Copy Lyrics
  const handleCopyLyrics = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedLyrics(true)
    setTimeout(() => setCopiedLyrics(false), 2000)
  }

  // Handle Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) {
      setStatusMessage({ text: 'Title is required.', type: 'error' })
      return
    }

    if (uploadType === 'file' && !formFile) {
      setStatusMessage({ text: 'Please select a file to upload.', type: 'error' })
      return
    }

    setIsSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('title', formTitle)
      fd.append('description', formDescription)
      fd.append('category', formCategory)
      fd.append('branchScope', formBranch)
      fd.append('authorComposer', formAuthor)
      fd.append('groupName', groupName)
      fd.append('tags', formTags)

      if (uploadType === 'youtube' && formYoutubeUrl) {
        fd.append('youtubeUrl', formYoutubeUrl)
      }

      if (formLyrics) fd.append('lyricsText', formLyrics)
      if (formChords) fd.append('chordsText', formChords)

      if (uploadType === 'file' && formFile) {
        fd.append('file', formFile)
      }

      const res = await fetch('/api/group/library/upload', {
        method: 'POST',
        body: fd,
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to upload resource.')
      }

      setItemsList((prev) => [data.item, ...prev])
      setStatusMessage({ text: 'Resource successfully added to the Library!', type: 'success' })
      setIsUploadModalOpen(false)

      // Reset form
      setFormTitle('')
      setFormDescription('')
      setFormAuthor('')
      setFormYoutubeUrl('')
      setFormLyrics('')
      setFormChords('')
      setFormTags('')
      setFormFile(null)
    } catch (err: any) {
      console.error('[Library Upload Error]:', err)
      setStatusMessage({ text: err?.message || 'Error uploading file.', type: 'error' })
    } finally {
      setIsSubmitting(false)
      setTimeout(() => setStatusMessage(null), 6000)
    }
  }

  // Handle Delete
  const handleDeleteItem = async (itemId: string, itemTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${itemTitle}" from the archive?`)) {
      return
    }

    try {
      const res = await fetch('/api/group/library/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      })

      if (!res.ok) throw new Error('Failed to delete item.')

      setItemsList((prev) => prev.filter((i) => i.id !== itemId))
      setStatusMessage({ text: `"${itemTitle}" was deleted from archive.`, type: 'success' })
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Error deleting item.', type: 'error' })
    } finally {
      setTimeout(() => setStatusMessage(null), 5000)
    }
  }

  return (
    <DashboardShell groupName={groupName} currentRole={currentRole} userName={userName}>
      <div className="max-w-7xl mx-auto space-y-6 pb-24">
        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          onTimeUpdate={handleAudioTimeUpdate}
          onEnded={handleAudioEnded}
          onLoadedMetadata={handleAudioTimeUpdate}
        />

        {/* ── HERO BANNER ── */}
        <div className="bg-gradient-to-r from-teal-950 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Bibliothèque & Archives du Groupe (المكتبة والأرشيف)</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-teal-900 text-teal-200">
                  <Sparkles className="h-3 w-3" />
                  <span>Google Drive Cloud Synced</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Scout Library, Media & Songbook
              </h1>
              <p className="text-sm text-teal-100/90 leading-relaxed">
                Centralized knowledge repository for scout handbooks, leader training sheets, audio songs with lyrics & chords, ceremonial scripts, brand assets, and camp blueprints.
              </p>
            </div>

            {canManage && (
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="self-start md:self-auto px-5 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-teal-950 font-black text-xs sm:text-sm shadow-lg transition-all flex items-center gap-2 shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Add Resource / Song (إضافة ملف أو أنشودة)</span>
              </button>
            )}
          </div>

          {/* Quick Category Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-6 mt-6 border-t border-teal-800/80">
            <div className="bg-teal-900/50 backdrop-blur-xs p-3 rounded-2xl border border-teal-700/50">
              <span className="text-[10px] uppercase font-extrabold text-teal-300 block">Total Resources</span>
              <span className="text-xl font-black text-white">{stats.total}</span>
            </div>
            <div className="bg-teal-900/50 backdrop-blur-xs p-3 rounded-2xl border border-teal-700/50">
              <span className="text-[10px] uppercase font-extrabold text-teal-300 block">Books & Handbooks</span>
              <span className="text-xl font-black text-white">{stats.books}</span>
            </div>
            <div className="bg-teal-900/50 backdrop-blur-xs p-3 rounded-2xl border border-teal-700/50">
              <span className="text-[10px] uppercase font-extrabold text-teal-300 block">Songbook & Chants</span>
              <span className="text-xl font-black text-amber-300">{stats.songs}</span>
            </div>
            <div className="bg-teal-900/50 backdrop-blur-xs p-3 rounded-2xl border border-teal-700/50">
              <span className="text-[10px] uppercase font-extrabold text-teal-300 block">Training & Tech</span>
              <span className="text-xl font-black text-white">{stats.training}</span>
            </div>
          </div>
        </div>

        {/* ── STATUS ALERT ── */}
        {statusMessage && (
          <div
            className={`p-4 rounded-2xl flex items-center gap-3 border text-sm font-bold shadow-xs animate-in fade-in slide-in-from-top-2 duration-200 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* ── SEARCH & BRANCH FILTER BAR ── */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search archive by title, description, lyrics, author, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-2xl border border-slate-200 focus:outline-none focus:border-teal-700 font-medium"
              />
            </div>

            {/* Branch Scope Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {BRANCH_SCOPES.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBranch(b.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                    selectedBranch === b.id
                      ? 'bg-teal-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Tabs Carousel/Grid */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-t border-slate-100 pt-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon
              const count =
                cat.id === 'all'
                  ? itemsList.length
                  : itemsList.filter((i) => i.category === cat.id).length

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 active:scale-95 border ${
                    selectedCategory === cat.id
                      ? 'bg-teal-900 text-white border-teal-900 shadow-md ring-2 ring-teal-600/30'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{cat.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                      selectedCategory === cat.id ? 'bg-teal-800 text-teal-100' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── RESOURCES GRID ── */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="font-black text-slate-800 text-base">No resources found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No files or songs match the selected filters. Try choosing a different category or clearing search terms.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item) => {
              const catObj = CATEGORIES.find((c) => c.id === item.category) || CATEGORIES[1]
              const isSong = item.category === 'songs_chansonnier'
              const isThisPlaying = playingSong?.id === item.id && isPlaying

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all p-4 flex flex-col justify-between gap-3 group"
                >
                  <div className="space-y-2.5">
                    {/* Header Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-xl border flex items-center gap-1 ${catObj.color}`}>
                        <catObj.icon className="h-3 w-3" />
                        <span className="truncate max-w-[120px]">{catObj.label.split('(')[0]}</span>
                      </span>

                      <div className="flex items-center gap-1">
                        {item.branch_scope !== 'all' && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            {item.branch_scope}
                          </span>
                        )}

                        {item.media_type === 'audio' && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 flex items-center gap-0.5">
                            <Headphones className="h-2.5 w-2.5" />
                            <span>MP3</span>
                          </span>
                        )}
                        {item.media_type === 'youtube' && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-red-100 text-red-900 flex items-center gap-0.5">
                            <Video className="h-2.5 w-2.5" />
                            <span>YouTube</span>
                          </span>
                        )}
                        {item.media_type === 'pdf' && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-900 flex items-center gap-0.5">
                            <FileText className="h-2.5 w-2.5" />
                            <span>PDF</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title & Author */}
                    <div>
                      <h3 className="font-black text-slate-900 text-sm leading-snug group-hover:text-teal-900 transition-colors line-clamp-2">
                        {item.title}
                      </h3>
                      {item.author_composer && (
                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5 truncate">
                          par {item.author_composer}
                        </p>
                      )}
                    </div>

                    {/* Description / Lyrics preview */}
                    {item.description && (
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {/* Tags */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap pt-0.5">
                        {item.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] font-bold bg-slate-50 text-slate-500 px-1.5 py-0.2 rounded border border-slate-100"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {/* Audio Play Button for Songs */}
                      {item.file_url && item.media_type === 'audio' && (
                        <button
                          type="button"
                          onClick={() => handleTogglePlaySong(item)}
                          className={`p-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 ${
                            isThisPlaying
                              ? 'bg-amber-500 text-teal-950 shadow-xs'
                              : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                          }`}
                        >
                          {isThisPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          <span>{isThisPlaying ? 'Pause' : 'Play'}</span>
                        </button>
                      )}

                      {/* View Lyrics / Chords for songs */}
                      {isSong && (item.lyrics_text || item.chords_text) && (
                        <button
                          type="button"
                          onClick={() => setViewingSong(item)}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-teal-50 text-[11px] font-bold text-slate-700 hover:text-teal-900 transition-colors flex items-center gap-1 shrink-0"
                        >
                          <Scroll className="h-3 w-3" />
                          <span>Lyrics</span>
                        </button>
                      )}

                      {/* YouTube Video Link */}
                      {item.youtube_url && (
                        <a
                          href={item.youtube_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-xl border border-red-200 bg-red-50 text-red-800 hover:bg-red-100 text-[11px] font-bold transition-colors flex items-center gap-1 shrink-0"
                        >
                          <Video className="h-3 w-3" />
                          <span>Watch</span>
                        </a>
                      )}

                      {/* File Download / View Link */}
                      {item.file_url && item.media_type !== 'audio' && (
                        <a
                          href={item.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-xl border border-teal-200 bg-teal-50 text-teal-900 hover:bg-teal-100 text-[11px] font-bold transition-colors flex items-center gap-1 truncate"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate">Open File</span>
                        </a>
                      )}
                    </div>

                    {/* Delete button for managers */}
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id, item.title)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                        title="Delete from archive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── FLOATING AUDIO PLAYER BAR ── */}
        {playingSong && (
          <div className="fixed bottom-4 left-4 right-4 max-w-3xl mx-auto z-40 bg-teal-950/95 backdrop-blur-md text-white rounded-3xl p-3.5 sm:p-4 shadow-2xl border border-teal-700/60 animate-in slide-in-from-bottom-4 duration-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => handleTogglePlaySong(playingSong)}
                className="w-10 h-10 rounded-2xl bg-amber-400 text-teal-950 flex items-center justify-center font-black shadow-md hover:bg-amber-300 transition-all shrink-0 active:scale-95"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </button>

              <div className="min-w-0">
                <h4 className="font-black text-xs sm:text-sm text-white truncate">
                  {playingSong.title}
                </h4>
                <p className="text-[10px] text-teal-300 truncate">
                  {playingSong.author_composer ? `par ${playingSong.author_composer}` : 'Scout Song'}
                </p>
              </div>
            </div>

            {/* Seeker Bar */}
            <div className="hidden sm:flex flex-1 items-center gap-2 max-w-xs px-2">
              <span className="text-[10px] text-teal-300 font-mono">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full accent-amber-400 h-1 bg-teal-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-teal-300 font-mono">{formatTime(duration)}</span>
            </div>

            <div className="flex items-center gap-2">
              {(playingSong.lyrics_text || playingSong.chords_text) && (
                <button
                  type="button"
                  onClick={() => setViewingSong(playingSong)}
                  className="px-2.5 py-1 rounded-xl bg-teal-800 hover:bg-teal-700 text-xs font-bold text-teal-100 transition-colors flex items-center gap-1 shrink-0"
                >
                  <Scroll className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Lyrics</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.muted = !isMuted
                    setIsMuted(!isMuted)
                  }
                }}
                className="p-1.5 text-teal-300 hover:text-white transition-colors"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  audioRef.current?.pause()
                  setPlayingSong(null)
                  setIsPlaying(false)
                }}
                className="p-1.5 text-teal-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── SONG LYRICS & CHORDS DRAWER MODAL ── */}
        {viewingSong && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                      Chansonnier Scout (دفتر الأناشيد)
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-1">
                      {viewingSong.title}
                    </h3>
                    {viewingSong.author_composer && (
                      <p className="text-xs text-slate-500 font-semibold">
                        Auteur / Compositeur: {viewingSong.author_composer}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setViewingSong(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Lyrics / Chords Tabs */}
                <div className="flex items-center justify-between pt-3">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setLyricsTab('lyrics')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        lyricsTab === 'lyrics' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      Paroles (Lyrics)
                    </button>
                    {viewingSong.chords_text && (
                      <button
                        type="button"
                        onClick={() => setLyricsTab('chords')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          lyricsTab === 'chords' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                        }`}
                      >
                        Accords (Guitar Chords)
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleCopyLyrics(
                        lyricsTab === 'lyrics'
                          ? viewingSong.lyrics_text || ''
                          : viewingSong.chords_text || ''
                      )
                    }
                    className="px-2.5 py-1 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors flex items-center gap-1"
                  >
                    {copiedLyrics ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedLyrics ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>

                {/* Content Box */}
                <div className="mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 max-h-96 overflow-y-auto font-mono text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {lyricsTab === 'lyrics'
                    ? viewingSong.lyrics_text || 'No lyrics text provided for this song.'
                    : viewingSong.chords_text || 'No guitar chords provided.'}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                {viewingSong.file_url && (
                  <button
                    type="button"
                    onClick={() => handleTogglePlaySong(viewingSong)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-teal-950 font-black text-xs transition-colors flex items-center gap-1.5"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Play Audio Track</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setViewingSong(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── UPLOAD RESOURCE MODAL ── */}
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-100 space-y-4 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-900 flex items-center justify-center font-black">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900">Add Resource / Song to Archive</h3>
                    <p className="text-xs text-slate-500">Stored on Google Drive with instant leader streaming</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-4">
                {/* Upload Mode Selector */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadType('file')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      uploadType === 'file'
                        ? 'bg-teal-900 text-white border-teal-900 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload File</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUploadType('youtube')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      uploadType === 'youtube'
                        ? 'bg-teal-900 text-white border-teal-900 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <Video className="h-3.5 w-3.5" />
                    <span>YouTube Link</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUploadType('text')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      uploadType === 'text'
                        ? 'bg-teal-900 text-white border-teal-900 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <Scroll className="h-3.5 w-3.5" />
                    <span>Lyrics & Text</span>
                  </button>
                </div>

                {/* Title & Author */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Resource Title (العنوان) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Livre de l'Éclaireur, Chant du Soir"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Author / Composer (المؤلف / الملحن)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Père Sevin, Baden-Powell, Maîtrise"
                      value={formAuthor}
                      onChange={(e) => setFormAuthor(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 font-medium"
                    />
                  </div>
                </div>

                {/* Category & Branch Scope */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Category (التصنيف) *
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-700 focus:outline-none focus:border-teal-700"
                    >
                      {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Branch Scope (الفئة المستهدفة) *
                    </label>
                    <select
                      value={formBranch}
                      onChange={(e) => setFormBranch(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-700 focus:outline-none focus:border-teal-700"
                    >
                      {BRANCH_SCOPES.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* File Dropzone (If file upload mode) */}
                {uploadType === 'file' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Select File (PDF, MP3 Audio, Word DOCX, Image) *
                    </label>
                    <input
                      type="file"
                      required
                      accept=".pdf,.mp3,.m4a,.wav,.docx,.doc,.png,.jpg,.jpeg,.svg"
                      onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-teal-800 hover:file:bg-teal-100 border border-slate-200 rounded-xl p-1"
                    />
                  </div>
                )}

                {/* YouTube URL (If youtube mode) */}
                {uploadType === 'youtube' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      YouTube Video URL (رابط يوتيوب) *
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={formYoutubeUrl}
                      onChange={(e) => setFormYoutubeUrl(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 font-medium"
                    />
                  </div>
                )}

                {/* Lyrics & Chords (For songs or text mode) */}
                {(formCategory === 'songs_chansonnier' || uploadType === 'text') && (
                  <div className="space-y-3 pt-1 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Song Lyrics / Text (كلمات الأنشودة)
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Paste song lyrics, verses, and chorus here..."
                        value={formLyrics}
                        onChange={(e) => setFormLyrics(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono focus:outline-none focus:border-teal-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Guitar Chords / Notation (كوردات الغيتار - اختياري)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. [Am] [C] [G] [Em]..."
                        value={formChords}
                        onChange={(e) => setFormChords(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono focus:outline-none focus:border-teal-700"
                      />
                    </div>
                  </div>
                )}

                {/* Description & Tags */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Brief summary or context..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tags (كلمات دلالية - مفصولة بفواصل)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. promesse, veillée, noeuds, secourisme"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 font-medium"
                  />
                </div>

                {/* Buttons */}
                <div className="pt-3 border-t border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-teal-900 hover:bg-teal-800 disabled:opacity-50 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <span>Uploading to Google Drive...</span>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span>Save to Library</span>
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
