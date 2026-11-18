'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardShell from '../DashboardShell'
import {
  Megaphone,
  Users,
  MessageSquare,
  UserCheck,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Smartphone,
  Check,
  Search,
  Bot,
  Bell,
  Eye,
  ExternalLink,
  Radio,
  BellRing,
  SmartphoneNfc,
  RotateCw,
  Loader2,
  FileText,
  Filter,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  SCOUT_ARABIC_CIRCULARS,
  SCOUT_PUSH_TEMPLATES,
  SCOUT_HEADER_AR,
  ScoutCircularTemplate,
  PushNotificationTemplate,
} from '@/utils/scoutArabicTemplates'

interface LeaderProfile {
  id: string
  fullName: string
  email: string
  phoneNumber?: string | null
  whatsappNumber?: string | null
  rank?: string | null
  roles: string[]
  troops: string[]
}

interface Troop {
  id: string
  name: string
  unit_type?: string
}

interface HistoryLog {
  id: string
  title: string
  message: string
  channels_dispatched: string[]
  created_at: string
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
  groupId: string
  groupName: string
  currentRole: string
  roles?: string[]
  userName: string
  userId: string
  canAccessPush?: boolean
  troops: Troop[]
  leaders: LeaderProfile[]
  parentsCount: number
  totalActiveMembers: number
  initialHistory: HistoryLog[]
  pushStats?: SubscriberStats
  initialPushLogs?: PushLogItem[]
}

type MainTab = 'whatsapp' | 'push' | 'history'
type AudienceType = 'individual_leaders' | 'leaders_group' | 'parents_group' | 'all_parents'

