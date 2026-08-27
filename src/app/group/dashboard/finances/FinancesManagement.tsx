'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  Menu, X, Wallet, DollarSign, ArrowUpRight, ArrowDownRight, Users,
  CheckCircle2, AlertCircle, Clock, Search, Filter, Plus, FileSpreadsheet,
  Receipt, ArrowRight, ShieldCheck, Download, Trash2, Calendar, Edit3,
  Layers, Percent, Tag, CreditCard, ChevronRight, HelpCircle
} from 'lucide-react'
import DashboardShell from '../DashboardShell'
import DashboardSidebar from '../DashboardSidebar'

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
  created_at?: string
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
  created_at?: string
  members?: Member
  membership_payments?: MembershipPayment[]
}

interface TreasuryTransaction {
  id: string
  group_id: string
  troop_id?: string
  transaction_type: 'income' | 'expense' | string
  category: string
  amount: number
  currency: string
  transaction_date: string
  description: string
  recorded_by?: string
  receipt_url?: string
  created_at?: string
  troops?: {
    id: string
    name: string
  }
  profiles?: {
    id: string
    full_name: string
  }
}

interface Props {
  initialFees: MembershipFee[]
  initialTransactions: TreasuryTransaction[]
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

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  membership_dues: { label: 'Membership Dues', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  donation: { label: 'Donation / Sponsor', color: 'bg-teal-50 text-teal-800 border-teal-200' },
  fundraising: { label: 'Fundraising Event', color: 'bg-blue-50 text-blue-800 border-blue-200' },
  equipment: { label: 'Tents & Gear', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  uniforms_badges: { label: 'Uniforms & Badges', color: 'bg-purple-50 text-purple-800 border-purple-200' },
  hq_utilities: { label: 'HQ & Utilities', color: 'bg-orange-50 text-orange-800 border-orange-200' },
  event_transfer: { label: 'Event Transfer', color: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
  misc: { label: 'Miscellaneous', color: 'bg-slate-100 text-slate-700 border-slate-200' },
}

export default function FinancesManagement({
  initialFees,
  initialTransactions,
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
  const [transactions, setTransactions] = useState<TreasuryTransaction[]>(initialTransactions)
  const [activeTab, setActiveTab] = useState<'dues' | 'treasury' | 'analytics'>('dues')
  const [selectedYear, setSelectedYear] = useState('2025-2026')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Status Notification
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type })
    setTimeout(() => setStatusMessage(null), 4000)
  }

  // Permissions
  const isGroupTreasurer = [
    'chef_groupe',
    'assistant_chef_groupe',
    'amin_sandou2_group',
    'amin_serr_group',
    'configurator',
  ].includes(currentRole)

  // Dues Filters
  const [searchScout, setSearchScout] = useState('')
  const [filterTroop, setFilterTroop] = useState<string>(userTroopId || 'all')
  const [filterStatus, setFilterStatus] = useState('all')

  // Modals State
  const [isBulkDuesModalOpen, setIsBulkDuesModalOpen] = useState(false)
  const [bulkYear, setBulkYear] = useState('2025-2026')
  const [bulkBaseFee, setBulkBaseFee] = useState('50')
  const [autoSiblingDiscount, setAutoSiblingDiscount] = useState(true)
  const [isProcessingBulk, setIsProcessingBulk] = useState(false)

  // Record Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedFeeForPayment, setSelectedFeeForPayment] = useState<MembershipFee | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentCurrency, setPaymentCurrency] = useState('USD')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentReceiptNo, setPaymentReceiptNo] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [syncToTreasury, setSyncToTreasury] = useState(true)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // View Payments History Drawer
  const [selectedFeeForHistory, setSelectedFeeForHistory] = useState<MembershipFee | null>(null)

  // Record Treasury Transaction Modal
  const [isTxModalOpen, setIsTxModalOpen] = useState(false)
  const [txType, setTxType] = useState<'income' | 'expense'>('income')
  const [txCategory, setTxCategory] = useState('membership_dues')
  const [txAmount, setTxAmount] = useState('')
  const [txCurrency, setTxCurrency] = useState('USD')
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0])
  const [txDescription, setTxDescription] = useState('')
  const [txTroopId, setTxTroopId] = useState('')
  const [txReceiptUrl, setTxReceiptUrl] = useState('')
  const [isProcessingTx, setIsProcessingTx] = useState(false)

  // ── Logout ─────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ── Sibling Count Helper ───────────────────────────────────────────────
  const getSiblingCount = (memberId: string) => {
    return siblingMap[memberId]?.length || 0
  }

  // ── Filtered Dues Roster ───────────────────────────────────────────────
  const filteredFees = useMemo(() => {
    return fees.filter((fee) => {
      if (selectedYear !== 'all' && fee.scout_year !== selectedYear) return false
      if (filterTroop !== 'all' && fee.members?.troop_id !== filterTroop) return false
      if (filterStatus !== 'all' && fee.status !== filterStatus) return false
      if (searchScout) {
        const query = searchScout.toLowerCase()
        const fullName = `${fee.members?.first_name || ''} ${fee.members?.last_name || ''}`.toLowerCase()
        if (!fullName.includes(query)) return false
      }
      return true
    })
  }, [fees, selectedYear, filterTroop, filterStatus, searchScout])

  // ── Financial KPI Computations ──────────────────────────────────────────
  const kpis = useMemo(() => {
    // Active year dues
    const activeYearFees = fees.filter((f) => selectedYear === 'all' || f.scout_year === selectedYear)
    const totalDuesGenerated = activeYearFees.reduce((sum, f) => sum + Number(f.final_due || 0), 0)
    const totalDuesCollected = activeYearFees.reduce((sum, f) => sum + Number(f.paid_amount || 0), 0)
    const totalDuesOutstanding = Math.max(0, totalDuesGenerated - totalDuesCollected)
    const collectionRate = totalDuesGenerated > 0 ? Math.round((totalDuesCollected / totalDuesGenerated) * 100) : 0

    // Treasury Ledger totals (USD only or normalized)
    const totalIncome = transactions
      .filter((t) => t.transaction_type === 'income')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0)

    const totalExpense = transactions
      .filter((t) => t.transaction_type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0)

    const netCashBalance = totalIncome - totalExpense

    return {
      totalDuesGenerated,
      totalDuesCollected,
      totalDuesOutstanding,
      collectionRate,
      totalIncome,
      totalExpense,
      netCashBalance,
      paidScoutsCount: activeYearFees.filter((f) => f.status === 'paid').length,
      totalScoutsWithDues: activeYearFees.length,
    }
  }, [fees, transactions, selectedYear])

  // ── Bulk Generate Dues Action ─────────────────────────────────────────
  const handleBulkGenerateDues = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessingBulk(true)
    const base = parseFloat(bulkBaseFee) || 0
    if (base <= 0) {
      setIsProcessingBulk(false)
      return showStatus('Please enter a valid base fee amount.', 'error')
    }

    try {
      // Find members who do not have a fee record for bulkYear yet
      const existingMemberIds = new Set(
        fees.filter((f) => f.scout_year === bulkYear).map((f) => f.member_id)
      )
      const membersToCreate = members.filter((m) => !existingMemberIds.has(m.id))

      if (membersToCreate.length === 0) {
        setIsProcessingBulk(false)
        setIsBulkDuesModalOpen(false)
        return showStatus(`All active scouts already have dues setup for ${bulkYear}!`, 'success')
      }

      // Group siblings to calculate discounts (1st child: 0% off, 2nd child: 20% off, 3rd+: 50% off)
      const processedFamilies = new Set<string>()
      const rowsToInsert = membersToCreate.map((m) => {
        let discount = 0
        let discountReason = ''

        if (autoSiblingDiscount) {
          const siblings = siblingMap[m.id] || []
          if (siblings.length > 0) {
            // Find birth date rank among siblings
            const familyMemberIds = [m.id, ...siblings]
            const familyMembers = members.filter((fm) => familyMemberIds.includes(fm.id))
            familyMembers.sort((a, b) => {
              const dateA = a.birth_date ? new Date(a.birth_date).getTime() : 0
              const dateB = b.birth_date ? new Date(b.birth_date).getTime() : 0
              return dateA - dateB // oldest first
            })

            const myIndex = familyMembers.findIndex((fm) => fm.id === m.id)
            if (myIndex === 1) {
              discount = Math.round(base * 0.2) // 20% discount for 2nd child
              discountReason = '2nd Sibling (20% discount)'
            } else if (myIndex >= 2) {
              discount = Math.round(base * 0.5) // 50% discount for 3rd+ child
              discountReason = `${myIndex + 1}th Sibling (50% discount)`
            }
          }
        }

        const finalDue = Math.max(0, base - discount)

        return {
          group_id: groupId,
          scout_year: bulkYear,
          member_id: m.id,
          base_fee: base,
          discount_amount: discount,
          discount_reason: discountReason || null,
          final_due: finalDue,
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
        setSelectedYear(bulkYear)
        setIsBulkDuesModalOpen(false)
        showStatus(`Successfully initialized annual dues for ${data.length} scouts!`, 'success')
      }
    } catch (err: any) {
      showStatus(`Error setting up dues: ${err.message}`, 'error')
    } finally {
      setIsProcessingBulk(false)
    }
  }

  // ── Record Payment Installment Action ─────────────────────────────────
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFeeForPayment) return
    const amt = parseFloat(paymentAmount) || 0
    if (amt <= 0) return showStatus('Please enter a valid payment amount.', 'error')

    setIsProcessingPayment(true)
    try {
      // 1. Insert payment record
      const { data: pData, error: pErr } = await supabase
        .from('membership_payments')
        .insert({
          membership_fee_id: selectedFeeForPayment.id,
          amount: amt,
          currency: paymentCurrency,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          received_by: userProfileId,
          receipt_number: paymentReceiptNo.trim() || null,
          notes: paymentNotes.trim() || null,
        })
        .select('*, profiles(full_name)')
        .single()

      if (pErr) throw pErr

      // 2. Update parent membership_fee paid_amount and status
      const newPaid = Number(selectedFeeForPayment.paid_amount || 0) + amt
      const finalDue = Number(selectedFeeForPayment.final_due || 0)
      let newStatus = 'partial'
      if (newPaid >= finalDue) newStatus = 'paid'
      else if (newPaid <= 0) newStatus = 'unpaid'

      const { data: updatedFee, error: uErr } = await supabase
        .from('membership_fees')
        .update({
          paid_amount: newPaid,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedFeeForPayment.id)
        .select(`
          *,
          members (id, first_name, last_name, troop_id, current_rank),
          membership_payments (*, profiles(full_name))
        `)
        .single()

      if (uErr) throw uErr

      // 3. Optionally sync as Income in Treasury Ledger
      if (syncToTreasury) {
        const scoutName = `${selectedFeeForPayment.members?.first_name || 'Scout'} ${selectedFeeForPayment.members?.last_name || ''}`
        const { data: txData } = await supabase
          .from('treasury_transactions')
          .insert({
            group_id: groupId,
            troop_id: selectedFeeForPayment.members?.troop_id || null,
            transaction_type: 'income',
            category: 'membership_dues',
            amount: amt,
            currency: paymentCurrency,
            transaction_date: paymentDate,
            description: `Cotisation ${selectedFeeForPayment.scout_year} - ${scoutName} (${paymentMethod})`,
            recorded_by: userProfileId,
          })
          .select('*, troops(id, name), profiles(id, full_name)')
          .single()

        if (txData) {
          setTransactions((prev) => [txData, ...prev])
        }
      }

      if (updatedFee) {
        setFees((prev) => prev.map((f) => (f.id === updatedFee.id ? updatedFee : f)))
      }

      setIsPaymentModalOpen(false)
      setSelectedFeeForPayment(null)
      setPaymentAmount('')
      setPaymentReceiptNo('')
      setPaymentNotes('')
      showStatus(`Payment of $${amt} recorded successfully!`, 'success')
    } catch (err: any) {
      showStatus(`Error logging payment: ${err.message}`, 'error')
    } finally {
      setIsProcessingPayment(false)
    }
  }

  // ── Record General Treasury Transaction ────────────────────────────────
  const handleRecordTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(txAmount) || 0
    if (amt <= 0) return showStatus('Please enter a valid transaction amount.', 'error')
    if (!txDescription.trim()) return showStatus('Please enter a description for the transaction.', 'error')

    setIsProcessingTx(true)
    try {
      const { data: newTx, error } = await supabase
        .from('treasury_transactions')
        .insert({
          group_id: groupId,
          troop_id: txTroopId || null,
          transaction_type: txType,
          category: txCategory,
          amount: amt,
          currency: txCurrency,
          transaction_date: txDate,
          description: txDescription.trim(),
          recorded_by: userProfileId,
          receipt_url: txReceiptUrl.trim() || null,
        })
        .select('*, troops(id, name), profiles(id, full_name)')
        .single()

      if (error) throw error

      if (newTx) {
        setTransactions((prev) => [newTx, ...prev])
        setIsTxModalOpen(false)
        setTxAmount('')
        setTxDescription('')
        setTxReceiptUrl('')
        setTxTroopId('')
        showStatus(`${txType === 'income' ? 'Income' : 'Expense'} of $${amt} logged to Treasury!`, 'success')
      }
    } catch (err: any) {
      showStatus(`Error logging transaction: ${err.message}`, 'error')
    } finally {
      setIsProcessingTx(false)
    }
  }

  // ── Delete Treasury Transaction ────────────────────────────────────────
  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this treasury entry?')) return
    const { error } = await supabase.from('treasury_transactions').delete().eq('id', id)
    if (!error) {
      setTransactions((prev) => prev.filter((t) => t.id !== id))
      showStatus('Transaction deleted.', 'success')
    } else {
      showStatus(error.message, 'error')
    }
  }

  // ── Export CSV Helpers ────────────────────────────────────────────────
  const exportDuesCSV = () => {
    const headers = ['Scout Year,First Name,Last Name,Troop,Base Fee,Discount,Final Due,Paid Amount,Balance,Status']
    const rows = filteredFees.map((f) => {
      const troopName = troops.find((t) => t.id === f.members?.troop_id)?.name || 'Unassigned'
      const balance = Math.max(0, f.final_due - f.paid_amount)
      return `"${f.scout_year}","${f.members?.first_name || ''}","${f.members?.last_name || ''}","${troopName}",${f.base_fee},${f.discount_amount},${f.final_due},${f.paid_amount},${balance},"${f.status}"`
    })
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `scout_dues_${selectedYear}_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportTreasuryCSV = () => {
    const headers = ['Date,Type,Category,Description,Amount,Currency,Troop,Recorded By,Receipt URL']
    const rows = transactions.map((t) => {
      const troopName = t.troops?.name || 'Group Wide'
      const recordedBy = t.profiles?.full_name || 'Leader'
      return `"${t.transaction_date}","${t.transaction_type}","${t.category}","${t.description.replace(/"/g, '""')}",${t.amount},"${t.currency}","${troopName}","${recordedBy}","${t.receipt_url || ''}"`
    })
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `group_treasury_ledger_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <DashboardShell
      groupName={groupName}
      currentRole={currentRole}
      userName={userName}
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            {statusMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-rose-600" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-teal-700 uppercase tracking-wider mb-1">
              <Wallet className="h-4 w-4" />
              Treasury & Financials
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Group Treasury & Scout Dues</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage annual cotisations, multi-child sibling discounts, and group cashbox accounts (*Sandou2 El Majlis*).
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isGroupTreasurer && (
              <>
                <button
                  onClick={() => setIsBulkDuesModalOpen(true)}
                  className="bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold px-3.5 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 border border-teal-200"
                >
                  <Percent className="h-3.5 w-3.5" />
                  <span>Setup Annual Dues</span>
                </button>

                <button
                  onClick={() => setIsTxModalOpen(true)}
                  className="bg-teal-700 hover:bg-teal-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>Record Transaction</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Top KPI Cards ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Net Cash Balance */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Treasury Balance</span>
              <div className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">${kpis.netCashBalance.toLocaleString()}</span>
              <span className="text-[10px] font-bold text-slate-400">Net Cash</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-1 border-t border-slate-100">
              <span className="text-emerald-600 font-bold flex items-center">
                <ArrowUpRight className="h-3 w-3 inline" /> ${kpis.totalIncome.toLocaleString()}
              </span>
              <span>•</span>
              <span className="text-rose-600 font-bold flex items-center">
                <ArrowDownRight className="h-3 w-3 inline" /> ${kpis.totalExpense.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Dues Collected */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Dues Collected</span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600">${kpis.totalDuesCollected.toLocaleString()}</span>
              <span className="text-[10px] font-bold text-slate-400">/ ${kpis.totalDuesGenerated.toLocaleString()}</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
              <span>{kpis.paidScoutsCount} of {kpis.totalScoutsWithDues} scouts paid</span>
              <span className="font-bold text-emerald-700">{kpis.collectionRate}%</span>
            </div>
          </div>

          {/* Outstanding Dues */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Outstanding Dues</span>
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600">${kpis.totalDuesOutstanding.toLocaleString()}</span>
              <span className="text-[10px] font-bold text-slate-400">to collect</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${kpis.collectionRate}%` }}
              />
            </div>
          </div>

          {/* Active Members */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Active Youth</span>
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{members.length}</span>
              <span className="text-[10px] font-bold text-slate-400">Scouts Registered</span>
            </div>
            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
              <span>{troops.length} Troops / Units</span>
              <span className="font-bold text-teal-700">{selectedYear}</span>
            </div>
          </div>
        </div>

        {/* ── Tabs Navigation ──────────────────────────────────────────── */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('dues')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'dues'
                ? 'border-teal-700 text-teal-800 bg-teal-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Percent className="h-4 w-4" />
            <span>Annual Membership Dues (Cotisations)</span>
            <span className="ml-1 bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-black">
              {filteredFees.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('treasury')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'treasury'
                ? 'border-teal-700 text-teal-800 bg-teal-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Receipt className="h-4 w-4" />
            <span>Group Treasury Ledger (*Sandou2*)</span>
            <span className="ml-1 bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-black">
              {transactions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'border-teal-700 text-teal-800 bg-teal-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Financial Reports & Breakdown</span>
          </button>
        </div>

        {/* ── TAB 1: MEMBERSHIP DUES ─────────────────────────────────────── */}
        {activeTab === 'dues' && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 flex-wrap">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search scout name..."
                    value={searchScout}
                    onChange={(e) => setSearchScout(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                  />
                </div>

                {/* Year Select */}
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none"
                >
                  <option value="2025-2026">Year 2025-2026</option>
                  <option value="2026-2027">Year 2026-2027</option>
                  <option value="2024-2025">Year 2024-2025</option>
                  <option value="all">All Years</option>
                </select>

                {/* Troop Select */}
                <select
                  value={filterTroop}
                  onChange={(e) => setFilterTroop(e.target.value)}
                  className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none"
                >
                  <option value="all">All Troops</option>
                  {troops.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>

                {/* Status Select */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="paid">Fully Paid</option>
                  <option value="partial">Partially Paid</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="exempt">Exempt / Scholarship</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={exportDuesCSV}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                  title="Export Dues Roster to CSV"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Dues Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Scout Member</th>
                      <th className="px-4 py-3">Troop / Unit</th>
                      <th className="px-4 py-3">Base Fee</th>
                      <th className="px-4 py-3">Discount</th>
                      <th className="px-4 py-3">Final Due</th>
                      <th className="px-4 py-3">Paid Amount</th>
                      <th className="px-4 py-3">Balance</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredFees.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                          <Percent className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p className="font-bold text-slate-600">No annual dues records found for this filter.</p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Click <strong>"Setup Annual Dues"</strong> above to initialize fees for active scouts.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredFees.map((fee) => {
                        const troop = troops.find((t) => t.id === fee.members?.troop_id)
                        const balance = Math.max(0, Number(fee.final_due || 0) - Number(fee.paid_amount || 0))
                        const hasSiblings = getSiblingCount(fee.member_id) > 0
                        const paymentsCount = fee.membership_payments?.length || 0

                        return (
                          <tr key={fee.id} className="hover:bg-slate-50 transition-colors">
                            {/* Scout Member */}
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="font-bold text-slate-900">
                                  {fee.members?.first_name} {fee.members?.last_name}
                                </div>
                                {hasSiblings && (
                                  <span
                                    className="bg-purple-50 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-purple-200"
                                    title="Has registered siblings in group"
                                  >
                                    Sibling
                                  </span>
                                )}
                              </div>
                              {fee.members?.current_rank && (
                                <span className="text-[10px] text-slate-400 block">{fee.members.current_rank}</span>
                              )}
                            </td>

                            {/* Troop */}
                            <td className="px-4 py-3.5 text-slate-600">
                              <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md text-[11px]">
                                {troop?.name || 'Unassigned'}
                              </span>
                            </td>

                            {/* Base Fee */}
                            <td className="px-4 py-3.5 text-slate-500 font-medium">${fee.base_fee}</td>

                            {/* Discount */}
                            <td className="px-4 py-3.5">
                              {fee.discount_amount > 0 ? (
                                <div>
                                  <span className="text-emerald-700 font-bold">-${fee.discount_amount}</span>
                                  {fee.discount_reason && (
                                    <span className="text-[10px] text-slate-400 block truncate max-w-[120px]" title={fee.discount_reason}>
                                      {fee.discount_reason}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>

                            {/* Final Due */}
                            <td className="px-4 py-3.5 font-bold text-slate-900">${fee.final_due}</td>

                            {/* Paid Amount */}
                            <td className="px-4 py-3.5">
                              <button
                                onClick={() => setSelectedFeeForHistory(fee)}
                                className="text-emerald-700 font-bold hover:underline flex items-center gap-1 group"
                                title="Click to view payment installments history"
                              >
                                <span>${fee.paid_amount}</span>
                                {paymentsCount > 0 && (
                                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.2 rounded-full">
                                    {paymentsCount}
                                  </span>
                                )}
                              </button>
                            </td>

                            {/* Balance */}
                            <td className="px-4 py-3.5">
                              {balance > 0 ? (
                                <span className="font-bold text-rose-600">${balance}</span>
                              ) : (
                                <span className="text-emerald-600 font-bold">Paid ($0)</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                                  fee.status === 'paid'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : fee.status === 'partial'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : fee.status === 'exempt'
                                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                                    : 'bg-rose-50 text-rose-800 border-rose-200'
                                }`}
                              >
                                {fee.status}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3.5 text-right">
                              <button
                                onClick={() => {
                                  setSelectedFeeForPayment(fee)
                                  setPaymentAmount(balance > 0 ? String(balance) : String(fee.final_due))
                                  setIsPaymentModalOpen(true)
                                }}
                                className="bg-teal-700 hover:bg-teal-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors shadow-2xs inline-flex items-center gap-1"
                              >
                                <DollarSign className="h-3 w-3" />
                                <span>Record Payment</span>
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
        )}

        {/* ── TAB 2: TREASURY LEDGER (SANDOU2 EL MAJLIS) ─────────────────── */}
        {activeTab === 'treasury' && (
          <div className="space-y-4">
            {/* Header & Export */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Group Cashbook (*Sandou2 El Majlis*)</h3>
                <p className="text-xs text-slate-500">General ledger tracking group-wide income, expenses, donations, and purchases.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={exportTreasuryCSV}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export CSV</span>
                </button>

                {isGroupTreasurer && (
                  <button
                    onClick={() => setIsTxModalOpen(true)}
                    className="bg-teal-700 hover:bg-teal-600 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Record Entry</span>
                  </button>
                )}
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Troop / Unit</th>
                      <th className="px-4 py-3">Recorded By</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      {isGroupTreasurer && <th className="px-4 py-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                          <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p className="font-bold text-slate-600">No transactions recorded yet in the Group Treasury.</p>
                          <p className="text-[11px] text-slate-400 mt-1">Click "Record Entry" above to log income or expenses.</p>
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => {
                        const catMeta = CATEGORY_LABELS[tx.category] || CATEGORY_LABELS.misc
                        const isIncome = tx.transaction_type === 'income'

                        return (
                          <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                            {/* Date */}
                            <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                              {tx.transaction_date}
                            </td>

                            {/* Type */}
                            <td className="px-4 py-3.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${
                                  isIncome
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-rose-50 text-rose-800 border-rose-200'
                                }`}
                              >
                                {isIncome ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                {isIncome ? 'Income' : 'Expense'}
                              </span>
                            </td>

                            {/* Category */}
                            <td className="px-4 py-3.5">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${catMeta.color}`}>
                                {catMeta.label}
                              </span>
                            </td>

                            {/* Description */}
                            <td className="px-4 py-3.5 text-slate-900">
                              <div className="font-medium">{tx.description}</div>
                              {tx.receipt_url && (
                                <a
                                  href={tx.receipt_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-teal-700 hover:underline flex items-center gap-1 mt-0.5"
                                >
                                  <span>View Attached Receipt</span>
                                  <ArrowRight className="h-2.5 w-2.5" />
                                </a>
                              )}
                            </td>

                            {/* Troop */}
                            <td className="px-4 py-3.5 text-slate-500">
                              {tx.troops?.name || <span className="text-slate-400 italic">Group Wide</span>}
                            </td>

                            {/* Recorded By */}
                            <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                              {tx.profiles?.full_name || 'Leader'}
                            </td>

                            {/* Amount */}
                            <td className={`px-4 py-3.5 text-right font-black text-sm ${isIncome ? 'text-emerald-700' : 'text-rose-600'}`}>
                              {isIncome ? '+' : '-'}${Number(tx.amount).toLocaleString()}
                            </td>

                            {/* Actions */}
                            {isGroupTreasurer && (
                              <td className="px-4 py-3.5 text-right">
                                <button
                                  onClick={() => handleDeleteTransaction(tx.id)}
                                  className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors"
                                  title="Delete transaction"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: FINANCIAL ANALYTICS & REPORTS ───────────────────────── */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Troop Collection Comparison */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900">Dues Collection by Troop / Unit</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Troop Name</th>
                      <th className="px-4 py-3">Total Scouts</th>
                      <th className="px-4 py-3">Dues Assessed</th>
                      <th className="px-4 py-3">Collected</th>
                      <th className="px-4 py-3">Pending</th>
                      <th className="px-4 py-3">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {troops.map((t) => {
                      const troopFees = fees.filter(
                        (f) => f.members?.troop_id === t.id && (selectedYear === 'all' || f.scout_year === selectedYear)
                      )
                      const assessed = troopFees.reduce((sum, f) => sum + Number(f.final_due || 0), 0)
                      const collected = troopFees.reduce((sum, f) => sum + Number(f.paid_amount || 0), 0)
                      const pending = Math.max(0, assessed - collected)
                      const percent = assessed > 0 ? Math.round((collected / assessed) * 100) : 0

                      return (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3.5 font-bold text-slate-900">{t.name}</td>
                          <td className="px-4 py-3.5 text-slate-600">{troopFees.length} scouts</td>
                          <td className="px-4 py-3.5 font-bold text-slate-900">${assessed.toLocaleString()}</td>
                          <td className="px-4 py-3.5 font-bold text-emerald-700">${collected.toLocaleString()}</td>
                          <td className="px-4 py-3.5 font-bold text-amber-600">${pending.toLocaleString()}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-teal-600 h-full rounded-full" style={{ width: `${percent}%` }} />
                              </div>
                              <span className="font-bold text-[11px] text-slate-700">{percent}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Income breakdown */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                  <span>Income Breakdown</span>
                </h3>
                <div className="space-y-3">
                  {Object.entries(CATEGORY_LABELS).map(([catKey, catMeta]) => {
                    const catTotal = transactions
                      .filter((t) => t.transaction_type === 'income' && t.category === catKey)
                      .reduce((sum, t) => sum + Number(t.amount || 0), 0)

                    if (catTotal === 0) return null

                    return (
                      <div key={catKey} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                        <span className="font-bold text-slate-800">{catMeta.label}</span>
                        <span className="font-black text-emerald-700">${catTotal.toLocaleString()}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Expense breakdown */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ArrowDownRight className="h-4 w-4 text-rose-600" />
                  <span>Expenses Breakdown</span>
                </h3>
                <div className="space-y-3">
                  {Object.entries(CATEGORY_LABELS).map(([catKey, catMeta]) => {
                    const catTotal = transactions
                      .filter((t) => t.transaction_type === 'expense' && t.category === catKey)
                      .reduce((sum, t) => sum + Number(t.amount || 0), 0)

                    if (catTotal === 0) return null

                    return (
                      <div key={catKey} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                        <span className="font-bold text-slate-800">{catMeta.label}</span>
                        <span className="font-black text-rose-600">${catTotal.toLocaleString()}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: BULK SETUP ANNUAL DUES ──────────────────────────────── */}
        {isBulkDuesModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Percent className="h-5 w-5 text-teal-700" />
                  <h3 className="text-base font-bold text-slate-900">Setup Annual Membership Dues</h3>
                </div>
                <button onClick={() => setIsBulkDuesModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleBulkGenerateDues} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Scout Year
                  </label>
                  <input
                    type="text"
                    required
                    value={bulkYear}
                    onChange={(e) => setBulkYear(e.target.value)}
                    placeholder="e.g. 2025-2026"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Standard Base Fee ($ USD)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={bulkBaseFee}
                    onChange={(e) => setBulkBaseFee(e.target.value)}
                    placeholder="50"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>

                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSiblingDiscount}
                      onChange={(e) => setAutoSiblingDiscount(e.target.checked)}
                      className="mt-0.5 rounded text-teal-700 focus:ring-teal-500"
                    />
                    <div>
                      <span className="font-bold text-teal-900 block">Auto-apply Sibling Discounts</span>
                      <span className="text-[11px] text-teal-700 block mt-0.5">
                        Calculates multi-child discounts automatically: <strong>1st child (100%)</strong>, <strong>2nd child (20% off)</strong>, <strong>3rd+ child (50% off)</strong>.
                      </span>
                    </div>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsBulkDuesModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingBulk}
                    className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold shadow-sm disabled:opacity-50"
                  >
                    {isProcessingBulk ? 'Processing…' : 'Generate Dues for Scouts'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: RECORD PAYMENT INSTALLMENT ─────────────────────────── */}
        {isPaymentModalOpen && selectedFeeForPayment && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Record Dues Payment</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedFeeForPayment.members?.first_name} {selectedFeeForPayment.members?.last_name} ({selectedFeeForPayment.scout_year})
                  </p>
                </div>
                <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Final Due</span>
                  <span className="font-bold text-slate-900">${selectedFeeForPayment.final_due}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Already Paid</span>
                  <span className="font-bold text-emerald-700">${selectedFeeForPayment.paid_amount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Remaining</span>
                  <span className="font-bold text-rose-600">
                    ${Math.max(0, selectedFeeForPayment.final_due - selectedFeeForPayment.paid_amount)}
                  </span>
                </div>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Payment Amount ($)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="Amount"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 focus:border-teal-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:border-teal-600 focus:outline-none font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-medium focus:border-teal-600 focus:outline-none"
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
                      value={paymentReceiptNo}
                      onChange={(e) => setPaymentReceiptNo(e.target.value)}
                      placeholder="e.g. REC-1042"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Notes / Reference
                  </label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="e.g. Paid by father in parent meeting"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={syncToTreasury}
                      onChange={(e) => setSyncToTreasury(e.target.checked)}
                      className="rounded text-teal-700 focus:ring-teal-500"
                    />
                    <span className="text-slate-800 font-medium">Sync to Group Treasury Ledger (*Sandou2*)</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingPayment}
                    className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold shadow-sm disabled:opacity-50"
                  >
                    {isProcessingPayment ? 'Saving…' : 'Record Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: PAYMENT HISTORY DRAWER ──────────────────────────────── */}
        {selectedFeeForHistory && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Payment History</h3>
                  <p className="text-xs text-slate-500">
                    {selectedFeeForHistory.members?.first_name} {selectedFeeForHistory.members?.last_name} ({selectedFeeForHistory.scout_year})
                  </p>
                </div>
                <button onClick={() => setSelectedFeeForHistory(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(!selectedFeeForHistory.membership_payments || selectedFeeForHistory.membership_payments.length === 0) ? (
                  <div className="p-6 text-center text-xs text-slate-400">No installment payments recorded yet.</div>
                ) : (
                  selectedFeeForHistory.membership_payments.map((p) => (
                    <div key={p.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">${p.amount} ({p.payment_method})</div>
                        <div className="text-[10px] text-slate-400">
                          {p.payment_date} • Received by {p.profiles?.full_name || 'Leader'}
                        </div>
                        {p.notes && <div className="text-[10px] text-slate-500 italic mt-0.5">"{p.notes}"</div>}
                      </div>
                      {p.receipt_number && (
                        <span className="bg-slate-200 text-slate-700 text-[10px] font-mono px-1.5 py-0.5 rounded">
                          {p.receipt_number}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-end">
                <button
                  onClick={() => setSelectedFeeForHistory(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: RECORD TREASURY TRANSACTION ─────────────────────────── */}
        {isTxModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-teal-700" />
                  <h3 className="text-base font-bold text-slate-900">Record Treasury Transaction</h3>
                </div>
                <button onClick={() => setIsTxModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleRecordTransaction} className="space-y-4 text-xs">
                {/* Type toggle */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setTxType('income')}
                    className={`py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                      txType === 'income' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    <span>Income (+)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType('expense')}
                    className={`py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                      txType === 'expense' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ArrowDownRight className="h-3.5 w-3.5" />
                    <span>Expense (-)</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Category
                    </label>
                    <select
                      value={txCategory}
                      onChange={(e) => setTxCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-medium focus:border-teal-600 focus:outline-none"
                    >
                      {Object.entries(CATEGORY_LABELS).map(([k, meta]) => (
                        <option key={k} value={k}>
                          {meta.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Amount ($)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-medium focus:border-teal-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Troop Attribution (Optional)
                    </label>
                    <select
                      value={txTroopId}
                      onChange={(e) => setTxTroopId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-medium focus:border-teal-600 focus:outline-none"
                    >
                      <option value="">Group Wide</option>
                      {troops.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    required
                    value={txDescription}
                    onChange={(e) => setTxDescription(e.target.value)}
                    placeholder="e.g. Purchased 4 new camping stoves"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:border-teal-600 focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Receipt Link / Attachment URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={txReceiptUrl}
                    onChange={(e) => setTxReceiptUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsTxModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingTx}
                    className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold shadow-sm disabled:opacity-50"
                  >
                    {isProcessingTx ? 'Recording…' : 'Record Transaction'}
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
