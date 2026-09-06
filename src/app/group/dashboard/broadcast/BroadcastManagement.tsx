'use client'

import { useState, useMemo } from 'react'
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
    RefreshCw,
    Eye,
    ShieldCheck,
    ExternalLink,
} from 'lucide-react'

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

interface Props {
    groupId: string
    groupName: string
    currentRole: string
    userName: string
    userId: string
    troops: Troop[]
    leaders: LeaderProfile[]
    parentsCount: number
    totalActiveMembers: number
    initialHistory: HistoryLog[]
}

type AudienceType = 'individual_leaders' | 'leaders_group' | 'parents_group' | 'all_parents'

interface MessageTemplate {
    id: string
    name: string
    title: string
    message: string
    actionUrl?: string
}

const SCOUT_TEMPLATES: MessageTemplate[] = [
    {
        id: 'meeting_call',
        name: '📅 Council Meeting Call (دعوة لاجتماع مجلس القيادة)',
        title: 'Ordre du Jour — Réunion du Conseil de Groupe',
        message: `Bonjour Chers Chefs,

Une réunion importante du Conseil de Groupe est prévue ce [JOUR] à [HEURE] au local.

Ordre du jour:
1. Préparation du camp & activités
2. Logistique & intendance
3. Suivi administratif & financier

Présence obligatoire. Merci de confirmer votre disponibilité.`,
        actionUrl: '/group/dashboard/events',
    },
    {
        id: 'camp_departure',
        name: '⛺ Camp Departure & Instructions (تعليمات انطلاق المخيم)',
        title: 'Départ pour le Camp — Consignes & Horaires',
        message: `Chers Chefs et Équipes,

Le rassemblement pour le départ au camp est fixé à [HEURE] précises devant l'église Saint Jean Marc.

Rappels importants:
- Tenue scoute impeccable obligatoire
- Vérification du matériel de patrouille et trousse de secours
- Respect strict des consignes de sécurité`,
        actionUrl: '/group/dashboard/events',
    },
    {
        id: 'urgent_alert',
        name: '🚨 Urgent Bulletin / Weather Alert (تنبيه عاجل وطارئ)',
        title: 'COMMUNIQUÉ URGENT DU COMMANDEMENT',
        message: `⚠️ MESSAGE IMPORTANT DU CHEF DE GROUPE

En raison des conditions météorologiques / imprévus, veuillez prendre note des directives suivantes:
[DIRECTIVES]

Restez en contact permanent avec la maîtrise du groupe.`,
    },
    {
        id: 'parents_briefing',
        name: '👨‍👩‍👧 Parent Camp Briefing (رسالة توجيهية لأهالي الكشافة)',
        title: 'Communication aux Parents — Activité du Week-end',
        message: `Chers Parents,

Nous vous informons que la prochaine sortie / activité scoute aura lieu ce [DATE] à [LIEU].
- Heure de départ: [HEURE]
- Heure de retour estimée: [HEURE]

Pour toute question ou urgence pendant la sortie, vous pouvez joindre la maîtrise du groupe. Merci pour votre confiance continue.`,
    },
    {
        id: 'dues_reminder',
        name: '💵 Dues & Membership Reminder (تذكير بالاشتراكات السنوية)',
        title: 'Rappel des Cotisations & Fiches Médicales',
        message: `Chers Parents et Chefs,

Un rappel amical concernant la régularisation des cotisations annuelles et le renouvellement des fiches médicales pour l'année scoute en cours.

Merci de vous rapprocher du trésorier du groupe pour finaliser les dossiers.`,
        actionUrl: '/group/dashboard/finances',
    },
]