export default function BroadcastManagement({
  groupId,
  groupName,
  currentRole,
  roles,
  userName,
  userId,
  canAccessPush = true,
  troops,
  leaders,
  parentsCount,
  totalActiveMembers,
  initialHistory,
  pushStats: initialPushStats = {
    totalSubscriptions: 0,
    registeredUserSubscriptions: 0,
    guestSubscriptions: 0,
    activeUserIds: [],
  },
  initialPushLogs = [],
}: Props) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')

  // Top level navigation tab (Gated so push is only available to group leaders)
  const [activeTab, setActiveTab] = useState<MainTab>(
    canAccessPush && tabParam === 'push'
      ? 'push'
      : tabParam === 'history'
      ? 'history'
      : 'whatsapp'
  )

  useEffect(() => {
    if (tabParam === 'push' && canAccessPush) {
      setActiveTab('push')
    } else if (tabParam === 'whatsapp' || tabParam === 'history') {
      setActiveTab(tabParam)
    }
  }, [tabParam, canAccessPush])

  // Global notification toast
  const [statusMessage, setStatusMessage] = useState<{
    text: string
    type: 'success' | 'error'
  } | null>(null)

  // ───────────────────────────────────────────────────────────
  // TAB 1: WHATSAPP BROADCAST STATE
  // ───────────────────────────────────────────────────────────
  const [audienceType, setAudienceType] = useState<AudienceType>('individual_leaders')
  const [selectedLeaderIds, setSelectedLeaderIds] = useState<string[]>([])
  const [leaderSearch, setLeaderSearch] = useState('')
  const [troopFilter, setTroopFilter] = useState<string>('all')

  // Composer fields
  const [broadcastTitle, setBroadcastTitle] = useState('دعوة اجتماع قيادة فوج')
  const [broadcastMessage, setBroadcastMessage] = useState(SCOUT_ARABIC_CIRCULARS[0].message)
  const [broadcastActionUrl, setBroadcastActionUrl] = useState('')
  const [customGroupJid, setCustomGroupJid] = useState('')
  const [templateCategory, setTemplateCategory] = useState<string>('all')

  // Custom Templates & Builder State
  const [customTemplates, setCustomTemplates] = useState<ScoutCircularTemplate[]>([])
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false)
  const [builderTitle, setBuilderTitle] = useState('')
  const [builderCategory, setBuilderCategory] = useState<string>('weekly')
  const [builderBody, setBuilderBody] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sdc_custom_templates')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setCustomTemplates(parsed)
        }
      }
    } catch (e) {
      console.warn('Failed to load custom templates from storage', e)
    }
  }, [])

  // Dispatch Channels
  const [sendViaWhatsApp, setSendViaWhatsApp] = useState(true)
  const [sendViaInApp, setSendViaInApp] = useState(true)

  // WhatsApp execution states
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [historyList, setHistoryList] = useState<HistoryLog[]>(initialHistory)

  // ───────────────────────────────────────────────────────────
  // TAB 2: PUSH NOTIFICATIONS STATE
  // ───────────────────────────────────────────────────────────
  const [stats, setStats] = useState<SubscriberStats>(initialPushStats)
  const [pushLogs, setPushLogs] = useState<PushLogItem[]>(initialPushLogs)
  const [refreshingStats, setRefreshingStats] = useState(false)

  const [pushTargetMode, setPushTargetMode] = useState<'all' | 'users'>('all')
  const [selectedPushUserIds, setSelectedPushUserIds] = useState<string[]>([])
  const [pushSearchQuery, setPushSearchQuery] = useState('')
  const [pushTroopFilter, setPushTroopFilter] = useState<string>('all')
  const [onlyWithDevice, setOnlyWithDevice] = useState(false)

  const [pushTitle, setPushTitle] = useState('مجلس قيادة الفوج • كشافة الأرز')
  const [pushBody, setPushBody] = useState(
    'تذكير باجتماع مجلس القيادة اليوم الساعة 7:00 مساءً في حالات. الحضور إلزامي.'
  )
  const [pushUrl, setPushUrl] = useState('/group/dashboard/broadcast')
  const [pushDelaySeconds, setPushDelaySeconds] = useState<number>(0)

  const [isSendingPush, setIsSendingPush] = useState(false)
  const [testingSelf, setTestingSelf] = useState(false)

  // ───────────────────────────────────────────────────────────
  // TAB 3: HISTORY FILTER STATE
  // ───────────────────────────────────────────────────────────
  const [historyFilter, setHistoryFilter] = useState<'all' | 'whatsapp' | 'push'>('all')

  // ───────────────────────────────────────────────────────────
  // COMPUTED: LEADERS FILTERING FOR WHATSAPP
  // ───────────────────────────────────────────────────────────
  const filteredLeaders = useMemo(() => {
    return leaders.filter((l) => {
      if (troopFilter !== 'all' && !l.troops.includes(troopFilter)) return false
      if (leaderSearch.trim()) {
        const query = leaderSearch.toLowerCase()
        const matchName = l.fullName.toLowerCase().includes(query)
        const matchEmail = l.email.toLowerCase().includes(query)
        const matchPhone = (l.phoneNumber || '').includes(query)
        const matchRoles = l.roles.some((r) => r.toLowerCase().includes(query))
        if (!matchName && !matchEmail && !matchPhone && !matchRoles) return false
      }
      return true
    })
  }, [leaders, troopFilter, leaderSearch])

  const toggleLeaderSelection = (id: string) => {
    setSelectedLeaderIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleSelectAllLeaders = () => {
    setSelectedLeaderIds(filteredLeaders.map((l) => l.id))
  }

  const handleDeselectAllLeaders = () => {
    setSelectedLeaderIds([])
  }

  // ───────────────────────────────────────────────────────────
  // COMPUTED: TEMPLATES FILTERING
  // ───────────────────────────────────────────────────────────
  const allAvailableTemplates = useMemo(() => {
    return [...customTemplates, ...SCOUT_ARABIC_CIRCULARS]
  }, [customTemplates])

  const filteredTemplates = useMemo(() => {
    if (templateCategory === 'all') return allAvailableTemplates
    if (templateCategory === 'custom') return customTemplates
    return allAvailableTemplates.filter((t) => t.category === templateCategory)
  }, [templateCategory, allAvailableTemplates, customTemplates])

  const handleApplyCircularTemplate = (tpl: ScoutCircularTemplate) => {
    setBroadcastTitle(tpl.title)
    setBroadcastMessage(tpl.message)
    if (tpl.actionUrl) {
      setBroadcastActionUrl(tpl.actionUrl)
    }
  }

  const handleApplyPushTemplate = (tpl: PushNotificationTemplate) => {
    setPushTitle(tpl.title)
    setPushBody(tpl.body)
    setPushUrl(tpl.url)
  }

  // Recipient estimated count
  const estimatedRecipientCount = useMemo(() => {
    if (audienceType === 'individual_leaders') return selectedLeaderIds.length
    if (audienceType === 'leaders_group') return 'Official Leaders Group'
    if (audienceType === 'parents_group') return 'Official Parents Group'
    if (audienceType === 'all_parents')
      return `${parentsCount} Direct Parents (${totalActiveMembers} Scouts)`
    return 0
  }, [audienceType, selectedLeaderIds, parentsCount, totalActiveMembers])

  // ───────────────────────────────────────────────────────────
  // COMPUTED: RECIPIENTS FILTERING FOR PUSH
  // ───────────────────────────────────────────────────────────
  const activeUserSet = useMemo(() => new Set(stats.activeUserIds || []), [stats.activeUserIds])

  const filteredPushRecipients = useMemo(() => {
    return leaders.filter((l) => {
      if (pushSearchQuery.trim()) {
        const q = pushSearchQuery.toLowerCase()
        const matchName = l.fullName.toLowerCase().includes(q)
        const matchEmail = l.email.toLowerCase().includes(q)
        const matchRoles = l.roles.some((r) => r.toLowerCase().includes(q))
        if (!matchName && !matchEmail && !matchRoles) return false
      }
      if (pushTroopFilter !== 'all') {
        if (!l.troops.includes(pushTroopFilter)) return false
      }
      if (onlyWithDevice) {
        if (!activeUserSet.has(l.id)) return false
      }
      return true
    })
  }, [leaders, pushSearchQuery, pushTroopFilter, onlyWithDevice, activeUserSet])

  const togglePushUser = (id: string) => {
    setSelectedPushUserIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const selectAllFilteredPush = () => {
    const ids = filteredPushRecipients.map((r) => r.id)
    setSelectedPushUserIds((prev) => Array.from(new Set([...prev, ...ids])))
  }

  const clearPushSelection = () => {
    setSelectedPushUserIds([])
  }

  // Refresh push device stats
  const refreshPushStats = async () => {
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

  // ───────────────────────────────────────────────────────────
  // ACTION: DIRECT 1-TAP WHATSAPP DISPATCH (BYPASSES TUNNEL)
  // ───────────────────────────────────────────────────────────
  const handleOpenDirectWhatsApp = () => {
    if (!broadcastMessage.trim()) {
      setStatusMessage({ text: 'Please enter a message or select a template first.', type: 'error' })
      return
    }

    let fullMessage = broadcastMessage.trim()
    if (broadcastActionUrl.trim() && !fullMessage.includes(broadcastActionUrl.trim())) {
      fullMessage += `\n\n🔗 الرابط المرفق:\n${broadcastActionUrl.trim()}`
    }

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullMessage)}`
    window.open(url, '_blank')

    const newLog: HistoryLog = {
      id: 'log_' + Date.now(),
      title: `[WhatsApp Direct] ${broadcastTitle || 'Circular'}`,
      message: broadcastMessage,
      channels_dispatched: ['whatsapp_direct'],
      created_at: new Date().toISOString(),
    }
    setHistoryList((prev) => [newLog, ...prev])
    setStatusMessage({ text: 'Opened WhatsApp with circular text ready to send!', type: 'success' })
    setShowConfirmModal(false)
  }

  // ───────────────────────────────────────────────────────────
  // ACTION: CUSTOM TEMPLATE BUILDER (SAVE & DELETE)
  // ───────────────────────────────────────────────────────────
  const handleSaveCustomTemplate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!builderTitle.trim() || !builderBody.trim()) {
      setStatusMessage({ text: 'Title and template message body are required.', type: 'error' })
      return
    }

    const categoryNames: Record<string, string> = {
      council: 'مجلس القيادة',
      weekly: 'نشاط أسبوعي',
      camp: 'مخيمات ورحلات',
      dues: 'اشتراكات ومالية',
      ceremony: 'احتفالات ووعد',
      urgent: 'عاجل وهام',
      feasts: 'أعياد ومناسبات',
      service: 'الخدمة العامة',
    }

    const newTpl: ScoutCircularTemplate = {
      id: 'custom_' + Date.now(),
      category: builderCategory as any,
      categoryNameAr: categoryNames[builderCategory] || 'قالب مخصص',
      name: `⭐ ${builderTitle.trim()}`,
      title: builderTitle.trim(),
      message: builderBody.trim(),
    }

    const updated = [newTpl, ...customTemplates]
    setCustomTemplates(updated)
    try {
      localStorage.setItem('sdc_custom_templates', JSON.stringify(updated))
    } catch (e) {}

    handleApplyCircularTemplate(newTpl)
    setShowTemplateBuilder(false)
    setBuilderTitle('')
    setBuilderBody('')
    setStatusMessage({ text: 'Custom template saved and applied to composer!', type: 'success' })
  }

  const handleDeleteCustomTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = customTemplates.filter((t) => t.id !== id)
    setCustomTemplates(updated)
    try {
      localStorage.setItem('sdc_custom_templates', JSON.stringify(updated))
    } catch (e) {}
    setStatusMessage({ text: 'Custom template deleted.', type: 'success' })
  }

  // ───────────────────────────────────────────────────────────
  // ACTION: SEND WHATSAPP BROADCAST VIA BACKEND GATEWAY
  // ───────────────────────────────────────────────────────────
  const handleSendWhatsApp = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      setStatusMessage({ text: 'Subject and message are required.', type: 'error' })
      return
    }

    if (audienceType === 'individual_leaders' && selectedLeaderIds.length === 0) {
      setStatusMessage({ text: 'Please select at least one leader.', type: 'error' })
      return
    }

    setIsSendingWhatsApp(true)
    setShowConfirmModal(false)

    try {
      const activeChannels: ('whatsapp' | 'in_app')[] = []
      if (sendViaWhatsApp) activeChannels.push('whatsapp')
      if (sendViaInApp) activeChannels.push('in_app')

      const res = await fetch('/api/group/broadcast/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAudience: audienceType,
          recipientProfileIds:
            audienceType === 'individual_leaders' ? selectedLeaderIds : undefined,
          groupJid: customGroupJid.trim() || undefined,
          channels: activeChannels,
          payload: {
            title: broadcastTitle,
            message: broadcastMessage,
            actionUrl: broadcastActionUrl.trim() || undefined,
            category: 'system',
          },
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to dispatch broadcast.')
      }

      setStatusMessage({
        text: `WhatsApp circular successfully dispatched! (${data.totalSent} delivered)`,
        type: 'success',
      })

      const newLog: HistoryLog = {
        id: 'log_' + Date.now(),
        title: `[WhatsApp] ${broadcastTitle}`,
        message: broadcastMessage,
        channels_dispatched: activeChannels,
        created_at: new Date().toISOString(),
      }
      setHistoryList((prev) => [newLog, ...prev])

      if (audienceType === 'individual_leaders') {
        setSelectedLeaderIds([])
      }
    } catch (err: any) {
      console.error('[BroadcastManagement] Error:', err)
      setStatusMessage({ text: err.message || 'Error sending broadcast.', type: 'error' })
    } finally {
      setIsSendingWhatsApp(false)
      setTimeout(() => setStatusMessage(null), 8000)
    }
  }

  // ───────────────────────────────────────────────────────────
  // ACTION: SEND WEB PUSH NOTIFICATION
  // ───────────────────────────────────────────────────────────
  const handleSendPush = async () => {
    if (!pushTitle.trim() || !pushBody.trim()) {
      setStatusMessage({ type: 'error', text: 'Please fill out both the push title and message.' })
      return
    }

    if (pushTargetMode === 'users' && selectedPushUserIds.length === 0) {
      setStatusMessage({ type: 'error', text: 'Please select at least one recipient user.' })
      return
    }

    const confirmText =
      pushTargetMode === 'all'
        ? `Broadcast this push alert to ALL ${stats.totalSubscriptions} registered devices?`
        : `Send this push alert to ${selectedPushUserIds.length} selected member(s)?`

    if (!window.confirm(confirmText)) {
      return
    }

    try {
      setIsSendingPush(true)
      setStatusMessage(null)

      const payload: any = {
        target: pushTargetMode,
        title: pushTitle,
        message: pushBody,
        url: pushUrl.trim() || '/group/dashboard',
        delaySeconds: pushDelaySeconds,
      }

      if (pushTargetMode === 'users') {
        payload.userIds = selectedPushUserIds
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
          text:
            data.message ||
            `Dispatched to ${data.delivered} / ${data.total} devices successfully.`,
        })

        refreshPushStats()
        setPushLogs((prev) => [
          {
            id: `temp-${Date.now()}`,
            title: pushTitle,
            body: pushBody,
            url: pushUrl,
            target_type: pushTargetMode,
            target_user_ids: pushTargetMode === 'users' ? selectedPushUserIds : null,
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
      console.error('Push dispatch error:', err)
      setStatusMessage({
        type: 'error',
        text: err.message || 'Unexpected network error during dispatch.',
      })
    } finally {
      setIsSendingPush(false)
      setTimeout(() => setStatusMessage(null), 8000)
    }
  }

  // ───────────────────────────────────────────────────────────
  // ACTION: TEST PUSH ON LEADER'S OWN DEVICE
  // ───────────────────────────────────────────────────────────
  const handleTestOnMyDevice = async () => {
    try {
      setTestingSelf(true)
      setStatusMessage(null)

      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission !== 'granted') {
          const perm = await Notification.requestPermission()
          if (perm !== 'granted') {
            setStatusMessage({
              type: 'error',
              text: 'Notification permission was not granted on this browser.',
            })
            return
          }
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
        setStatusMessage({
          type: 'error',
          text: 'Could not obtain device push credentials. Ensure notifications are enabled in browser.',
        })
        return
      }

      const res = await fetch('/api/notifications/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          title: `[Self-Test] ${pushTitle}`,
          message: pushBody,
          url: pushUrl,
          delaySeconds: 1,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: 'Sample notification delivered directly to your device lock-screen!',
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
        text: err.message || 'Error executing test push on this device.',
      })
    } finally {
      setTestingSelf(false)
      setTimeout(() => setStatusMessage(null), 8000)
    }
  }

  return (
    <DashboardShell
      groupName={groupName}
      currentRole={currentRole}
      roles={roles}
      userName={userName}
    >
      <div className="max-w-7xl mx-auto space-y-2.5 sm:space-y-3 pb-4 sm:pb-8 font-sans">
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

        {/* ── TOP HEADER & UNIFIED TAB NAVIGATION ── */}
        <div className="bg-white p-3 sm:p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0 shadow-2xs">
                <Megaphone className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight truncate">
                    Broadcast Hub
                  </h1>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-teal-100/70 text-teal-900 border border-teal-200" dir="rtl">
                    التعاميم
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate hidden sm:block">
                  Official WhatsApp scout circulars & instant device lock-screen push alerts
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-xl border border-teal-200/60 flex items-center gap-1">
                <Smartphone className="h-3 w-3 text-teal-700" />
                <span>{stats.totalSubscriptions} Devices</span>
              </span>
            </div>
          </div>

          {/* Unified Tab Switcher: 3 columns guaranteed to fit on all screen sizes */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveTab('whatsapp')}
              className={`py-2 px-1 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer truncate ${
                activeTab === 'whatsapp'
                  ? 'bg-white text-teal-950 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">WhatsApp</span>
            </button>

            {canAccessPush && (
              <button
                type="button"
                onClick={() => setActiveTab('push')}
                className={`py-2 px-1 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer truncate ${
                  activeTab === 'push'
                    ? 'bg-white text-teal-950 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BellRing className="h-3.5 w-3.5 text-teal-700 shrink-0" />
                <span className="truncate">Push</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-900">
                  {stats.totalSubscriptions}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`py-2 px-1 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer truncate ${
                activeTab === 'history'
                  ? 'bg-white text-teal-950 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span className="truncate">Archive</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
                {historyList.length + pushLogs.length}
              </span>
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════ */}
        {/* TAB 1: WHATSAPP BROADCAST & ARABIC SCOUT CIRCULARS       */}
        {/* ═════════════════════════════════════════════════════════ */}
        {activeTab === 'whatsapp' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start animate-in fade-in duration-150">
            {/* LEFT / COMPOSER: 8 COLS */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-4">
              {/* 1. TARGET AUDIENCE */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-teal-800 shrink-0" />
                    <span dir="ltr">1. Target Audience</span>
                    <span className="text-xs font-normal text-slate-400" dir="rtl">(تحديد الفئة)</span>
                  </h3>
                  <span className="text-xs font-black text-teal-800 bg-teal-50 px-2.5 py-1 rounded-xl border border-teal-200/60">
                    {typeof estimatedRecipientCount === 'number'
                      ? `${estimatedRecipientCount} Selected`
                      : estimatedRecipientCount}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setAudienceType('individual_leaders')}
                    className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1 cursor-pointer ${
                      audienceType === 'individual_leaders'
                        ? 'bg-teal-900 text-white border-teal-900 shadow-md ring-2 ring-teal-600/30'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {audienceType === 'individual_leaders' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] sm:text-xs font-black truncate">Individual Leaders</div>
                      <div className="text-[9px] sm:text-[10px] opacity-75 truncate">Select by name</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudienceType('leaders_group')}
                    className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1 cursor-pointer ${
                      audienceType === 'leaders_group'
                        ? 'bg-teal-900 text-white border-teal-900 shadow-md ring-2 ring-teal-600/30'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {audienceType === 'leaders_group' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] sm:text-xs font-black truncate">Leaders Group</div>
                      <div className="text-[9px] sm:text-[10px] opacity-75 truncate">Official Chat</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudienceType('parents_group')}
                    className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1 cursor-pointer ${
                      audienceType === 'parents_group'
                        ? 'bg-teal-900 text-white border-teal-900 shadow-md ring-2 ring-teal-600/30'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {audienceType === 'parents_group' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] sm:text-xs font-black truncate">Parents Group</div>
                      <div className="text-[9px] sm:text-[10px] opacity-75 truncate">Official Chat</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudienceType('all_parents')}
                    className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1 cursor-pointer ${
                      audienceType === 'all_parents'
                        ? 'bg-teal-900 text-white border-teal-900 shadow-md ring-2 ring-teal-600/30'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Megaphone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {audienceType === 'all_parents' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] sm:text-xs font-black truncate">All Parents</div>
                      <div className="text-[9px] sm:text-[10px] opacity-75 truncate">{parentsCount} Direct DMs</div>
                    </div>
                  </button>
                </div>

                {/* Individual Leaders Multi-select */}
                {audienceType === 'individual_leaders' && (
                  <div className="space-y-3 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
                    <div className="flex flex-col gap-2">
                      <div className="relative w-full">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search leader by name, phone, or rank..."
                          value={leaderSearch}
                          onChange={(e) => setLeaderSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-teal-700 font-medium text-slate-900"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center sm:gap-2">
                        <select
                          value={troopFilter}
                          onChange={(e) => setTroopFilter(e.target.value)}
                          className="col-span-1 px-2 sm:px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-700 focus:outline-none truncate"
                        >
                          <option value="all">All Troops</option>
                          {troops.map((t) => (
                            <option key={t.id} value={t.name}>
                              {t.name}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={handleSelectAllLeaders}
                          className="px-2 sm:px-2.5 py-1.5 text-xs font-black text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl border border-teal-200/60 transition-colors cursor-pointer text-center truncate"
                        >
                          Select All
                        </button>

                        <button
                          type="button"
                          onClick={handleDeselectAllLeaders}
                          className="px-2 sm:px-2.5 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer text-center truncate"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 border border-slate-200/70 rounded-2xl p-2 bg-slate-50/50">
                      {filteredLeaders.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-400 font-medium">
                          No leaders match your search criteria.
                        </div>
                      ) : (
                        filteredLeaders.map((leader) => {
                          const isSelected = selectedLeaderIds.includes(leader.id)
                          const hasPhone = Boolean(leader.whatsappNumber || leader.phoneNumber)
                          return (
                            <div
                              key={leader.id}
                              onClick={() => toggleLeaderSelection(leader.id)}
                              className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                isSelected
                                  ? 'bg-teal-50/80 border border-teal-300/80 shadow-2xs'
                                  : 'hover:bg-white bg-white/60 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-4 h-4 rounded-md flex items-center justify-center transition-colors shrink-0 ${
                                    isSelected
                                      ? 'bg-teal-800 text-white'
                                      : 'border border-slate-300 bg-white'
                                  }`}
                                >
                                  {isSelected && <Check className="h-3 w-3" />}
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-black text-xs text-slate-900 truncate">
                                      {leader.fullName}
                                    </span>
                                    {leader.rank && (
                                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                        {leader.rank}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-500 truncate flex items-center gap-1.5">
                                    <span>{leader.roles.slice(0, 2).join(' • ') || 'Leader'}</span>
                                    {leader.troops.length > 0 && (
                                      <span className="text-teal-700 font-bold">
                                        ({leader.troops.join(', ')})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                {hasPhone ? (
                                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                                    📱 {leader.whatsappNumber || leader.phoneNumber}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium text-slate-400 italic">
                                    No phone
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}

                {(audienceType === 'leaders_group' || audienceType === 'parents_group') && (
                  <div className="p-3.5 bg-teal-50/70 border border-teal-200/80 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-bold text-teal-950">
                      <Smartphone className="h-4 w-4 text-teal-800 shrink-0" />
                      <span>
                        {audienceType === 'leaders_group'
                          ? 'Broadcasting to Official Leadership Group Chat'
                          : 'Broadcasting to Official Parents Group Chat'}
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. 120363024892348239@g.us (Leave empty to use default group configured in system)"
                      value={customGroupJid}
                      onChange={(e) => setCustomGroupJid(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-teal-200 bg-white focus:outline-none focus:border-teal-700 font-mono"
                    />
                  </div>
                )}

                {audienceType === 'all_parents' && (
                  <div className="p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-2xl space-y-1 text-xs">
                    <div className="font-bold text-amber-950 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-amber-800" />
                      <span>Personalized Direct Messages to {parentsCount} Registered Parents</span>
                    </div>
                    <p className="text-[11px] text-amber-900/90 leading-relaxed">
                      Each parent receives an individualized WhatsApp dispatch referencing their registered scouts.
                    </p>
                  </div>
                )}
              </div>

              {/* 2. AUTHENTIC ARABIC SCOUT CIRCULARS LIBRARY */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <FileText className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span dir="ltr" className="text-sm font-black text-slate-900">2. Circular Templates</span>
                    <span className="text-xs font-normal text-slate-400" dir="rtl">(نماذج كشفية)</span>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setBuilderTitle('')
                        setBuilderBody(`${SCOUT_HEADER_AR}\n\nالموضوع: \n\nتحية كشفية وبعد ...\n\n*ملاحظة:* `)
                        setShowTemplateBuilder(true)
                      }}
                      className="min-h-[38px] px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>صانع النماذج (Builder)</span>
                    </button>
                    <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-xl border border-emerald-200 hidden sm:inline">
                      سان جان مارك
                    </span>
                  </div>
                </div>

                {/* Category Pills: Smooth horizontal scroll on mobile */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1">
                  {[
                    { id: 'all', label: 'الكل (All)' },
                    ...(customTemplates.length > 0
                      ? [{ id: 'custom', label: `⭐ قوالبي (${customTemplates.length})` }]
                      : []),
                    { id: 'council', label: 'مجلس القيادة' },
                    { id: 'weekly', label: 'الأنشطة الأسبوعية' },
                    { id: 'camp', label: 'المخيمات' },
                    { id: 'dues', label: 'الاشتراكات' },
                    { id: 'ceremony', label: 'القداس والوعد' },
                    { id: 'feasts', label: 'البربارة والميلاد' },
                    { id: 'urgent', label: 'تنبيه طارئ' },
                    { id: 'service', label: 'الخدمة العامة' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setTemplateCategory(cat.id)}
                      className={`min-h-[34px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0 whitespace-nowrap ${
                        templateCategory === cat.id
                          ? 'bg-teal-900 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Circular Cards Grid */}
                {filteredTemplates.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <Sparkles className="h-6 w-6 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">
                      لا توجد قوالب في هذه الفئة حالياً.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setBuilderTitle('')
                        setBuilderBody(`${SCOUT_HEADER_AR}\n\nالموضوع: \n\nتحية كشفية وبعد ...`)
                        setShowTemplateBuilder(true)
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-all inline-flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      <span>إنشاء قالب مخصص الآن</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {filteredTemplates.map((tpl) => {
                      const isCustom = tpl.id.startsWith('custom_')
                      return (
                        <div
                          key={tpl.id}
                          onClick={() => handleApplyCircularTemplate(tpl)}
                          className={`p-3 rounded-2xl border transition-all group cursor-pointer flex flex-col justify-between text-right relative ${
                            isCustom
                              ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-50/70 hover:border-amber-400'
                              : 'border-slate-200/90 hover:border-emerald-500 bg-slate-50/60 hover:bg-emerald-50/40'
                          }`}
                          dir="rtl"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${
                                  isCustom
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : 'bg-white border-slate-200 text-slate-700'
                                }`}
                              >
                                {tpl.categoryNameAr}
                              </span>

                              <div className="flex items-center gap-1">
                                {isCustom && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteCustomTemplate(tpl.id, e)}
                                    title="حذف هذا القالب"
                                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                                <span className="text-[10px] font-bold text-emerald-800 opacity-0 group-hover:opacity-100 transition-opacity">
                                  تطبيق ←
                                </span>
                              </div>
                            </div>
                            <h4 className="text-xs font-black text-slate-900 group-hover:text-emerald-950 leading-snug">
                              {tpl.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-sans">
                              {tpl.message.replace(tpl.title, '').slice(0, 100)}...
                            </p>
                          </div>
                          <div className="pt-2 mt-2 border-t border-slate-200/50 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                            <span>جاهز للإرسال الفوري</span>
                            <span className="text-emerald-700 font-bold group-hover:underline">
                              اختر هذا القالب
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* 3. MESSAGE COMPOSER */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <Send className="h-4 w-4 text-teal-800 shrink-0" />
                    <span dir="ltr">3. Message Composer</span>
                    <span className="text-xs font-normal text-slate-400" dir="rtl">(صياغة البيان)</span>
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                    يدعم التنسيق الكشفي والخطوط العربية
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Subject / Title (الموضوع وعنوان البيان) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. دعوة اجتماع قيادة فوج"
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      dir="rtl"
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Official Message Text (نص البيان والترويسة الكشفية) *
                      </label>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {broadcastMessage.length} characters
                      </span>
                    </div>
                    <textarea
                      rows={12}
                      required
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      dir="rtl"
                      className="w-full px-3.5 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 font-medium text-slate-800 leading-relaxed font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Optional Action URL / Form Link (رابط استمارة أو صفحة مرفقة)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. /group/dashboard/events or https://forms.gle/..."
                      value={broadcastActionUrl}
                      onChange={(e) => setBroadcastActionUrl(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 font-medium text-slate-700"
                    />
                  </div>

                  {/* Dispatch Channels */}
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-4 flex-wrap">
                    <span className="text-xs font-bold text-slate-600 block">Channels:</span>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={sendViaWhatsApp}
                        onChange={(e) => setSendViaWhatsApp(e.target.checked)}
                        className="rounded text-teal-800 focus:ring-teal-700 h-4 w-4 cursor-pointer"
                      />
                      <span className="flex items-center gap-1">
                        <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
                        <span>WhatsApp Gateway</span>
                      </span>
                    </label>


                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={sendViaInApp}
                        onChange={(e) => setSendViaInApp(e.target.checked)}
                        className="rounded text-teal-800 focus:ring-teal-700 h-4 w-4 cursor-pointer"
                      />
                      <span className="flex items-center gap-1">
                        <Bell className="h-3.5 w-3.5 text-amber-600" />
                        <span>Leader In-App Logs</span>
                      </span>
                    </label>
                  </div>

                  {/* Action Buttons: 1-Tap WhatsApp Direct + Server Gateway */}
                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!broadcastMessage.trim()}
                      onClick={handleOpenDirectWhatsApp}
                      className="w-full py-3 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 active:scale-98 text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Smartphone className="h-4 w-4" />
                      <span>📲 Open & Send in WhatsApp (إرسال مباشر عبر واتساب)</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSendingWhatsApp || !broadcastTitle.trim() || !broadcastMessage.trim()}
                      onClick={() => setShowConfirmModal(true)}
                      className="w-full py-3 px-4 rounded-2xl bg-teal-900 hover:bg-teal-800 disabled:opacity-50 active:scale-98 text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSendingWhatsApp ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      <span>
                        {isSendingWhatsApp
                          ? 'Dispatching WhatsApp Circular...'
                          : '🚀 Server Gateway (إرسال عبر السيرفر)'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT / PREVIEW: 4 COLS */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-4">
              {/* LIVE WHATSAPP BUBBLE PREVIEW */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Eye className="h-4 w-4 text-emerald-600" />
                    <span>Live WhatsApp Chat Preview</span>
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                    Mobile Bubble
                  </span>
                </div>

                <div className="bg-[#EFEAE2] p-3 rounded-2xl border border-slate-200 space-y-2 shadow-inner font-sans">
                  <div
                    className="bg-white p-3.5 rounded-2xl rounded-tr-xs shadow-xs space-y-2 max-w-[95%] border border-slate-100 text-right"
                    dir="rtl"
                  >
                    <div className="text-[11px] font-black text-teal-950 flex items-center justify-end gap-1">
                      <span>⚜️ Scouts des Cèdres • Saint Jean Marc</span>
                    </div>

                    <div className="text-xs font-black text-slate-900 border-b border-slate-100 pb-1">
                      📢 {broadcastTitle || 'الموضوع / عنوان البيان'}
                    </div>

                    <div className="text-[11px] text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {broadcastMessage || 'سيظهر نص البيان هنا بالترويسة والتنسيق الكامل...'}
                    </div>

                    {broadcastActionUrl && (
                      <div className="pt-1 text-[11px] font-bold text-teal-800 flex items-center justify-end gap-1">
                        <ExternalLink className="h-3 w-3" />
                        <span>فتح الرابط المرفق</span>
                      </div>
                    )}

                    <div className="text-[9px] text-left text-slate-400 font-semibold pt-1 flex items-center justify-start gap-1">
                      <span>12:00 PM</span>
                      <span className="text-sky-500 font-black">✓✓</span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 leading-relaxed p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  💡 <b>ملاحظة:</b> يتم إرسال هذا البيان عبر بوابة واتساب المعتمدة مباشرة إلى أولياء الأمور أو القادة مع الحفاظ على التنسيق والرموز.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* TAB 2: INSTANT WEB PUSH NOTIFICATIONS                    */}
        {/* ═════════════════════════════════════════════════════════ */}
        {activeTab === 'push' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Metric Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Active Devices
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
                  Sync & Status
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <button
                    type="button"
                    onClick={refreshPushStats}
                    disabled={refreshingStats}
                    className="flex items-center gap-1 text-xs font-bold text-teal-800 hover:text-teal-900 cursor-pointer"
                  >
                    <RotateCw className={`h-3.5 w-3.5 ${refreshingStats ? 'animate-spin' : ''}`} />
                    <span>Sync Counts</span>
                  </button>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* LEFT / COMPOSER: 7 COLS */}
              <div className="lg:col-span-7 xl:col-span-8 space-y-4">
                {/* 1. TARGET MODE */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-3.5 sm:p-5 shadow-sm space-y-3">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Radio className="h-4 w-4 text-teal-800" />
                    <span>Push Target Audience (الأجهزة المستهدفة)</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPushTargetMode('all')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        pushTargetMode === 'all'
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
                          {pushTargetMode === 'all' && (
                            <span className="h-4 w-4 rounded-full bg-teal-800 text-white flex items-center justify-center text-[10px]">
                              <Check className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                          Instant broadcast to all active mobile and desktop browsers with notifications enabled.
                        </p>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Reach:</span>
                        <span className="font-bold text-teal-800">{stats.totalSubscriptions} devices</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPushTargetMode('users')}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        pushTargetMode === 'users'
                          ? 'border-teal-600 bg-teal-50/60 shadow-2xs ring-1 ring-teal-600'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-teal-700" />
                            Select Specific Members
                          </span>
                          {pushTargetMode === 'users' && (
                            <span className="h-4 w-4 rounded-full bg-teal-800 text-white flex items-center justify-center text-[10px]">
                              <Check className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                          Filter by troop or search by leader name to target selected devices.
                        </p>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Selected:</span>
                        <span className="font-bold text-teal-800">
                          {selectedPushUserIds.length} recipient(s)
                        </span>
                      </div>
                    </button>
                  </div>

                  {pushTargetMode === 'users' && (
                    <div className="pt-3 border-t border-slate-100 space-y-3 animate-in fade-in duration-150">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search leader by name..."
                            value={pushSearchQuery}
                            onChange={(e) => setPushSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-teal-600"
                          />
                        </div>

                        <select
                          value={pushTroopFilter}
                          onChange={(e) => setPushTroopFilter(e.target.value)}
                          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-600"
                        >
                          <option value="all">All Troops & Units</option>
                          {troops.map((t) => (
                            <option key={t.id} value={t.name}>
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
                          Showing <b>{filteredPushRecipients.length}</b> •{' '}
                          <b>{selectedPushUserIds.length}</b> selected
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={selectAllFilteredPush}
                            className="text-teal-800 hover:text-teal-900 font-bold hover:underline cursor-pointer"
                          >
                            Select all
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={clearPushSelection}
                            className="text-slate-500 hover:text-slate-800 font-medium hover:underline cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
                        {filteredPushRecipients.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-400">
                            No matching leaders found.
                          </div>
                        ) : (
                          filteredPushRecipients.map((leader) => {
                            const isSelected = selectedPushUserIds.includes(leader.id)
                            const hasDevice = activeUserSet.has(leader.id)
                            return (
                              <div
                                key={leader.id}
                                onClick={() => togglePushUser(leader.id)}
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
                                        {leader.fullName}
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
                                      {leader.roles.slice(0, 2).join(' • ') || 'Leader'}
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

                {/* 2. PUSH TEMPLATES & COMPOSER */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-3.5 sm:p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <BellRing className="h-4 w-4 text-teal-800" />
                      <span>Notification Content (نص الإشعار الفوري)</span>
                    </h3>

                    <div className="flex items-center gap-1 text-xs">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                        Templates:
                      </span>
                      {SCOUT_PUSH_TEMPLATES.slice(0, 3).map((tpl) => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => handleApplyPushTemplate(tpl)}
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
                      Lockscreen Notification Title *
                    </label>
                    <input
                      type="text"
                      value={pushTitle}
                      onChange={(e) => setPushTitle(e.target.value)}
                      placeholder="e.g. مجلس قيادة الفوج • كشافة الأرز"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
                      maxLength={65}
                    />
                  </div>

                  {/* Body */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        Alert Message Body *
                      </label>
                      <span className="text-[10px] text-slate-400">{pushBody.length}/180</span>
                    </div>
                    <textarea
                      value={pushBody}
                      onChange={(e) => setPushBody(e.target.value)}
                      rows={3}
                      placeholder="Message displayed on lock screens and notifications trays..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
                      maxLength={180}
                    />
                  </div>

                  {/* URL */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Target App Link (Opened on tap)
                    </label>
                    <div className="relative">
                      <ExternalLink className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={pushUrl}
                        onChange={(e) => setPushUrl(e.target.value)}
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
                          onClick={() => setPushDelaySeconds(sec)}
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                            pushDelaySeconds === sec
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
                      onClick={handleSendPush}
                      disabled={isSendingPush || testingSelf}
                      className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-teal-800 hover:bg-teal-700 active:scale-95 text-white font-bold text-xs sm:text-sm transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isSendingPush ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Dispatching Web Push...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span>
                            {pushTargetMode === 'all'
                              ? `Broadcast to All (${stats.totalSubscriptions} Devices)`
                              : `Send to ${selectedPushUserIds.length} Selected Member(s)`}
                          </span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleTestOnMyDevice}
                      disabled={isSendingPush || testingSelf}
                      className="w-full sm:w-auto py-3 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold transition-all border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                      title="Send sample only to your current browser"
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

              {/* RIGHT / PREVIEW: 5 COLS */}
              <div className="lg:col-span-5 xl:col-span-4 space-y-4">
                {/* Native Smartphone Frame Preview */}
                <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-teal-800" />
                      <span>Lock-Screen Preview</span>
                    </h3>
                    <span className="text-[10px] text-slate-400 font-medium">Native Mockup</span>
                  </div>

                  <div className="mx-auto max-w-[280px] bg-slate-900 rounded-[32px] p-2.5 shadow-xl border-2 border-slate-800">
                    <div className="w-16 h-3 bg-slate-950 rounded-full mx-auto mb-2 flex items-center justify-center">
                      <div className="w-6 h-0.5 bg-slate-800 rounded-full" />
                    </div>

                    <div className="relative rounded-[24px] overflow-hidden p-3.5 pt-5 pb-8 bg-gradient-to-b from-teal-950 via-slate-900 to-slate-950 text-white min-h-[290px] flex flex-col justify-between">
                      <div className="text-center space-y-0.5">
                        <span className="text-[9px] font-medium text-teal-200/80 uppercase tracking-widest block">
                          Today
                        </span>
                        <div className="text-3xl font-light tracking-tight text-white/95">
                          19:00
                        </div>
                      </div>

                      {/* Push Banner */}
                      <div className="my-auto">
                        <div className="bg-white/95 text-slate-900 rounded-2xl p-3 shadow-md border border-white/50 space-y-1.5">
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
                              {pushTitle || 'Scouts des Cèdres • Saint Jean Marc'}
                            </h5>
                            <p className="text-[10px] text-slate-700 leading-snug mt-0.5">
                              {pushBody || 'Notification content appears on lock screen...'}
                            </p>
                          </div>

                          {pushUrl && (
                            <div className="pt-1 flex items-center justify-between text-[9px] text-teal-800 font-bold border-t border-slate-200/60">
                              <span>Tap to open in app</span>
                              <span>›</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="w-16 h-0.5 bg-white/40 rounded-full mx-auto" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* TAB 3: COMMUNICATION ARCHIVE & TRANSMISSION LOGS          */}
        {/* ═════════════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-3.5 sm:p-5 shadow-sm space-y-4 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-teal-800" />
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    Transmission Archive & Delivery Logs (أرشيف وسجل المراسلات)
                  </h3>
                  <p className="text-xs text-slate-500">
                    All outbound communications dispatched through WhatsApp or Web Push
                  </p>
                </div>
              </div>

              {/* History Filter */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/70 text-xs">
                <button
                  type="button"
                  onClick={() => setHistoryFilter('all')}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    historyFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({historyList.length + pushLogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter('whatsapp')}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    historyFilter === 'whatsapp'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  WhatsApp ({historyList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter('push')}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    historyFilter === 'push'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Push ({pushLogs.length})
                </button>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              {/* WhatsApp Logs */}
              {(historyFilter === 'all' || historyFilter === 'whatsapp') &&
                historyList.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/60 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-200">
                          WhatsApp
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          {log.title.replace(/^\[Broadcast\]\s*/, '')}
                        </h4>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {log.message}
                    </p>

                    <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-500 font-medium">
                      <span>Channels: {log.channels_dispatched.join(', ')}</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-bold">✓ Logged in system</span>
                    </div>
                  </div>
                ))}

              {/* Push Logs */}
              {(historyFilter === 'all' || historyFilter === 'push') &&
                pushLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-2xl bg-teal-50/40 border border-teal-200/70 hover:bg-teal-50/70 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-teal-100 text-teal-900 border border-teal-200">
                          Web Push
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          {log.title}
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded-md border border-teal-200/60 shrink-0">
                        {log.total_delivered}/{log.total_attempted} Delivered
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{log.body}</p>

                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 font-medium">
                      <span className="capitalize">Target: {log.target_type}</span>
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}

              {historyList.length === 0 && pushLogs.length === 0 && (
                <div className="text-center py-10 text-xs text-slate-400 font-medium">
                  No communication logs available yet. Outbound announcements will be tracked here.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CONFIRMATION MODAL FOR WHATSAPP DISPATCH ── */}
        {showConfirmModal && (
          <div data-modal="true" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 pb-[max(env(safe-area-inset-bottom),1.25rem)] space-y-4 shadow-2xl border border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Confirm Broadcast Transmission
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review circular dispatch parameters before sending
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Audience:</span>
                  <span className="font-bold text-slate-900 capitalize">
                    {audienceType.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Recipients:</span>
                  <span className="font-bold text-teal-800">
                    {typeof estimatedRecipientCount === 'number'
                      ? `${estimatedRecipientCount} leader(s)`
                      : estimatedRecipientCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Title:</span>
                  <span className="font-bold text-slate-900 truncate max-w-[200px]">
                    {broadcastTitle}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleOpenDirectWhatsApp}
                  className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>📲 Send Directly in WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  disabled={isSendingWhatsApp}
                  className="px-4 py-2.5 rounded-xl bg-teal-900 hover:bg-teal-800 text-white text-xs font-black shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSendingWhatsApp ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>🚀 Server Gateway</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* MODAL: SCOUT TEMPLATE BUILDER (صانع النماذج الكشفية)      */}
        {/* ═════════════════════════════════════════════════════════ */}
        {showTemplateBuilder && (
          <div data-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-xl w-full p-4 sm:p-5 shadow-2xl border border-slate-200 space-y-3.5 max-h-[92vh] overflow-y-auto my-auto animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Scout Template Builder (صانع النماذج الكشفية)
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Create and save reusable Arabic circulars with dynamic variable chips
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTemplateBuilder(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveCustomTemplate} className="space-y-3">
                {/* Title & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                      Template Name / Title (عنوان القالب) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. إشعار نشاط بيئي / مخيم الميلاد"
                      value={builderTitle}
                      onChange={(e) => setBuilderTitle(e.target.value)}
                      dir="rtl"
                      className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-700 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                      Category (الفئة) *
                    </label>
                    <select
                      value={builderCategory}
                      onChange={(e) => setBuilderCategory(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-700 focus:outline-none"
                    >
                      <option value="weekly">الأنشطة الأسبوعية</option>
                      <option value="council">مجلس القيادة</option>
                      <option value="camp">المخيمات والرحلات</option>
                      <option value="dues">الاشتراكات والمالية</option>
                      <option value="ceremony">القداس والوعد</option>
                      <option value="feasts">الأعياد والمناسبات</option>
                      <option value="urgent">تنبيه طارئ</option>
                      <option value="service">الخدمة العامة</option>
                    </select>
                  </div>
                </div>

                {/* Variable chips */}
                <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      Dynamic Chips (اضغط لإدراج المتغير)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setBuilderBody((prev) => `${SCOUT_HEADER_AR}\n\n${prev}`)
                      }}
                      className="text-[10px] font-bold text-emerald-800 hover:underline"
                    >
                      + إدراج ترويسة الفوج
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: 'اسم الفوج', token: '{اسم_الفوج}' },
                      { label: 'التاريخ', token: '{التاريخ}' },
                      { label: 'الوقت', token: '{الوقت}' },
                      { label: 'المكان', token: '{المكان}' },
                      { label: 'القائد المسؤول', token: '{القائد_المسؤول}' },
                      { label: 'رسم النشاط', token: '{رسم_النشاط}' },
                      { label: 'الموعد النهائي', token: '{الموعد_النهائي}' },
                    ].map((chip) => (
                      <button
                        key={chip.token}
                        type="button"
                        onClick={() => {
                          setBuilderBody((prev) => `${prev} ${chip.token} `)
                        }}
                        className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-800 text-[11px] font-bold shadow-2xs transition-all"
                      >
                        +{chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Body Editor */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                    Circular Body (نص التعميم الكشفي) *
                  </label>
                  <textarea
                    rows={8}
                    required
                    dir="rtl"
                    value={builderBody}
                    onChange={(e) => setBuilderBody(e.target.value)}
                    placeholder="اكتب نص التعميم هنا أو أدرج المتغيرات من الأعلى..."
                    className="w-full px-3 py-2 text-xs font-sans rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-700 focus:outline-none leading-relaxed text-slate-900"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowTemplateBuilder(false)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-2xs flex items-center gap-1.5"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Save to My Templates (حفظ القالب)</span>
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
