'use client'

import { useState, useMemo } from 'react'
import DashboardShell from '../DashboardShell'
import {
  BellRing,
  Send,
  Users,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
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
  currentRole: string
  roles?: string[]
  currentUserName: string
  patrolRole?: string | null
  troops: Array<{ id: string; name: string }>
  recipients: RecipientProfile[]
  stats: SubscriberStats
  recentLogs: PushLogItem[]
}

const TEMPLATE_SUGGESTIONS = [
  {
    name: 'Rassemblement',
    title: '⚜️ Rassemblement du Samedi',
    body: 'Rappel: Rassemblement général ce samedi à 14h30 au local en uniforme impeccable!',
    url: '/group/dashboard/attendance',
  },
  {
    name: 'Camp',
    title: '⛺ Camp & Sortie Logistique',
    body: 'Vérifiez le sac de camp et les documents médicaux avant le rassemblement.',
    url: '/group/dashboard/events',
  },
  {
    name: 'Annonce',
    title: '📢 Annonce Importante du Groupe',
    body: 'Une mise à jour importante a été publiée dans le portail des chefs.',
    url: '/group/dashboard',
  },
]

export default function NotificationsManagement({
  groupName,
  currentRole,
  roles = [],
  currentUserName,
  patrolRole,
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
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error'
    text: string
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
      setStatusMessage(null)

      if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission()
        if (perm !== 'granted') {
          setStatusMessage({ type: 'error', text: 'Notification permission was not granted on this browser.' })
          return
        }
      }

      const reg = await navigator.serviceWorker?.ready
      let sub = await reg?.pushManager?.getSubscription()

      if (!sub) {
        let publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!publicKey) {
          const keyRes = await fetch('/api/notifications/push/vapid-public-key')
          const keyData = await keyRes.json()
          publicKey = keyData.publicKey
        }

        if (publicKey && reg) {
          const { urlBase64ToUint8Array } = await import('@/utils/push/vapidHelper')
          const appServerKey = urlBase64ToUint8Array(publicKey)
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: appServerKey.buffer as ArrayBuffer,
          })
        }
      }

      if (!sub) {
        setStatusMessage({ type: 'error', text: 'Could not obtain device push credentials.' })
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
        setStatusMessage({
          type: 'success',
          text: 'Test notification delivered directly to your device!',
        })
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Failed to dispatch test notification.',
        })
      }
    } catch (err: any) {
      console.error('Self test error:', err)
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error executing test push.',
      })
    } finally {
      setTestingSelf(false)
    }
  }

  // Dispatch push
  const handleSendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      setStatusMessage({ type: 'error', text: 'Please fill out both the title and message.' })
      return
    }

    if (targetMode === 'users' && selectedUserIds.length === 0) {
      setStatusMessage({ type: 'error', text: 'Please select at least one recipient user.' })
      return
    }

    const confirmText =
      targetMode === 'all'
        ? `Broadcast this push alert to ALL ${stats.totalSubscriptions} registered devices?`
        : `Send this push alert to ${selectedUserIds.length} selected member(s)?`

    if (!window.confirm(confirmText)) {
      return
    }

    try {
      setSending(true)
      setStatusMessage(null)

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
        setStatusMessage({
          type: 'success',
          text: data.message || `Dispatched to ${data.delivered} / ${data.total} devices successfully.`,
        })

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
        setStatusMessage({
          type: 'error',
          text: data.error || 'Failed to dispatch push notification.',
        })
      }
    } catch (err: any) {
      console.error('Dispatch error:', err)
      setStatusMessage({
        type: 'error',
        text: err.message || 'Unexpected network error during dispatch.',
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <DashboardShell
      groupName={groupName}
      currentRole={currentRole}
      roles={roles}
      userName={currentUserName}
      patrolRole={patrolRole}
    >
      <div className="max-w-7xl mx-auto space-y-3 pb-12">
        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl flex items-center gap-2 border text-xs font-bold shadow-2xs animate-in fade-in slide-in-from-top-2 duration-200 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* ── TOP HEADER CARD (Matches all other pages) ── */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0 shadow-2xs">
              <BellRing className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight truncate">
                Push Notifications
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                Direct background & lock-screen push alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={refreshStats}
              disabled={refreshingStats}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-all cursor-pointer disabled:opacity-50"
              title="Refresh device counts"
            >
              <RotateCw className={`h-3.5 w-3.5 ${refreshingStats ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>
            <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-xl border border-teal-200/60">
              {stats.totalSubscriptions} Devices Active
            </span>
          </div>
        </div>

        {/* ── METRIC STATS CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Devices
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900">
                {stats.totalSubscriptions}
              </span>
              <Smartphone className="h-4 w-4 text-teal-700" />
            </div>
          </div>

          <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Members & Leaders
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl sm:text-2xl font-black text-teal-700">
                {stats.registeredUserSubscriptions}
              </span>
              <Users className="h-4 w-4 text-teal-700" />
            </div>
          </div>

          <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Guest Devices
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl sm:text-2xl font-black text-amber-600">
                {stats.guestSubscriptions}
              </span>
              <SmartphoneNfc className="h-4 w-4 text-amber-600" />
            </div>
          </div>

          <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Reachability
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl sm:text-2xl font-black text-emerald-600">
                {stats.totalSubscriptions > 0 ? '100%' : '0%'}
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* ── MAIN WORKSPACE GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
          {/* ── LEFT / MAIN: AUDIENCE & COMPOSER (7 COLS) ── */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-3">
            {/* 1. AUDIENCE SELECTOR */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-3">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-teal-800" />
                <span>Target Audience</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setTargetMode('all')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    targetMode === 'all'
                      ? 'border-teal-600 bg-teal-50/60 shadow-2xs ring-1 ring-teal-600'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                        <Radio className="h-3.5 w-3.5 text-teal-700" />
                        Send to All Devices
                      </span>
                      {targetMode === 'all' && (
                        <span className="h-4 w-4 rounded-full bg-teal-800 text-white flex items-center justify-center text-[10px]">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Broadcasts to every registered device including signed-in scouts, leaders, and visitors.
                    </p>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Reach:</span>
                    <span className="font-bold text-teal-800">{stats.totalSubscriptions} device(s)</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetMode('users')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    targetMode === 'users'
                      ? 'border-teal-600 bg-teal-50/60 shadow-2xs ring-1 ring-teal-600'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-teal-700" />
                        Select Specific Users
                      </span>
                      {targetMode === 'users' && (
                        <span className="h-4 w-4 rounded-full bg-teal-800 text-white flex items-center justify-center text-[10px]">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Filter by troop or search by name to target specific leaders and members.
                    </p>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Selected:</span>
                    <span className="font-bold text-teal-800">{selectedUserIds.length} recipient(s)</span>
                  </div>
                </button>
              </div>

              {/* Specific User Filter & Selector */}
              {targetMode === 'users' && (
                <div className="pt-3 border-t border-slate-100 space-y-3 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search leader or member name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
                      />
                    </div>

                    <select
                      value={selectedTroopFilter}
                      onChange={(e) => setSelectedTroopFilter(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-600"
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
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                        onlyWithDevice
                          ? 'bg-teal-800 text-white border-teal-800'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Smartphone className="h-3 w-3" />
                      <span>Has Device</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">
                      Showing <b>{filteredRecipients.length}</b> • <b>{selectedUserIds.length}</b> selected
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllFiltered}
                        className="text-teal-800 hover:text-teal-900 font-bold hover:underline cursor-pointer"
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

                  {/* Recipient list */}
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 border border-slate-100 rounded-xl p-1.5 bg-slate-50/50">
                    {filteredRecipients.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No matching members found.
                      </div>
                    ) : (
                      filteredRecipients.map((rec) => {
                        const isSelected = selectedUserIds.includes(rec.id)
                        const hasDevice = activeUserSet.has(rec.id)

                        return (
                          <div
                            key={rec.id}
                            onClick={() => toggleUser(rec.id)}
                            className={`p-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                              isSelected
                                ? 'border-teal-500 bg-teal-50/60 shadow-2xs'
                                : 'border-slate-200/70 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="h-3.5 w-3.5 text-teal-800 rounded border-slate-300 focus:ring-teal-600 cursor-pointer"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-slate-900 truncate">
                                    {rec.fullName}
                                  </span>
                                  {hasDevice ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                      Device Connected
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                                      No Device
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">
                                  {rec.email || 'No email'} {rec.troopNames.length > 0 ? `• ${rec.troopNames.join(', ')}` : ''}
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

            {/* 2. COMPOSER */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <BellRing className="h-4 w-4 text-teal-800" />
                  <span>Notification Content</span>
                </h2>

                <div className="flex items-center gap-1 text-xs">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Templates:</span>
                  {TEMPLATE_SUGGESTIONS.map((tpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-[10px] font-semibold text-slate-600 transition-colors cursor-pointer"
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Notification Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Scouts des Cèdres • Saint Jean Marc"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  maxLength={65}
                />
              </div>

              {/* Body */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Message Body
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Type the announcement to be displayed on device lock screens..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  maxLength={180}
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Supports Arabic, French, and emojis</span>
                  <span>{message.length}/180</span>
                </div>
              </div>

              {/* Action Link */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Destination Link (Opened on tap)
                </label>
                <div className="relative">
                  <ExternalLink className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="/group/dashboard"
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                </div>
              </div>

              {/* Delay Selector */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Send Delay:</span>
                </div>
                <div className="flex items-center gap-1">
                  {[0, 5, 15].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setDelaySeconds(sec)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        delaySeconds === sec
                          ? 'bg-teal-800 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {sec === 0 ? 'Instant' : `${sec}s`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dispatch Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSendNotification}
                  disabled={sending || testingSelf}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-teal-800 hover:bg-teal-700 active:scale-95 text-white font-bold text-xs sm:text-sm transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending Push...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>
                        {targetMode === 'all'
                          ? `Broadcast to All (${stats.totalSubscriptions} Devices)`
                          : `Send to ${selectedUserIds.length} Selected Member(s)`}
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleTestOnMyDevice}
                  disabled={sending || testingSelf}
                  className="w-full sm:w-auto py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold transition-all border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  title="Send sample only to your browser"
                >
                  {testingSelf ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Smartphone className="h-3.5 w-3.5 text-teal-800" />
                  )}
                  <span>Test on My Phone</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: MOBILE PREVIEW & HISTORY (5 COLS) ── */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-3">
            {/* Live Mobile Lockscreen Preview */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-teal-800" />
                  <span>Lock-Screen Preview</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">Native Mockup</span>
              </div>

              {/* Clean Smartphone Frame */}
              <div className="mx-auto max-w-[280px] bg-slate-900 rounded-[32px] p-2.5 shadow-xl border-2 border-slate-800">
                <div className="w-16 h-3 bg-slate-950 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <div className="w-6 h-0.5 bg-slate-800 rounded-full" />
                </div>

                <div className="relative rounded-[24px] overflow-hidden p-3.5 pt-5 pb-8 bg-gradient-to-b from-teal-950 via-slate-900 to-slate-950 text-white min-h-[300px] flex flex-col justify-between">
                  {/* Clock */}
                  <div className="text-center space-y-0.5">
                    <span className="text-[9px] font-medium text-teal-200/80 uppercase tracking-widest block">
                      Today
                    </span>
                    <div className="text-3xl font-light tracking-tight text-white/95">
                      14:30
                    </div>
                  </div>

                  {/* Notification bubble */}
                  <div className="my-auto">
                    <div className="bg-white/95 text-slate-900 rounded-xl p-3 shadow-md border border-white/50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="text-[9px]">⚜️</span>
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-700">
                            SCOUTS DES CÈDRES
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-400">now</span>
                      </div>

                      <div>
                        <h5 className="text-[11px] font-black text-slate-950 leading-tight">
                          {title || 'Scouts des Cèdres'}
                        </h5>
                        <p className="text-[10px] text-slate-700 leading-snug mt-0.5">
                          {message || 'Notification content appears here...'}
                        </p>
                      </div>

                      {url && (
                        <div className="pt-1 flex items-center justify-between text-[9px] text-teal-800 font-bold border-t border-slate-200/60">
                          <span>Tap to open in app</span>
                          <span>›</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Home bar */}
                  <div className="w-16 h-0.5 bg-white/40 rounded-full mx-auto" />
                </div>
              </div>
            </div>

            {/* Recent Dispatches */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-2.5">
              <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-teal-800" />
                <span>Recent Dispatches</span>
              </h3>

              {logs.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400">
                  No push history yet. Dispatches will be logged here.
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.slice(0, 4).map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 truncate max-w-[150px]">
                          {log.title}
                        </span>
                        <span className="text-[9px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200/60">
                          {log.total_delivered}/{log.total_attempted} sent
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{log.body}</p>
                      <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
                        <span className="capitalize">Target: {log.target_type}</span>
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
    </DashboardShell>
  )
}