export default function BroadcastManagement({
    groupId,
    groupName,
    currentRole,
    userName,
    troops,
    leaders,
    parentsCount,
    totalActiveMembers,
    initialHistory,
}: Props) {
    const [audienceType, setAudienceType] = useState<AudienceType>('individual_leaders')
    const [selectedLeaderIds, setSelectedLeaderIds] = useState<string[]>([])
    const [leaderSearch, setLeaderSearch] = useState('')
    const [troopFilter, setTroopFilter] = useState<string>('all')

    // Composer fields
    const [broadcastTitle, setBroadcastTitle] = useState('')
    const [broadcastMessage, setBroadcastMessage] = useState('')
    const [broadcastActionUrl, setBroadcastActionUrl] = useState('')
    const [customGroupJid, setCustomGroupJid] = useState('')

    // Channels
    const [sendViaWhatsApp, setSendViaWhatsApp] = useState(true)
    const [sendViaTelegram, setSendViaTelegram] = useState(true)
    const [sendViaInApp, setSendViaInApp] = useState(true)

    // Status & sending state
    const [isSending, setIsSending] = useState(false)
    const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [historyList, setHistoryList] = useState<HistoryLog[]>(initialHistory)

    // Filtered leaders for individual selection
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

    // Select / Deselect all
    const handleSelectAllLeaders = () => {
        setSelectedLeaderIds(filteredLeaders.map((l) => l.id))
    }

    const handleDeselectAllLeaders = () => {
        setSelectedLeaderIds([])
    }

    const toggleLeaderSelection = (id: string) => {
        setSelectedLeaderIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        )
    }

    // Apply template
    const handleApplyTemplate = (templateId: string) => {
        const t = SCOUT_TEMPLATES.find((tpl) => tpl.id === templateId)
        if (t) {
            setBroadcastTitle(t.title)
            setBroadcastMessage(t.message)
            if (t.actionUrl) setBroadcastActionUrl(t.actionUrl)
        }
    }

    // Calculate recipient count
    const estimatedRecipientCount = useMemo(() => {
        if (audienceType === 'individual_leaders') return selectedLeaderIds.length
        if (audienceType === 'leaders_group') return 'Official Leaders Group (All Members)'
        if (audienceType === 'parents_group') return 'Official Parents Group (All Parents)'
        if (audienceType === 'all_parents') return `${parentsCount} Registered Parents (${totalActiveMembers} Scouts)`
        return 0
    }, [audienceType, selectedLeaderIds, parentsCount, totalActiveMembers])

    // Send Broadcast
    const handleSendBroadcast = async () => {
        if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
            setStatusMessage({ text: 'Title and message are required.', type: 'error' })
            return
        }

        if (audienceType === 'individual_leaders' && selectedLeaderIds.length === 0) {
            setStatusMessage({ text: 'Please select at least one leader.', type: 'error' })
            return
        }

        setIsSending(true)
        setShowConfirmModal(false)

        try {
            const activeChannels: ('whatsapp' | 'telegram' | 'in_app')[] = []
            if (sendViaWhatsApp) activeChannels.push('whatsapp')
            if (sendViaTelegram) activeChannels.push('telegram')
            if (sendViaInApp) activeChannels.push('in_app')

            const res = await fetch('/api/group/broadcast/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetAudience: audienceType,
                    recipientProfileIds: audienceType === 'individual_leaders' ? selectedLeaderIds : undefined,
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
                text: `Broadcast successfully dispatched! (${data.totalSent} delivered)`,
                type: 'success',
            })

            // Add to history
            const newLog: HistoryLog = {
                id: 'log_' + Date.now(),
                title: `[Broadcast] ${broadcastTitle}`,
                message: broadcastMessage,
                channels_dispatched: activeChannels,
                created_at: new Date().toISOString(),
            }
            setHistoryList((prev) => [newLog, ...prev])

            // Clear composer optionally or reset selection
            if (audienceType === 'individual_leaders') {
                setSelectedLeaderIds([])
            }
        } catch (err: any) {
            console.error('[BroadcastManagement] Error:', err)
            setStatusMessage({ text: err.message || 'Error sending broadcast.', type: 'error' })
        } finally {
            setIsSending(false)
            setTimeout(() => setStatusMessage(null), 8000)
        }
    }

    return (
        <DashboardShell groupName={groupName} currentRole={currentRole} userName={userName}>
            <div className="max-w-7xl mx-auto space-y-3 pb-12">
                {/* Status Toast */}
                {statusMessage && (
                    <div
                        className={`p-3.5 rounded-2xl flex items-center gap-2 border text-xs font-bold shadow-2xs animate-in fade-in slide-in-from-top-2 duration-200 ${statusMessage.type === 'success'
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

                {/* ── TOP HEADER CARD ── */}
                <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-row items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0 shadow-2xs">
                            <Megaphone className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight truncate">
                                Announcements & Broadcast
                            </h1>
                            <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                                WhatsApp, Telegram & In-App notifications
                            </p>
                        </div>
                    </div>

                    <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-xl border border-teal-200/60 shrink-0">
                        {typeof estimatedRecipientCount === 'number'
                            ? `${estimatedRecipientCount} Selected`
                            : estimatedRecipientCount}
                    </span>
                </div>

                {/* ── MAIN WORKSPACE GRID ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* ── LEFT / MAIN: AUDIENCE & COMPOSER (8 COLS) ── */}
                    <div className="lg:col-span-7 xl:col-span-8 space-y-4">

                        {/* 1. AUDIENCE TARGET SELECTOR */}
                        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                    <Users className="h-5 w-5 text-teal-800" />
                                    <span>1. Select Target Audience (تحديد الفئة المستهدفة)</span>
                                </h3>
                                <span className="text-xs font-black text-teal-800 bg-teal-50 px-2.5 py-1 rounded-xl border border-teal-200/60">
                                    {typeof estimatedRecipientCount === 'number'
                                        ? `${estimatedRecipientCount} Selected`
                                        : estimatedRecipientCount}
                                </span>
                            </div>

                            {/* 4 Audience Tabs */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setAudienceType('individual_leaders')}
                                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 active:scale-98 ${audienceType === 'individual_leaders'
                                            ? 'bg-teal-900 text-white border-teal-900 shadow-md ring-2 ring-teal-600/30'
                                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                        }`}
                                >
                                    <UserCheck className="h-5 w-5" />
                                    <div>
                                        <div className="text-xs font-black">Individual Leaders</div>
                                        <div className="text-[10px] opacity-80">1-by-1 or Multi-select</div>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setAudienceType('leaders_group')}
                                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 active:scale-98 ${audienceType === 'leaders_group'
                                            ? 'bg-teal-900 text-white border-teal-900 shadow-md ring-2 ring-teal-600/30'
                                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                        }`}
                                >
                                    <Users className="h-5 w-5" />
                                    <div>
                                        <div className="text-xs font-black">Leaders Group</div>
                                        <div className="text-[10px] opacity-80">Official WhatsApp Chat</div>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setAudienceType('parents_group')}
                                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 active:scale-98 ${audienceType === 'parents_group'
                                            ? 'bg-teal-900 text-white border-teal-900 shadow-md ring-2 ring-teal-600/30'
                                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                        }`}
                                >
                                    <MessageSquare className="h-5 w-5" />
                                    <div>
                                        <div className="text-xs font-black">Parents Group</div>
                                        <div className="text-[10px] opacity-80">Official WhatsApp Chat</div>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setAudienceType('all_parents')}
                                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 active:scale-98 ${audienceType === 'all_parents'
                                            ? 'bg-teal-900 text-white border-teal-900 shadow-md ring-2 ring-teal-600/30'
                                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                        }`}
                                >
                                    <Megaphone className="h-5 w-5" />
                                    <div>
                                        <div className="text-xs font-black">All Active Parents</div>
                                        <div className="text-[10px] opacity-80">{parentsCount} Direct DMs</div>
                                    </div>
                                </button>
                            </div>

                            {/* AUDIENCE 1 SUBVIEW: LEADER MULTI-SELECT CHECKBOX GRID */}
                            {audienceType === 'individual_leaders' && (
                                <div className="space-y-3 pt-2 border-t border-slate-100">
                                    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Search leader by name, role, phone..."
                                                value={leaderSearch}
                                                onChange={(e) => setLeaderSearch(e.target.value)}
                                                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 font-medium"
                                            />
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <select
                                                value={troopFilter}
                                                onChange={(e) => setTroopFilter(e.target.value)}
                                                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-700 focus:outline-none"
                                            >
                                                <option value="all">All Units / Troops</option>
                                                {troops.map((t) => (
                                                    <option key={t.id} value={t.name}>
                                                        {t.name}
                                                    </option>
                                                ))}
                                            </select>

                                            <button
                                                type="button"
                                                onClick={handleSelectAllLeaders}
                                                className="px-2.5 py-1.5 text-[11px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors"
                                            >
                                                Select All
                                            </button>

                                            <button
                                                type="button"
                                                onClick={handleDeselectAllLeaders}
                                                className="px-2.5 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </div>

                                    {/* Leaders List */}
                                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 border border-slate-200/70 rounded-2xl p-2 bg-slate-50/50">
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
                                                        className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${isSelected
                                                                ? 'bg-teal-50/80 border border-teal-300/80 shadow-2xs'
                                                                : 'hover:bg-white bg-white/60 border border-transparent'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div
                                                                className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-teal-800 text-white' : 'border border-slate-300 bg-white'
                                                                    }`}
                                                            >
                                                                {isSelected && <Check className="h-3.5 w-3.5" />}
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
                                                                        <span className="text-teal-700 font-bold">({leader.troops.join(', ')})</span>
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

                            {/* AUDIENCE 2 & 3: GROUP JID INPUT OPTION */}
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
                                    <p className="text-[11px] text-teal-900/80 leading-relaxed">
                                        Uses the default group configured in environment, or specify a custom WhatsApp Group JID:
                                    </p>
                                    <input
                                        type="text"
                                        placeholder="e.g. 120363024892348239@g.us (Leave empty for default group)"
                                        value={customGroupJid}
                                        onChange={(e) => setCustomGroupJid(e.target.value)}
                                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-teal-200 bg-white focus:outline-none focus:border-teal-700 font-mono"
                                    />
                                </div>
                            )}

                            {/* AUDIENCE 4: DIRECT PARENTS BROADCAST INFO */}
                            {audienceType === 'all_parents' && (
                                <div className="p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-2xl space-y-1.5 text-xs">
                                    <div className="font-bold text-amber-950 flex items-center gap-1.5">
                                        <Sparkles className="h-4 w-4 text-amber-800" />
                                        <span>Personalized Direct Messages to {parentsCount} Registered Parents</span>
                                    </div>
                                    <p className="text-[11px] text-amber-900/90 leading-relaxed">
                                        Each parent will receive a direct WhatsApp message personalized with their scout&apos;s name (e.g. <em>&quot;Chers Parents de Marc...&quot;</em>) based on active youth records.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 2. SCOUT TEMPLATE QUICK PICKER */}
                        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-amber-500" />
                                    <span>2. Scout Message Templates (قوالب جاهزة)</span>
                                </h3>
                                <span className="text-xs text-slate-400 font-semibold">Optional</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {SCOUT_TEMPLATES.map((tpl) => (
                                    <button
                                        key={tpl.id}
                                        type="button"
                                        onClick={() => handleApplyTemplate(tpl.id)}
                                        className="p-2.5 rounded-xl border border-slate-200 hover:border-teal-600 bg-slate-50 hover:bg-teal-50/50 text-left transition-all group"
                                    >
                                        <div className="text-xs font-bold text-slate-800 group-hover:text-teal-900">
                                            {tpl.name}
                                        </div>
                                        <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                                            {tpl.title}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 3. MESSAGE COMPOSER */}
                        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-4">
                            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                <Send className="h-5 w-5 text-teal-800" />
                                <span>3. Compose Message (نص الرسالة والبيان)</span>
                            </h3>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Subject / Title (عنوان البيان أو التنبيه) *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Ordre du Jour — Réunion du Conseil de Groupe"
                                        value={broadcastTitle}
                                        onChange={(e) => setBroadcastTitle(e.target.value)}
                                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 font-bold text-slate-900"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-bold text-slate-700">
                                            Message Content (نص الرسالة) *
                                        </label>
                                        <span className="text-[10px] font-semibold text-slate-400">
                                            {broadcastMessage.length} characters
                                        </span>
                                    </div>
                                    <textarea
                                        rows={7}
                                        required
                                        placeholder="Write your official directive, announcement, or camp instructions here..."
                                        value={broadcastMessage}
                                        onChange={(e) => setBroadcastMessage(e.target.value)}
                                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 font-medium text-slate-800 leading-relaxed font-sans"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Optional Action Link / Portal URL (رابط مرفق أو استمارة)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. /group/dashboard/events or https://forms.gle/..."
                                        value={broadcastActionUrl}
                                        onChange={(e) => setBroadcastActionUrl(e.target.value)}
                                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 font-medium text-slate-700"
                                    />
                                </div>

                                {/* Multi-channel dispatch options */}
                                <div className="pt-2 border-t border-slate-100 flex items-center gap-4 flex-wrap">
                                    <span className="text-xs font-bold text-slate-600 block">Channels:</span>

                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                                        <input
                                            type="checkbox"
                                            checked={sendViaWhatsApp}
                                            onChange={(e) => setSendViaWhatsApp(e.target.checked)}
                                            className="rounded text-teal-800 focus:ring-teal-700 h-4 w-4"
                                        />
                                        <span className="flex items-center gap-1">
                                            <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
                                            <span>WhatsApp</span>
                                        </span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                                        <input
                                            type="checkbox"
                                            checked={sendViaTelegram}
                                            onChange={(e) => setSendViaTelegram(e.target.checked)}
                                            className="rounded text-teal-800 focus:ring-teal-700 h-4 w-4"
                                        />
                                        <span className="flex items-center gap-1">
                                            <Bot className="h-3.5 w-3.5 text-sky-600" />
                                            <span>Telegram SDC Alerts</span>
                                        </span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                                        <input
                                            type="checkbox"
                                            checked={sendViaInApp}
                                            onChange={(e) => setSendViaInApp(e.target.checked)}
                                            className="rounded text-teal-800 focus:ring-teal-700 h-4 w-4"
                                        />
                                        <span className="flex items-center gap-1">
                                            <Bell className="h-3.5 w-3.5 text-amber-600" />
                                            <span>In-App Logs</span>
                                        </span>
                                    </label>
                                </div>

                                {/* Send Button */}
                                <div className="pt-3">
                                    <button
                                        type="button"
                                        disabled={isSending || !broadcastTitle.trim() || !broadcastMessage.trim()}
                                        onClick={() => setShowConfirmModal(true)}
                                        className="w-full py-3.5 rounded-2xl bg-teal-900 hover:bg-teal-800 disabled:opacity-50 active:scale-98 text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2"
                                    >
                                        {isSending ? (
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Send className="h-4 w-4" />
                                        )}
                                        <span>
                                            {isSending ? 'Dispatching Broadcast...' : 'Review & Send Broadcast (إرسال البيان)'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT COLUMN: LIVE WHATSAPP PREVIEW & HISTORY (4 COLS) ── */}
                    <div className="lg:col-span-5 xl:col-span-4 space-y-6">

                        {/* LIVE WHATSAPP CHAT PREVIEW */}
                        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                                    <Eye className="h-4 w-4 text-emerald-600" />
                                    <span>Live WhatsApp Preview</span>
                                </h3>
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                                    Mobile Bubble
                                </span>
                            </div>

                            {/* Mock WhatsApp Chat Box */}
                            <div className="bg-[#EFEAE2] p-3 rounded-2xl border border-slate-200 space-y-2 shadow-inner font-sans">
                                <div className="bg-white p-3 rounded-2xl rounded-tl-xs shadow-xs space-y-2 max-w-[92%] border border-slate-100">
                                    <div className="text-[11px] font-black text-teal-950 flex items-center gap-1">
                                        <span>⚜️ Scouts des Cèdres Saint Jean Marc</span>
                                    </div>

                                    <div className="text-xs font-black text-slate-900">
                                        📢 {broadcastTitle || 'Subject / Title of Broadcast'}
                                    </div>

                                    <div className="text-[10px] font-medium text-slate-500 italic">
                                        {audienceType === 'all_parents'
                                            ? 'Chers Parents de [Nom du Scout],'
                                            : 'Bonjour Chef [Nom du Chef],'}
                                    </div>

                                    <div className="text-[11px] text-slate-800 whitespace-pre-wrap leading-relaxed">
                                        {broadcastMessage || 'Your message text will render here with full bold formatting and scout styling...'}
                                    </div>

                                    {broadcastActionUrl && (
                                        <div className="pt-1 text-[11px] font-bold text-teal-800 flex items-center gap-1">
                                            <ExternalLink className="h-3 w-3" />
                                            <span>Open in Portal / Form Link</span>
                                        </div>
                                    )}

                                    <div className="text-[9px] text-right text-slate-400 font-semibold pt-0.5 flex items-center justify-end gap-1">
                                        <span>12:00 PM</span>
                                        <span className="text-sky-500 font-black">✓✓</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BROADCAST HISTORY LOG */}
                        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                                    <Clock className="h-4 w-4 text-slate-600" />
                                    <span>Recent Broadcasts (سجل البيانات)</span>
                                </h3>
                            </div>

                            {historyList.length === 0 ? (
                                <div className="text-center py-6 text-xs text-slate-400 font-medium">
                                    No previous broadcasts recorded yet.
                                </div>
                            ) : (
                                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                                    {historyList.map((log) => (
                                        <div
                                            key={log.id}
                                            className="p-3 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="font-black text-xs text-slate-900 truncate">
                                                    {log.title.replace('[Broadcast]', '').trim()}
                                                </div>
                                                <span className="text-[9px] text-slate-400 font-semibold shrink-0">
                                                    {new Date(log.created_at).toLocaleDateString('fr-FR', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                    })}
                                                </span>
                                            </div>

                                            <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                                                {log.message}
                                            </p>

                                            <div className="flex items-center gap-1.5 pt-1">
                                                {log.channels_dispatched?.map((c) => (
                                                    <span
                                                        key={c}
                                                        className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-white text-slate-600 border border-slate-200"
                                                    >
                                                        {c}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── CONFIRMATION MODAL ── */}
                {showConfirmModal && (
                    <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
                        <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
                            <div className="flex items-center gap-3 text-teal-900">
                                <div className="w-10 h-10 rounded-2xl bg-teal-100 flex items-center justify-center shrink-0">
                                    <Megaphone className="h-5 w-5 text-teal-800" />
                                </div>
                                <div>
                                    <h3 className="font-black text-base">Confirm Official Broadcast</h3>
                                    <p className="text-xs text-slate-500">Please review recipient target before dispatching</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-slate-500 font-semibold">Target Audience:</span>
                                    <span className="font-black text-slate-900">{audienceType}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 font-semibold">Recipients:</span>
                                    <span className="font-black text-teal-800">
                                        {typeof estimatedRecipientCount === 'number'
                                            ? `${estimatedRecipientCount} Selected Leaders`
                                            : estimatedRecipientCount}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 font-semibold">Channels:</span>
                                    <span className="font-bold text-slate-700">
                                        {[sendViaWhatsApp && 'WhatsApp', sendViaTelegram && 'Telegram', sendViaInApp && 'In-App']
                                            .filter(Boolean)
                                            .join(' • ')}
                                    </span>
                                </div>
                                <div className="pt-1 border-t border-slate-200">
                                    <span className="text-[11px] font-bold text-slate-900 block truncate">
                                        Title: {broadcastTitle}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmModal(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-700 hover:bg-slate-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={isSending}
                                    onClick={handleSendBroadcast}
                                    className="flex-1 py-2.5 rounded-xl bg-teal-900 hover:bg-teal-800 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                                >
                                    {isSending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    <span>Confirm & Dispatch</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardShell>
    )
}
