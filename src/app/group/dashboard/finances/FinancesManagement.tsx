'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
    Menu, X, Wallet, DollarSign, ArrowUpRight, ArrowDownRight, Users,
    CheckCircle2, AlertCircle, Clock, Search, Filter, Plus, FileSpreadsheet,
    Receipt, ArrowRight, ShieldCheck, Download, Trash2, Calendar, Edit3,
    Layers, Percent, Tag, CreditCard, ChevronLeft, ChevronRight, HelpCircle, Send, Check, Ban, Settings, Printer
} from 'lucide-react'
import DashboardShell from '../DashboardShell'

interface Member {
    id: string
    first_name: string
    last_name: string
    troop_id: string
    current_rank?: string
    birth_date?: string
}

interface Troop {
    id: string
    name: string
}

interface Leader {
    id: string
    fullName: string
    email: string
    rank?: string
}

interface TroopFeeSetting {
    id: string
    group_id: string
    troop_id: string
    scout_year: string
    monthly_target: number
}

interface TroopDuePayment {
    id: string
    troop_monthly_due_id: string
    amount: number
    payment_date: string
    payment_method: string
    received_by?: string
    notes?: string
    created_at?: string
    profiles?: {
        full_name: string
    }
}

interface TroopMonthlyDue {
    id: string
    group_id: string
    troop_id: string
    member_id: string
    scout_year: string
    month_key: string // e.g. '2026-01'
    target_amount: number
    paid_amount: number
    status: 'unpaid' | 'partial' | 'paid' | 'exempt' | string
    created_at?: string
    members?: Member
    troop_dues_payments?: TroopDuePayment[]
}

interface TroopHandover {
    id: string
    group_id: string
    troop_id: string
    month_key: string
    amount: number
    handed_over_by?: string
    confirmed_by?: string
    handover_date: string
    status: 'pending' | 'confirmed' | 'rejected' | string
    notes?: string
    troops?: { id: string; name: string }
    handed_over?: { id: string; full_name: string }
    confirmed_by_leader?: { id: string; full_name: string }
}

interface TroopDisbursement {
    id: string
    group_id: string
    troop_id: string
    amount: number
    purpose: string
    requested_by?: string
    approved_by?: string
    request_date: string
    status: 'pending' | 'approved' | 'rejected' | string
    receipt_url?: string
    notes?: string
    troops?: { id: string; name: string }
    requested_by_leader?: { id: string; full_name: string }
    approved_by_leader?: { id: string; full_name: string }
}

interface MembershipPayment {
    id: string
    membership_fee_id: string
    amount: number
    currency: string
    payment_date: string
    payment_method: string
    received_by?: string
    receipt_number?: string
    notes?: string
    profiles?: {
        full_name: string
    }
}

interface MembershipFee {
    id: string
    group_id: string
    scout_year: string
    member_id: string
    base_fee: number
    discount_amount: number
    discount_reason?: string
    final_due: number
    paid_amount: number
    status: 'unpaid' | 'partial' | 'paid' | 'exempt' | string
    notes?: string
    members?: Member
    membership_payments?: MembershipPayment[]
}

interface TreasuryTransaction {
    id: string
    group_id: string
    troop_id?: string | null
    transaction_type?: string
    type?: string
    category: string
    amount: number
    currency: string
    transaction_date?: string
    created_at?: string
    description: string
    recorded_by?: string
    submitted_by?: string
    scope?: string
    payment_method?: string
    status?: string
    receipt_url?: string
    troops?: { id: string; name: string }
    profiles?: { id: string; full_name: string }
}

interface MonthlyFinancialStatement {
    id: string
    group_id: string
    month_key: string // e.g. '2026-01'
    status: 'draft' | 'submitted' | 'approved' | 'rejected' | string
    opening_balance_usd: number
    opening_balance_lbp: number
    closing_balance_usd: number
    closing_balance_lbp: number
    submitted_by?: string
    submitted_at?: string
    approved_by?: string
    approved_at?: string
    notes?: string
    submitted_by_profile?: { id: string; full_name: string }
    approved_by_profile?: { id: string; full_name: string }
}

interface StatementDetailItem {
    id: string
    date: string
    amount: number
    currency: string
    description: string
    ref: string
    notes?: string
    recordedBy?: string
}

interface StatementGroupedRow {
    key: string
    title: string
    titleArabic: string
    totalUSD: number
    totalLBP: number
    count: number
    items: StatementDetailItem[]
}

interface Props {
    initialFees: MembershipFee[]
    initialTroopSettings: TroopFeeSetting[]
    initialTroopDues: TroopMonthlyDue[]
    initialHandovers: TroopHandover[]
    initialDisbursements: TroopDisbursement[]
    initialTransactions: TreasuryTransaction[]
    initialStatements?: MonthlyFinancialStatement[]
    members: Member[]
    siblingMap: Record<string, string[]>
    troops: Troop[]
    leaders: Leader[]
    currentRole: string
    groupId: string
    groupName: string
    userTroopId: string | null
    userProfileId: string
    userName: string
}

const MONTHS_ORDER = [
    { key: '01', label: 'Jan' },
    { key: '02', label: 'Feb' },
    { key: '03', label: 'Mar' },
    { key: '04', label: 'Apr' },
    { key: '05', label: 'May' },
    { key: '06', label: 'Jun' },
    { key: '07', label: 'Jul' },
    { key: '08', label: 'Aug' },
    { key: '09', label: 'Sep' },
    { key: '10', label: 'Oct' },
    { key: '11', label: 'Nov' },
    { key: '12', label: 'Dec' },
]

