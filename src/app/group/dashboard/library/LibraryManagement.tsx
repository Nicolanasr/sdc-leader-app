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
  Trash2,
  Plus,
  X,
  FileText,
  Video,
  Headphones,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Pencil,
  Link2,
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

interface Troop {
  id: string
  name: string
  unit_type?: string
}

interface Props {
  groupId: string
  groupName: string
  currentRole: string
  userName: string
  userId: string
  canManage: boolean
  troops: Troop[]
  initialItems: ArchiveItem[]
}

const CATEGORIES = [
  { id: 'all', label: 'All', icon: FolderArchive },
  { id: 'books_manuals', label: 'Books', icon: BookOpen },
  { id: 'training_materials', label: 'Training', icon: GraduationCap },
  { id: 'songs_chansonnier', label: 'Songbook', icon: Music },
  { id: 'ceremonials_prayers', label: 'Ceremonials', icon: Scroll },
  { id: 'brand_assets', label: 'Logos', icon: Palette },
  { id: 'maps_blueprints', label: 'Blueprints', icon: MapPin },
  { id: 'safety_protocols', label: 'Safety', icon: ShieldAlert },
  { id: 'admin_archives', label: 'Archives', icon: FolderArchive },
]

export default function LibraryManagement({
  groupName,
  currentRole,
  userName,
  canManage,
  troops = [],
  initialItems,
}: Props) {
  const [itemsList, setItemsList] = useState<ArchiveItem[]>(initialItems)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const branchOptions = useMemo(() => {
    return [
      { id: 'all', label: 'All Units (عام للفوج)' },
      ...troops.map((t) => ({ id: t.name, label: t.name })),
    ]
  }, [troops])

  // Upload modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [uploadType, setUploadType] = useState<'file' | 'url'>('file')
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

  // Edit modal states
  const [editingItem, setEditingItem] = useState<ArchiveItem | null>(null)

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

      if (uploadType === 'url' && formYoutubeUrl) {
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
      setStatusMessage({ text: 'Resource added to library!', type: 'success' })
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
      setTimeout(() => setStatusMessage(null), 5000)
    }
  }

  // Handle Open Edit Modal
  const handleOpenEditModal = (item: ArchiveItem) => {
    setEditingItem(item)
    setFormTitle(item.title || '')
    setFormDescription(item.description || '')
    setFormCategory(item.category || 'books_manuals')
    setFormBranch(item.branch_scope || 'all')
    setFormAuthor(item.author_composer || '')
    setFormYoutubeUrl(item.youtube_url || '')
    setFormLyrics(item.lyrics_text || '')
    setFormChords(item.chords_text || '')
    setFormTags((item.tags || []).join(', '))
    setFormFile(null)
  }

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem || !formTitle.trim()) return

    setIsSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('itemId', editingItem.id)
      fd.append('title', formTitle)
      fd.append('description', formDescription)
      fd.append('category', formCategory)
      fd.append('branchScope', formBranch)
      fd.append('authorComposer', formAuthor)
      fd.append('groupName', groupName)
      fd.append('tags', formTags)

      if (formYoutubeUrl) fd.append('youtubeUrl', formYoutubeUrl)
      if (formLyrics) fd.append('lyricsText', formLyrics)
      if (formChords) fd.append('chordsText', formChords)
      if (formFile) fd.append('file', formFile)

      const res = await fetch('/api/group/library/update', {
        method: 'POST',
        body: fd,
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update resource.')
      }

      setItemsList((prev) =>
        prev.map((i) => (i.id === editingItem.id ? { ...i, ...data.item } : i))
      )
      setStatusMessage({ text: 'Resource updated successfully!', type: 'success' })
      setEditingItem(null)
    } catch (err: any) {
      console.error('[Library Edit Error]:', err)
      setStatusMessage({ text: err?.message || 'Error updating resource.', type: 'error' })
    } finally {
      setIsSubmitting(false)
      setTimeout(() => setStatusMessage(null), 4000)
    }
  }

  // Handle Delete
  const handleDeleteItem = async (itemId: string, itemTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${itemTitle}"?`)) {
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
      setStatusMessage({ text: `"${itemTitle}" was deleted.`, type: 'success' })
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Error deleting item.', type: 'error' })
    } finally {
      setTimeout(() => setStatusMessage(null), 4000)
    }
  }

  return (
    <DashboardShell groupName={groupName} currentRole={currentRole} userName={userName}>
      <div className="w-full pb-24 space-y-4">
        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          onTimeUpdate={handleAudioTimeUpdate}
          onEnded={handleAudioEnded}
          onLoadedMetadata={handleAudioTimeUpdate}
        />

        {/* ── STATUS TOAST ── */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 ${
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

        {/* ── TOP HEADER (Clean, Consistent White Card) ── */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0 shadow-2xs">
              <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Library & Archive</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  {itemsList.length}
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Scout books, training materials, songs & blueprints
              </p>
            </div>
          </div>

          {canManage && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-teal-800 hover:bg-teal-700 active:scale-95 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Add Resource / Song</span>
            </button>
          )}
        </div>

        {/* ── SEARCH & BRANCH SCOPE BAR ── */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search resources, songs, lyrics, author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 font-medium"
              />
            </div>

            {/* Branch Pills from actual troops */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {branchOptions.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBranch(b.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                    selectedBranch === b.id
                      ? 'bg-teal-800 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Horizontal Segmented Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 scrollbar-none border-t border-slate-100">
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 active:scale-95 ${
                    selectedCategory === cat.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{cat.label}</span>
                  <span
                    className={`px-1 py-0.2 rounded text-[10px] font-bold ${
                      selectedCategory === cat.id ? 'bg-slate-700 text-slate-200' : 'bg-slate-200/70 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── RESOURCES LIST / GRID (Mobile Native Feel) ── */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <BookOpen className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">No resources found</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Try switching category or clearing search terms.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredItems.map((item) => {
              const isSong = item.category === 'songs_chansonnier'
              const isThisPlaying = playingSong?.id === item.id && isPlaying

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all p-3.5 flex flex-col justify-between gap-3 active:scale-[0.99]"
                >
                  <div className="space-y-2">
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-lg bg-teal-50 text-teal-900 border border-teal-200/60 truncate">
                        {item.category.replace('_', ' ')}
                      </span>

                      <div className="flex items-center gap-1">
                        {item.branch_scope !== 'all' && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {item.branch_scope}
                          </span>
                        )}

                        {item.media_type === 'audio' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 flex items-center gap-0.5">
                            <Headphones className="h-2.5 w-2.5" />
                            <span>MP3</span>
                          </span>
                        )}
                        {item.media_type === 'youtube' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-900 flex items-center gap-0.5">
                            <Video className="h-2.5 w-2.5" />
                            <span>YouTube</span>
                          </span>
                        )}
                        {item.media_type === 'pdf' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 flex items-center gap-0.5">
                            <FileText className="h-2.5 w-2.5" />
                            <span>PDF</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title & Author */}
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                        {item.title}
                      </h3>
                      {item.author_composer && (
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                          par {item.author_composer}
                        </p>
                      )}
                    </div>

                    {/* Description preview */}
                    {item.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {/* Tags */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap pt-0.5">
                        {item.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] font-semibold bg-slate-50 text-slate-500 px-1.5 py-0.2 rounded border border-slate-100"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {/* Audio Play Button */}
                      {item.file_url && item.media_type === 'audio' && (
                        <button
                          type="button"
                          onClick={() => handleTogglePlaySong(item)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
                            isThisPlaying
                              ? 'bg-amber-500 text-teal-950 shadow-2xs'
                              : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                          }`}
                        >
                          {isThisPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                          <span>{isThisPlaying ? 'Pause' : 'Play'}</span>
                        </button>
                      )}

                      {/* Lyrics Button */}
                      {isSong && (item.lyrics_text || item.chords_text) && (
                        <button
                          type="button"
                          onClick={() => setViewingSong(item)}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-teal-50 text-xs font-bold text-slate-700 hover:text-teal-900 transition-colors flex items-center gap-1 shrink-0"
                        >
                          <Scroll className="h-3 w-3" />
                          <span>Lyrics</span>
                        </button>
                      )}

                      {/* YouTube Link */}
                      {item.youtube_url && (
                        <a
                          href={item.youtube_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-xl border border-red-200 bg-red-50 text-red-800 hover:bg-red-100 text-xs font-bold transition-colors flex items-center gap-1 shrink-0"
                        >
                          <Video className="h-3 w-3" />
                          <span>Watch</span>
                        </a>
                      )}

                      {/* Open File Link */}
                      {item.file_url && item.media_type !== 'audio' && (
                        <a
                          href={item.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-xl border border-teal-200 bg-teal-50 text-teal-900 hover:bg-teal-100 text-xs font-bold transition-colors flex items-center gap-1 truncate"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate">Open File</span>
                        </a>
                      )}
                    </div>

                    {/* Edit & Delete for managers */}
                    {canManage && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                          title="Edit resource"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id, item.title)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── FLOATING MOBILE AUDIO PLAYER BAR ── */}
        {playingSong && (
          <div className="fixed bottom-3 left-3 right-3 max-w-2xl mx-auto z-40 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-3 shadow-2xl border border-slate-700 animate-in slide-in-from-bottom-3 duration-150 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => handleTogglePlaySong(playingSong)}
                className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-sm hover:bg-amber-300 transition-all shrink-0 active:scale-95"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
              </button>

              <div className="min-w-0">
                <h4 className="font-bold text-xs text-white truncate">
                  {playingSong.title}
                </h4>
                <p className="text-[10px] text-slate-400 truncate">
                  {playingSong.author_composer || 'Scout Song'}
                </p>
              </div>
            </div>

            {/* Seeker */}
            <div className="hidden sm:flex flex-1 items-center gap-2 max-w-xs px-2">
              <span className="text-[10px] text-slate-400 font-mono">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full accent-amber-400 h-1 bg-slate-700 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 font-mono">{formatTime(duration)}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {(playingSong.lyrics_text || playingSong.chords_text) && (
                <button
                  type="button"
                  onClick={() => setViewingSong(playingSong)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors flex items-center gap-1 shrink-0"
                >
                  <Scroll className="h-3 w-3" />
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
                className="p-1 text-slate-400 hover:text-white transition-colors"
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
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── SONG LYRICS MODAL ── */}
        {viewingSong && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl p-4 sm:p-5 max-w-lg w-full shadow-2xl border border-slate-100 space-y-3 max-h-[85vh] flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                      Song Lyrics
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      {viewingSong.title}
                    </h3>
                    {viewingSong.author_composer && (
                      <p className="text-xs text-slate-500">
                        {viewingSong.author_composer}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setViewingSong(null)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center justify-between pt-2.5">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setLyricsTab('lyrics')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        lyricsTab === 'lyrics' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      Lyrics
                    </button>
                    {viewingSong.chords_text && (
                      <button
                        type="button"
                        onClick={() => setLyricsTab('chords')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          lyricsTab === 'chords' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                        }`}
                      >
                        Chords
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

                {/* Text Box */}
                <div className="mt-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 max-h-72 overflow-y-auto font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {lyricsTab === 'lyrics'
                    ? viewingSong.lyrics_text || 'No lyrics text available.'
                    : viewingSong.chords_text || 'No guitar chords available.'}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                {viewingSong.file_url && (
                  <button
                    type="button"
                    onClick={() => handleTogglePlaySong(viewingSong)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-teal-950 font-bold text-xs transition-colors flex items-center gap-1.5"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Play Song</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setViewingSong(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── UPLOAD MODAL ── */}
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl p-5 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-900 flex items-center justify-center font-bold">
                    <Upload className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Add Resource / Song</h3>
                    <p className="text-[11px] text-slate-500">Google Drive synced repository</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-3.5">
                {/* Mode Selector (2 Options: File Upload vs URL Link) */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadType('file')}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      uploadType === 'file'
                        ? 'bg-teal-800 text-white border-teal-800 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>File Upload</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUploadType('url')}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      uploadType === 'url'
                        ? 'bg-teal-800 text-white border-teal-800 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    <span>URL Link</span>
                  </button>
                </div>

                {/* Title & Author */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Livre de l'Éclaireur"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Author / Composer
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Père Sevin, Baden-Powell"
                      value={formAuthor}
                      onChange={(e) => setFormAuthor(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 font-medium"
                    />
                  </div>
                </div>

                {/* Category & Branch Scope */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Category *
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
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Branch Scope *
                    </label>
                    <select
                      value={formBranch}
                      onChange={(e) => setFormBranch(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-700 focus:outline-none focus:border-teal-700"
                    >
                      {branchOptions.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* File Dropzone */}
                {uploadType === 'file' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      File (PDF, MP3, DOCX, Image) *
                    </label>
                    <input
                      type="file"
                      required
                      accept=".pdf,.mp3,.m4a,.wav,.docx,.doc,.png,.jpg,.jpeg,.svg"
                      onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-teal-800 hover:file:bg-teal-100 border border-slate-200 rounded-xl p-1"
                    />
                  </div>
                )}

                {/* URL Link Input */}
                {uploadType === 'url' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Resource URL Link (YouTube, Drive, Web Link) *
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://www.youtube.com/watch?v=... or https://..."
                      value={formYoutubeUrl}
                      onChange={(e) => setFormYoutubeUrl(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 font-medium"
                    />
                  </div>
                )}

                {/* Lyrics & Chords (Optional for songs) */}
                {formCategory === 'songs_chansonnier' && (
                  <div className="space-y-2.5 pt-1 border-t border-slate-100">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Song Lyrics
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Paste song verses and chorus..."
                        value={formLyrics}
                        onChange={(e) => setFormLyrics(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-mono focus:outline-none focus:border-teal-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Guitar Chords (Optional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. [Am] [C] [G]..."
                        value={formChords}
                        onChange={(e) => setFormChords(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-mono focus:outline-none focus:border-teal-700"
                      />
                    </div>
                  </div>
                )}

                {/* Description & Tags */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Short description..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="promesse, veillée, noeuds"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 font-medium"
                  />
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <span>Saving to Drive...</span>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" />
                        <span>Save Resource</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── EDIT RESOURCE MODAL ── */}
        {editingItem && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl p-5 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-900 flex items-center justify-center font-bold">
                    <Pencil className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Edit Resource</h3>
                    <p className="text-[11px] text-slate-500">Update metadata, lyrics or replace file</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-3.5">
                {/* Title & Author */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Author / Composer
                    </label>
                    <input
                      type="text"
                      value={formAuthor}
                      onChange={(e) => setFormAuthor(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 font-medium"
                    />
                  </div>
                </div>

                {/* Category & Branch Scope */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Category *
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
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Branch Scope *
                    </label>
                    <select
                      value={formBranch}
                      onChange={(e) => setFormBranch(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-700 focus:outline-none focus:border-teal-700"
                    >
                      {branchOptions.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Replace File (Optional) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Replace File (Optional)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.mp3,.m4a,.wav,.docx,.doc,.png,.jpg,.jpeg,.svg"
                    onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-teal-800 hover:file:bg-teal-100 border border-slate-200 rounded-xl p-1"
                  />
                  {editingItem.file_url && (
                    <p className="text-[10px] text-teal-700 font-medium mt-1">
                      Current file attached on Google Drive. Uploading a new file will replace it.
                    </p>
                  )}
                </div>

                {/* YouTube URL */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    YouTube Video URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={formYoutubeUrl}
                    onChange={(e) => setFormYoutubeUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 font-medium"
                  />
                </div>

                {/* Lyrics & Chords */}
                {(formCategory === 'songs_chansonnier' || editingItem.lyrics_text) && (
                  <div className="space-y-2.5 pt-1 border-t border-slate-100">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Song Lyrics
                      </label>
                      <textarea
                        rows={3}
                        value={formLyrics}
                        onChange={(e) => setFormLyrics(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-mono focus:outline-none focus:border-teal-700"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Guitar Chords
                      </label>
                      <textarea
                        rows={2}
                        value={formChords}
                        onChange={(e) => setFormChords(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-mono focus:outline-none focus:border-teal-700"
                      />
                    </div>
                  </div>
                )}

                {/* Description & Tags */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 font-medium"
                  />
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <span>Updating...</span>
                    ) : (
                      <>
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Update Resource</span>
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
