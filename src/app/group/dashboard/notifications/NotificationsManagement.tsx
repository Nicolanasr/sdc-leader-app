'use client'

import { useState, useMemo } from 'react'
import {
  BellRing,
  Send,
  Users,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  Filter,
  ExternalLink,
  Clock,
  Sparkles,
  SmartphoneNfc,
  Radio,
  Check,
  RotateCw,
  Eye,
} from 'lucide-react'

export interface RecipientProfile {
  id: string
  fullName: string
  email: string
  rank?: string | null
  roles: string[]
  troopNames: string[]
  troopIds: string[]
}

export interface SubscriberStats {
  totalSubscriptions: number
  registeredUserSubscriptions: number
  guestSubscriptions: number
  activeUserIds: string[]
}

export interface PushLogItem {
  id: string
  title: string
  body: string
  url?: string | null
  target_type: string
  target_user_ids?: string[] | null
  total_attempted: number
  total_delivered: number
  created_at: string
}

interface Props {
  groupName: string
  currentUserName: string
  troops: Array<{ id: string; name: string }>
  recipients: RecipientProfile[]
  stats: SubscriberStats
  recentLogs: PushLogItem[]
}

const TEMPLATE_SUGGESTIONS = [
  {
    title: '⚜️ Rassemblement du Samedi',
    body: 'Rappel: Rassemblement général ce samedi à 14h30 en tenue impeccable!',
    url: '/group/dashboard/attendance',
  },
  {
    title: '⛺ Camp & Sortie Logistique',
    body: 'Vérifiez le sac de camp et les documents médicaux avant le départ.',
    url: '/group/dashboard/events',
  },
  {
    title: '📢 Annonce Importante du Groupe',
    body: 'Une mise à jour importante a été publiée dans le portail des chefs.',
    url: '/group/dashboard',
  },
]