const ARABIC_MONTH_NAMES: Record<string, string> = {
    '01': 'كانون الثاني (January)',
    '02': 'شباط (February)',
    '03': 'آذار (March)',
    '04': 'نيسان (April)',
    '05': 'أيار (May)',
    '06': 'حزيران (June)',
    '07': 'تموز (July)',
    '08': 'آب (August)',
    '09': 'أيلول (September)',
    '10': 'تشرين الأول (October)',
    '11': 'تشرين الثاني (November)',
    '12': 'كانون الأول (December)',
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
    membership_dues: { label: 'Annual Cotisations', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    troop_handover: { label: 'Troop Monthly Handover', color: 'bg-teal-50 text-teal-800 border-teal-200' },
    donation: { label: 'Donation / Sponsor', color: 'bg-blue-50 text-blue-800 border-blue-200' },
    fundraising: { label: 'Fundraising Event', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
    troop_disbursement: { label: 'Troop Disbursement', color: 'bg-purple-50 text-purple-800 border-purple-200' },
    equipment: { label: 'Tents & Gear', color: 'bg-amber-50 text-amber-800 border-amber-200' },
    uniforms_badges: { label: 'Uniforms & Badges', color: 'bg-violet-50 text-violet-800 border-violet-200' },
    hq_utilities: { label: 'HQ & Utilities', color: 'bg-orange-50 text-orange-800 border-orange-200' },
    event_transfer: { label: 'Event Transfer', color: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
    sponsorship: { label: 'Sponsorship', color: 'bg-sky-50 text-sky-800 border-sky-200' },
    transportation: { label: 'Transportation', color: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
    food_supplies: { label: 'Food & Supplies', color: 'bg-lime-50 text-lime-800 border-lime-200' },
    medical_safety: { label: 'First Aid & Safety', color: 'bg-red-50 text-red-800 border-red-200' },
    misc: { label: 'Miscellaneous', color: 'bg-slate-100 text-slate-700 border-slate-200' },
}

const INCOME_CATEGORIES = [
    { id: 'donation', label: 'Donation / تبرع', defaultDesc: 'Donation from supporter / parent' },
    { id: 'fundraising', label: 'Fundraising / نشاط تمويلي', defaultDesc: 'Fundraising event revenue' },
    { id: 'event_transfer', label: 'Event Registration / اشتراك نشاط', defaultDesc: 'Activity / Camp fee contribution' },
    { id: 'sponsorship', label: 'Sponsorship / رعاية رسمية', defaultDesc: 'Corporate / Community sponsorship' },
    { id: 'other', label: 'Other (Custom) / أخرى...', defaultDesc: '' },
]

const EXPENSE_CATEGORIES = [
    { id: 'equipment', label: 'Tents & Gear / خيم ومعدات', defaultDesc: 'Tents, ropes & outdoor gear maintenance' },
    { id: 'uniforms_badges', label: 'Uniforms & Badges / بدلات وأوسمة', defaultDesc: 'Scout scarves, badges & insignia' },
    { id: 'hq_utilities', label: 'HQ Utilities & Rent / إيجار وصيانة المقر', defaultDesc: 'Electricity, water, cleaning & HQ maintenance' },
    { id: 'transportation', label: 'Transportation / نقليات وبوسطات', defaultDesc: 'Bus / transportation rental for scout trip' },
    { id: 'food_supplies', label: 'Food & Camp Supplies / تموين وأكل', defaultDesc: 'Food ingredients, snacks & beverages for camp' },
    { id: 'medical_safety', label: 'First Aid & Safety / إسعاف وسلامة', defaultDesc: 'Medical kit replenishments & safety equipment' },
    { id: 'other', label: 'Other (Custom) / أخرى...', defaultDesc: '' },
]

const getCategoryMeta = (cat?: string) => {
    if (!cat) return CATEGORY_LABELS.misc
    if (CATEGORY_LABELS[cat]) return CATEGORY_LABELS[cat]
    return {
        label: cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' '),
        color: 'bg-teal-50 text-teal-800 border-teal-200',
    }
}

export default function FinancesManagement({
    initialFees,
    initialTroopSettings,
    initialTroopDues,
    initialHandovers,
    initialDisbursements,
    initialTransactions,
    initialStatements = [],
    members,
    siblingMap,
    troops,
    leaders,
    currentRole,
    groupId,
    groupName,
    userTroopId,
    userProfileId,
    userName,
}: Props) {
    const router = useRouter()
    const supabase = createClient()

    // State
    const [fees, setFees] = useState<MembershipFee[]>(initialFees)
    const [troopSettings, setTroopSettings] = useState<TroopFeeSetting[]>(initialTroopSettings)
    const [troopDues, setTroopDues] = useState<TroopMonthlyDue[]>(initialTroopDues)
    const [handovers, setHandovers] = useState<TroopHandover[]>(initialHandovers)
    const [disbursements, setDisbursements] = useState<TroopDisbursement[]>(initialDisbursements)
    const [transactions, setTransactions] = useState<TreasuryTransaction[]>(initialTransactions)

    // Role permissions
    const isGroupTreasurer = [
        'chef_groupe',
        'assistant_chef_groupe',
        'amin_sandou2_group',
        'amin_serr_group',
        'configurator',
    ].includes(currentRole)

    const isTroopLeader = !isGroupTreasurer

    const getLeaderName = (profileId?: string | null) => {
        if (!profileId) return 'Treasurer'
        const match = leaders.find((l) => l.id === profileId)
        return match?.fullName || 'Leader'
    }

    const getTxType = (t: TreasuryTransaction) => {
        return t.transaction_type || t.type || 'income'
    }

    const getTxDate = (t: TreasuryTransaction) => {
        if (t.transaction_date) return t.transaction_date
        if (t.created_at) return t.created_at.split('T')[0]
        return new Date().toISOString().split('T')[0]
    }

    const getTxRecorder = (t: TreasuryTransaction) => {
        return t.recorded_by || t.submitted_by || ''
    }

    // Navigation & Filter state
    const [activeTab, setActiveTab] = useState<
        'monthly_dues' | 'troop_vaults' | 'monthly_statement' | 'annual_dues' | 'treasury'
    >('monthly_dues')
    const [selectedYearNum, setSelectedYearNum] = useState<number>(new Date().getFullYear())
    const [selectedTroopId, setSelectedTroopId] = useState<string>(
        userTroopId || (troops[0]?.id || '')
    )

    // Troop Monthly Dues Single-Month & Filter State
    const [duesMonth, setDuesMonth] = useState<string>(
        String(new Date().getMonth() + 1).padStart(2, '0')
    )
    const [duesViewMode, setDuesViewMode] = useState<'month' | 'matrix'>('month')
    const [duesScoutSearch, setDuesScoutSearch] = useState('')
    const [duesFilterStatus, setDuesFilterStatus] = useState<'all' | 'unpaid' | 'paid'>('all')

    const handlePrevDuesMonth = () => {
        const num = parseInt(duesMonth, 10)
        if (num === 1) {
            setSelectedYearNum((prev) => prev - 1)
            setDuesMonth('12')
        } else {
            setDuesMonth(String(num - 1).padStart(2, '0'))
        }
    }

    const handleNextDuesMonth = () => {
        const num = parseInt(duesMonth, 10)
        if (num === 12) {
            setSelectedYearNum((prev) => prev + 1)
            setDuesMonth('01')
        } else {
            setDuesMonth(String(num + 1).padStart(2, '0'))
        }
    }

    // Group Ledger / Treasury search and filter state
    const [treasurySearch, setTreasurySearch] = useState('')
    const [treasuryFilterType, setTreasuryFilterType] = useState<'all' | 'income' | 'expense'>('all')

    // Monthly Financial Statement (Kashf Hisab) State
    const [statements, setStatements] = useState<MonthlyFinancialStatement[]>(initialStatements || [])
    const [statementMonth, setStatementMonth] = useState<string>(
        String(new Date().getMonth() + 1).padStart(2, '0')
    )
    const [isProcessingStatementAction, setIsProcessingStatementAction] = useState(false)
    const [selectedStatementGroup, setSelectedStatementGroup] = useState<StatementGroupedRow | null>(null)

    // Troop Details Modal state (for Group Treasurer deep dive)
    const [selectedTroopForDetails, setSelectedTroopForDetails] = useState<Troop | null>(null)
    const [troopDetailsSubTab, setTroopDetailsSubTab] = useState<'scouts' | 'transactions'>('scouts')
    const [detailsScoutSearch, setDetailsScoutSearch] = useState('')

    // Status Toast
    const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
    const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
        setStatusMessage({ text, type })
        setTimeout(() => setStatusMessage(null), 4000)
    }

    // ── Logout ─────────────────────────────────────────────────────────────
    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    // ── Helper: Get Monthly Target for Troop ───────────────────────────────
    const getTroopMonthlyTarget = (tId: string) => {
        const setting = troopSettings.find((s) => s.troop_id === tId && s.scout_year === String(selectedYearNum))
        return setting ? Number(setting.monthly_target) : 5
    }

    // ── Helper: Sibling Count ──────────────────────────────────────────────
    const getSiblingCount = (memberId: string) => siblingMap[memberId]?.length || 0

    // ── Compute Troop Vault Balances ───────────────────────────────────────
    const troopVaults = useMemo(() => {
        return troops.map((t) => {
            // 1. Total collected from scouts in matrix for selected year
            const collectedFromScouts = troopDues
                .filter((d) => d.troop_id === t.id && d.month_key.startsWith(String(selectedYearNum)))
                .reduce((sum, d) => sum + Number(d.paid_amount || 0), 0)

            // 2. Total handed over to treasurer (confirmed)
            const confirmedHandovers = handovers
                .filter((h) => h.troop_id === t.id && h.status === 'confirmed')
                .reduce((sum, h) => sum + Number(h.amount || 0), 0)

            const pendingHandovers = handovers
                .filter((h) => h.troop_id === t.id && h.status === 'pending')
                .reduce((sum, h) => sum + Number(h.amount || 0), 0)

            // 3. Total disbursements approved (spent by troop)
            const approvedDisbursements = disbursements
                .filter((d) => d.troop_id === t.id && d.status === 'approved')
                .reduce((sum, d) => sum + Number(d.amount || 0), 0)

            const pendingDisbursements = disbursements
                .filter((d) => d.troop_id === t.id && d.status === 'pending')
                .reduce((sum, d) => sum + Number(d.amount || 0), 0)

            const availableBalance = confirmedHandovers - approvedDisbursements
            const cashInTroopHand = Math.max(0, collectedFromScouts - confirmedHandovers)

            return {
                troop: t,
                collectedFromScouts,
                confirmedHandovers,
                pendingHandovers,
                approvedDisbursements,
                pendingDisbursements,
                availableBalance,
                cashInTroopHand,
            }
        })
    }, [troops, troopDues, handovers, disbursements, selectedYearNum])

    // Current selected troop vault stats
    const activeTroopVault = useMemo(() => {
        return troopVaults.find((tv) => tv.troop.id === selectedTroopId) || troopVaults[0]
    }, [troopVaults, selectedTroopId])

    // ── Compute Central Group Treasury Balance (Group Treasurer Only) ──────
    const centralTreasury = useMemo(() => {
        const totalIncome = transactions
            .filter((t) => getTxType(t) === 'income')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0)

        const totalExpense = transactions
            .filter((t) => getTxType(t) === 'expense')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0)

        const netGroupVault = totalIncome - totalExpense

        const totalAnnualDuesCollected = fees
            .filter((f) => f.scout_year.includes(String(selectedYearNum)))
            .reduce((sum, f) => sum + Number(f.paid_amount || 0), 0)

        const totalAnnualDuesAssessed = fees
            .filter((f) => f.scout_year.includes(String(selectedYearNum)))
            .reduce((sum, f) => sum + Number(f.final_due || 0), 0)

        const totalTroopAllocations = troopVaults.reduce((sum, tv) => sum + Math.max(0, tv.availableBalance), 0)

        return {
            netGroupVault,
            totalIncome,
            totalExpense,
            totalAnnualDuesCollected,
            totalAnnualDuesAssessed,
            totalTroopAllocations,
            unallocatedGroupCash: netGroupVault - totalTroopAllocations,
        }
    }, [transactions, fees, troopVaults, selectedYearNum])

    // Group Leader permission (Chef de Groupe / Assistant Chef / Configurator)
    const isGroupLeader = [
        'chef_groupe',
        'assistant_chef_groupe',
        'configurator',
    ].includes(currentRole)

    // ── Compute Monthly Statement Data (Kashf Hisab) ─────────────────────────
    const statementMonthKey = `${selectedYearNum}-${statementMonth}`

    const currentStatementRecord = useMemo(() => {
        return statements.find((s) => s.month_key === statementMonthKey) || null
    }, [statements, statementMonthKey])

    const monthlyStatementData = useMemo(() => {
        // 1. Grouped Inflows
        const inflowGroups: Record<string, StatementGroupedRow> = {}

        // A. Confirmed handovers grouped by troop
        handovers
            .filter((h) => h.status === 'confirmed' && (h.month_key === statementMonthKey || h.handover_date.startsWith(statementMonthKey)))
            .forEach((h) => {
                const groupKey = `troop-${h.troop_id}`
                const troopName = h.troops?.name || 'الفرقة'
                if (!inflowGroups[groupKey]) {
                    inflowGroups[groupKey] = {
                        key: groupKey,
                        title: `إشتراكات ${troopName} (Troop Monthly Dues)`,
                        titleArabic: `إشتراكات ${troopName}`,
                        totalUSD: 0,
                        totalLBP: 0,
                        count: 0,
                        items: [],
                    }
                }
                inflowGroups[groupKey].totalUSD += Number(h.amount)
                inflowGroups[groupKey].count += 1
                inflowGroups[groupKey].items.push({
                    id: h.id,
                    date: h.handover_date,
                    amount: Number(h.amount),
                    currency: 'USD',
                    description: `Handover for ${h.month_key}`,
                    ref: `REC-${h.id.slice(0, 5).toUpperCase()}`,
                    notes: h.notes || '',
                    recordedBy: h.handed_over?.full_name || 'Leader',
                })
            })

        // B. Annual fees payments grouped into 1 line
        fees.forEach((fee) => {
            fee.membership_payments?.forEach((p) => {
                if (p.payment_date.startsWith(statementMonthKey)) {
                    const groupKey = 'annual-cotisations'
                    if (!inflowGroups[groupKey]) {
                        inflowGroups[groupKey] = {
                            key: groupKey,
                            title: 'إشتراكات سنوية (Annual Membership Cotisations)',
                            titleArabic: 'إشتراكات سنوية',
                            totalUSD: 0,
                            totalLBP: 0,
                            count: 0,
                            items: [],
                        }
                    }
                    const cur = p.currency || 'USD'
                    if (cur === 'LBP') {
                        inflowGroups[groupKey].totalLBP += Number(p.amount)
                    } else {
                        inflowGroups[groupKey].totalUSD += Number(p.amount)
                    }
                    inflowGroups[groupKey].count += 1
                    inflowGroups[groupKey].items.push({
                        id: p.id,
                        date: p.payment_date,
                        amount: Number(p.amount),
                        currency: cur,
                        description: `${fee.members?.first_name || ''} ${fee.members?.last_name || ''} (${fee.members?.current_rank || 'Scout'})`,
                        ref: p.receipt_number || '—',
                        notes: p.notes || '',
                        recordedBy: p.profiles?.full_name || 'Treasurer',
                    })
                }
            })
        })

        // C. Central Treasury income transactions
        transactions
            .filter((t) => getTxType(t) === 'income' && getTxDate(t).startsWith(statementMonthKey))
            .forEach((t) => {
                const groupKey = `tx-${t.description}`
                if (!inflowGroups[groupKey]) {
                    inflowGroups[groupKey] = {
                        key: groupKey,
                        title: t.description,
                        titleArabic: t.description,
                        totalUSD: 0,
                        totalLBP: 0,
                        count: 0,
                        items: [],
                    }
                }
                if (t.currency === 'LBP') {
                    inflowGroups[groupKey].totalLBP += Number(t.amount)
                } else {
                    inflowGroups[groupKey].totalUSD += Number(t.amount)
                }
                inflowGroups[groupKey].count += 1
                inflowGroups[groupKey].items.push({
                    id: t.id,
                    date: getTxDate(t),
                    amount: Number(t.amount),
                    currency: t.currency || 'USD',
                    description: t.description,
                    ref: `TX-${t.id.slice(0, 5).toUpperCase()}`,
                    notes: getCategoryMeta(t.category).label || t.category,
                    recordedBy: getLeaderName(getTxRecorder(t)) || 'Treasurer',
                })
            })

        const groupedInflows = Object.values(inflowGroups)

        // 2. Grouped Outflows
        const outflowGroups: Record<string, StatementGroupedRow> = {}

        // A. Approved troop disbursements grouped by troop
        disbursements
            .filter((d) => d.status === 'approved' && d.request_date.startsWith(statementMonthKey))
            .forEach((d) => {
                const groupKey = `troop-disb-${d.troop_id}`
                const troopName = d.troops?.name || 'الفرقة'
                if (!outflowGroups[groupKey]) {
                    outflowGroups[groupKey] = {
                        key: groupKey,
                        title: `مصاريف ${troopName} (${troopName} Expenses)`,
                        titleArabic: `مصاريف ${troopName}`,
                        totalUSD: 0,
                        totalLBP: 0,
                        count: 0,
                        items: [],
                    }
                }
                outflowGroups[groupKey].totalUSD += Number(d.amount)
                outflowGroups[groupKey].count += 1
                outflowGroups[groupKey].items.push({
                    id: d.id,
                    date: d.request_date,
                    amount: Number(d.amount),
                    currency: 'USD',
                    description: d.purpose,
                    ref: `DISB-${d.id.slice(0, 5).toUpperCase()}`,
                    notes: d.notes || '',
                    recordedBy: d.requested_by_leader?.full_name || 'Leader',
                })
            })

        // B. Central Treasury expense transactions
        transactions
            .filter((t) => getTxType(t) === 'expense' && getTxDate(t).startsWith(statementMonthKey))
            .forEach((t) => {
                const groupKey = `tx-${t.description}`
                if (!outflowGroups[groupKey]) {
                    outflowGroups[groupKey] = {
                        key: groupKey,
                        title: t.description,
                        titleArabic: t.description,
                        totalUSD: 0,
                        totalLBP: 0,
                        count: 0,
                        items: [],
                    }
                }
                if (t.currency === 'LBP') {
                    outflowGroups[groupKey].totalLBP += Number(t.amount)
                } else {
                    outflowGroups[groupKey].totalUSD += Number(t.amount)
                }
                outflowGroups[groupKey].count += 1
                outflowGroups[groupKey].items.push({
                    id: t.id,
                    date: getTxDate(t),
                    amount: Number(t.amount),
                    currency: t.currency || 'USD',
                    description: t.description,
                    ref: `TX-${t.id.slice(0, 5).toUpperCase()}`,
                    notes: getCategoryMeta(t.category).label || t.category,
                    recordedBy: getLeaderName(getTxRecorder(t)) || 'Treasurer',
                })
            })

        const groupedOutflows = Object.values(outflowGroups)

        // 3. Opening Balance (All past transactions before statementMonthKey)
        let openingUSD = 0
        let openingLBP = 0

        transactions
            .filter((t) => getTxDate(t) < `${statementMonthKey}-01`)
            .forEach((t) => {
                const val = Number(t.amount)
                if (t.currency === 'LBP') {
                    openingLBP += getTxType(t) === 'income' ? val : -val
                } else {
                    openingUSD += getTxType(t) === 'income' ? val : -val
                }
            })

        // Sum totals for this month from grouped rows
        const totalInflowUSD = groupedInflows.reduce((s, g) => s + g.totalUSD, 0)
        const totalInflowLBP = groupedInflows.reduce((s, g) => s + g.totalLBP, 0)

        const totalOutflowUSD = groupedOutflows.reduce((s, g) => s + g.totalUSD, 0)
        const totalOutflowLBP = groupedOutflows.reduce((s, g) => s + g.totalLBP, 0)

        const netCurrentUSD = totalInflowUSD - totalOutflowUSD
        const netCurrentLBP = totalInflowLBP - totalOutflowLBP

        const closingUSD = openingUSD + netCurrentUSD
        const closingLBP = openingLBP + netCurrentLBP

        return {
            groupedInflows,
            groupedOutflows,
            openingUSD,
            openingLBP,
            totalInflowUSD,
            totalInflowLBP,
            totalOutflowUSD,
            totalOutflowLBP,
            netCurrentUSD,
            netCurrentLBP,
            closingUSD,
            closingLBP,
        }
    }, [handovers, fees, transactions, disbursements, statementMonthKey])

    // ── Auto-Detect Modifications After Approval ───────────────────────────
    const isStatementOutdatedAfterApproval = useMemo(() => {
        if (!currentStatementRecord || currentStatementRecord.status !== 'approved') return false
        const savedUSD = Number(currentStatementRecord.closing_balance_usd || 0)
        const currentUSD = monthlyStatementData.closingUSD
        const savedLBP = Number(currentStatementRecord.closing_balance_lbp || 0)
        const currentLBP = monthlyStatementData.closingLBP
        return savedUSD !== currentUSD || savedLBP !== currentLBP
    }, [currentStatementRecord, monthlyStatementData])

    const effectiveStatementStatus = isStatementOutdatedAfterApproval
        ? 'needs_reapproval'
        : currentStatementRecord?.status || 'draft'

    // ── Submit Statement for Group Leader Approval ───────────────────────────
    const handleSubmitStatementForApproval = async () => {
        setIsProcessingStatementAction(true)
        try {
            const { data, error } = await supabase
                .from('monthly_financial_statements')
                .upsert(
                    {
                        group_id: groupId,
                        month_key: statementMonthKey,
                        status: 'submitted',
                        opening_balance_usd: monthlyStatementData.openingUSD,
                        opening_balance_lbp: monthlyStatementData.openingLBP,
                        closing_balance_usd: monthlyStatementData.closingUSD,
                        closing_balance_lbp: monthlyStatementData.closingLBP,
                        submitted_by: userProfileId,
                        submitted_at: new Date().toISOString(),
                    },
                    { onConflict: 'group_id,month_key' }
                )
                .select(`
          *,
          submitted_by_profile:profiles!monthly_financial_statements_submitted_by_fkey (id, full_name),
          approved_by_profile:profiles!monthly_financial_statements_approved_by_fkey (id, full_name)
        `)
                .single()

            if (error) throw error
            if (data) {
                setStatements((prev) => {
                    const filtered = prev.filter((s) => s.month_key !== statementMonthKey)
                    return [...filtered, data]
                })
                showStatus(`Statement for ${statementMonthKey} submitted to Group Leader!`, 'success')
            }
        } catch (err: any) {
            showStatus(`Error submitting statement: ${err.message}`, 'error')
        } finally {
            setIsProcessingStatementAction(false)
        }
    }

    // ── Approve Statement by Group Leader (Chef de Groupe) ───────────────────
    const handleApproveStatementByLeader = async () => {
        setIsProcessingStatementAction(true)
        try {
            const { data, error } = await supabase
                .from('monthly_financial_statements')
                .upsert(
                    {
                        group_id: groupId,
                        month_key: statementMonthKey,
                        status: 'approved',
                        opening_balance_usd: monthlyStatementData.openingUSD,
                        opening_balance_lbp: monthlyStatementData.openingLBP,
                        closing_balance_usd: monthlyStatementData.closingUSD,
                        closing_balance_lbp: monthlyStatementData.closingLBP,
                        approved_by: userProfileId,
                        approved_at: new Date().toISOString(),
                    },
                    { onConflict: 'group_id,month_key' }
                )
                .select(`
          *,
          submitted_by_profile:profiles!monthly_financial_statements_submitted_by_fkey (id, full_name),
          approved_by_profile:profiles!monthly_financial_statements_approved_by_fkey (id, full_name)
        `)
                .single()

            if (error) throw error
            if (data) {
                setStatements((prev) => {
                    const filtered = prev.filter((s) => s.month_key !== statementMonthKey)
                    return [...filtered, data]
                })
                showStatus(`Monthly statement for ${statementMonthKey} approved by Group Leader!`, 'success')
            }
        } catch (err: any) {
            showStatus(`Error approving statement: ${err.message}`, 'error')
        } finally {
            setIsProcessingStatementAction(false)
        }
    }

    // ── Reject / Request Revision for Statement ─────────────────────────────
    const handleRejectStatementByLeader = async () => {
        const reason = prompt('Please enter a note / reason for revision request:')
        if (reason === null) return

        setIsProcessingStatementAction(true)
        try {
            const { data, error } = await supabase
                .from('monthly_financial_statements')
                .upsert(
                    {
                        group_id: groupId,
                        month_key: statementMonthKey,
                        status: 'rejected',
                        notes: reason.trim() || null,
                    },
                    { onConflict: 'group_id,month_key' }
                )
                .select(`
          *,
          submitted_by_profile:profiles!monthly_financial_statements_submitted_by_fkey (id, full_name),
          approved_by_profile:profiles!monthly_financial_statements_approved_by_fkey (id, full_name)
        `)
                .single()

            if (error) throw error
            if (data) {
                setStatements((prev) => {
                    const filtered = prev.filter((s) => s.month_key !== statementMonthKey)
                    return [...filtered, data]
                })
                showStatus(`Revision requested for statement ${statementMonthKey}.`, 'error')
            }
        } catch (err: any) {
            showStatus(`Error requesting revision: ${err.message}`, 'error')
        } finally {
            setIsProcessingStatementAction(false)
        }
    }

    // ── Monthly Matrix Helpers ─────────────────────────────────────────────
    const activeTroopObj = useMemo(() => {
        return troops.find((t) => t.id === selectedTroopId) || troops[0]
    }, [troops, selectedTroopId])

    const selectedTroopScouts = useMemo(() => {
        return members.filter((m) => m.troop_id === selectedTroopId)
    }, [members, selectedTroopId])

    const getDueCell = (memberId: string, monthKey: string) => {
        return troopDues.find((d) => d.member_id === memberId && d.month_key === monthKey)
    }

    // ── MODAL: Quick Log Monthly Payment ──────────────────────────────────
    const [quickPayCell, setQuickPayCell] = useState<{
        member: Member
        monthKey: string
        monthLabel: string
        currentPaid: number
        target: number
        dueRecordId?: string
    } | null>(null)
    const [quickPayAmount, setQuickPayAmount] = useState('1')
    const [quickPayMethod, setQuickPayMethod] = useState('cash')
    const [quickPayNotes, setQuickPayNotes] = useState('')
    const [isProcessingQuickPay, setIsProcessingQuickPay] = useState(false)

    const handleSaveQuickPayment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!quickPayCell) return
        const amt = parseFloat(quickPayAmount) || 0
        if (amt <= 0) return showStatus('Please enter a valid amount (e.g. $1 or $5).', 'error')

        setIsProcessingQuickPay(true)
        try {
            let dueId = quickPayCell.dueRecordId

            if (!dueId) {
                const { data: newDue, error: dueErr } = await supabase
                    .from('troop_monthly_dues')
                    .insert({
                        group_id: groupId,
                        troop_id: quickPayCell.member.troop_id,
                        member_id: quickPayCell.member.id,
                        scout_year: String(selectedYearNum),
                        month_key: quickPayCell.monthKey,
                        target_amount: quickPayCell.target,
                        paid_amount: amt,
                        status: amt >= quickPayCell.target ? 'paid' : 'partial',
                    })
                    .select('*, members(id, first_name, last_name, troop_id), troop_dues_payments(*, profiles(full_name))')
                    .single()

                if (dueErr) throw dueErr
                if (newDue) {
                    dueId = newDue.id
                    setTroopDues((prev) => [...prev, newDue])
                }
            } else {
                const newTotalPaid = quickPayCell.currentPaid + amt
                const newStatus = newTotalPaid >= quickPayCell.target ? 'paid' : 'partial'

                const { data: updatedDue, error: uErr } = await supabase
                    .from('troop_monthly_dues')
                    .update({
                        paid_amount: newTotalPaid,
                        status: newStatus,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', dueId)
                    .select('*, members(id, first_name, last_name, troop_id), troop_dues_payments(*, profiles(full_name))')
                    .single()

                if (uErr) throw uErr
                if (updatedDue) {
                    setTroopDues((prev) => prev.map((d) => (d.id === updatedDue.id ? updatedDue : d)))
                }
            }

            if (dueId) {
                await supabase.from('troop_dues_payments').insert({
                    troop_monthly_due_id: dueId,
                    amount: amt,
                    payment_method: quickPayMethod,
                    received_by: userProfileId,
                    notes: quickPayNotes.trim() || null,
                })
            }

            setQuickPayCell(null)
            setQuickPayNotes('')
            showStatus(`Logged +$${amt} for ${quickPayCell.member.first_name}!`, 'success')
        } catch (err: any) {
            showStatus(`Error logging monthly payment: ${err.message}`, 'error')
        } finally {
            setIsProcessingQuickPay(false)
        }
    }

    // ── MODAL: Configure Troop Monthly Target ─────────────────────────────
    const [isConfigTargetOpen, setIsConfigTargetOpen] = useState(false)
    const [newMonthlyTarget, setNewMonthlyTarget] = useState(String(getTroopMonthlyTarget(selectedTroopId)))
    const [isSavingTarget, setIsSavingTarget] = useState(false)

    const handleSaveMonthlyTarget = async (e: React.FormEvent) => {
        e.preventDefault()
        const target = parseFloat(newMonthlyTarget) || 0
        if (target <= 0) return showStatus('Please enter a valid monthly amount.', 'error')

        setIsSavingTarget(true)
        try {
            const { data, error } = await supabase
                .from('troop_fee_settings')
                .upsert(
                    {
                        group_id: groupId,
                        troop_id: selectedTroopId,
                        scout_year: String(selectedYearNum),
                        monthly_target: target,
                    },
                    { onConflict: 'troop_id,scout_year' }
                )
                .select()
                .single()

            if (error) throw error
            if (data) {
                setTroopSettings((prev) => {
                    const filtered = prev.filter((s) => !(s.troop_id === selectedTroopId && s.scout_year === String(selectedYearNum)))
                    return [...filtered, data]
                })
                setIsConfigTargetOpen(false)
                showStatus(`Monthly target set to $${target}/month for this unit!`, 'success')
            }
        } catch (err: any) {
            showStatus(`Error saving target: ${err.message}`, 'error')
        } finally {
            setIsSavingTarget(false)
        }
    }

    // ── MODAL: Submit Handover to Treasurer ────────────────────────────────
    const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false)
    const [handoverMonth, setHandoverMonth] = useState(`${selectedYearNum}-01`)
    const [handoverAmount, setHandoverAmount] = useState('')
    const [handoverNotes, setHandoverNotes] = useState('')
    const [isSubmittingHandover, setIsSubmittingHandover] = useState(false)

    const handleSubmitHandover = async (e: React.FormEvent) => {
        e.preventDefault()
        const amt = parseFloat(handoverAmount) || 0
        if (amt <= 0) return showStatus('Please enter a valid handover amount.', 'error')

        setIsSubmittingHandover(true)
        try {
            const { data, error } = await supabase
                .from('troop_handovers')
                .insert({
                    group_id: groupId,
                    troop_id: selectedTroopId,
                    month_key: handoverMonth,
                    amount: amt,
                    handed_over_by: userProfileId,
                    status: 'pending',
                    notes: handoverNotes.trim() || null,
                })
                .select(`
          *,
          troops (id, name),
          handed_over:profiles!troop_handovers_handed_over_by_fkey (id, full_name),
          confirmed_by_leader:profiles!troop_handovers_confirmed_by_fkey (id, full_name)
        `)
                .single()

            if (error) throw error
            if (data) {
                setHandovers((prev) => [data, ...prev])
                setIsHandoverModalOpen(false)
                setHandoverAmount('')
                setHandoverNotes('')
                showStatus(`Handover of $${amt} submitted to Group Treasurer!`, 'success')
            }
        } catch (err: any) {
            showStatus(`Error submitting handover: ${err.message}`, 'error')
        } finally {
            setIsSubmittingHandover(false)
        }
    }

    // ── Confirm Handover Action (Group Treasurer Only) ─────────────────────
    const handleConfirmHandover = async (handover: TroopHandover) => {
        try {
            const { data, error } = await supabase
                .from('troop_handovers')
                .update({
                    status: 'confirmed',
                    confirmed_by: userProfileId,
                })
                .eq('id', handover.id)
                .select(`
          *,
          troops (id, name),
          handed_over:profiles!troop_handovers_handed_over_by_fkey (id, full_name),
          confirmed_by_leader:profiles!troop_handovers_confirmed_by_fkey (id, full_name)
        `)
                .single()

            if (error) throw error

            const { data: txData } = await supabase
                .from('treasury_transactions')
                .insert({
                    group_id: groupId,
                    troop_id: handover.troop_id,
                    scope: 'group',
                    type: 'income',
                    category: 'troop_handover',
                    amount: handover.amount,
                    currency: 'USD',
                    payment_method: 'cash',
                    status: 'approved',
                    description: `Troop Handover: ${handover.troops?.name || 'Troop'} (${handover.month_key})`,
                    submitted_by: userProfileId,
                })
                .select('*, troops(id, name)')
                .single()

            if (data) {
                setHandovers((prev) => prev.map((h) => (h.id === data.id ? data : h)))
            }
            if (txData) {
                setTransactions((prev) => [txData, ...prev])
            }
            showStatus(`Handover of $${handover.amount} confirmed & credited to Group Vault!`, 'success')
        } catch (err: any) {
            showStatus(`Error confirming handover: ${err.message}`, 'error')
        }
    }

    // ── Decline Handover Action (Group Treasurer Only) ─────────────────────
    const handleDeclineHandover = async (handover: TroopHandover) => {
        if (!confirm(`Are you sure you want to decline this handover of $${handover.amount} from ${handover.troops?.name || 'Troop'}?`)) return
        try {
            const { data, error } = await supabase
                .from('troop_handovers')
                .update({
                    status: 'rejected',
                    confirmed_by: userProfileId,
                })
                .eq('id', handover.id)
                .select(`
          *,
          troops (id, name),
          handed_over:profiles!troop_handovers_handed_over_by_fkey (id, full_name),
          confirmed_by_leader:profiles!troop_handovers_confirmed_by_fkey (id, full_name)
        `)
                .single()

            if (error) throw error
            if (data) {
                setHandovers((prev) => prev.map((h) => (h.id === data.id ? data : h)))
            }
            showStatus(`Handover of $${handover.amount} was declined.`, 'error')
        } catch (err: any) {
            showStatus(`Error declining handover: ${err.message}`, 'error')
        }
    }

    // ── MODAL: Request Troop Disbursement ──────────────────────────────────
    const [isDisbursementModalOpen, setIsDisbursementModalOpen] = useState(false)
    const [disbursementAmount, setDisbursementAmount] = useState('')
    const [disbursementPurpose, setDisbursementPurpose] = useState('')
    const [isSubmittingDisbursement, setIsSubmittingDisbursement] = useState(false)

    const handleSubmitDisbursement = async (e: React.FormEvent) => {
        e.preventDefault()
        const amt = parseFloat(disbursementAmount) || 0
        if (amt <= 0) return showStatus('Please enter a valid disbursement amount.', 'error')
        if (!disbursementPurpose.trim()) return showStatus('Please enter the purpose of this expense.', 'error')

        setIsSubmittingDisbursement(true)
        try {
            const { data, error } = await supabase
                .from('troop_disbursements')
                .insert({
                    group_id: groupId,
                    troop_id: selectedTroopId,
                    amount: amt,
                    purpose: disbursementPurpose.trim(),
                    requested_by: userProfileId,
                    status: 'pending',
                })
                .select(`
          *,
          troops (id, name),
          requested_by_leader:profiles!troop_disbursements_requested_by_fkey (id, full_name),
          approved_by_leader:profiles!troop_disbursements_approved_by_fkey (id, full_name)
        `)
                .single()

            if (error) throw error
            if (data) {
                setDisbursements((prev) => [data, ...prev])
                setIsDisbursementModalOpen(false)
                setDisbursementAmount('')
                setDisbursementPurpose('')
                showStatus(`Disbursement request for $${amt} submitted to Group Treasurer!`, 'success')
            }
        } catch (err: any) {
            showStatus(`Error requesting disbursement: ${err.message}`, 'error')
        } finally {
            setIsSubmittingDisbursement(false)
        }
    }

    // ── Approve Disbursement Action (Group Treasurer Only) ────────────────
    const handleApproveDisbursement = async (disbursement: TroopDisbursement) => {
        try {
            const { data, error } = await supabase
                .from('troop_disbursements')
                .update({
                    status: 'approved',
                    approved_by: userProfileId,
                })
                .eq('id', disbursement.id)
                .select(`
          *,
          troops (id, name),
          requested_by_leader:profiles!troop_disbursements_requested_by_fkey (id, full_name),
          approved_by_leader:profiles!troop_disbursements_approved_by_fkey (id, full_name)
        `)
                .single()

            if (error) throw error

            const { data: txData } = await supabase
                .from('treasury_transactions')
                .insert({
                    group_id: groupId,
                    troop_id: disbursement.troop_id,
                    scope: 'group',
                    type: 'expense',
                    category: 'troop_disbursement',
                    amount: disbursement.amount,
                    currency: 'USD',
                    payment_method: 'cash',
                    status: 'approved',
                    description: `Disbursement: ${disbursement.troops?.name || 'Troop'} - ${disbursement.purpose}`,
                    submitted_by: userProfileId,
                })
                .select('*, troops(id, name)')
                .single()

            if (data) {
                setDisbursements((prev) => prev.map((d) => (d.id === data.id ? data : d)))
            }
            if (txData) {
                setTransactions((prev) => [txData, ...prev])
            }
            showStatus(`Disbursement of $${disbursement.amount} approved & released!`, 'success')
        } catch (err: any) {
            showStatus(`Error approving disbursement: ${err.message}`, 'error')
        }
    }

    // ── Decline Disbursement Action (Group Treasurer Only) ────────────────
    const handleDeclineDisbursement = async (disbursement: TroopDisbursement) => {
        if (!confirm(`Are you sure you want to decline this fund request of $${disbursement.amount} from ${disbursement.troops?.name || 'Troop'}?`)) return
        try {
            const { data, error } = await supabase
                .from('troop_disbursements')
                .update({
                    status: 'rejected',
                    approved_by: userProfileId,
                })
                .eq('id', disbursement.id)
                .select(`
          *,
          troops (id, name),
          requested_by_leader:profiles!troop_disbursements_requested_by_fkey (id, full_name),
          approved_by_leader:profiles!troop_disbursements_approved_by_fkey (id, full_name)
        `)
                .single()

            if (error) throw error
            if (data) {
                setDisbursements((prev) => prev.map((d) => (d.id === data.id ? data : d)))
            }
            showStatus(`Disbursement request for $${disbursement.amount} was declined.`, 'error')
        } catch (err: any) {
            showStatus(`Error declining disbursement: ${err.message}`, 'error')
        }
    }

    // ── MODAL: Record Annual Cotisation (Group Treasurer Only) ─────────────
    const [isAnnualPaymentModalOpen, setIsAnnualPaymentModalOpen] = useState(false)
    const [selectedFeeForAnnual, setSelectedFeeForAnnual] = useState<MembershipFee | null>(null)
    const [annualPayAmount, setAnnualPayAmount] = useState('')
    const [annualPayMethod, setAnnualPayMethod] = useState('cash')
    const [annualPayReceiptNo, setAnnualPayReceiptNo] = useState('')
    const [isProcessingAnnualPay, setIsProcessingAnnualPay] = useState(false)

    const handleRecordAnnualPayment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedFeeForAnnual) return
        const amt = parseFloat(annualPayAmount) || 0
        if (amt <= 0) return showStatus('Please enter a valid amount.', 'error')

        setIsProcessingAnnualPay(true)
        try {
            const { data: pData, error: pErr } = await supabase
                .from('membership_payments')
                .insert({
                    membership_fee_id: selectedFeeForAnnual.id,
                    amount: amt,
                    currency: 'USD',
                    payment_method: annualPayMethod,
                    received_by: userProfileId,
                    receipt_number: annualPayReceiptNo.trim() || null,
                })
                .select('*, profiles(full_name)')
                .single()

            if (pErr) throw pErr

            const newPaid = Number(selectedFeeForAnnual.paid_amount || 0) + amt
            const finalDue = Number(selectedFeeForAnnual.final_due || 0)
            const newStatus = newPaid >= finalDue ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid'

            const { data: updatedFee, error: uErr } = await supabase
                .from('membership_fees')
                .update({
                    paid_amount: newPaid,
                    status: newStatus,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', selectedFeeForAnnual.id)
                .select(`
          *,
          members (id, first_name, last_name, troop_id, current_rank),
          membership_payments (*, profiles(full_name))
        `)
                .single()

            if (uErr) throw uErr

            const scoutName = `${selectedFeeForAnnual.members?.first_name || 'Scout'} ${selectedFeeForAnnual.members?.last_name || ''}`
            const { data: txData } = await supabase
                .from('treasury_transactions')
                .insert({
                    group_id: groupId,
                    scope: 'group',
                    type: 'income',
                    category: 'membership_dues',
                    amount: amt,
                    currency: 'USD',
                    payment_method: 'cash',
                    status: 'approved',
                    description: `Annual Cotisation: ${scoutName} (${selectedFeeForAnnual.scout_year})`,
                    submitted_by: userProfileId,
                })
                .select('*, troops(id, name)')
                .single()

            if (updatedFee) {
                setFees((prev) => prev.map((f) => (f.id === updatedFee.id ? updatedFee : f)))
            }
            if (txData) {
                setTransactions((prev) => [txData, ...prev])
            }

            setIsAnnualPaymentModalOpen(false)
            setSelectedFeeForAnnual(null)
            setAnnualPayAmount('')
            setAnnualPayReceiptNo('')
            showStatus(`Annual cotisation of $${amt} recorded successfully!`, 'success')
        } catch (err: any) {
            showStatus(`Error logging annual fee: ${err.message}`, 'error')
        } finally {
            setIsProcessingAnnualPay(false)
        }
    }

    // ── MODAL: Setup Annual Dues Bulk (Group Treasurer Only) ────────────────
    const [isBulkAnnualModalOpen, setIsBulkAnnualModalOpen] = useState(false)
    const [bulkAnnualFee, setBulkAnnualFee] = useState('50')
    const [isProcessingBulkAnnual, setIsProcessingBulkAnnual] = useState(false)

    const handleBulkGenerateAnnualDues = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsProcessingBulkAnnual(true)
        const base = parseFloat(bulkAnnualFee) || 0
        if (base <= 0) {
            setIsProcessingBulkAnnual(false)
            return showStatus('Please enter a valid base fee amount.', 'error')
        }

        try {
            const existingMemberIds = new Set(fees.filter((f) => f.scout_year.includes(String(selectedYearNum))).map((f) => f.member_id))
            const membersToCreate = members.filter((m) => !existingMemberIds.has(m.id))

            if (membersToCreate.length === 0) {
                setIsProcessingBulkAnnual(false)
                setIsBulkAnnualModalOpen(false)
                return showStatus(`All scouts already have annual dues setup for ${selectedYearNum}!`, 'success')
            }

            const rowsToInsert = membersToCreate.map((m) => {
                let discount = 0
                let discountReason = ''
                const siblings = siblingMap[m.id] || []
                if (siblings.length > 0) {
                    const familyMemberIds = [m.id, ...siblings]
                    const familyMembers = members.filter((fm) => familyMemberIds.includes(fm.id))
                    familyMembers.sort((a, b) => {
                        const dateA = a.birth_date ? new Date(a.birth_date).getTime() : 0
                        const dateB = b.birth_date ? new Date(b.birth_date).getTime() : 0
                        return dateA - dateB
                    })

                    const myIndex = familyMembers.findIndex((fm) => fm.id === m.id)
                    if (myIndex === 1) {
                        discount = Math.round(base * 0.2)
                        discountReason = '2nd Sibling (20% discount)'
                    } else if (myIndex >= 2) {
                        discount = Math.round(base * 0.5)
                        discountReason = `${myIndex + 1}th Sibling (50% discount)`
                    }
                }

                return {
                    group_id: groupId,
                    scout_year: `${selectedYearNum}-${selectedYearNum + 1}`,
                    member_id: m.id,
                    base_fee: base,
                    discount_amount: discount,
                    discount_reason: discountReason || null,
                    final_due: Math.max(0, base - discount),
                    paid_amount: 0,
                    status: 'unpaid',
                }
            })

            const { data, error } = await supabase
                .from('membership_fees')
                .insert(rowsToInsert)
                .select(`
          *,
          members (id, first_name, last_name, troop_id, current_rank),
          membership_payments (*, profiles(full_name))
        `)

            if (error) throw error
            if (data) {
                setFees((prev) => [...data, ...prev])
                setIsBulkAnnualModalOpen(false)
                showStatus(`Initialized annual dues for ${data.length} scouts!`, 'success')
            }
        } catch (err: any) {
            showStatus(`Error: ${err.message}`, 'error')
        } finally {
            setIsProcessingBulkAnnual(false)
        }
    }

    // ── MODAL: Record General Treasury Transaction (Group Treasurer Only) ──
    const [isTxModalOpen, setIsTxModalOpen] = useState(false)
    const [txType, setTxType] = useState<'income' | 'expense'>('income')
    const [txCategory, setTxCategory] = useState('donation')
    const [customTxCategory, setCustomTxCategory] = useState('')
    const [txAmount, setTxAmount] = useState('')
    const [txDescription, setTxDescription] = useState('Donation from supporter / parent')
    const [isProcessingTx, setIsProcessingTx] = useState(false)

    const handleTxTypeChange = (newType: 'income' | 'expense') => {
        setTxType(newType)
        const defaultCat = newType === 'income' ? 'donation' : 'equipment'
        setTxCategory(defaultCat)
        setCustomTxCategory('')
        const list = newType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
        const item = list.find((c) => c.id === defaultCat)
        if (item?.defaultDesc) {
            setTxDescription(item.defaultDesc)
        }
    }

    const handleTxCategoryChange = (newCat: string) => {
        setTxCategory(newCat)
        if (newCat === 'other') {
            setCustomTxCategory('')
        } else {
            setCustomTxCategory('')
            const list = txType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
            const item = list.find((c) => c.id === newCat)
            if (item?.defaultDesc) {
                setTxDescription(item.defaultDesc)
            }
        }
    }

    const handleRecordGeneralTx = async (e: React.FormEvent) => {
        e.preventDefault()
        const amt = parseFloat(txAmount) || 0
        if (amt <= 0) return showStatus('Please enter a valid transaction amount.', 'error')
        if (!txDescription.trim()) return showStatus('Please enter a description.', 'error')
        if (txCategory === 'other' && !customTxCategory.trim()) {
            return showStatus('Please specify the custom category name.', 'error')
        }

        const effectiveCat = txCategory === 'other' ? customTxCategory.trim() : txCategory

        setIsProcessingTx(true)
        try {
            const { data: newTx, error } = await supabase
                .from('treasury_transactions')
                .insert({
                    group_id: groupId,
                    scope: 'group',
                    type: txType,
                    category: effectiveCat,
                    amount: amt,
                    currency: 'USD',
                    payment_method: 'cash',
                    status: 'approved',
                    description: txDescription.trim(),
                    submitted_by: userProfileId,
                })
                .select('*, troops(id, name)')
                .single()

            if (error) throw error
            if (newTx) {
                setTransactions((prev) => [newTx, ...prev])
                setIsTxModalOpen(false)
                setTxAmount('')
                setTxDescription('')
                setCustomTxCategory('')
                showStatus(`${txType === 'income' ? 'Income' : 'Expense'} of $${amt} recorded!`, 'success')
            }
        } catch (err: any) {
            showStatus(`Error: ${err.message}`, 'error')
        } finally {
            setIsProcessingTx(false)
        }
    }

    return (
        <DashboardShell groupName={groupName} currentRole={currentRole} userName={userName}>
            <div className="space-y-6 pb-12">
                {/* Status Toast */}
                {statusMessage && (
                    <div
                        className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${statusMessage.type === 'success'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                            : 'bg-rose-50 border-rose-300 text-rose-900'
                            }`}
                    >
                        {statusMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-rose-600" />}
                        <span>{statusMessage.text}</span>
                    </div>
                )}

                {/* ── Page Header with Back/Forward Year Navigation ───────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs">
                    <div>
                        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-teal-700 uppercase tracking-wider mb-0.5">
                            <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            {isTroopLeader ? `${activeTroopObj?.name || 'Unit'} Treasury` : 'Group Treasury & Troop Accounts'}
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                            {isTroopLeader ? `${activeTroopObj?.name || 'Unit'} - Monthly Dues` : 'Scout Financials & Dues'}
                        </h1>
                    </div>

                    {/* Year Navigator (Back / Forward) */}
                    <div className="flex items-center self-start sm:self-auto gap-1.5 bg-slate-100 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-slate-200">
                        <button
                            onClick={() => setSelectedYearNum((prev) => prev - 1)}
                            className="p-1 sm:p-1.5 rounded-lg sm:rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white transition-all shadow-2xs"
                            title="Previous Year"
                        >
                            <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                        <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 bg-white rounded-lg sm:rounded-xl shadow-xs border border-slate-200/80">
                            <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-teal-700" />
                            <span className="font-black text-xs sm:text-sm text-slate-900 font-mono tracking-tight">
                                {selectedYearNum}
                            </span>
                        </div>
                        <button
                            onClick={() => setSelectedYearNum((prev) => prev + 1)}
                            className="p-1 sm:p-1.5 rounded-lg sm:rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white transition-all shadow-2xs"
                            title="Next Year"
                        >
                            <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                    </div>
                </div>

                {/* ── Top KPI Overview (Role Differentiated - 2 Columns on Mobile) ── */}
                {isGroupTreasurer ? (
                    /* Group Treasurer Overview Cards (2x2 Grid on Mobile) */
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5 sm:space-y-2">
                            <div className="flex items-center justify-between text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                                <span className="truncate">Group Vault</span>
                                <div className="p-1 sm:p-1.5 rounded-lg bg-teal-50 text-teal-700 shrink-0">
                                    <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-1 sm:gap-2">
                                <span className="text-lg sm:text-2xl font-black text-slate-900">${centralTreasury.netGroupVault.toLocaleString()}</span>
                                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400">Total</span>
                            </div>
                            <div className="text-[10px] sm:text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex flex-row justify-between gap-0.5">
                                <span>Free: <strong className="text-emerald-700">${centralTreasury.unallocatedGroupCash.toLocaleString()}</strong></span>
                                <span>Troops: <strong className="text-teal-700">${centralTreasury.totalTroopAllocations.toLocaleString()}</strong></span>
                            </div>
                        </div>

                        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5 sm:space-y-2">
                            <div className="flex items-center justify-between text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                                <span className="truncate">Troop Accounts</span>
                                <div className="p-1 sm:p-1.5 rounded-lg bg-purple-50 text-purple-700 shrink-0">
                                    <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-1 sm:gap-2">
                                <span className="text-lg sm:text-2xl font-black text-purple-700">
                                    ${troopVaults.reduce((sum, tv) => sum + Math.max(0, tv.availableBalance), 0).toLocaleString()}
                                </span>
                                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400">7 troops</span>
                            </div>
                            <div className="text-[10px] sm:text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex  flex-row justify-between gap-0.5">
                                <span>Spent: <strong>${troopVaults.reduce((sum, tv) => sum + tv.approvedDisbursements, 0)}</strong></span>
                                <span>In: <strong>${troopVaults.reduce((sum, tv) => sum + tv.confirmedHandovers, 0)}</strong></span>
                            </div>
                        </div>

                        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5 sm:space-y-2">
                            <div className="flex items-center justify-between text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                                <span className="truncate">Monthly Dues</span>
                                <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-50 text-emerald-700 shrink-0">
                                    <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-1 sm:gap-2">
                                <span className="text-lg sm:text-2xl font-black text-emerald-600">
                                    ${troopDues.filter((d) => d.month_key.startsWith(String(selectedYearNum))).reduce((sum, d) => sum + Number(d.paid_amount || 0), 0).toLocaleString()}
                                </span>
                                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400">in {selectedYearNum}</span>
                            </div>
                            <div className="text-[10px] sm:text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                                <span>All troop dues collected</span>
                            </div>
                        </div>

                        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5 sm:space-y-2">
                            <div className="flex items-center justify-between text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                                <span className="truncate">Annual Fees</span>
                                <div className="p-1 sm:p-1.5 rounded-lg bg-blue-50 text-blue-700 shrink-0">
                                    <Percent className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-1 sm:gap-2">
                                <span className="text-lg sm:text-2xl font-black text-slate-900">${centralTreasury.totalAnnualDuesCollected.toLocaleString()}</span>
                                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400">/ ${centralTreasury.totalAnnualDuesAssessed.toLocaleString()}</span>
                            </div>
                            <div className="text-[10px] sm:text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex justify-between">
                                <span>Group Cotisations</span>
                                <span className="font-bold text-blue-700">
                                    {centralTreasury.totalAnnualDuesAssessed > 0
                                        ? Math.round((centralTreasury.totalAnnualDuesCollected / centralTreasury.totalAnnualDuesAssessed) * 100)
                                        : 0}%
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Troop Leader Single Troop Overview Cards */
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
                        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5 sm:space-y-2">
                            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                                <span>Collected in {selectedYearNum}</span>
                                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                                    <CheckCircle2 className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl sm:text-2xl font-black text-emerald-600">${activeTroopVault?.collectedFromScouts || 0}</span>
                                <span className="text-[10px] font-bold text-slate-400">from scouts</span>
                            </div>
                            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                                <span>Target: ${getTroopMonthlyTarget(selectedTroopId)} / member / month</span>
                            </div>
                        </div>

                        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5 sm:space-y-2">
                            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                                <span>Handed Over to Treasurer</span>
                                <div className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
                                    <Send className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl sm:text-2xl font-black text-teal-800">${activeTroopVault?.confirmedHandovers || 0}</span>
                                <span className="text-[10px] font-bold text-slate-400">confirmed</span>
                            </div>
                            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex justify-between">
                                <span>Pending Handover: <strong>${activeTroopVault?.cashInTroopHand || 0}</strong></span>
                            </div>
                        </div>

                        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5 sm:space-y-2">
                            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                                <span>Available Troop Balance</span>
                                <div className="p-1.5 rounded-lg bg-purple-50 text-purple-700">
                                    <Wallet className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl sm:text-2xl font-black text-purple-700">${activeTroopVault?.availableBalance || 0}</span>
                                <span className="text-[10px] font-bold text-slate-400">in Group Vault</span>
                            </div>
                            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex justify-between">
                                <span>Spent on Troop: <strong>${activeTroopVault?.approvedDisbursements || 0}</strong></span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Native Segmented Tab Bar (Horizontal Scrollable Pills on Mobile) ── */}
                {isGroupTreasurer && (
                    <div className="overflow-x-auto no-scrollbar -mx-1 px-1 flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200 shadow-2xs">
                        <button
                            onClick={() => setActiveTab('monthly_dues')}
                            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${activeTab === 'monthly_dues'
                                ? 'bg-teal-800 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                }`}
                        >
                            <Calendar className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Monthly Troop Dues Matrix</span>
                            <span className="sm:hidden">Troop Dues</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('troop_vaults')}
                            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${activeTab === 'troop_vaults'
                                ? 'bg-teal-800 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                }`}
                        >
                            <Layers className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Troop Accounts & Handovers</span>
                            <span className="sm:hidden">Troop Vaults</span>
                            {handovers.filter((h) => h.status === 'pending').length > 0 && (
                                <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                                    {handovers.filter((h) => h.status === 'pending').length}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab('monthly_statement')}
                            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${activeTab === 'monthly_statement'
                                ? 'bg-teal-800 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                }`}
                        >
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Monthly Statement (*Kashf Hisab*)</span>
                            <span className="sm:hidden">Statement</span>
                            {currentStatementRecord?.status === 'submitted' && isGroupLeader && (
                                <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                                    Review
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab('annual_dues')}
                            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${activeTab === 'annual_dues'
                                ? 'bg-teal-800 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                }`}
                        >
                            <Percent className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Annual Membership Cotisations</span>
                            <span className="sm:hidden">Annual Dues</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('treasury')}
                            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${activeTab === 'treasury'
                                ? 'bg-teal-800 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                }`}
                        >
                            <Receipt className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Group Treasury Ledger</span>
                            <span className="sm:hidden">Group Ledger</span>
                        </button>
                    </div>
                )}

                {/* ── TAB 1: MONTHLY TROOP DUES MATRIX (JAN - DEC) ──────────────── */}
                {(activeTab === 'monthly_dues' || isTroopLeader) && (
                    <div className="space-y-3">
                        {/* ── UNIFIED STREAMLINED CONTROL HEADER ── */}
                        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                            {/* Row 1: Troop Selector + Target & Action Buttons */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                                    {isGroupTreasurer ? (
                                        troops.map((t) => (
                                            <button
                                                key={t.id}
                                                onClick={() => setSelectedTroopId(t.id)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                                                    selectedTroopId === t.id
                                                        ? 'bg-teal-700 text-white shadow-xs'
                                                        : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                                                }`}
                                            >
                                                {t.name}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                                            <span>{activeTroopObj?.name} Youth Roster</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0 justify-between sm:justify-end">
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => {
                                                setNewMonthlyTarget(String(getTroopMonthlyTarget(selectedTroopId)))
                                                setIsConfigTargetOpen(true)
                                            }}
                                            className="px-2 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-900 text-[11px] font-bold flex items-center gap-1 transition-colors"
                                            title="Configure Target"
                                        >
                                            <span className="text-teal-700 font-semibold">Target:</span>
                                            <span className="bg-teal-700 text-white px-1.5 py-0.5 rounded-md text-[10px] font-black">
                                                ${getTroopMonthlyTarget(selectedTroopId)}/mo
                                            </span>
                                            <Settings className="h-3 w-3 text-teal-700 ml-0.5" />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => setIsHandoverModalOpen(true)}
                                            className="bg-teal-700 hover:bg-teal-600 text-white font-bold px-2.5 py-1 rounded-xl text-xs transition-colors shadow-2xs flex items-center gap-1"
                                        >
                                            <Send className="h-3 w-3" />
                                            <span>Handover</span>
                                        </button>

                                        <button
                                            onClick={() => setIsDisbursementModalOpen(true)}
                                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded-xl text-xs transition-colors"
                                        >
                                            Request
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: Month Stepper, Progress Snippet & View Toggle */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                                {/* Back / Forward Month Stepper */}
                                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                                    <button
                                        onClick={handlePrevDuesMonth}
                                        className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all shadow-2xs"
                                        title="Previous Month"
                                    >
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                    </button>
                                    <div className="px-2.5 py-0.5 text-xs font-black text-slate-900 min-w-[95px] text-center">
                                        {MONTHS_ORDER.find((m) => m.key === duesMonth)?.label} {selectedYearNum}
                                    </div>
                                    <button
                                        onClick={handleNextDuesMonth}
                                        className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all shadow-2xs"
                                        title="Next Month"
                                    >
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </button>
                                </div>

                                {/* Month Progress Pill */}
                                {(() => {
                                    const duesMonthKey = `${selectedYearNum}-${duesMonth}`
                                    const targetPerMonth = getTroopMonthlyTarget(selectedTroopId)
                                    let monthPaidCount = 0
                                    let monthTotalCollected = 0
                                    selectedTroopScouts.forEach((scout) => {
                                        const due = getDueCell(scout.id, duesMonthKey)
                                        const paid = Number(due?.paid_amount || 0)
                                        monthTotalCollected += paid
                                        if (paid >= targetPerMonth) monthPaidCount += 1
                                    })
                                    return (
                                        <div className="text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl truncate">
                                            <span className="text-teal-700 font-black">${monthTotalCollected}</span>
                                            <span className="text-slate-400 font-normal"> / ${selectedTroopScouts.length * targetPerMonth}</span>
                                            <span className="text-slate-400 mx-1">•</span>
                                            <span className="text-slate-700">{monthPaidCount}/{selectedTroopScouts.length} Paid</span>
                                        </div>
                                    )
                                })()}

                                {/* Compact View Toggle */}
                                <button
                                    onClick={() => setDuesViewMode(duesViewMode === 'month' ? 'matrix' : 'month')}
                                    className="p-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                                    title={duesViewMode === 'month' ? 'Switch to Full Year Grid' : 'Switch to Month View'}
                                >
                                    {duesViewMode === 'month' ? (
                                        <>
                                            <FileSpreadsheet className="h-3.5 w-3.5 text-teal-700" />
                                            <span className="hidden sm:inline text-[11px]">Grid</span>
                                        </>
                                    ) : (
                                        <>
                                            <Calendar className="h-3.5 w-3.5 text-teal-700" />
                                            <span className="hidden sm:inline text-[11px]">Month</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Row 3: Fast Jump Months Pill Strip */}
                            <div className="overflow-x-auto no-scrollbar -mx-1 px-1 flex items-center gap-1">
                                {MONTHS_ORDER.map((m) => (
                                    <button
                                        key={m.key}
                                        onClick={() => setDuesMonth(m.key)}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                                            duesMonth === m.key
                                                ? 'bg-teal-700 text-white shadow-2xs'
                                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                                        }`}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </div>

                            {/* Row 4: Search & Status Filter Chips */}
                            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="relative w-full sm:max-w-xs">
                                    <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search scout name…"
                                        value={duesScoutSearch}
                                        onChange={(e) => setDuesScoutSearch(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-medium"
                                    />
                                </div>

                                {(() => {
                                    const duesMonthKey = `${selectedYearNum}-${duesMonth}`
                                    const targetPerMonth = getTroopMonthlyTarget(selectedTroopId)
                                    let monthPaidCount = 0
                                    selectedTroopScouts.forEach((scout) => {
                                        const due = getDueCell(scout.id, duesMonthKey)
                                        const paid = Number(due?.paid_amount || 0)
                                        if (paid >= targetPerMonth) monthPaidCount += 1
                                    })
                                    return (
                                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                                            <button
                                                onClick={() => setDuesFilterStatus('all')}
                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                                                    duesFilterStatus === 'all'
                                                        ? 'bg-slate-800 text-white'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                            >
                                                All ({selectedTroopScouts.length})
                                            </button>
                                            <button
                                                onClick={() => setDuesFilterStatus('unpaid')}
                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                                                    duesFilterStatus === 'unpaid'
                                                        ? 'bg-amber-600 text-white'
                                                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                                                }`}
                                            >
                                                Unpaid ({selectedTroopScouts.length - monthPaidCount})
                                            </button>
                                            <button
                                                onClick={() => setDuesFilterStatus('paid')}
                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                                                    duesFilterStatus === 'paid'
                                                        ? 'bg-emerald-600 text-white'
                                                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                                                }`}
                                            >
                                                Paid ({monthPaidCount})
                                            </button>
                                        </div>
                                    )
                                })()}
                            </div>
                        </div>

                        {/* ── VIEW 1: SINGLE MONTH VIEW (NATIVE CONTINUOUS LIST) ── */}
                        {duesViewMode === 'month' && (() => {
                            const duesMonthKey = `${selectedYearNum}-${duesMonth}`
                            const targetPerMonth = getTroopMonthlyTarget(selectedTroopId)

                            const filteredScouts = selectedTroopScouts.filter((scout) => {
                                const fullName = `${scout.first_name} ${scout.last_name}`.toLowerCase()
                                if (duesScoutSearch && !fullName.includes(duesScoutSearch.toLowerCase())) {
                                    return false
                                }
                                const due = getDueCell(scout.id, duesMonthKey)
                                const paid = Number(due?.paid_amount || 0)
                                const isPaid = paid >= targetPerMonth
                                if (duesFilterStatus === 'paid' && !isPaid) return false
                                if (duesFilterStatus === 'unpaid' && isPaid) return false
                                return true
                            })

                            return (
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                                    {filteredScouts.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400 space-y-1">
                                            <Users className="h-7 w-7 mx-auto opacity-30" />
                                            <p className="font-bold text-slate-600 text-xs">No scouts found matching this filter.</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-100">
                                            {filteredScouts.map((scout) => {
                                                const due = getDueCell(scout.id, duesMonthKey)
                                                const paid = Number(due?.paid_amount || 0)
                                                const isFull = paid >= targetPerMonth
                                                const isPartial = paid > 0 && paid < targetPerMonth
                                                const initials = `${scout.first_name?.[0] || ''}${scout.last_name?.[0] || ''}`.toUpperCase()

                                                return (
                                                    <div
                                                        key={scout.id}
                                                        onClick={() => {
                                                            setQuickPayCell({
                                                                member: scout,
                                                                monthKey: duesMonthKey,
                                                                monthLabel: `${MONTHS_ORDER.find((m) => m.key === duesMonth)?.label} ${selectedYearNum}`,
                                                                currentPaid: paid,
                                                                target: targetPerMonth,
                                                                dueRecordId: due?.id,
                                                            })
                                                            setQuickPayAmount(isFull ? '1' : String(Math.max(1, targetPerMonth - paid)))
                                                        }}
                                                        className="px-3.5 py-3 hover:bg-slate-50/80 active:bg-slate-100 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                                                    >
                                                        {/* Left: Avatar & Name */}
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[11px] shrink-0 transition-colors ${
                                                                isFull
                                                                    ? 'bg-emerald-100 text-emerald-800'
                                                                    : isPartial
                                                                    ? 'bg-amber-100 text-amber-800'
                                                                    : 'bg-slate-100 text-slate-600 group-hover:bg-teal-50 group-hover:text-teal-800'
                                                            }`}>
                                                                {initials || <Users className="h-3.5 w-3.5" />}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="font-bold text-slate-900 text-xs truncate">
                                                                    {scout.first_name} {scout.last_name}
                                                                </div>
                                                                {scout.current_rank && (
                                                                    <div className="text-[10px] text-slate-400 truncate">
                                                                        {scout.current_rank}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Right: Payment Status Badge & Action */}
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {isFull ? (
                                                                <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-black text-[11px] flex items-center gap-1">
                                                                    <Check className="h-3 w-3 text-emerald-600" />
                                                                    <span>${paid}</span>
                                                                </span>
                                                            ) : isPartial ? (
                                                                <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                                                                    ${paid} / ${targetPerMonth}
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setQuickPayCell({
                                                                            member: scout,
                                                                            monthKey: duesMonthKey,
                                                                            monthLabel: `${MONTHS_ORDER.find((m) => m.key === duesMonth)?.label} ${selectedYearNum}`,
                                                                            currentPaid: paid,
                                                                            target: targetPerMonth,
                                                                            dueRecordId: due?.id,
                                                                        })
                                                                        setQuickPayAmount(String(targetPerMonth))
                                                                    }}
                                                                    className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs shadow-2xs transition-colors flex items-center gap-1"
                                                                >
                                                                    <span>Pay ${targetPerMonth}</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )
                        })()}

                        {/* ── VIEW 2: FULL YEAR MATRIX TABLE (OPTIONAL TOGGLE) ── */}
                        {duesViewMode === 'matrix' && (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                            <tr>
                                                <th className="px-4 py-3 sticky left-0 bg-slate-50 z-10 min-w-[160px]">Scout Name</th>
                                                {MONTHS_ORDER.map((m) => (
                                                    <th key={m.key} className="px-2.5 py-3 text-center min-w-[65px]">
                                                        {m.label}
                                                    </th>
                                                ))}
                                                <th className="px-4 py-3 text-right">Year Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {selectedTroopScouts.length === 0 ? (
                                                <tr>
                                                    <td colSpan={14} className="px-4 py-12 text-center text-slate-400">
                                                        <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                                        <p className="font-bold text-slate-600">No active scouts registered in this troop.</p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                selectedTroopScouts.map((scout) => {
                                                    const targetPerMonth = getTroopMonthlyTarget(selectedTroopId)
                                                    let scoutTotalPaid = 0

                                                    return (
                                                        <tr key={scout.id} className="hover:bg-slate-50/70 transition-colors">
                                                            {/* Scout Name (Sticky) */}
                                                            <td className="px-4 py-2.5 font-bold text-slate-900 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-100">
                                                                <div className="truncate max-w-[150px]">
                                                                    {scout.first_name} {scout.last_name}
                                                                </div>
                                                                {scout.current_rank && (
                                                                    <span className="text-[9px] text-slate-400 block font-normal">{scout.current_rank}</span>
                                                                )}
                                                            </td>

                                                            {/* Months (Jan – Dec in selectedYearNum) */}
                                                            {MONTHS_ORDER.map((m) => {
                                                                const monthKey = `${selectedYearNum}-${m.key}`
                                                                const due = getDueCell(scout.id, monthKey)
                                                                const paid = Number(due?.paid_amount || 0)
                                                                scoutTotalPaid += paid
                                                                const isFull = paid >= targetPerMonth
                                                                const isPartial = paid > 0 && paid < targetPerMonth

                                                                return (
                                                                    <td key={m.key} className="px-1.5 py-2 text-center">
                                                                        <button
                                                                            onClick={() => {
                                                                                setQuickPayCell({
                                                                                    member: scout,
                                                                                    monthKey,
                                                                                    monthLabel: `${m.label} ${selectedYearNum}`,
                                                                                    currentPaid: paid,
                                                                                    target: targetPerMonth,
                                                                                    dueRecordId: due?.id,
                                                                                })
                                                                                setQuickPayAmount(isFull ? '1' : String(Math.max(1, targetPerMonth - paid)))
                                                                            }}
                                                                            className={`w-full py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all border ${isFull
                                                                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
                                                                                : isPartial
                                                                                    ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                                                                                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-700'
                                                                                }`}
                                                                            title={`Click to log payment for ${m.label} ${selectedYearNum}`}
                                                                        >
                                                                            {paid > 0 ? `$${paid}` : '—'}
                                                                        </button>
                                                                    </td>
                                                                )
                                                            })}

                                                            {/* Scout Year Total */}
                                                            <td className="px-4 py-2.5 text-right font-black text-slate-900">
                                                                ${scoutTotalPaid}
                                                            </td>
                                                        </tr>
                                                    )
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB 2: TROOP ACCOUNTS & HANDOVERS (GROUP TREASURER ONLY) ─── */}
                {isGroupTreasurer && activeTab === 'troop_vaults' && (
                    <div className="space-y-6">
                        {/* Troop Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {troopVaults.map((tv) => (
                                <div
                                    key={tv.troop.id}
                                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 hover:border-teal-400 hover:shadow-md transition-all group flex flex-col justify-between"
                                >
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-base group-hover:text-teal-800 transition-colors">
                                                    {tv.troop.name}
                                                </h4>
                                                <p className="text-xs text-slate-500">Virtual Troop Account</p>
                                            </div>
                                            <span className="bg-teal-50 text-teal-800 text-xs font-black px-2.5 py-1 rounded-lg border border-teal-200">
                                                Balance: ${tv.availableBalance}
                                            </span>
                                        </div>

                                        <div className="space-y-2 text-xs">
                                            <div className="flex justify-between text-slate-600">
                                                <span>Total Collected from Scouts ({selectedYearNum}):</span>
                                                <strong className="text-slate-900">${tv.collectedFromScouts}</strong>
                                            </div>
                                            <div className="flex justify-between text-slate-600">
                                                <span>Handed Over to Treasurer:</span>
                                                <strong className="text-emerald-700">${tv.confirmedHandovers}</strong>
                                            </div>
                                            <div className="flex justify-between text-slate-600">
                                                <span>Spent / Disbursed:</span>
                                                <strong className="text-rose-600">-${tv.approvedDisbursements}</strong>
                                            </div>
                                            {tv.cashInTroopHand > 0 && (
                                                <div className="flex justify-between text-amber-700 bg-amber-50 p-2 rounded-lg font-bold">
                                                    <span>Cash Pending Handover:</span>
                                                    <span>${tv.cashInTroopHand}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setSelectedTroopForDetails(tv.troop)
                                            setTroopDetailsSubTab('scouts')
                                            setDetailsScoutSearch('')
                                        }}
                                        className="w-full mt-2 bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-900 font-bold py-2 px-3 rounded-xl text-xs border border-slate-200 hover:border-teal-300 transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                                    >
                                        <span>Inspect Troop Dues & Transactions</span>
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Pending Handovers Table (Treasurer Action) */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                    <Send className="h-4 w-4 text-teal-700" />
                                    <span>Troop Handovers to Treasurer (*Taslim El Sandou2*)</span>
                                </h3>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                                        <tr>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Troop</th>
                                            <th className="px-4 py-3">Month</th>
                                            <th className="px-4 py-3">Amount</th>
                                            <th className="px-4 py-3">Handed Over By</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {handovers.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                                                    No handovers submitted yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            handovers.map((h) => (
                                                <tr key={h.id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 text-slate-500">{h.handover_date}</td>
                                                    <td className="px-4 py-3 font-bold text-slate-900">{h.troops?.name}</td>
                                                    <td className="px-4 py-3 font-mono text-[11px]">{h.month_key}</td>
                                                    <td className="px-4 py-3 font-black text-emerald-700">${h.amount}</td>
                                                    <td className="px-4 py-3 text-slate-600">{h.handed_over?.full_name || 'Leader'}</td>
                                                    <td className="px-4 py-3">
                                                        <span
                                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${h.status === 'confirmed'
                                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                                : h.status === 'rejected'
                                                                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                                                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                                                }`}
                                                        >
                                                            {h.status === 'confirmed' ? 'Approved' : h.status === 'rejected' ? 'Declined' : 'Pending'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {h.status === 'pending' ? (
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button
                                                                    onClick={() => handleConfirmHandover(h)}
                                                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] shadow-2xs transition-colors"
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeclineHandover(h)}
                                                                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-2 py-1 rounded-lg text-[11px] border border-rose-200 transition-colors"
                                                                >
                                                                    Decline
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 font-medium">Completed</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Troop Disbursements Table */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <Receipt className="h-4 w-4 text-purple-700" />
                                <span>Troop Fund Disbursements & Cash Advances (*Talab Masarif*)</span>
                            </h3>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                                        <tr>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Troop</th>
                                            <th className="px-4 py-3">Purpose</th>
                                            <th className="px-4 py-3">Amount</th>
                                            <th className="px-4 py-3">Requested By</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {disbursements.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                                                    No disbursement requests logged yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            disbursements.map((d) => (
                                                <tr key={d.id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 text-slate-500">{d.request_date}</td>
                                                    <td className="px-4 py-3 font-bold text-slate-900">{d.troops?.name}</td>
                                                    <td className="px-4 py-3 text-slate-900">{d.purpose}</td>
                                                    <td className="px-4 py-3 font-black text-rose-600">${d.amount}</td>
                                                    <td className="px-4 py-3 text-slate-600">{d.requested_by_leader?.full_name || 'Leader'}</td>
                                                    <td className="px-4 py-3">
                                                        <span
                                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${d.status === 'approved'
                                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                                : d.status === 'rejected'
                                                                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                                                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                                                }`}
                                                        >
                                                            {d.status === 'approved' ? 'Approved' : d.status === 'rejected' ? 'Declined' : 'Pending'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {d.status === 'pending' ? (
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button
                                                                    onClick={() => handleApproveDisbursement(d)}
                                                                    className="bg-teal-700 hover:bg-teal-600 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] shadow-2xs transition-colors"
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeclineDisbursement(d)}
                                                                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-2 py-1 rounded-lg text-[11px] border border-rose-200 transition-colors"
                                                                >
                                                                    Decline
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 font-medium">Completed</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── TAB: MONTHLY FINANCIAL STATEMENT (KASHF HISAB CHAHRI) ───── */}
                {isGroupTreasurer && activeTab === 'monthly_statement' && (
                    <div className="space-y-6">
                        {/* Action Bar & Month Selector */}
                        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                            <div className="flex items-center gap-2 overflow-hidden w-full md:w-auto">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">Month:</span>
                                <div className="overflow-x-auto no-scrollbar -mx-1 px-1 flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full">
                                    {MONTHS_ORDER.map((m) => (
                                        <button
                                            key={m.key}
                                            onClick={() => setStatementMonth(m.key)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${statementMonth === m.key
                                                ? 'bg-teal-700 text-white shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                                                }`}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Status & Approval Actions */}
                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                                {/* Status Badge */}
                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border font-bold text-xs bg-white shrink-0">
                                    <span className="text-[10px] text-slate-500 uppercase">Status:</span>
                                    <span
                                        className={`px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-black uppercase ${effectiveStatementStatus === 'needs_reapproval'
                                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                            : effectiveStatementStatus === 'approved'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : effectiveStatementStatus === 'submitted'
                                                    ? 'bg-amber-100 text-amber-900'
                                                    : effectiveStatementStatus === 'rejected'
                                                        ? 'bg-rose-100 text-rose-800'
                                                        : 'bg-slate-100 text-slate-700'
                                            }`}
                                    >
                                        {effectiveStatementStatus === 'needs_reapproval'
                                            ? 'Re-Approval Required'
                                            : effectiveStatementStatus}
                                    </span>
                                </div>

                                {/* Print Button */}
                                <button
                                    onClick={() => window.print()}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-2xs shrink-0"
                                >
                                    <Printer className="h-3.5 w-3.5" />
                                    <span>Print</span>
                                </button>

                                {/* Treasurer Action: Submit or Re-submit for approval */}
                                {(!currentStatementRecord || effectiveStatementStatus === 'draft' || effectiveStatementStatus === 'rejected' || effectiveStatementStatus === 'needs_reapproval') && (
                                    <button
                                        onClick={handleSubmitStatementForApproval}
                                        disabled={isProcessingStatementAction}
                                        className="bg-teal-700 hover:bg-teal-600 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-2xs shrink-0"
                                    >
                                        <Send className="h-3.5 w-3.5" />
                                        <span>{effectiveStatementStatus === 'needs_reapproval' ? 'Re-Submit' : 'Submit'}</span>
                                    </button>
                                )}

                                {/* Group Leader Actions: Approve or Reject (available if submitted OR if modified after previous approval) */}
                                {(effectiveStatementStatus === 'submitted' || effectiveStatementStatus === 'needs_reapproval') && isGroupLeader && (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            onClick={handleApproveStatementByLeader}
                                            disabled={isProcessingStatementAction}
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-colors flex items-center gap-1 shadow-2xs"
                                        >
                                            <Check className="h-3.5 w-3.5" />
                                            <span>{effectiveStatementStatus === 'needs_reapproval' ? 'Re-Approve' : 'Approve'}</span>
                                        </button>
                                        <button
                                            onClick={handleRejectStatementByLeader}
                                            disabled={isProcessingStatementAction}
                                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold px-2.5 py-1.5 rounded-xl text-xs transition-colors"
                                        >
                                            Revision
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ⚠️ If Modifications Detected After Approval */}
                        {isStatementOutdatedAfterApproval && (
                            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 flex items-start gap-3 shadow-2xs">
                                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <strong className="font-bold block text-sm">⚠️ Modifications Detected Since Group Leader Approval:</strong>
                                    <p>
                                        Transactions were added or modified for this month. Previously approved balance was{' '}
                                        <strong>${Number(currentStatementRecord?.closing_balance_usd || 0).toLocaleString()}</strong>, but the current calculated balance is{' '}
                                        <strong>${monthlyStatementData.closingUSD.toLocaleString()}</strong>.
                                    </p>
                                    <p className="font-medium text-amber-800">
                                        The statement has been unlocked and must be re-approved by the Group Leader (*Chef de Groupe*).
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* If Revision Requested Note */}
                        {currentStatementRecord?.status === 'rejected' && currentStatementRecord.notes && (
                            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                    <strong className="font-bold block">Revision Requested by Group Leader:</strong>
                                    <p className="mt-0.5">{currentStatementRecord.notes}</p>
                                </div>
                            </div>
                        )}

                        {/* ── OFFICIAL MONTHLY STATEMENT CARD (PRINTABLE & STRUCTURED LIKE IMAGE) ── */}
                        <div
                            id="printable-statement-card"
                            className="bg-white rounded-3xl border border-slate-300 p-6 md:p-8 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0 print:m-0"
                        >
                            {/* Header */}
                            <div className="border-b-2 border-slate-900 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-3 text-right">
                                <div className="text-left">
                                    <span className="text-xs font-black uppercase tracking-widest text-teal-800">Scout des Cèdres</span>
                                    <h2 className="text-xl font-black text-slate-900">كشف حساب شهري (Monthly Treasury Statement)</h2>
                                    <p className="text-xs text-slate-500 font-medium">سندات الصندوق والمقبوضات والمدفوعات</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-black text-slate-900">
                                        عن شهر: {ARABIC_MONTH_NAMES[statementMonth] || statementMonth} {selectedYearNum}
                                    </div>
                                    <div className="text-xs text-slate-500" suppressHydrationWarning>
                                        تاريخ الإصدار: {new Date().toISOString().split('T')[0]}
                                    </div>
                                </div>
                            </div>

                            {/* ── SECTION 1: INFLOWS (داخل في شهر ...) ── */}
                            <div className="border border-sky-300 rounded-2xl overflow-hidden shadow-2xs">
                                <div className="bg-sky-700 text-white px-4 py-2.5 flex items-center justify-between font-bold text-xs">
                                    <div className="flex items-center gap-2">
                                        <ArrowDownRight className="h-4 w-4" />
                                        <span>داخل في شهر {ARABIC_MONTH_NAMES[statementMonth]?.split(' ')[0]} {selectedYearNum} (Income & Inflows)</span>
                                    </div>
                                    <span className="bg-sky-800 px-2 py-0.5 rounded text-[11px]">
                                        المجموع: ${monthlyStatementData.totalInflowUSD.toLocaleString()}
                                    </span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse min-w-[580px]">
                                        <thead className="bg-sky-50/80 border-b border-sky-200 text-slate-700 font-bold uppercase text-[10px]">
                                            <tr>
                                                <th className="px-4 py-2.5">المبلغ (Amount)</th>
                                                <th className="px-4 py-2.5">العملة (Cur)</th>
                                                <th className="px-4 py-2.5">البيان / داخل (Source / Description)</th>
                                                <th className="px-4 py-2.5">القرار / رقم الإيصال</th>
                                                <th className="px-4 py-2.5">التاريخ (Date)</th>
                                                <th className="px-4 py-2.5">تفاصيل (Details)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                                            {monthlyStatementData.groupedInflows.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                                                        لا توجد مقبوضات مسجلة لهذا الشهر (No recorded income for this month).
                                                    </td>
                                                </tr>
                                            ) : (
                                                monthlyStatementData.groupedInflows.map((group) => (
                                                    <tr
                                                        key={group.key}
                                                        onClick={() => setSelectedStatementGroup(group)}
                                                        className="hover:bg-sky-50/80 cursor-pointer transition-colors group"
                                                    >
                                                        <td className="px-4 py-2.5 font-mono font-black text-emerald-700 text-sm">
                                                            {group.totalUSD > 0 ? `$${group.totalUSD.toLocaleString()}` : ''}
                                                            {group.totalLBP > 0 ? ` LBP ${group.totalLBP.toLocaleString()}` : ''}
                                                        </td>
                                                        <td className="px-4 py-2.5 font-bold text-slate-600">
                                                            {group.totalUSD > 0 && group.totalLBP > 0 ? 'USD/LBP' : group.totalUSD > 0 ? 'USD' : 'LBP'}
                                                        </td>
                                                        <td className="px-4 py-2.5 font-bold text-slate-900">
                                                            <div className="flex items-center gap-2">
                                                                <span>{group.title}</span>
                                                                <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full group-hover:bg-sky-200 print:hidden">
                                                                    {group.count} {group.count === 1 ? 'entry' : 'entries'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                                                            {group.count === 1 ? group.items[0]?.ref : `${group.count} receipts`}
                                                        </td>
                                                        <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                                                            {group.count === 1 ? group.items[0]?.date : statementMonthKey}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-sky-700 font-bold text-[11px] group-hover:underline print:hidden">
                                                            Click for breakdown →
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                        {monthlyStatementData.groupedInflows.length > 0 && (
                                            <tfoot className="bg-sky-50/50 font-bold border-t border-sky-200 text-xs">
                                                <tr>
                                                    <td className="px-4 py-2.5 font-black text-emerald-800 text-sm">
                                                        ${monthlyStatementData.totalInflowUSD.toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-slate-600">USD</td>
                                                    <td colSpan={4} className="px-4 py-2.5 text-slate-800 font-black">
                                                        مجموع المقبوضات لشهر {ARABIC_MONTH_NAMES[statementMonth]?.split(' ')[0]}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>

                            {/* ── SECTION 2: OUTFLOWS (خارج في شهر ...) ── */}
                            <div className="border border-slate-300 rounded-2xl overflow-hidden shadow-2xs">
                                <div className="bg-slate-700 text-white px-4 py-2.5 flex items-center justify-between font-bold text-xs">
                                    <div className="flex items-center gap-2">
                                        <ArrowUpRight className="h-4 w-4" />
                                        <span>خارج في شهر {ARABIC_MONTH_NAMES[statementMonth]?.split(' ')[0]} {selectedYearNum} (Expenses & Outflows)</span>
                                    </div>
                                    <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                                        المجموع: ${monthlyStatementData.totalOutflowUSD.toLocaleString()}
                                    </span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse min-w-[580px]">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                                            <tr>
                                                <th className="px-4 py-2.5">المبلغ (Amount)</th>
                                                <th className="px-4 py-2.5">العملة (Cur)</th>
                                                <th className="px-4 py-2.5">البيان / خارج (Expense Purpose)</th>
                                                <th className="px-4 py-2.5">القرار / رقم الإيصال</th>
                                                <th className="px-4 py-2.5">التاريخ (Date)</th>
                                                <th className="px-4 py-2.5">تفاصيل (Details)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                                            {monthlyStatementData.groupedOutflows.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                                                        لا توجد مدفوعات مسجلة لهذا الشهر (No recorded expenses for this month).
                                                    </td>
                                                </tr>
                                            ) : (
                                                monthlyStatementData.groupedOutflows.map((group) => (
                                                    <tr
                                                        key={group.key}
                                                        onClick={() => setSelectedStatementGroup(group)}
                                                        className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                                                    >
                                                        <td className="px-4 py-2.5 font-mono font-black text-rose-600 text-sm">
                                                            {group.totalUSD > 0 ? `$${group.totalUSD.toLocaleString()}` : ''}
                                                            {group.totalLBP > 0 ? ` LBP ${group.totalLBP.toLocaleString()}` : ''}
                                                        </td>
                                                        <td className="px-4 py-2.5 font-bold text-slate-600">
                                                            {group.totalUSD > 0 && group.totalLBP > 0 ? 'USD/LBP' : group.totalUSD > 0 ? 'USD' : 'LBP'}
                                                        </td>
                                                        <td className="px-4 py-2.5 font-bold text-slate-900">
                                                            <div className="flex items-center gap-2">
                                                                <span>{group.title}</span>
                                                                <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full group-hover:bg-slate-200 print:hidden">
                                                                    {group.count} {group.count === 1 ? 'entry' : 'entries'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                                                            {group.count === 1 ? group.items[0]?.ref : `${group.count} disbursements`}
                                                        </td>
                                                        <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                                                            {group.count === 1 ? group.items[0]?.date : statementMonthKey}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-slate-700 font-bold text-[11px] group-hover:underline print:hidden">
                                                            Click for breakdown →
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                        {monthlyStatementData.groupedOutflows.length > 0 && (
                                            <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                                                <tr>
                                                    <td className="px-4 py-2.5 font-black text-rose-700 text-sm">
                                                        ${monthlyStatementData.totalOutflowUSD.toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-slate-600">USD</td>
                                                    <td colSpan={4} className="px-4 py-2.5 text-slate-800 font-black">
                                                        مجموع المدفوعات لشهر {ARABIC_MONTH_NAMES[statementMonth]?.split(' ')[0]}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>

                            {/* ── SECTION 3: SUMMARY & BALANCES (رصيد منقول / حالي / نهائي) ── */}
                            <div className="border border-slate-300 rounded-2xl overflow-hidden bg-slate-50/50">
                                <table className="w-full text-right text-xs">
                                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left">العملة (LBP)</th>
                                            <th className="px-4 py-2.5 text-left">العملة (USD)</th>
                                            <th className="px-4 py-2.5 text-right">بيان الأرصدة (Summary Description)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 font-medium">
                                        <tr>
                                            <td className="px-4 py-2.5 text-left font-mono font-bold text-slate-700">
                                                LBP {monthlyStatementData.openingLBP.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-2.5 text-left font-mono font-bold text-slate-900">
                                                ${monthlyStatementData.openingUSD.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-2.5 font-bold text-slate-800">
                                                رصيد منقول من الشهر السابق (Opening Balance Carried Forward)
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-2.5 text-left font-mono font-bold text-slate-700">
                                                LBP {monthlyStatementData.netCurrentLBP.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-2.5 text-left font-mono font-bold text-emerald-700">
                                                ${monthlyStatementData.netCurrentUSD.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-2.5 font-bold text-slate-800">
                                                رصيد حالي للشهر (Current Month Net: Inflow - Outflow)
                                            </td>
                                        </tr>
                                        <tr className="bg-teal-50/60 font-black text-sm text-teal-950">
                                            <td className="px-4 py-3 text-left font-mono">
                                                LBP {monthlyStatementData.closingLBP.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-left font-mono text-base text-teal-900">
                                                ${monthlyStatementData.closingUSD.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 font-black text-slate-900">
                                                رصيد نهائي في الصندوق (Final Closing Vault Balance)
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* ── SECTION 4: SIGNATURES & APPROVALS (التواقيع والمصادقة) ── */}
                            <div className="pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-8 text-center text-xs">
                                {/* Chef de Groupe Signature / Approval */}
                                <div className="p-4 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-between min-h-[130px] bg-slate-50/50">
                                    <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                                        مصادقة قائد الفوج (Chef de Groupe Approval)
                                    </span>

                                    {isStatementOutdatedAfterApproval ? (
                                        <div className="my-2 p-2.5 bg-amber-50 rounded-xl border border-amber-300 text-amber-900 flex items-center gap-2">
                                            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                                            <div className="text-left">
                                                <span className="font-black text-xs block text-amber-950">إعادة المصادقة مطلوبة (Changes Detected)</span>
                                                <span className="text-[10px] text-amber-800">
                                                    تم تعديل قيود هذا الشهر بعد المصادقة السابقة
                                                </span>
                                            </div>
                                        </div>
                                    ) : currentStatementRecord?.status === 'approved' ? (
                                        <div className="my-2 p-2 bg-emerald-50 rounded-xl border border-emerald-300 text-emerald-800 flex items-center gap-2">
                                            <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                            <div className="text-left">
                                                <span className="font-black text-xs block">مصدّق ومعتمد (APPROVED)</span>
                                                <span className="text-[10px] text-slate-600">
                                                    {currentStatementRecord.approved_by_profile?.full_name || 'Chef de Groupe'} •{' '}
                                                    {currentStatementRecord.approved_at?.split('T')[0]}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-slate-400 text-[11px] italic my-auto">
                                            بانتظار مصادقة قائد الفوج (Pending Signature)
                                        </div>
                                    )}

                                    <span className="text-[10px] text-slate-400 font-bold border-t border-slate-200 pt-1 w-full">
                                        قائد الفوج (Chef de Groupe)
                                    </span>
                                </div>

                                {/* Group Treasurer Signature */}
                                <div className="p-4 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-between min-h-[130px] bg-slate-50/50">
                                    <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                                        إعداد أمين الصندوق (Prepared by Group Treasurer)
                                    </span>

                                    {currentStatementRecord?.submitted_at ? (
                                        <div className="my-2 text-slate-700">
                                            <span className="font-bold text-xs block">
                                                {currentStatementRecord.submitted_by_profile?.full_name || userName}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-mono">
                                                {currentStatementRecord.submitted_at.split('T')[0]}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="my-2 text-slate-600">
                                            <span className="font-bold text-xs block">{userName}</span>
                                            <span className="text-[10px] text-slate-400">أمين صندوق الفوج</span>
                                        </div>
                                    )}

                                    <span className="text-[10px] text-slate-400 font-bold border-t border-slate-200 pt-1 w-full">
                                        أمين صندوق الفوج (Group Treasurer)
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── TAB 3: ANNUAL MEMBERSHIP COTISATIONS (GROUP TREASURER ONLY) ─ */}
                {isGroupTreasurer && activeTab === 'annual_dues' && (() => {
                    return (
                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Annual Membership Cotisations (*Ishtirak Sanawi*)</h3>
                                    <p className="text-xs text-slate-500">
                                        Direct group revenue for scout insurance, headquarters utilities, and badges.
                                    </p>
                                </div>

                                <button
                                    onClick={() => setIsBulkAnnualModalOpen(true)}
                                    className="bg-teal-700 hover:bg-teal-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-2xs flex items-center justify-center gap-1.5 shrink-0"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>Setup Annual Fees for Scouts</span>
                                </button>
                            </div>

                            {/* ── MOBILE CARD LIST (SM & DOWN) ── */}
                            <div className="space-y-2.5 md:hidden">
                                {fees.length === 0 ? (
                                    <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 space-y-2">
                                        <Percent className="h-8 w-8 mx-auto opacity-30" />
                                        <p className="font-bold text-slate-600 text-xs">No annual cotisations setup yet.</p>
                                    </div>
                                ) : (
                                    fees.map((fee) => {
                                        const troop = troops.find((t) => t.id === fee.members?.troop_id)
                                        const balance = Math.max(0, fee.final_due - fee.paid_amount)
                                        const isPaid = fee.status === 'paid'
                                        const initials = `${fee.members?.first_name?.[0] || ''}${fee.members?.last_name?.[0] || ''}`.toUpperCase()

                                        return (
                                            <div
                                                key={fee.id}
                                                className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                                            isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                                        }`}>
                                                            {initials || <Users className="h-4 w-4" />}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-900 text-xs">
                                                                {fee.members?.first_name} {fee.members?.last_name}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400">
                                                                {troop?.name || 'General'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <span
                                                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border capitalize ${
                                                            isPaid
                                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                                : 'bg-rose-50 text-rose-800 border-rose-200'
                                                        }`}
                                                    >
                                                        {fee.status}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 rounded-xl text-center text-xs">
                                                    <div>
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Base Fee</span>
                                                        <span className="font-bold text-slate-700">${fee.base_fee}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Discount</span>
                                                        <span className="font-bold text-emerald-700">{fee.discount_amount > 0 ? `-$${fee.discount_amount}` : '—'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Paid / Due</span>
                                                        <span className="font-black text-slate-900">${fee.paid_amount} / ${fee.final_due}</span>
                                                    </div>
                                                </div>

                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedFeeForAnnual(fee)
                                                            setAnnualPayAmount(balance > 0 ? String(balance) : String(fee.final_due))
                                                            setIsAnnualPaymentModalOpen(true)
                                                        }}
                                                        className="w-full py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs shadow-2xs transition-colors"
                                                    >
                                                        {isPaid ? 'Edit / Add Payment' : `Record Payment ($${balance} Remaining)`}
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>

                            {/* ── DESKTOP TABLE (MD & UP) ── */}
                            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                                            <tr>
                                                <th className="px-4 py-3">Scout Name</th>
                                                <th className="px-4 py-3">Troop</th>
                                                <th className="px-4 py-3">Base Fee</th>
                                                <th className="px-4 py-3">Discount</th>
                                                <th className="px-4 py-3">Final Due</th>
                                                <th className="px-4 py-3">Paid Amount</th>
                                                <th className="px-4 py-3">Status</th>
                                                <th className="px-4 py-3 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {fees.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                                                        <Percent className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                                        <p className="font-bold text-slate-600">No annual cotisations setup yet.</p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                fees.map((fee) => {
                                                    const troop = troops.find((t) => t.id === fee.members?.troop_id)
                                                    const balance = Math.max(0, fee.final_due - fee.paid_amount)

                                                    return (
                                                        <tr key={fee.id} className="hover:bg-slate-50">
                                                            <td className="px-4 py-3 font-bold text-slate-900">
                                                                {fee.members?.first_name} {fee.members?.last_name}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-600">{troop?.name}</td>
                                                            <td className="px-4 py-3 text-slate-500">${fee.base_fee}</td>
                                                            <td className="px-4 py-3">
                                                                {fee.discount_amount > 0 ? (
                                                                    <span className="text-emerald-700 font-bold">-${fee.discount_amount}</span>
                                                                ) : (
                                                                    '—'
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 font-bold text-slate-900">${fee.final_due}</td>
                                                            <td className="px-4 py-3 font-bold text-emerald-700">${fee.paid_amount}</td>
                                                            <td className="px-4 py-3">
                                                                <span
                                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${fee.status === 'paid'
                                                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                                        : 'bg-rose-50 text-rose-800 border-rose-200'
                                                                        }`}
                                                                >
                                                                    {fee.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedFeeForAnnual(fee)
                                                                        setAnnualPayAmount(balance > 0 ? String(balance) : String(fee.final_due))
                                                                        setIsAnnualPaymentModalOpen(true)
                                                                    }}
                                                                    className="bg-teal-700 hover:bg-teal-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs"
                                                                >
                                                                    Record Payment
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    )
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )
                })()}

                {/* ── TAB 4: GROUP TREASURY LEDGER (GROUP TREASURER ONLY) ───────── */}
                {isGroupTreasurer && activeTab === 'treasury' && (() => {
                    const filteredTxs = transactions.filter((tx) => {
                        const isIncome = getTxType(tx) === 'income'
                        if (treasuryFilterType === 'income' && !isIncome) return false
                        if (treasuryFilterType === 'expense' && isIncome) return false
                        if (treasurySearch) {
                            const q = treasurySearch.toLowerCase()
                            const desc = (tx.description || '').toLowerCase()
                            const cat = (tx.category || '').toLowerCase()
                            const leader = (getLeaderName(getTxRecorder(tx)) || '').toLowerCase()
                            if (!desc.includes(q) && !cat.includes(q) && !leader.includes(q)) return false
                        }
                        return true
                    })

                    const totalFilteredIncome = filteredTxs
                        .filter((tx) => getTxType(tx) === 'income')
                        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)

                    const totalFilteredExpense = filteredTxs
                        .filter((tx) => getTxType(tx) === 'expense')
                        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)

                    return (
                        <div className="space-y-4">
                            {/* Header & Record Button */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Group Treasury Cashbook (*Sandou2 El Majlis*)</h3>
                                    <p className="text-xs text-slate-500">General ledger tracking central group income and expenses.</p>
                                </div>

                                <button
                                    onClick={() => setIsTxModalOpen(true)}
                                    className="bg-teal-700 hover:bg-teal-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-2xs flex items-center justify-center gap-1.5 shrink-0"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>Record Transaction</span>
                                </button>
                            </div>

                            {/* Search & Filter Controls */}
                            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                    {/* Search Input */}
                                    <div className="relative w-full sm:max-w-xs">
                                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search ledger description or category…"
                                            value={treasurySearch}
                                            onChange={(e) => setTreasurySearch(e.target.value)}
                                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-medium"
                                        />
                                    </div>

                                    {/* Type Filter Chips */}
                                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                                        <button
                                            onClick={() => setTreasuryFilterType('all')}
                                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                                                treasuryFilterType === 'all'
                                                    ? 'bg-slate-800 text-white shadow-xs'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            All ({transactions.length})
                                        </button>
                                        <button
                                            onClick={() => setTreasuryFilterType('income')}
                                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                                                treasuryFilterType === 'income'
                                                    ? 'bg-emerald-600 text-white shadow-xs'
                                                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                                            }`}
                                        >
                                            <ArrowDownRight className="h-3 w-3" />
                                            <span>Income (${totalFilteredIncome.toLocaleString()})</span>
                                        </button>
                                        <button
                                            onClick={() => setTreasuryFilterType('expense')}
                                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                                                treasuryFilterType === 'expense'
                                                    ? 'bg-rose-600 text-white shadow-xs'
                                                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                                            }`}
                                        >
                                            <ArrowUpRight className="h-3 w-3" />
                                            <span>Expenses (${totalFilteredExpense.toLocaleString()})</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* ── MOBILE CARD LIST (SM & DOWN) ── */}
                            <div className="space-y-2.5 md:hidden">
                                {filteredTxs.length === 0 ? (
                                    <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 space-y-2">
                                        <Receipt className="h-8 w-8 mx-auto opacity-30" />
                                        <p className="font-bold text-slate-600 text-xs">No transactions match your search or filter.</p>
                                    </div>
                                ) : (
                                    filteredTxs.map((tx) => {
                                        const catMeta = getCategoryMeta(tx.category)
                                        const isIncome = getTxType(tx) === 'income'

                                        return (
                                            <div
                                                key={tx.id}
                                                className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2"
                                            >
                                                {/* Top row: Category badge, Date, and Amount */}
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                                                            isIncome ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                                        }`}>
                                                            {isIncome ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${catMeta.color}`}>
                                                            {catMeta.label}
                                                        </span>
                                                    </div>
                                                    <div className={`font-mono font-black text-sm ${isIncome ? 'text-emerald-700' : 'text-rose-600'}`}>
                                                        {isIncome ? '+' : '-'}${Number(tx.amount).toLocaleString()}
                                                    </div>
                                                </div>

                                                {/* Middle: Description */}
                                                <div className="font-bold text-slate-900 text-xs leading-snug">
                                                    {tx.description}
                                                </div>

                                                {/* Bottom row: Sub-info */}
                                                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                                                    <span className="font-mono">{getTxDate(tx)}</span>
                                                    <span>By: {getLeaderName(getTxRecorder(tx)) || 'Leader'}</span>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>

                            {/* ── DESKTOP TABLE (MD & UP) ── */}
                            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                                            <tr>
                                                <th className="px-4 py-3">Date</th>
                                                <th className="px-4 py-3">Type</th>
                                                <th className="px-4 py-3">Category</th>
                                                <th className="px-4 py-3">Description</th>
                                                <th className="px-4 py-3">Recorded By</th>
                                                <th className="px-4 py-3 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {filteredTxs.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                                                        <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                                        <p className="font-bold text-slate-600">No transactions match your search.</p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredTxs.map((tx) => {
                                                    const catMeta = getCategoryMeta(tx.category)
                                                    const isIncome = getTxType(tx) === 'income'

                                                    return (
                                                        <tr key={tx.id} className="hover:bg-slate-50">
                                                            <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">{getTxDate(tx)}</td>
                                                            <td className="px-4 py-3">
                                                                <span
                                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${isIncome
                                                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                                        : 'bg-rose-50 text-rose-800 border-rose-200'
                                                                        }`}
                                                                >
                                                                    {isIncome ? '+' : '-'} {isIncome ? 'Income' : 'Expense'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${catMeta.color}`}>
                                                                    {catMeta.label}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-900 font-medium">{tx.description}</td>
                                                            <td className="px-4 py-3 text-slate-500">{getLeaderName(getTxRecorder(tx)) || 'Leader'}</td>
                                                            <td className={`px-4 py-3 text-right font-black text-sm ${isIncome ? 'text-emerald-700' : 'text-rose-600'}`}>
                                                                {isIncome ? '+' : '-'}${Number(tx.amount).toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    )
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )
                })()}

                {/* ── MODAL: QUICK MONTHLY MATRIX PAYMENT ───────────────────────── */}
                {quickPayCell && (
                    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95">
                            <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto -mt-1 mb-2 sm:hidden shrink-0" />
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Log Monthly Dues</h3>
                                    <p className="text-xs text-slate-500">{quickPayCell.member.first_name} {quickPayCell.member.last_name}</p>
                                </div>
                                <button onClick={() => setQuickPayCell(null)} className="text-slate-400 hover:text-slate-600">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-3 gap-2 text-center text-xs">
                                <div>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Month</span>
                                    <span className="font-bold text-slate-900">{quickPayCell.monthLabel}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Paid So Far</span>
                                    <span className="font-bold text-emerald-700">${quickPayCell.currentPaid}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Target</span>
                                    <span className="font-bold text-slate-900">${quickPayCell.target}</span>
                                </div>
                            </div>

                            <form onSubmit={handleSaveQuickPayment} className="space-y-4 text-xs">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                                        Add Payment Amount ($)
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0.5"
                                        step="0.5"
                                        value={quickPayAmount}
                                        onChange={(e) => setQuickPayAmount(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 focus:border-teal-600 focus:outline-none"
                                    />
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            type="button"
                                            onClick={() => setQuickPayAmount('1')}
                                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 font-bold rounded-lg text-[10px]"
                                        >
                                            +$1 (Weekly)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setQuickPayAmount('2')}
                                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 font-bold rounded-lg text-[10px]"
                                        >
                                            +$2
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setQuickPayAmount(String(Math.max(1, quickPayCell.target - quickPayCell.currentPaid)))}
                                            className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold rounded-lg text-[10px]"
                                        >
                                            Full Month
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                                        Notes / Reference (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={quickPayNotes}
                                        onChange={(e) => setQuickPayNotes(e.target.value)}
                                        placeholder="e.g. Week 2 meeting cash"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:border-teal-600 focus:outline-none"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setQuickPayCell(null)}
                                        className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isProcessingQuickPay}
                                        className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold shadow-sm disabled:opacity-50"
                                    >
                                        {isProcessingQuickPay ? 'Saving…' : 'Save Payment'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ── MODAL: CONFIGURE MONTHLY TARGET ────────────────────────────── */}
                {isConfigTargetOpen && (
                    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95">
                            <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto -mt-1 mb-2 sm:hidden shrink-0" />
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <h3 className="text-sm font-bold text-slate-900">Set Monthly Dues Target</h3>
                                <button onClick={() => setIsConfigTargetOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveMonthlyTarget} className="space-y-4 text-xs">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                                        Target per Member per Month ($ USD)
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={newMonthlyTarget}
                                        onChange={(e) => setNewMonthlyTarget(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 focus:border-teal-600 focus:outline-none"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Every member in this troop will have this target amount assigned each month for {selectedYearNum}.
                                    </p>
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsConfigTargetOpen(false)}
                                        className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSavingTarget}
                                        className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold"
                                    >
                                        {isSavingTarget ? 'Saving…' : 'Update Target'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ── MODAL: SUBMIT HANDOVER ─────────────────────────────────────── */}
                {isHandoverModalOpen && (
                    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95">
                            <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto -mt-1 mb-2 sm:hidden shrink-0" />
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Handover Cash to Treasurer</h3>
                                    <p className="text-xs text-slate-500">Submit collected monthly dues to the Group Vault</p>
                                </div>
                                <button onClick={() => setIsHandoverModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmitHandover} className="space-y-4 text-xs">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                                        Month
                                    </label>
                                    <input
                                        type="month"
                                        required
                                        value={handoverMonth}
                                        onChange={(e) => setHandoverMonth(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-900 focus:border-teal-600 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                                        Amount Collected ($)
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={handoverAmount}
                                        onChange={(e) => setHandoverAmount(e.target.value)}
                                        placeholder="e.g. 150"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 focus:border-teal-600 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                                        Notes
                                    </label>
                                    <input
                                        type="text"
                                        value={handoverNotes}
                                        onChange={(e) => setHandoverNotes(e.target.value)}
                                        placeholder="e.g. October monthly collection full batch"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:border-teal-600 focus:outline-none"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsHandoverModalOpen(false)}
                                        className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingHandover}
                                        className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold"
                                    >
                                        {isSubmittingHandover ? 'Submitting…' : 'Submit Handover'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ── MODAL: REQUEST DISBURSEMENT ────────────────────────────────── */}
                {isDisbursementModalOpen && (
                    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95">
                            <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto -mt-1 mb-2 sm:hidden shrink-0" />
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <h3 className="text-sm font-bold text-slate-900">Request Troop Funds</h3>
                                <button onClick={() => setIsDisbursementModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmitDisbursement} className="space-y-4 text-xs">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                                        Requested Amount ($)
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={disbursementAmount}
                                        onChange={(e) => setDisbursementAmount(e.target.value)}
                                        placeholder="e.g. 40"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 focus:border-teal-600 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                                        Purpose of Expense
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={disbursementPurpose}
                                        onChange={(e) => setDisbursementPurpose(e.target.value)}
                                        placeholder="e.g. Craft ropes and meeting snacks"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:border-teal-600 focus:outline-none"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsDisbursementModalOpen(false)}
                                        className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingDisbursement}
                                        className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold"
                                    >
                                        {isSubmittingDisbursement ? 'Submitting…' : 'Submit Request'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ── MODAL: RECORD ANNUAL COTISATION PAYMENT (GROUP TREASURER ONLY) */}
                {isAnnualPaymentModalOpen && selectedFeeForAnnual && (
                    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95">
                            <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto -mt-1 mb-2 sm:hidden shrink-0" />
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Record Annual Cotisation</h3>
                                    <p className="text-xs text-slate-500">{selectedFeeForAnnual.members?.first_name} {selectedFeeForAnnual.members?.last_name}</p>
                                </div>
                                <button onClick={() => setIsAnnualPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <form onSubmit={handleRecordAnnualPayment} className="space-y-4 text-xs">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                                        Amount ($)
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={annualPayAmount}
                                        onChange={(e) => setAnnualPayAmount(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 focus:border-teal-600 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                                        Payment Method
                                    </label>
                                    <select
                                        value={annualPayMethod}
                                        onChange={(e) => setAnnualPayMethod(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-900 focus:border-teal-600 focus:outline-none"
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="whish_omt">Whish / OMT</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                                        Receipt # (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={annualPayReceiptNo}
                                        onChange={(e) => setAnnualPayReceiptNo(e.target.value)}
                                        placeholder="REC-2026-01"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:border-teal-600 focus:outline-none"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsAnnualPaymentModalOpen(false)}
                                        className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isProcessingAnnualPay}
                                        className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold"
                                    >
                                        {isProcessingAnnualPay ? 'Saving…' : 'Record Payment'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ── MODAL: SETUP ANNUAL DUES BULK (GROUP TREASURER ONLY) ──────── */}
                {isBulkAnnualModalOpen && (
                    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95">
                            <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto -mt-1 mb-2 sm:hidden shrink-0" />
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <h3 className="text-sm font-bold text-slate-900">Setup Annual Fees for Scouts</h3>
                                <button onClick={() => setIsBulkAnnualModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <form onSubmit={handleBulkGenerateAnnualDues} className="space-y-4 text-xs">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                                        Standard Base Fee ($ USD)
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={bulkAnnualFee}
                                        onChange={(e) => setBulkAnnualFee(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 focus:border-teal-600 focus:outline-none"
                                    />
                                    <p className="text-[11px] text-teal-800 mt-2 bg-teal-50 p-2 rounded-lg border border-teal-200">
                                        💡 Automatically calculates sibling discounts: <strong>1st child (100%)</strong>, <strong>2nd child (20% off)</strong>, <strong>3rd+ child (50% off)</strong>.
                                    </p>
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsBulkAnnualModalOpen(false)}
                                        className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isProcessingBulkAnnual}
                                        className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold"
                                    >
                                        {isProcessingBulkAnnual ? 'Processing…' : 'Generate Annual Fees'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ── MODAL: RECORD GENERAL TREASURY TRANSACTION (GROUP TREASURER ONLY) */}
                {isTxModalOpen && (
                    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95">
                            <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto -mt-1 mb-2 sm:hidden shrink-0" />
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <h3 className="text-sm font-bold text-slate-900">Record Treasury Transaction</h3>
                                <button onClick={() => setIsTxModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <form onSubmit={handleRecordGeneralTx} className="space-y-4 text-xs">
                                {/* Income / Expense Type Toggle */}
                                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => handleTxTypeChange('income')}
                                        className={`py-1.5 rounded-lg font-bold transition-all ${txType === 'income' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                    >
                                        + Income (دخل)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleTxTypeChange('expense')}
                                        className={`py-1.5 rounded-lg font-bold transition-all ${txType === 'expense' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                    >
                                        - Expense (خرج)
                                    </button>
                                </div>

                                {/* Category Selection Dropdown & Quick Badges */}
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                                        Category (الفئة)
                                    </label>
                                    <select
                                        value={txCategory}
                                        onChange={(e) => handleTxCategoryChange(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white focus:border-teal-600 focus:outline-none"
                                    >
                                        {(txType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.label}
                                            </option>
                                        ))}
                                    </select>

                                    {/* Quick Select Category Chips */}
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {(txType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => handleTxCategoryChange(cat.id)}
                                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors ${txCategory === cat.id
                                                    ? 'bg-teal-700 text-white border-teal-800'
                                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                            >
                                                {cat.label.split(' / ')[0]}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Custom Category Input if "Other" is selected */}
                                {txCategory === 'other' && (
                                    <div className="p-3 bg-amber-50/70 border border-amber-300 rounded-xl space-y-1 animate-in fade-in slide-in-from-top-1">
                                        <label className="block font-bold text-amber-900 uppercase tracking-wider text-[10px]">
                                            Custom Category Name (اسم الفئة المخصصة) *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={customTxCategory}
                                            onChange={(e) => setCustomTxCategory(e.target.value)}
                                            placeholder="e.g. Printing, Sound System, Medals..."
                                            className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white text-slate-900 font-bold focus:border-amber-500 focus:outline-none text-xs"
                                        />
                                    </div>
                                )}

                                {/* Amount */}
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                                        Amount ($ USD)
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0.01"
                                        step="any"
                                        value={txAmount}
                                        onChange={(e) => setTxAmount(e.target.value)}
                                        placeholder="e.g. 50"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 focus:border-teal-600 focus:outline-none"
                                    />
                                </div>

                                {/* Description (Auto-populated based on category, fully editable) */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                                            Description / البيان
                                        </label>
                                        <span className="text-[10px] text-teal-700 font-medium">Auto-filled from category</span>
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={txDescription}
                                        onChange={(e) => setTxDescription(e.target.value)}
                                        placeholder="Enter transaction details..."
                                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:border-teal-600 focus:outline-none"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsTxModalOpen(false)}
                                        className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isProcessingTx}
                                        className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold transition-colors shadow-2xs"
                                    >
                                        {isProcessingTx ? 'Saving…' : 'Record Transaction'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ── MODAL: TROOP DETAILS & FINANCIAL AUDIT (GROUP TREASURER DEEP DIVE) ── */}
                {selectedTroopForDetails && (
                    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 overflow-hidden">
                            <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mt-2 sm:hidden shrink-0" />
                            {/* Modal Header */}
                            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 sm:p-2.5 rounded-2xl bg-teal-100/80 text-teal-800 shrink-0">
                                        <Layers className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-base sm:text-lg font-black text-slate-900">{selectedTroopForDetails.name}</h3>
                                            <span className="bg-teal-50 text-teal-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-teal-200">
                                                Target: ${getTroopMonthlyTarget(selectedTroopForDetails.id)}/mo
                                            </span>
                                        </div>
                                        <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                                            Detailed Financial Audit & Scout Dues Breakdown ({selectedYearNum})
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setSelectedTroopForDetails(null)}
                                    className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Troop Summary Metrics Bar */}
                            {(() => {
                                const vault = troopVaults.find((tv) => tv.troop.id === selectedTroopForDetails.id)
                                return (
                                    <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs">
                                        <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase block">Available Balance</span>
                                            <span className="text-sm sm:text-base font-black text-teal-800">${vault?.availableBalance || 0}</span>
                                        </div>
                                        <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase block">Collected in {selectedYearNum}</span>
                                            <span className="text-sm sm:text-base font-black text-emerald-600">${vault?.collectedFromScouts || 0}</span>
                                        </div>
                                        <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase block">Handed Over</span>
                                            <span className="text-sm sm:text-base font-black text-slate-900">${vault?.confirmedHandovers || 0}</span>
                                        </div>
                                        <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase block">Pending Cash</span>
                                            <span className="text-sm sm:text-base font-black text-amber-600">${vault?.cashInTroopHand || 0}</span>
                                        </div>
                                    </div>
                                )
                            })()}

                            {/* Sub-Tabs */}
                            <div className="px-4 sm:px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white overflow-x-auto">
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <button
                                        onClick={() => setTroopDetailsSubTab('scouts')}
                                        className={`py-2.5 sm:py-3 px-2 sm:px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${troopDetailsSubTab === 'scouts'
                                            ? 'border-teal-700 text-teal-800'
                                            : 'border-transparent text-slate-500 hover:text-slate-900'
                                            }`}
                                    >
                                        <Users className="h-3.5 w-3.5" />
                                        <span>Who's Paying</span>
                                    </button>
                                    <button
                                        onClick={() => setTroopDetailsSubTab('transactions')}
                                        className={`py-2.5 sm:py-3 px-2 sm:px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${troopDetailsSubTab === 'transactions'
                                            ? 'border-teal-700 text-teal-800'
                                            : 'border-transparent text-slate-500 hover:text-slate-900'
                                            }`}
                                    >
                                        <Receipt className="h-3.5 w-3.5" />
                                        <span>All Transactions</span>
                                    </button>
                                </div>

                                {troopDetailsSubTab === 'scouts' && (
                                    <div className="relative w-full sm:w-auto min-w-[160px] pb-2 sm:pb-0">
                                        <Search className="absolute left-2.5 top-2 h-3 w-3 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search scout…"
                                            value={detailsScoutSearch}
                                            onChange={(e) => setDetailsScoutSearch(e.target.value)}
                                            className="w-full pl-7 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Modal Body */}
                            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
                                {/* SUBTAB 1: SCOUTS BREAKDOWN */}
                                {troopDetailsSubTab === 'scouts' && (() => {
                                    const troopScouts = members
                                        .filter((m) => m.troop_id === selectedTroopForDetails.id)
                                        .filter((m) => {
                                            if (!detailsScoutSearch) return true
                                            const q = detailsScoutSearch.toLowerCase()
                                            return `${m.first_name} ${m.last_name}`.toLowerCase().includes(q)
                                        })

                                    const targetPerMonth = getTroopMonthlyTarget(selectedTroopForDetails.id)

                                    return (
                                        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-xs min-w-[480px]">
                                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                                                        <tr>
                                                            <th className="px-4 py-3">Scout Name</th>
                                                            <th className="px-4 py-3">Months Paid</th>
                                                            <th className="px-4 py-3">Total Paid</th>
                                                            <th className="px-4 py-3">Status</th>
                                                            <th className="px-4 py-3 text-right">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 font-medium">
                                                        {troopScouts.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                                                                    No scouts found for this filter.
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            troopScouts.map((scout) => {
                                                                let totalPaid = 0
                                                                let paidMonthsCount = 0

                                                                MONTHS_ORDER.forEach((m) => {
                                                                    const due = getDueCell(scout.id, `${selectedYearNum}-${m.key}`)
                                                                    const p = Number(due?.paid_amount || 0)
                                                                    totalPaid += p
                                                                    if (p >= targetPerMonth) paidMonthsCount += 1
                                                                })

                                                                const isFullyPaidYear = paidMonthsCount >= 12
                                                                const isPartiallyPaid = totalPaid > 0

                                                                return (
                                                                    <tr key={scout.id} className="hover:bg-slate-50">
                                                                        <td className="px-4 py-3">
                                                                            <span className="font-bold text-slate-900 block">{scout.first_name} {scout.last_name}</span>
                                                                            {scout.current_rank && <span className="text-[10px] text-slate-400">{scout.current_rank}</span>}
                                                                        </td>
                                                                        <td className="px-4 py-3">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="font-bold text-slate-700">{paidMonthsCount} / 12 months</span>
                                                                                <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                                                    <div
                                                                                        className="bg-teal-600 h-full rounded-full"
                                                                                        style={{ width: `${Math.round((paidMonthsCount / 12) * 100)}%` }}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 py-3 font-black text-emerald-700">${totalPaid}</td>
                                                                        <td className="px-4 py-3">
                                                                            <span
                                                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${isFullyPaidYear
                                                                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                                                    : isPartiallyPaid
                                                                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                                                                        : 'bg-rose-50 text-rose-800 border-rose-200'
                                                                                    }`}
                                                                            >
                                                                                {isFullyPaidYear ? 'Fully Paid' : isPartiallyPaid ? 'Partially Paid' : 'Unpaid'}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right">
                                                                            <button
                                                                                onClick={() => {
                                                                                    setSelectedTroopId(selectedTroopForDetails.id)
                                                                                    setActiveTab('monthly_dues')
                                                                                    setSelectedTroopForDetails(null)
                                                                                }}
                                                                                className="text-teal-700 font-bold hover:underline text-[11px] inline-flex items-center gap-1"
                                                                            >
                                                                                <span>Open</span>
                                                                                <ArrowRight className="h-3 w-3" />
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                )
                                                            })
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )
                                })()}

                                {/* SUBTAB 2: ALL TRANSACTIONS AUDIT TRAIL */}
                                {troopDetailsSubTab === 'transactions' && (() => {
                                    const troopHandovers = handovers.filter((h) => h.troop_id === selectedTroopForDetails.id)
                                    const troopDisbs = disbursements.filter((d) => d.troop_id === selectedTroopForDetails.id)
                                    const troopTxs = transactions.filter((t) => t.troop_id === selectedTroopForDetails.id)

                                    const combinedList: Array<{
                                        id: string
                                        date: string
                                        type: 'handover' | 'disbursement' | 'treasury'
                                        title: string
                                        amount: number
                                        isIncome: boolean
                                        status: string
                                        leaderName: string
                                    }> = [
                                            ...troopHandovers.map((h) => ({
                                                id: h.id,
                                                date: h.handover_date,
                                                type: 'handover' as const,
                                                title: `Handover for Month ${h.month_key}`,
                                                amount: h.amount,
                                                isIncome: true,
                                                status: h.status,
                                                leaderName: h.handed_over?.full_name || 'Leader',
                                            })),
                                            ...troopDisbs.map((d) => ({
                                                id: d.id,
                                                date: d.request_date,
                                                type: 'disbursement' as const,
                                                title: `Disbursement: ${d.purpose}`,
                                                amount: d.amount,
                                                isIncome: false,
                                                status: d.status,
                                                leaderName: d.requested_by_leader?.full_name || 'Leader',
                                            })),
                                            ...troopTxs.map((t) => ({
                                                id: t.id,
                                                date: getTxDate(t),
                                                type: 'treasury' as const,
                                                title: t.description,
                                                amount: t.amount,
                                                isIncome: getTxType(t) === 'income',
                                                status: 'confirmed',
                                                leaderName: getLeaderName(getTxRecorder(t)) || 'Leader',
                                            })),
                                        ]

                                    combinedList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

                                    return (
                                        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-xs min-w-[500px]">
                                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                                                        <tr>
                                                            <th className="px-4 py-3">Date</th>
                                                            <th className="px-4 py-3">Type</th>
                                                            <th className="px-4 py-3">Description</th>
                                                            <th className="px-4 py-3">Recorded By</th>
                                                            <th className="px-4 py-3">Status</th>
                                                            <th className="px-4 py-3 text-right">Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 font-medium">
                                                        {combinedList.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                                                                    No transactions or handovers recorded yet for {selectedTroopForDetails.name}.
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            combinedList.map((item) => (
                                                                <tr key={item.id} className="hover:bg-slate-50">
                                                                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">{item.date}</td>
                                                                    <td className="px-4 py-3">
                                                                        <span
                                                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${item.type === 'handover'
                                                                                ? 'bg-teal-50 text-teal-800 border-teal-200'
                                                                                : item.type === 'disbursement'
                                                                                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                                                                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                                                                }`}
                                                                        >
                                                                            {item.type}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-slate-900 font-medium">{item.title}</td>
                                                                    <td className="px-4 py-3 text-slate-600">{item.leaderName}</td>
                                                                    <td className="px-4 py-3">
                                                                        <span
                                                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${item.status === 'confirmed' || item.status === 'approved'
                                                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                                                : item.status === 'rejected'
                                                                                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                                                                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                                                                }`}
                                                                        >
                                                                            {item.status}
                                                                        </span>
                                                                    </td>
                                                                    <td
                                                                        className={`px-4 py-3 text-right font-black text-sm ${item.isIncome ? 'text-emerald-700' : 'text-rose-600'
                                                                            }`}
                                                                    >
                                                                        {item.isIncome ? '+' : '-'}${item.amount}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )
                                })()}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
                                <button
                                    onClick={() => setSelectedTroopForDetails(null)}
                                    className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 font-bold text-slate-700 text-xs transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── MODAL: STATEMENT LINE ITEM BREAKDOWN DRILL-DOWN ── */}
                {selectedStatementGroup && (
                    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 overflow-hidden">
                            <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mt-2 sm:hidden shrink-0" />
                            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <div>
                                    <h3 className="text-sm sm:text-base font-black text-slate-900">{selectedStatementGroup.title}</h3>
                                    <p className="text-[11px] sm:text-xs text-slate-500">
                                        Breakdown of {selectedStatementGroup.count} transaction(s) for {statementMonthKey}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedStatementGroup(null)}
                                    className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse min-w-[480px]">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                                            <tr>
                                                <th className="px-3 py-2">Date</th>
                                                <th className="px-3 py-2">Description / Person</th>
                                                <th className="px-3 py-2">Ref #</th>
                                                <th className="px-3 py-2">Recorded By</th>
                                                <th className="px-3 py-2 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {selectedStatementGroup.items.map((item) => (
                                                <tr key={item.id} className="hover:bg-slate-50">
                                                    <td className="px-3 py-2.5 text-slate-500 font-mono text-[11px]">{item.date}</td>
                                                    <td className="px-3 py-2.5 font-bold text-slate-900">
                                                        {item.description}
                                                        {item.notes && <span className="block text-[10px] text-slate-400 font-normal">{item.notes}</span>}
                                                    </td>
                                                    <td className="px-3 py-2.5 font-mono text-slate-500 text-[11px]">{item.ref}</td>
                                                    <td className="px-3 py-2.5 text-slate-600 text-[11px]">{item.recordedBy || 'Leader'}</td>
                                                    <td className="px-3 py-2.5 text-right font-black text-emerald-700">
                                                        ${item.amount} {item.currency !== 'USD' ? item.currency : ''}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                                            <tr>
                                                <td colSpan={4} className="px-3 py-2 text-slate-900 font-black">
                                                    Total for {selectedStatementGroup.titleArabic}:
                                                </td>
                                                <td className="px-3 py-2 text-right font-black text-emerald-700 text-sm">
                                                    ${selectedStatementGroup.totalUSD}
                                                    {selectedStatementGroup.totalLBP > 0 ? ` + LBP ${selectedStatementGroup.totalLBP.toLocaleString()}` : ''}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
                                <button
                                    onClick={() => setSelectedStatementGroup(null)}
                                    className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 font-bold text-slate-700 text-xs transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Global Print Styles to print only the statement card */}
                <style jsx global>{`
          @media print {
            body {
              background: white !important;
              color: black !important;
            }
            body * {
              visibility: hidden;
            }
            #printable-statement-card, #printable-statement-card * {
              visibility: visible;
            }
            #printable-statement-card {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 10px !important;
              border: none !important;
              box-shadow: none !important;
            }
          }
        `}</style>
            </div>
        </DashboardShell>
    )
}