export default function NotificationsManagement({
  groupName,
  currentUserName,
  troops,
  recipients,
  stats: initialStats,
  recentLogs: initialLogs,
}: Props) {
  // State
  const [stats, setStats] = useState<SubscriberStats>(initialStats)
  const [logs, setLogs] = useState<PushLogItem[]>(initialLogs)
  const [refreshingStats, setRefreshingStats] = useState(false)

  // Dispatch parameters
  const [targetMode, setTargetMode] = useState<'all' | 'users'>('all')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  // Recipient search & filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTroopFilter, setSelectedTroopFilter] = useState<string>('all')
  const [onlyWithDevice, setOnlyWithDevice] = useState(false)

  // Message content
  const [title, setTitle] = useState('Scouts des Cèdres • Saint Jean Marc')
  const [message, setMessage] = useState(
    'Rassemblement ce samedi à 14h30 au local. N’oubliez pas vos foulards!'
  )
  const [url, setUrl] = useState('/group/dashboard')
  const [delaySeconds, setDelaySeconds] = useState<number>(0)

  // Execution state
  const [sending, setSending] = useState(false)
  const [testingSelf, setTestingSelf] = useState(false)
  const [dispatchResult, setDispatchResult] = useState<{
    success: boolean
    delivered: number
    total: number
    message?: string
  } | null>(null)

  // Set of user IDs with active subscriptions
  const activeUserSet = useMemo(() => new Set(stats.activeUserIds || []), [stats.activeUserIds])

  // Filtered recipient list
  const filteredRecipients = useMemo(() => {
    return recipients.filter((r) => {
      // Search text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = r.fullName.toLowerCase().includes(q)
        const matchesEmail = r.email.toLowerCase().includes(q)
        const matchesRole = r.roles.some((role) => role.toLowerCase().includes(q))
        if (!matchesName && !matchesEmail && !matchesRole) return false
      }

      // Troop filter
      if (selectedTroopFilter !== 'all') {
        if (!r.troopIds.includes(selectedTroopFilter)) return false
      }

      // Device filter
      if (onlyWithDevice) {
        if (!activeUserSet.has(r.id)) return false
      }

      return true
    })
  }, [recipients, searchQuery, selectedTroopFilter, onlyWithDevice, activeUserSet])

  // Refresh stats
  const refreshStats = async () => {
    try {
      setRefreshingStats(true)
      const res = await fetch('/api/notifications/push/subscribers-stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (err) {
      console.warn('Failed to refresh stats:', err)
    } finally {
      setRefreshingStats(false)
    }
  }

  // Toggle user selection
  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  // Select all filtered users
  const selectAllFiltered = () => {
    const ids = filteredRecipients.map((r) => r.id)
    setSelectedUserIds((prev) => Array.from(new Set([...prev, ...ids])))
  }

  // Clear selection
  const clearSelection = () => {
    setSelectedUserIds([])
  }

  // Apply template
  const applyTemplate = (t: { title: string; body: string; url: string }) => {
    setTitle(t.title)
    setMessage(t.body)
    setUrl(t.url)
  }

  // Test on leader's own active device
  const handleTestOnMyDevice = async () => {
    try {
      setTestingSelf(true)
      setDispatchResult(null)

      if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission()
        if (perm !== 'granted') {
          alert('Notification permission was not granted on this browser.')
          return
        }
      }

      // Read current subscription
      const reg = await navigator.serviceWorker?.ready
      let sub = await reg?.pushManager?.getSubscription()

      if (!sub) {
        // Fetch key and create sub
        const keyRes = await fetch('/api/notifications/push/vapid-public-key')
        const keyData = await keyRes.json()
        if (keyData.publicKey && reg) {
          const { urlBase64ToUint8Array } = await import('@/utils/push/vapidHelper')
          const appServerKey = urlBase64ToUint8Array(keyData.publicKey)
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: appServerKey.buffer as ArrayBuffer,
          })
        }
      }

      if (!sub) {
        alert('Could not obtain a device push subscription. Please check browser permissions.')
        return
      }

      const res = await fetch('/api/notifications/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          title: `[Self-Test] ${title}`,
          message,
          url,
          delaySeconds: 1,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setDispatchResult({
          success: true,
          delivered: 1,
          total: 1,
          message: 'Test notification delivered to your browser!',
        })
      } else {
        setDispatchResult({
          success: false,
          delivered: 0,
          total: 1,
          message: data.error || 'Failed to dispatch test notification.',
        })
      }
    } catch (err: any) {
      console.error('Self test error:', err)
      setDispatchResult({
        success: false,
        delivered: 0,
        total: 1,
        message: err.message || 'Error executing test push.',
      })
    } finally {
      setTestingSelf(false)
    }
  }

  // Dispatch push
  const handleSendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      alert('Please fill out both the title and message.')
      return
    }

    if (targetMode === 'users' && selectedUserIds.length === 0) {
      alert('Please select at least one recipient user.')
      return
    }

    const confirmText =
      targetMode === 'all'
        ? `Broadcast this push alert to ALL ${stats.totalSubscriptions} registered devices (including guests)?`
        : `Send this push alert to ${selectedUserIds.length} selected member(s)?`

    if (!window.confirm(confirmText)) {
      return
    }

    try {
      setSending(true)
      setDispatchResult(null)

      const payload: any = {
        target: targetMode,
        title,
        message,
        url: url.trim() || '/group/dashboard',
        delaySeconds,
      }

      if (targetMode === 'users') {
        payload.userIds = selectedUserIds
      }

      const res = await fetch('/api/notifications/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (res.ok) {
        setDispatchResult({
          success: data.success,
          delivered: data.delivered || 0,
          total: data.total || 0,
          message: data.message || `Dispatched to ${data.delivered} / ${data.total} devices successfully.`,
        })

        // Refresh stats and logs
        refreshStats()
        setLogs((prev) => [
          {
            id: `temp-${Date.now()}`,
            title,
            body: message,
            url,
            target_type: targetMode,
            target_user_ids: targetMode === 'users' ? selectedUserIds : null,
            total_attempted: data.total || 0,
            total_delivered: data.delivered || 0,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ])
      } else {
        setDispatchResult({
          success: false,
          delivered: 0,
          total: 0,
          message: data.error || 'Failed to dispatch push notification.',
        })
      }
    } catch (err: any) {
      console.error('Dispatch error:', err)
      setDispatchResult({
        success: false,
        delivered: 0,
        total: 0,
        message: err.message || 'Unexpected network error during dispatch.',
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* 1. Header & Overview */}
      <div className="bg-gradient-to-br from-teal-950 via-slate-900 to-teal-900 rounded-3xl p-6 sm:p-8 text-white border border-teal-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-bold tracking-wide">
              <Radio className="h-3.5 w-3.5 animate-pulse text-teal-400" />
              <span>Web Push Notification Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Instant Push Dispatcher
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Send native lock-screen push alerts directly to leaders, scouts, and guest visitors. Notifications are delivered in real time even when the app or browser is completely closed.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshStats}
              disabled={refreshingStats}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold text-teal-200 border border-white/10 transition-all cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`h-3.5 w-3.5 ${refreshingStats ? 'animate-spin' : ''}`} />
              <span>Sync Devices</span>
            </button>
          </div>
        </div>

        {/* Real-time Device Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-4 border border-white/10">
            <span className="text-xs text-slate-400 block font-medium">Total Registered Devices</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {stats.totalSubscriptions}
              </span>
              <Smartphone className="h-4 w-4 text-teal-400" />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-4 border border-white/10">
            <span className="text-xs text-slate-400 block font-medium">Member & Leader Devices</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black text-teal-300">
                {stats.registeredUserSubscriptions}
              </span>
              <Users className="h-4 w-4 text-teal-400" />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-4 border border-white/10">
            <span className="text-xs text-slate-400 block font-medium">Guest / Visitor Devices</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black text-amber-300">
                {stats.guestSubscriptions}
              </span>
              <SmartphoneNfc className="h-4 w-4 text-amber-400" />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-2xl p-4 border border-white/10">
            <span className="text-xs text-slate-400 block font-medium">Reachability Rate</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                {stats.totalSubscriptions > 0 ? '100%' : '0%'}
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Composer & Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Configuration & Audience (8 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* A. Audience Selector */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-teal-700" />
              <span>1. Choose Target Audience</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Broadcast to All */}
              <button
                type="button"
                onClick={() => setTargetMode('all')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  targetMode === 'all'
                    ? 'border-teal-600 bg-teal-50/70 shadow-sm ring-1 ring-teal-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Radio className="h-4 w-4 text-teal-600" />
                      Send to All Devices
                    </span>
                    {targetMode === 'all' && (
                      <span className="h-5 w-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Broadcasts to every registered phone and laptop, including guests, parents, and leaders.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Estimated Reach:</span>
                  <span className="font-bold text-teal-800">
                    {stats.totalSubscriptions} device(s)
                  </span>
                </div>
              </button>

              {/* Option 2: Select Specific Users */}
              <button
                type="button"
                onClick={() => setTargetMode('users')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  targetMode === 'users'
                    ? 'border-teal-600 bg-teal-50/70 shadow-sm ring-1 ring-teal-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-teal-600" />
                      Select Specific Users
                    </span>
                    {targetMode === 'users' && (
                      <span className="h-5 w-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Filter by unit/troop or search by name to target specific leaders and scouts.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Selected:</span>
                  <span className="font-bold text-teal-800">
                    {selectedUserIds.length} recipient(s)
                  </span>
                </div>
              </button>
            </div>

            {/* Targeted User Selection Drawer */}
            {targetMode === 'users' && (
              <div className="pt-4 border-t border-slate-100 space-y-4 animate-in fade-in duration-200">
                {/* Search & Troop Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search leader or member name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <select
                    value={selectedTroopFilter}
                    onChange={(e) => setSelectedTroopFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="all">All Troops & Units</option>
                    {troops.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setOnlyWithDevice(!onlyWithDevice)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                      onlyWithDevice
                        ? 'bg-teal-800 text-white border-teal-800'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    <span>Has Device</span>
                  </button>
                </div>

                {/* Batch Action Buttons */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Showing <b>{filteredRecipients.length}</b> people • <b>{selectedUserIds.length}</b> selected
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllFiltered}
                      className="text-teal-700 hover:text-teal-900 font-bold hover:underline cursor-pointer"
                    >
                      Select all ({filteredRecipients.length})
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="text-slate-500 hover:text-slate-800 font-medium hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Recipients Scrollable List */}
                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
                  {filteredRecipients.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No matching leaders or members found.
                    </div>
                  ) : (
                    filteredRecipients.map((rec) => {
                      const isSelected = selectedUserIds.includes(rec.id)
                      const hasDevice = activeUserSet.has(rec.id)

                      return (
                        <div
                          key={rec.id}
                          onClick={() => toggleUser(rec.id)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'border-teal-500 bg-teal-50/60 shadow-2xs'
                              : 'border-slate-200/70 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent div
                              className="h-4 w-4 text-teal-600 rounded-md border-slate-300 focus:ring-teal-500 cursor-pointer"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900">
                                  {rec.fullName}
                                </span>
                                {hasDevice ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Device Online
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                    No Device
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                <span>{rec.email || 'No email'}</span>
                                {rec.troopNames.length > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-teal-700 font-medium">
                                      {rec.troopNames.join(', ')}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* B. Message Content Composer */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BellRing className="h-4 w-4 text-teal-700" />
                <span>2. Compose Notification</span>
              </h2>

              {/* Quick Template Dropdown */}
              <div className="flex items-center gap-1.5 text-xs">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-slate-500 font-medium">Templates:</span>
                <div className="flex items-center gap-1">
                  {TEMPLATE_SUGGESTIONS.map((tpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-[11px] text-slate-700 transition-colors cursor-pointer"
                    >
                      {idx === 0 ? 'Rassemblement' : idx === 1 ? 'Camp' : 'Urgent'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                Notification Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Scouts des Cèdres • Saint Jean Marc"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                maxLength={65}
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Keep titles concise for lock-screen readability.</span>
                <span>{title.length}/65</span>
              </div>
            </div>

            {/* Message Body */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                Message Body
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Type the message to be displayed on device lock screens..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                maxLength={180}
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Supports emojis and bilingual Arabic / French text.</span>
                <span>{message.length}/180</span>
              </div>
            </div>

            {/* Action URL */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                Destination Link (Opened when notification is clicked)
              </label>
              <div className="relative">
                <ExternalLink className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="/group/dashboard"
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Optional Delay */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>Dispatch Delay:</span>
              </div>
              <div className="flex items-center gap-1">
                {[0, 5, 15].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setDelaySeconds(sec)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                      delaySeconds === sec
                        ? 'bg-teal-800 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {sec === 0 ? 'Instant' : `${sec}s delay`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* C. Dispatch Actions & Feedback */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Primary Send Button */}
              <button
                type="button"
                onClick={handleSendNotification}
                disabled={sending || testingSelf}
                className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-teal-800 hover:bg-teal-900 active:scale-95 text-white font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Dispatching Push Notification...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>
                      {targetMode === 'all'
                        ? `Broadcast to All (${stats.totalSubscriptions} Devices)`
                        : `Send to ${selectedUserIds.length} Selected Member(s)`}
                    </span>
                  </>
                )}
              </button>

              {/* Quick Self-Test Button */}
              <button
                type="button"
                onClick={handleTestOnMyDevice}
                disabled={sending || testingSelf}
                className="w-full sm:w-auto py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 text-xs font-bold transition-all border border-slate-300/70 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                title="Send a sample of this notification only to your current browser to preview"
              >
                {testingSelf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Smartphone className="h-3.5 w-3.5 text-teal-700" />
                )}
                <span>Test on My Phone/Device</span>
              </button>
            </div>

            {/* Results Callout */}
            {dispatchResult && (
              <div
                className={`p-4 rounded-2xl border text-xs animate-in fade-in duration-200 flex items-start gap-3 ${
                  dispatchResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {dispatchResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-bold">
                    {dispatchResult.success ? 'Notification Dispatched' : 'Dispatch Warning'}
                  </h4>
                  <p className="mt-0.5 leading-relaxed">{dispatchResult.message}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Mobile Lockscreen Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Eye className="h-4 w-4 text-teal-700" />
                <span>Live Lock-Screen Preview</span>
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">Mobile Mockup</span>
            </div>

            {/* Realistic Smartphone Shell */}
            <div className="mx-auto max-w-[310px] bg-slate-950 rounded-[40px] p-3 shadow-2xl border-4 border-slate-800">
              {/* Phone Speaker Notch */}
              <div className="w-24 h-4 bg-slate-900 rounded-full mx-auto mb-3 flex items-center justify-center">
                <div className="w-10 h-1 bg-slate-800 rounded-full" />
              </div>

              {/* Lockscreen Glass Area */}
              <div className="relative rounded-[32px] overflow-hidden p-4 pt-6 pb-12 bg-gradient-to-b from-teal-900 via-slate-900 to-slate-950 text-white min-h-[380px] flex flex-col justify-between">
                {/* Lockscreen Clock */}
                <div className="text-center space-y-0.5">
                  <span className="text-[10px] font-medium text-teal-200/80 uppercase tracking-widest block">
                    Wednesday, September 23
                  </span>
                  <div className="text-4xl font-light tracking-tight text-white/95">
                    14:30
                  </div>
                </div>

                {/* Push Notification Banner */}
                <div className="my-auto">
                  <div className="bg-white/90 backdrop-blur-md text-slate-900 rounded-2xl p-3.5 shadow-lg border border-white/40 space-y-2 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-md bg-teal-800 flex items-center justify-center text-[10px] text-white">
                          ⚜️
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                          SCOUTS DES CÈDRES
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">now</span>
                    </div>

                    <div className="space-y-0.5">
                      <h5 className="text-xs font-black text-slate-950 leading-snug">
                        {title || 'Scouts des Cèdres'}
                      </h5>
                      <p className="text-[11px] text-slate-700 leading-tight">
                        {message || 'Notification content will appear here...'}
                      </p>
                    </div>

                    {url && (
                      <div className="pt-1 flex items-center justify-between text-[10px] text-teal-700 font-bold border-t border-slate-200/60">
                        <span>Tap to open in app</span>
                        <span>›</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Lockscreen Home Indicator */}
                <div className="w-24 h-1 bg-white/40 rounded-full mx-auto" />
              </div>
            </div>

            <p className="text-center text-[11px] text-slate-400">
              Matches iOS and Android Web Push notification styles.
            </p>
          </div>

          {/* Recent Dispatches Log Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-teal-700" />
              <span>Recent Dispatches</span>
            </h3>

            {logs.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No notifications logged yet. Your first dispatch will be recorded here.
              </div>
            ) : (
              <div className="space-y-2.5">
                {logs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 truncate max-w-[180px]">
                        {log.title}
                      </span>
                      <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                        {log.total_delivered} / {log.total_attempted} sent
                      </span>
                    </div>
                    <p className="text-slate-600 line-clamp-1">{log.body}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span className="capitalize">
                        Audience: <b>{log.target_type}</b>
                      </span>
                      <span>{new Date(log.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
