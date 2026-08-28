'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  Package, Search, Plus, Filter, CheckCircle2, Clock, AlertTriangle, XCircle,
  Calendar, Layers, MapPin, Send, Check, X, ShieldAlert, Trash2, Edit3,
  Archive, ArrowRight, Eye, RefreshCw, ChevronRight, Tag, HelpCircle, ChevronDown, Sparkles, SlidersHorizontal, ShoppingCart, Minus, Folder, Users, Tent, Loader2, Info, ClipboardCheck, UtensilsCrossed, Apple, ShoppingBag
} from 'lucide-react'
import DashboardShell from '../DashboardShell'

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Troop {
  id: string
  name: string
  sectionName?: string
}

interface Leader {
  id: string
  fullName: string
  email: string
  rank: string
}

interface EventItem {
  id: string
  title: string
  event_type: string
  start_time: string
  end_time?: string | null
  scope: string
  troop_id?: string | null
}

export interface InventoryItem {
  id: string
  group_id: string
  troop_id?: string | null
  name: string
  category: string
  quantity_total: number
  quantity_available: number
  qty_good?: number
  qty_fair?: number
  qty_needs_repair?: number
  qty_damaged?: number
  condition: 'good' | 'fair' | 'needs_repair' | 'damaged'
  location_stored?: string | null
  description?: string | null
  created_at?: string
  is_deleted?: boolean
}

export interface InventoryCheckout {
  id: string
  item_id: string
  group_id: string
  checked_out_to: string
  troop_id?: string | null
  event_id?: string | null
  quantity: number
  checkout_date: string
  return_date?: string | null
  actual_return_date?: string | null
  returned_condition?: string | null
  notes?: string | null
  status: 'requested' | 'handed_out' | 'return_pending' | 'returned' | 'rejected'
  handed_out_by?: string | null
  received_by?: string | null
  created_at?: string
}

export interface InventoryWriteoff {
  id: string
  item_id: string
  group_id: string
  quantity: number
  reason: string
  notes?: string | null
  status: 'pending' | 'approved' | 'rejected'
  requested_by: string
  approved_by?: string | null
  rejection_reason?: string | null
  requested_at: string
  actioned_at?: string | null
}

export interface GroupPantryItem {
  id: string
  group_id: string
  name: string
  category: 'grains_pasta' | 'canned_goods' | 'spices_condiments' | 'beverages_tea' | 'breakfast_spreads' | 'oils_fats' | 'consumables_hygiene' | 'other'
  quantity_total: number
  quantity_available: number
  unit: string
  location_stored?: string | null
  expiry_date?: string | null
  notes?: string | null
  is_deleted?: boolean
}

interface CartItem {
  item: InventoryItem
  quantity: number
}

interface AuditItemState {
  qtyGood: number
  qtyFair: number
  qtyNeedsRepair: number
  qtyDamaged: number
  isAudited: boolean
}

interface ReturnBreakdownState {
  good: number
  fair: number
  needs_repair: number
  damaged: number
}

interface ConfirmDialogState {
  title: string
  message: string
  confirmLabel: string
  confirmStyle?: 'teal' | 'amber' | 'emerald' | 'rose'
  onConfirm: () => Promise<void> | void
}

interface Props {
  groupId: string
  groupName: string
  currentRole: string
  userTroopId: string | null
  userId: string
  userName?: string
  isEventStaff?: boolean
  userEventRoles?: Array<{ event_id: string; event_role: string }>
  troops: Troop[]
  leaders: Leader[]
  events: EventItem[]
  initialInventory: InventoryItem[]
  initialCheckouts: InventoryCheckout[]
  initialWriteoffs: InventoryWriteoff[]
}

// ─── 14 Standard Category Presets ─────────────────────────────────────────────

export const INVENTORY_CATEGORIES = [
  { id: 'tents', label: 'Tents & Shelters', ar: 'خيم ومظلات', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { id: 'cooking', label: 'Camp Kitchen & Gas', ar: 'مطبخ المخيم وغاز', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'pioneering', label: 'Pioneering, Ropes & Timber', ar: 'ريادات وحبال وخشب', color: 'bg-orange-50 text-orange-800 border-orange-200' },
  { id: 'tools', label: 'Tools & Hardware', ar: 'عدة وصيانة', color: 'bg-slate-50 text-slate-800 border-slate-200' },
  { id: 'lighting', label: 'Lighting & Electricity', ar: 'إنارة وكهرباء', color: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
  { id: 'first_aid', label: 'First Aid & Health', ar: 'إسعافات وسلامة', color: 'bg-rose-50 text-rose-800 border-rose-200' },
  { id: 'av_sound', label: 'Audio, Visual & Sound', ar: 'صوتيات وتصوير', color: 'bg-purple-50 text-purple-800 border-purple-200' },
  { id: 'ceremonial', label: 'Ceremonial, Flags & Banners', ar: 'أعلام ومراسم', color: 'bg-teal-50 text-teal-800 border-teal-200' },
  { id: 'sleeping', label: 'Sleeping & Mattresses', ar: 'فرشات وحرامات', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  { id: 'furniture', label: 'Camp Tables & Benches', ar: 'طاولات وكراسي', color: 'bg-stone-50 text-stone-800 border-stone-200' },
  { id: 'luggage', label: 'Backpacks & Storage Boxes', ar: 'شنط وصناديق', color: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
  { id: 'sports', label: 'Games, Sports & Activities', ar: 'ألعاب ورياضة', color: 'bg-lime-50 text-lime-800 border-lime-200' },
  { id: 'craft', label: 'Stationery, Craft & Badges', ar: 'قرطاسية وأشغال', color: 'bg-pink-50 text-pink-800 border-pink-200' },
  { id: 'other', label: 'Other / Miscellaneous', ar: 'أخرى / متنوع', color: 'bg-gray-50 text-gray-800 border-gray-200' },
]

export const CONDITIONS = [
  { id: 'good', label: 'Good (جاهز وممتاز)', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { id: 'fair', label: 'Fair (صالح مع استعمال)', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'needs_repair', label: 'Needs Repair (بحاجة لصيانة)', color: 'bg-orange-50 text-orange-800 border-orange-200' },
  { id: 'damaged', label: 'Damaged (متضرر)', color: 'bg-rose-50 text-rose-800 border-rose-200' },
]

export const WRITEOFF_REASONS = [
  'Broken beyond repair / Damaged in camp',
  'Lost / Stolen / Missing in field',
  'Expired / Unsafe for scout use',
  'Replaced / Obsolete equipment',
  'Severe wear and tear / Normal aging',
  'Other / Custom reason',
]

// Helper to extract breakdown from item safely
export function getItemConditionBreakdown(item: InventoryItem) {
  const hasExplicit =
    item.qty_good !== undefined ||
    item.qty_fair !== undefined ||
    item.qty_needs_repair !== undefined ||
    item.qty_damaged !== undefined

  if (hasExplicit) {
    const good = Number(item.qty_good || 0)
    const fair = Number(item.qty_fair || 0)
    const needs_repair = Number(item.qty_needs_repair || 0)
    const damaged = Number(item.qty_damaged || 0)
    
    // If all are 0 but total > 0, fallback to scalar condition
    if (good + fair + needs_repair + damaged === 0 && item.quantity_total > 0) {
      return {
        good: item.condition === 'good' ? item.quantity_total : 0,
        fair: item.condition === 'fair' ? item.quantity_total : 0,
        needs_repair: item.condition === 'needs_repair' ? item.quantity_total : 0,
        damaged: item.condition === 'damaged' ? item.quantity_total : 0,
      }
    }
    return { good, fair, needs_repair, damaged }
  }

  // Fallback based on scalar condition
  return {
    good: item.condition === 'good' ? item.quantity_total : 0,
    fair: item.condition === 'fair' ? item.quantity_total : 0,
    needs_repair: item.condition === 'needs_repair' ? item.quantity_total : 0,
    damaged: item.condition === 'damaged' ? item.quantity_total : 0,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InventoryManagement({
  groupId,
  groupName,
  currentRole,
  userTroopId,
  userId,
  userName,
  isEventStaff = false,
  userEventRoles = [],
  troops,
  leaders,
  events,
  initialInventory,
  initialCheckouts,
  initialWriteoffs,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  // Strict Permissions
  const isGroupLeader = currentRole === 'chef_groupe' || currentRole === 'assistant_chef_groupe' || currentRole === 'configurator'
  const isQuartermaster = currentRole === 'amin_tejhizet_group' || isGroupLeader
  const isFullManager = isGroupLeader || isQuartermaster
  const isTroopLeader = currentRole === 'ka2ed_fer2a' || currentRole === 'mouse3ed_ka2ed_fer2a'
  const canRequestForTroop = isFullManager || Boolean(userTroopId)

  // Data State
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory)
  const [checkouts, setCheckouts] = useState<InventoryCheckout[]>(initialCheckouts)
  const [writeoffs, setWriteoffs] = useState<InventoryWriteoff[]>(initialWriteoffs)

  // Navigation State: Troop leaders land directly on checkouts
  const [activeTab, setActiveTab] = useState<'catalog' | 'checkouts' | 'writeoffs' | 'approvals'>(
    isFullManager ? 'catalog' : 'checkouts'
  )

  // Multi-Select Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedConditions, setSelectedConditions] = useState<string[]>([])
  const [checkoutFilterStatus, setCheckoutFilterStatus] = useState<string>('all')

  // Mobile Filter Sheet
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)

  // Accordion Expand/Collapse Map for Grouped Lending
  const [expandedGroupIds, setExpandedGroupIds] = useState<Record<string, boolean>>({})

  const toggleGroupExpand = (groupIdKey: string) => {
    setExpandedGroupIds((prev) => ({
      ...prev,
      [groupIdKey]: !prev[groupIdKey],
    }))
  }

  // ── Stock Count (Jard El Tejhizet) Mode State ────────────────────────────────
  const [isAuditModeOpen, setIsAuditModeOpen] = useState(false)
  const [auditMap, setAuditMap] = useState<Record<string, AuditItemState>>({})
  const [auditLocationFilter, setAuditLocationFilter] = useState<string>('all')
  const [auditUncheckedOnly, setAuditUncheckedOnly] = useState(false)
  const [isSavingAudit, setIsSavingAudit] = useState(false)

  const handleStartAudit = () => {
    const initialMap: Record<string, AuditItemState> = {}
    inventory.forEach((item) => {
      const breakdown = getItemConditionBreakdown(item)
      initialMap[item.id] = {
        qtyGood: breakdown.good,
        qtyFair: breakdown.fair,
        qtyNeedsRepair: breakdown.needs_repair,
        qtyDamaged: breakdown.damaged,
        isAudited: false,
      }
    })
    setAuditMap(initialMap)
    setAuditLocationFilter('all')
    setAuditUncheckedOnly(false)
    setIsAuditModeOpen(true)
  }

  const handleAuditConditionCountChange = (
    itemId: string,
    tier: 'qtyGood' | 'qtyFair' | 'qtyNeedsRepair' | 'qtyDamaged',
    newVal: number
  ) => {
    const valid = Math.max(0, newVal)
    setAuditMap((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [tier]: valid,
        isAudited: true,
      },
    }))
  }

  const handleAuditQuickMatch = (itemId: string) => {
    const item = inventory.find((i) => i.id === itemId)
    if (!item) return
    const breakdown = getItemConditionBreakdown(item)
    setAuditMap((prev) => ({
      ...prev,
      [itemId]: {
        qtyGood: breakdown.good,
        qtyFair: breakdown.fair,
        qtyNeedsRepair: breakdown.needs_repair,
        qtyDamaged: breakdown.damaged,
        isAudited: true,
      },
    }))
  }

  const handleAuditMatchAllVisible = (visibleItems: InventoryItem[]) => {
    setAuditMap((prev) => {
      const next = { ...prev }
      visibleItems.forEach((item) => {
        const breakdown = getItemConditionBreakdown(item)
        next[item.id] = {
          qtyGood: breakdown.good,
          qtyFair: breakdown.fair,
          qtyNeedsRepair: breakdown.needs_repair,
          qtyDamaged: breakdown.damaged,
          isAudited: true,
        }
      })
      return next
    })
  }

  // Confirmation Modal State (Action Sheet)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
  const [isExecutingConfirm, setIsExecutingConfirm] = useState(false)

  // Status Message Toast
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type })
    setTimeout(() => setStatusMessage(null), 5000)
  }

  // ── Permitted Events Calculation ───────────────────────────────────────────
  const permittedEvents = useMemo(() => {
    if (isGroupLeader || currentRole === 'amin_tejhizet_group') {
      return events
    }
    const myLeadingEventIds = userEventRoles
      .filter((es) => ['ka2ed_mouskhayyam', 'amin_tejhizet', 'ka2ed_nashat'].includes(es.event_role))
      .map((es) => es.event_id)
    return events.filter((ev) => myLeadingEventIds.includes(ev.id))
  }, [events, isGroupLeader, currentRole, userEventRoles])

  // ── Modals & Bottom Sheets State ───────────────────────────────────────────
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState('tents')
  const [formCustomCategory, setFormCustomCategory] = useState('')
  
  // Explicit Condition Quantities in Form
  const [formQtyGood, setFormQtyGood] = useState('1')
  const [formQtyFair, setFormQtyFair] = useState('0')
  const [formQtyNeedsRepair, setFormQtyNeedsRepair] = useState('0')
  const [formQtyDamaged, setFormQtyDamaged] = useState('0')

  const [formLocation, setFormLocation] = useState('Main Depot')
  const [formTroopId, setFormTroopId] = useState('')
  const [formDescription, setFormDescription] = useState('')

  // Multi-Item Lending Request (Cart) State
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [checkoutItemSearch, setCheckoutItemSearch] = useState('')
  const [checkoutCategoryFilter, setCheckoutCategoryFilter] = useState('all')
  const [checkoutScope, setCheckoutScope] = useState<'troop' | 'event'>(canRequestForTroop ? 'troop' : 'event')
  const [checkoutTroopId, setCheckoutTroopId] = useState(userTroopId || troops[0]?.id || '')
  const [checkoutEventId, setCheckoutEventId] = useState(permittedEvents[0]?.id || '')
  const [checkoutDate, setCheckoutDate] = useState(new Date().toISOString().split('T')[0])
  const [checkoutReturnDate, setCheckoutReturnDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  )
  const [checkoutNotes, setCheckoutNotes] = useState('')

  // Automatically prefill event dates when event is selected or modal opened
  useEffect(() => {
    if (checkoutScope === 'event' && checkoutEventId) {
      const selectedEv = events.find((e) => e.id === checkoutEventId)
      if (selectedEv) {
        if (selectedEv.start_time) {
          setCheckoutDate(selectedEv.start_time.split('T')[0])
        }
        const toDate = selectedEv.end_time || selectedEv.start_time
        if (toDate) {
          setCheckoutReturnDate(toDate.split('T')[0])
        }
      }
    }
  }, [isCheckoutModalOpen, checkoutScope, checkoutEventId, events])

  // Return & Inspection Modal with Detailed Breakdown
  const [inspectingCheckout, setInspectingCheckout] = useState<InventoryCheckout | null>(null)
  const [returnBreakdown, setReturnBreakdown] = useState<ReturnBreakdownState>({
    good: 1,
    fair: 0,
    needs_repair: 0,
    damaged: 0,
  })
  const [returnInspectionNotes, setReturnInspectionNotes] = useState('')

  // Writeoff / Decommission Request Modal
  const [isWriteoffModalOpen, setIsWriteoffModalOpen] = useState(false)
  const [writeoffItem, setWriteoffItem] = useState<InventoryItem | null>(null)
  const [writeoffQty, setWriteoffQty] = useState('1')
  const [writeoffReason, setWriteoffReason] = useState(WRITEOFF_REASONS[0])
  const [writeoffCustomReason, setWriteoffCustomReason] = useState('')
  const [writeoffNotes, setWriteoffNotes] = useState('')

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [batchActionLoadingId, setBatchActionLoadingId] = useState<string | null>(null)

  // ── Helpers & In-Memory Lookups ────────────────────────────────────────────
  const getLeaderName = (profileId: string) => {
    const leader = leaders.find((l) => l.id === profileId)
    return leader ? leader.fullName : 'Leader'
  }

  const getTroopName = (troopId?: string | null) => {
    if (!troopId) return null
    const troop = troops.find((t) => t.id === troopId)
    return troop ? troop.name : null
  }

  const getEventTitle = (eventId?: string | null) => {
    if (!eventId) return null
    const event = events.find((e) => e.id === eventId)
    return event ? event.title : null
  }

  const getItemName = (itemId: string) => {
    const item = inventory.find((i) => i.id === itemId)
    return item ? item.name : 'Equipment Item'
  }

  // ── Pending Write-Offs Map ─────────────────────────────────────────────────
  const pendingWriteoffsMap = useMemo(() => {
    const map: Record<string, number> = {}
    writeoffs
      .filter((w) => w.status === 'pending')
      .forEach((w) => {
        map[w.item_id] = (map[w.item_id] || 0) + Number(w.quantity)
      })
    return map
  }, [writeoffs])

  // Counts
  const pendingApprovalsCount = useMemo(() => {
    return writeoffs.filter((w) => w.status === 'pending').length
  }, [writeoffs])

  const pendingCheckoutsCount = useMemo(() => {
    return checkouts.filter((c) => c.status === 'requested').length
  }, [checkouts])

  const returnPendingCount = useMemo(() => {
    return checkouts.filter((c) => c.status === 'return_pending').length
  }, [checkouts])

  const inUseCheckoutsCount = useMemo(() => {
    return checkouts.filter((c) => c.status === 'handed_out' || c.status === 'return_pending').length
  }, [checkouts])

  // Available Items for Checkout Modal Selector (Only items with usable stock)
  const availableItemsList = useMemo(() => {
    return inventory.filter((item) => item.quantity_available > 0)
  }, [inventory])

  // Filtered available items in checkout modal
  const filteredCheckoutModalItems = useMemo(() => {
    return availableItemsList.filter((it) => {
      if (checkoutCategoryFilter !== 'all' && it.category !== checkoutCategoryFilter) return false
      if (checkoutItemSearch) {
        const q = checkoutItemSearch.toLowerCase()
        return it.name.toLowerCase().includes(q) || it.category.toLowerCase().includes(q)
      }
      return true
    })
  }, [availableItemsList, checkoutCategoryFilter, checkoutItemSearch])

  // ── Filtered Inventory ─────────────────────────────────────────────────────
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      if (!isFullManager && item.quantity_available <= 0) {
        return false
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchName = item.name.toLowerCase().includes(q)
        const matchCat = item.category.toLowerCase().includes(q)
        const matchLoc = (item.location_stored || '').toLowerCase().includes(q)
        if (!matchName && !matchCat && !matchLoc) return false
      }

      if (selectedCategories.length > 0) {
        if (!selectedCategories.includes(item.category)) return false
      }

      if (selectedConditions.length > 0) {
        const breakdown = getItemConditionBreakdown(item)
        const hasMatchingCondition = selectedConditions.some((condKey) => {
          if (condKey === 'good') return breakdown.good > 0
          if (condKey === 'fair') return breakdown.fair > 0
          if (condKey === 'needs_repair') return breakdown.needs_repair > 0
          if (condKey === 'damaged') return breakdown.damaged > 0
          return false
        })
        if (!hasMatchingCondition) return false
      }

      if (selectedLocations.length > 0) {
        const itemLocKey = item.troop_id ? item.troop_id : 'central'
        if (!selectedLocations.includes(itemLocKey)) return false
      }

      return true
    })
  }, [inventory, isFullManager, searchQuery, selectedCategories, selectedConditions, selectedLocations])

  const activeFiltersCount = selectedCategories.length + selectedLocations.length + selectedConditions.length

  // Locations List
  const locationOptions = useMemo(() => {
    return [
      { id: 'central', label: 'Group Central Depot (عام لكل الفوج)' },
      ...troops.map((t) => ({ id: t.id, label: `${t.name} Locker` })),
    ]
  }, [troops])

  const distinctDepotLocations = useMemo(() => {
    const locSet = new Set<string>()
    inventory.forEach((i) => {
      if (i.location_stored && i.location_stored.trim()) {
        locSet.add(i.location_stored.trim())
      }
    })
    return Array.from(locSet).sort()
  }, [inventory])

  // Items for Stock Count (Jard Mode)
  const auditVisibleItems = useMemo(() => {
    return inventory.filter((item) => {
      if (auditLocationFilter !== 'all') {
        if (item.location_stored?.trim() !== auditLocationFilter) return false
      }
      if (auditUncheckedOnly) {
        const auditState = auditMap[item.id]
        if (auditState && auditState.isAudited) return false
      }
      return true
    })
  }, [inventory, auditLocationFilter, auditUncheckedOnly, auditMap])

  const auditProgressCount = useMemo(() => {
    return Object.values(auditMap).filter((s) => s.isAudited).length
  }, [auditMap])

  const getCategoryMeta = (catId: string) => {
    const found = INVENTORY_CATEGORIES.find((c) => c.id === catId || c.label.toLowerCase() === catId.toLowerCase())
    if (found) return found
    return { id: catId, label: catId, ar: catId, color: 'bg-slate-100 text-slate-800 border-slate-200' }
  }

  // Render multi-condition badges on cards
  const renderConditionBreakdownBadges = (item: InventoryItem) => {
    const b = getItemConditionBreakdown(item)
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {b.good > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
            🟢 {b.good} Good
          </span>
        )}
        {b.fair > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
            🟡 {b.fair} Fair
          </span>
        )}
        {b.needs_repair > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-800 border border-orange-200 shrink-0">
            🟠 {b.needs_repair} Repair
          </span>
        )}
        {b.damaged > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 shrink-0">
            🔴 {b.damaged} Damaged
          </span>
        )}
      </div>
    )
  }

  // ── Grouped Checkouts by Event / Troop ─────────────────────────────────────
  const groupedCheckouts = useMemo(() => {
    const visibleCheckouts = checkouts.filter((c) => {
      if (!isFullManager) {
        const isMine = c.checked_out_to === userId
        const isMyTroop = userTroopId && c.troop_id === userTroopId
        if (!isMine && !isMyTroop) return false
      }
      if (checkoutFilterStatus !== 'all' && c.status !== checkoutFilterStatus) {
        return false
      }
      return true
    })

    const groupsMap: Record<
      string,
      {
        key: string
        type: 'event' | 'troop' | 'general'
        title: string
        subtitle?: string
        items: InventoryCheckout[]
        requestedCount: number
        inUseCount: number
        returnPendingCount: number
        returnedCount: number
      }
    > = {}

    visibleCheckouts.forEach((c) => {
      let groupKey = 'general'
      let type: 'event' | 'troop' | 'general' = 'general'
      let title = 'Direct / Council Loans'
      let subtitle = 'General group gear checkouts'

      if (c.event_id) {
        groupKey = `event_${c.event_id}`
        type = 'event'
        title = getEventTitle(c.event_id) || 'Camp / Event'
        subtitle = 'Event Gear Assignment'
      } else if (c.troop_id) {
        groupKey = `troop_${c.troop_id}`
        type = 'troop'
        title = getTroopName(c.troop_id) || 'Troop Unit'
        subtitle = 'Unit Activity & Hike Gear'
      }

      if (!groupsMap[groupKey]) {
        groupsMap[groupKey] = {
          key: groupKey,
          type,
          title,
          subtitle,
          items: [],
          requestedCount: 0,
          inUseCount: 0,
          returnPendingCount: 0,
          returnedCount: 0,
        }
      }

      groupsMap[groupKey].items.push(c)
      if (c.status === 'requested') groupsMap[groupKey].requestedCount++
      if (c.status === 'handed_out') groupsMap[groupKey].inUseCount++
      if (c.status === 'return_pending') groupsMap[groupKey].returnPendingCount++
      if (c.status === 'returned') groupsMap[groupKey].returnedCount++
    })

    return Object.values(groupsMap)
  }, [checkouts, isFullManager, userId, userTroopId, checkoutFilterStatus, events, troops])

  // ── Cart Management Helpers ────────────────────────────────────────────────
  const handleAddToCart = (item: InventoryItem) => {
    const existing = cartItems.find((ci) => ci.item.id === item.id)
    if (existing) {
      if (existing.quantity < item.quantity_available) {
        setCartItems(
          cartItems.map((ci) => (ci.item.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci))
        )
      }
    } else {
      setCartItems([...cartItems, { item, quantity: 1 }])
    }
  }

  const handleUpdateCartQty = (itemId: string, newQty: number) => {
    const item = inventory.find((i) => i.id === itemId)
    if (!item) return

    if (newQty <= 0) {
      setCartItems(cartItems.filter((ci) => ci.item.id !== itemId))
    } else {
      const validQty = Math.min(newQty, item.quantity_available)
      setCartItems(
        cartItems.map((ci) => (ci.item.id === itemId ? { ...ci, quantity: validQty } : ci))
      )
    }
  }

  const handleRemoveFromCart = (itemId: string) => {
    setCartItems(cartItems.filter((ci) => ci.item.id !== itemId))
  }

  // ── 1. Create or Edit Inventory Item with Condition Breakdown ─────────────────
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      showStatus('Please enter an item name.', 'error')
      return
    }

    const g = parseInt(formQtyGood, 10) || 0
    const f = parseInt(formQtyFair, 10) || 0
    const r = parseInt(formQtyNeedsRepair, 10) || 0
    const d = parseInt(formQtyDamaged, 10) || 0
    const total = g + f + r + d

    if (total < 1) {
      showStatus('Total quantity across all conditions must be at least 1.', 'error')
      return
    }

    const finalCategory = formCategory === 'custom' ? (formCustomCategory.trim() || 'other') : formCategory
    const primaryCond = g > 0 ? 'good' : (f > 0 ? 'fair' : (r > 0 ? 'needs_repair' : 'damaged'))

    setIsSubmitting(true)

    try {
      if (editingItem) {
        const onLoan = Math.max(0, editingItem.quantity_total - editingItem.quantity_available)
        // Usable stock in depot = (good + fair) - onLoan
        const newAvailable = Math.max(0, (g + f) - onLoan)

        const payload: any = {
          name: formName.trim(),
          category: finalCategory,
          quantity_total: total,
          quantity_available: newAvailable,
          qty_good: g,
          qty_fair: f,
          qty_needs_repair: r,
          qty_damaged: d,
          condition: primaryCond,
          location_stored: formLocation.trim() || 'Main Depot',
          troop_id: formTroopId || null,
          description: formDescription.trim() || null,
        }

        let { data, error } = await supabase
          .from('quartermaster_inventory')
          .update(payload)
          .eq('id', editingItem.id)
          .select('*')
          .single()

        // Fallback if condition columns not yet added to remote database
        if (error && (error.message.includes('qty_good') || error.code === 'PGRST204')) {
          delete payload.qty_good
          delete payload.qty_fair
          delete payload.qty_needs_repair
          delete payload.qty_damaged
          payload.notes = `[Conditions: Good: ${g}, Fair: ${f}, Repair: ${r}, Damaged: ${d}]`

          const retryRes = await supabase
            .from('quartermaster_inventory')
            .update(payload)
            .eq('id', editingItem.id)
            .select('*')
            .single()

          data = retryRes.data
          error = retryRes.error
        }

        setIsSubmitting(false)
        if (error) {
          showStatus(error.message, 'error')
        } else {
          // Merge local breakdown
          const updatedItem = { ...data, qty_good: g, qty_fair: f, qty_needs_repair: r, qty_damaged: d }
          setInventory((prev) => prev.map((it) => (it.id === updatedItem.id ? updatedItem : it)))
          showStatus(`Equipment "${updatedItem.name}" updated successfully!`)
          setIsAddEditModalOpen(false)
          setEditingItem(null)
        }
      } else {
        const payload: any = {
          group_id: groupId,
          troop_id: formTroopId || null,
          name: formName.trim(),
          category: finalCategory,
          quantity_total: total,
          quantity_available: g + f, // usable initial stock
          qty_good: g,
          qty_fair: f,
          qty_needs_repair: r,
          qty_damaged: d,
          condition: primaryCond,
          location_stored: formLocation.trim() || 'Main Depot',
          description: formDescription.trim() || null,
        }

        let { data, error } = await supabase
          .from('quartermaster_inventory')
          .insert(payload)
          .select('*')
          .single()

        // Fallback if condition columns not yet added to remote database
        if (error && (error.message.includes('qty_good') || error.code === 'PGRST204')) {
          delete payload.qty_good
          delete payload.qty_fair
          delete payload.qty_needs_repair
          delete payload.qty_damaged
          payload.notes = `[Conditions: Good: ${g}, Fair: ${f}, Repair: ${r}, Damaged: ${d}]`

          const retryRes = await supabase
            .from('quartermaster_inventory')
            .insert(payload)
            .select('*')
            .single()

          data = retryRes.data
          error = retryRes.error
        }

        setIsSubmitting(false)
        if (error) {
          showStatus(error.message, 'error')
        } else {
          const newItem = { ...data, qty_good: g, qty_fair: f, qty_needs_repair: r, qty_damaged: d }
          setInventory((prev) => [newItem, ...prev])
          showStatus(`Equipment "${newItem.name}" added to inventory!`)
          setIsAddEditModalOpen(false)
        }
      }
    } catch (err: any) {
      setIsSubmitting(false)
      showStatus(err?.message || 'Error saving item.', 'error')
    }
  }

  // ── 2. Batch Multi-Item Lending Request ──────────────────────────────────────
  const handleBatchCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cartItems.length === 0) {
      showStatus('Please add at least one item to your loan request.', 'error')
      return
    }

    if (checkoutScope === 'event' && !checkoutEventId) {
      showStatus('Please select an event for this loan request.', 'error')
      return
    }

    if (checkoutScope === 'troop' && !canRequestForTroop) {
      showStatus('You must be assigned to a troop to request troop gear.', 'error')
      return
    }

    setIsSubmitting(true)
    const isDirectHandout = isQuartermaster
    const newCheckouts: InventoryCheckout[] = []

    try {
      for (const cartItem of cartItems) {
        const targetTroopId = isTroopLeader ? (userTroopId || checkoutTroopId) : checkoutTroopId

        let insertPayload: any = {
          item_id: cartItem.item.id,
          group_id: groupId,
          checked_out_to: userId,
          quantity: cartItem.quantity,
          checkout_date: checkoutDate,
          return_date: checkoutReturnDate || null,
          notes: checkoutNotes.trim() || null,
          status: isDirectHandout ? 'handed_out' : 'requested',
          handed_out_by: isDirectHandout ? userId : null,
        }

        if (checkoutScope === 'troop' && targetTroopId) {
          insertPayload.troop_id = targetTroopId
        } else if (checkoutScope === 'event' && checkoutEventId) {
          insertPayload.event_id = checkoutEventId
        }

        let { data, error } = await supabase
          .from('inventory_checkouts')
          .insert(insertPayload)
          .select('*')
          .single()

        // Fallback if 'troop_id' is missing in Postgres schema cache
        if (
          error &&
          (error.message.includes('troop_id') ||
            error.code === 'PGRST204' ||
            error.message.includes('schema cache'))
        ) {
          const troopName = getTroopName(targetTroopId) || 'Troop'
          delete insertPayload.troop_id
          insertPayload.notes = `[Troop: ${troopName}] ${insertPayload.notes || ''}`.trim()

          const retryRes = await supabase
            .from('inventory_checkouts')
            .insert(insertPayload)
            .select('*')
            .single()

          data = retryRes.data
          error = retryRes.error
        }

        if (error) {
          throw error
        }

        newCheckouts.push(data)

        if (isDirectHandout) {
          const newAvail = Math.max(0, cartItem.item.quantity_available - cartItem.quantity)
          await supabase
            .from('quartermaster_inventory')
            .update({ quantity_available: newAvail })
            .eq('id', cartItem.item.id)

          setInventory((prev) =>
            prev.map((it) => (it.id === cartItem.item.id ? { ...it, quantity_available: newAvail } : it))
          )
        }
      }

      setIsSubmitting(false)
      setCheckouts((prev) => [...newCheckouts, ...prev])
      showStatus(
        isDirectHandout
          ? `${cartItems.length} item type(s) handed out successfully!`
          : `Batch loan request for ${cartItems.length} item(s) submitted for approval!`
      )
      setCartItems([])
      setIsCheckoutModalOpen(false)
    } catch (err: any) {
      setIsSubmitting(false)
      showStatus(err?.message || 'Error submitting loan request.', 'error')
    }
  }

  // ── 3. Approve Handout (Single) ──────────────────────────────────────────────
  const handleApproveHandout = async (checkout: InventoryCheckout) => {
    const item = inventory.find((i) => i.id === checkout.item_id)
    if (!item || item.quantity_available < checkout.quantity) {
      showStatus('Not enough available stock to hand out this request.', 'error')
      return
    }

    setBatchActionLoadingId(checkout.id)
    const { data, error } = await supabase
      .from('inventory_checkouts')
      .update({
        status: 'handed_out',
        handed_out_by: userId,
      })
      .eq('id', checkout.id)
      .select('*')
      .single()

    if (error) {
      setBatchActionLoadingId(null)
      showStatus(error.message, 'error')
      return
    }

    const newAvail = Math.max(0, item.quantity_available - checkout.quantity)
    await supabase
      .from('quartermaster_inventory')
      .update({ quantity_available: newAvail })
      .eq('id', item.id)

    setInventory((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, quantity_available: newAvail } : it))
    )

    setCheckouts((prev) => prev.map((c) => (c.id === data.id ? data : c)))
    setBatchActionLoadingId(null)
    showStatus(`Equipment marked as handed out! Available stock updated.`)
  }

  // ── 3B. Approve All Pending for a Group (Batch QM Action) ─────────────────────
  const handleApproveAllPending = async (groupItems: InventoryCheckout[], groupKey: string) => {
    const pendingItems = groupItems.filter((c) => c.status === 'requested')
    if (pendingItems.length === 0) return

    setBatchActionLoadingId(`${groupKey}-approve`)
    try {
      const updatedList: InventoryCheckout[] = []

      for (const checkout of pendingItems) {
        const item = inventory.find((i) => i.id === checkout.item_id)
        if (!item || item.quantity_available < checkout.quantity) continue

        const { data, error } = await supabase
          .from('inventory_checkouts')
          .update({
            status: 'handed_out',
            handed_out_by: userId,
          })
          .eq('id', checkout.id)
          .select('*')
          .single()

        if (!error && data) {
          updatedList.push(data)
          const newAvail = Math.max(0, item.quantity_available - checkout.quantity)
          await supabase
            .from('quartermaster_inventory')
            .update({ quantity_available: newAvail })
            .eq('id', item.id)

          setInventory((prev) =>
            prev.map((it) => (it.id === item.id ? { ...it, quantity_available: newAvail } : it))
          )
        }
      }

      setCheckouts((prev) =>
        prev.map((c) => {
          const match = updatedList.find((u) => u.id === c.id)
          return match || c
        })
      )
      setBatchActionLoadingId(null)
      showStatus(`Approved and handed out ${updatedList.length} gear item(s)!`, 'success')
    } catch (err: any) {
      setBatchActionLoadingId(null)
      showStatus(err?.message || 'Error during batch approval.', 'error')
    }
  }

  // ── 3C. Mark All In-Use for Return (Batch Leader Action) ─────────────────────
  const handleMarkAllForReturn = async (groupItems: InventoryCheckout[], groupKey: string) => {
    const inUseItems = groupItems.filter((c) => c.status === 'handed_out')
    if (inUseItems.length === 0) return

    setBatchActionLoadingId(`${groupKey}-return-all`)
    try {
      const updatedList: InventoryCheckout[] = []

      for (const checkout of inUseItems) {
        const { data, error } = await supabase
          .from('inventory_checkouts')
          .update({ status: 'return_pending' })
          .eq('id', checkout.id)
          .select('*')
          .single()

        if (!error && data) {
          updatedList.push(data)
        }
      }

      setCheckouts((prev) =>
        prev.map((c) => {
          const match = updatedList.find((u) => u.id === c.id)
          return match || c
        })
      )
      setBatchActionLoadingId(null)
      showStatus(`Marked ${updatedList.length} item(s) as returned! Awaiting Quartermaster check-in.`, 'success')
    } catch (err: any) {
      setBatchActionLoadingId(null)
      showStatus(err?.message || 'Error marking all items for return.', 'error')
    }
  }

  // ── 3D. Check-In & Restock All Returned (Batch QM Action) ────────────────────
  const handleCheckInAllReturned = async (groupItems: InventoryCheckout[], groupKey: string) => {
    const pendingReturnItems = groupItems.filter((c) => c.status === 'return_pending')
    if (pendingReturnItems.length === 0) return

    setBatchActionLoadingId(`${groupKey}-checkin-all`)
    const todayStr = new Date().toISOString().split('T')[0]

    try {
      const updatedList: InventoryCheckout[] = []

      for (const checkout of pendingReturnItems) {
        const { data, error } = await supabase
          .from('inventory_checkouts')
          .update({
            status: 'returned',
            actual_return_date: todayStr,
            returned_condition: 'good',
            received_by: userId,
          })
          .eq('id', checkout.id)
          .select('*')
          .single()

        if (!error && data) {
          updatedList.push(data)
          const item = inventory.find((i) => i.id === checkout.item_id)
          if (item) {
            const b = getItemConditionBreakdown(item)
            const newGood = b.good + checkout.quantity
            const newAvail = Math.min(item.quantity_total, item.quantity_available + checkout.quantity)
            
            await supabase
              .from('quartermaster_inventory')
              .update({
                quantity_available: newAvail,
                qty_good: newGood,
              })
              .eq('id', item.id)

            setInventory((prev) =>
              prev.map((it) =>
                it.id === item.id ? { ...it, quantity_available: newAvail, qty_good: newGood } : it
              )
            )
          }
        }
      }

      setCheckouts((prev) =>
        prev.map((c) => {
          const match = updatedList.find((u) => u.id === c.id)
          return match || c
        })
      )
      setBatchActionLoadingId(null)
      showStatus(`Checked in and replenished ${updatedList.length} returned item(s)!`, 'success')
    } catch (err: any) {
      setBatchActionLoadingId(null)
      showStatus(err?.message || 'Error checking in all items.', 'error')
    }
  }

  // ── 3E. Save Stock Count (Jard El Tejhizet) with Breakdown ──────────────────
  const handleSaveStockCount = async () => {
    setIsSavingAudit(true)
    const modifiedItems: InventoryItem[] = []

    try {
      for (const item of inventory) {
        const auditState = auditMap[item.id]
        if (!auditState || !auditState.isAudited) continue

        const onLoanQty = Math.max(0, item.quantity_total - item.quantity_available)
        const inDepotUsable = auditState.qtyGood + auditState.qtyFair
        const newAvailable = inDepotUsable
        const newTotal = inDepotUsable + auditState.qtyNeedsRepair + auditState.qtyDamaged + onLoanQty
        const primaryCond = auditState.qtyGood > 0 ? 'good' : (auditState.qtyFair > 0 ? 'fair' : (auditState.qtyNeedsRepair > 0 ? 'needs_repair' : 'damaged'))

        const payload: any = {
          quantity_available: newAvailable,
          quantity_total: newTotal,
          qty_good: auditState.qtyGood,
          qty_fair: auditState.qtyFair,
          qty_needs_repair: auditState.qtyNeedsRepair,
          qty_damaged: auditState.qtyDamaged,
          condition: primaryCond,
        }

        let { data, error } = await supabase
          .from('quartermaster_inventory')
          .update(payload)
          .eq('id', item.id)
          .select('*')
          .single()

        if (error && (error.message.includes('qty_good') || error.code === 'PGRST204')) {
          delete payload.qty_good
          delete payload.qty_fair
          delete payload.qty_needs_repair
          delete payload.qty_damaged
          const retryRes = await supabase
            .from('quartermaster_inventory')
            .update(payload)
            .eq('id', item.id)
            .select('*')
            .single()
          data = retryRes.data
          error = retryRes.error
        }

        if (!error && data) {
          modifiedItems.push({
            ...data,
            qty_good: auditState.qtyGood,
            qty_fair: auditState.qtyFair,
            qty_needs_repair: auditState.qtyNeedsRepair,
            qty_damaged: auditState.qtyDamaged,
          })
        }
      }

      if (modifiedItems.length > 0) {
        setInventory((prev) =>
          prev.map((it) => {
            const match = modifiedItems.find((m) => m.id === it.id)
            return match || it
          })
        )
      }

      setIsSavingAudit(false)
      setIsAuditModeOpen(false)
      showStatus(
        `Stock Count complete! Audited ${auditProgressCount} items (${modifiedItems.length} adjusted).`,
        'success'
      )
    } catch (err: any) {
      setIsSavingAudit(false)
      showStatus(err?.message || 'Error saving stock count.', 'error')
    }
  }

  // ── 4. Decline Checkout ──────────────────────────────────────────────────────
  const handleDeclineCheckout = async (checkout: InventoryCheckout) => {
    setBatchActionLoadingId(checkout.id)
    const { data, error } = await supabase
      .from('inventory_checkouts')
      .update({ status: 'rejected' })
      .eq('id', checkout.id)
      .select('*')
      .single()

    setBatchActionLoadingId(null)
    if (error) {
      showStatus(error.message, 'error')
    } else {
      setCheckouts((prev) => prev.map((c) => (c.id === data.id ? data : c)))
      showStatus(`Checkout request declined.`)
    }
  }

  // ── 5. Requester Marks for Return ───────────────────────────────────────────
  const handleMarkReturnPending = async (checkout: InventoryCheckout) => {
    setBatchActionLoadingId(checkout.id)
    const { data, error } = await supabase
      .from('inventory_checkouts')
      .update({ status: 'return_pending' })
      .eq('id', checkout.id)
      .select('*')
      .single()

    setBatchActionLoadingId(null)
    if (error) {
      showStatus(error.message, 'error')
    } else {
      setCheckouts((prev) => prev.map((c) => (c.id === data.id ? data : c)))
      showStatus(`Marked as returned! Awaiting Quartermaster check-in.`)
    }
  }

  // ── 6. Quartermaster Completes Return & Inspection with Breakdown ───────────
  const handleCompleteReturn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inspectingCheckout) return

    const totalInspected =
      returnBreakdown.good + returnBreakdown.fair + returnBreakdown.needs_repair + returnBreakdown.damaged

    if (totalInspected !== inspectingCheckout.quantity) {
      showStatus(
        `Total condition quantities (${totalInspected}) must equal the returned quantity (${inspectingCheckout.quantity}).`,
        'error'
      )
      return
    }

    setIsSubmitting(true)
    const todayStr = new Date().toISOString().split('T')[0]
    const primaryCond =
      returnBreakdown.good > 0
        ? 'good'
        : returnBreakdown.fair > 0
        ? 'fair'
        : returnBreakdown.needs_repair > 0
        ? 'needs_repair'
        : 'damaged'

    const returnCondSummary = `Good: ${returnBreakdown.good}, Fair: ${returnBreakdown.fair}, Repair: ${returnBreakdown.needs_repair}, Damaged: ${returnBreakdown.damaged}`

    const { data, error } = await supabase
      .from('inventory_checkouts')
      .update({
        status: 'returned',
        actual_return_date: todayStr,
        returned_condition: primaryCond,
        notes: returnInspectionNotes.trim()
          ? `${inspectingCheckout.notes ? inspectingCheckout.notes + ' | ' : ''}Inspection [${returnCondSummary}]: ${returnInspectionNotes.trim()}`
          : `${inspectingCheckout.notes ? inspectingCheckout.notes + ' | ' : ''}[${returnCondSummary}]`,
        received_by: userId,
      })
      .eq('id', inspectingCheckout.id)
      .select('*')
      .single()

    if (error) {
      setIsSubmitting(false)
      showStatus(error.message, 'error')
      return
    }

    const item = inventory.find((i) => i.id === inspectingCheckout.item_id)
    if (item) {
      const b = getItemConditionBreakdown(item)
      const newGood = b.good + returnBreakdown.good
      const newFair = b.fair + returnBreakdown.fair
      const newRepair = b.needs_repair + returnBreakdown.needs_repair
      const newDamaged = b.damaged + returnBreakdown.damaged

      // Usable returned = good + fair
      const usableReturned = returnBreakdown.good + returnBreakdown.fair
      const newAvail = item.quantity_available + usableReturned

      const itemPayload: any = {
        quantity_available: newAvail,
        qty_good: newGood,
        qty_fair: newFair,
        qty_needs_repair: newRepair,
        qty_damaged: newDamaged,
      }

      await supabase
        .from('quartermaster_inventory')
        .update(itemPayload)
        .eq('id', item.id)

      setInventory((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? {
                ...it,
                quantity_available: newAvail,
                qty_good: newGood,
                qty_fair: newFair,
                qty_needs_repair: newRepair,
                qty_damaged: newDamaged,
              }
            : it
        )
      )
    }

    setCheckouts((prev) => prev.map((c) => (c.id === data.id ? data : c)))
    setIsSubmitting(false)
    showStatus(`Return confirmed! Stock replenished across condition tiers.`)
    setInspectingCheckout(null)
  }

  // ── 7. Submit Write-Off Request ──────────────────────────────────────────────
  const handleSubmitWriteoff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!writeoffItem) return

    const qty = parseInt(writeoffQty, 10)
    if (isNaN(qty) || qty < 1 || qty > writeoffItem.quantity_total) {
      showStatus(`Please choose a quantity between 1 and ${writeoffItem.quantity_total}.`, 'error')
      return
    }

    const finalReason =
      writeoffReason === 'Other / Custom reason' ? (writeoffCustomReason.trim() || 'Damaged') : writeoffReason

    setIsSubmitting(true)

    const { data, error } = await supabase
      .from('inventory_writeoffs')
      .insert({
        item_id: writeoffItem.id,
        group_id: groupId,
        quantity: qty,
        reason: finalReason,
        notes: writeoffNotes.trim() || null,
        status: 'pending',
        requested_by: userId,
      })
      .select('*')
      .single()

    setIsSubmitting(false)
    if (error) {
      showStatus(error.message, 'error')
    } else {
      setWriteoffs((prev) => [data, ...prev])
      showStatus(`Write-off request submitted for Group Leader approval!`)
      setIsWriteoffModalOpen(false)
      setWriteoffItem(null)
    }
  }

  // ── 8. Approve Write-Off (Group Leader Only) ─────────────────────────────────
  const handleApproveWriteoff = async (writeoff: InventoryWriteoff) => {
    const item = inventory.find((i) => i.id === writeoff.item_id)
    if (!item) {
      showStatus('Associated inventory item not found.', 'error')
      return
    }

    setIsSubmitting(true)

    const { data, error } = await supabase
      .from('inventory_writeoffs')
      .update({
        status: 'approved',
        approved_by: userId,
        actioned_at: new Date().toISOString(),
      })
      .eq('id', writeoff.id)
      .select('*')
      .single()

    if (error) {
      setIsSubmitting(false)
      showStatus(error.message, 'error')
      return
    }

    const b = getItemConditionBreakdown(item)
    // Deduct voided qty primarily from damaged or needs_repair
    let remainToDeduct = writeoff.quantity
    let newDamaged = b.damaged
    let newRepair = b.needs_repair
    let newFair = b.fair
    let newGood = b.good

    if (newDamaged >= remainToDeduct) {
      newDamaged -= remainToDeduct
      remainToDeduct = 0
    } else {
      remainToDeduct -= newDamaged
      newDamaged = 0
    }

    if (remainToDeduct > 0 && newRepair >= remainToDeduct) {
      newRepair -= remainToDeduct
      remainToDeduct = 0
    } else if (remainToDeduct > 0) {
      remainToDeduct -= newRepair
      newRepair = 0
    }

    if (remainToDeduct > 0 && newFair >= remainToDeduct) {
      newFair -= remainToDeduct
      remainToDeduct = 0
    } else if (remainToDeduct > 0) {
      remainToDeduct -= newFair
      newFair = 0
    }

    if (remainToDeduct > 0) {
      newGood = Math.max(0, newGood - remainToDeduct)
    }

    const newTotal = Math.max(0, item.quantity_total - writeoff.quantity)
    const newAvailable = Math.max(0, (newGood + newFair) - Math.max(0, item.quantity_total - item.quantity_available))

    await supabase
      .from('quartermaster_inventory')
      .update({
        quantity_total: newTotal,
        quantity_available: newAvailable,
        qty_good: newGood,
        qty_fair: newFair,
        qty_needs_repair: newRepair,
        qty_damaged: newDamaged,
      })
      .eq('id', item.id)

    setInventory((prev) =>
      prev.map((it) =>
        it.id === item.id
          ? {
              ...it,
              quantity_total: newTotal,
              quantity_available: newAvailable,
              qty_good: newGood,
              qty_fair: newFair,
              qty_needs_repair: newRepair,
              qty_damaged: newDamaged,
            }
          : it
      )
    )

    setWriteoffs((prev) => prev.map((w) => (w.id === data.id ? data : w)))
    setIsSubmitting(false)
    showStatus(`Write-off approved! ${writeoff.quantity} item(s) permanently voided.`)
  }

  // ── 9. Reject Write-Off ──────────────────────────────────────────────────────
  const handleRejectWriteoff = async (writeoff: InventoryWriteoff) => {
    const reasonPrompt = prompt('Enter a reason for rejecting this write-off request (optional):')
    if (reasonPrompt === null) return

    setIsSubmitting(true)

    const { data, error } = await supabase
      .from('inventory_writeoffs')
      .update({
        status: 'rejected',
        approved_by: userId,
        rejection_reason: reasonPrompt.trim() || 'Declined by Group Leader',
        actioned_at: new Date().toISOString(),
      })
      .eq('id', writeoff.id)
      .select('*')
      .single()

    setIsSubmitting(false)
    if (error) {
      showStatus(error.message, 'error')
    } else {
      setWriteoffs((prev) => prev.map((w) => (w.id === data.id ? data : w)))
      showStatus(`Write-off request rejected.`)
    }
  }

  return (
    <DashboardShell
      groupName={groupName}
      currentRole={currentRole}
      userName={userName}
    >
      <div className="space-y-3 w-full">
        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2 text-xs font-bold transition-all animate-in fade-in slide-in-from-top-4 ${
              statusMessage.type === 'success'
                ? 'bg-teal-900 text-white border-teal-700'
                : 'bg-rose-900 text-white border-rose-700'
            }`}
          >
            {statusMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-teal-300" /> : <AlertTriangle className="h-4 w-4 text-rose-300" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* ── NATIVE MOBILE-FIRST HEADER & SEGMENTED CONTROLS ── */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
          {/* Row 1: App Title & Subtitle */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0 shadow-2xs">
                <Package className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">
                  {isFullManager ? 'Equipment & Gear' : 'Activity Gear'}
                </h1>
                <p className="text-[11px] text-slate-500 truncate">
                  {isFullManager
                    ? 'Quartermaster Depot & Group Logistics'
                    : 'Manage activity loans and borrow equipment'}
                </p>
              </div>
            </div>

            {/* Desktop Action Buttons (Hidden on Mobile, Rendered in Mobile Pill Row Below) */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              {isFullManager && (
                <button
                  onClick={handleStartAudit}
                  className="bg-purple-50 hover:bg-purple-100 active:scale-95 text-purple-900 font-bold px-3 py-2 rounded-xl text-xs border border-purple-200 transition-all flex items-center gap-1.5 shadow-2xs"
                  title="Perform Stock Count (Jard)"
                >
                  <ClipboardCheck className="h-4 w-4 text-purple-700" />
                  <span>Stock Count (*Jard*)</span>
                </button>
              )}

              <button
                onClick={() => {
                  setCartItems([])
                  setIsCheckoutModalOpen(true)
                }}
                className="bg-teal-700 hover:bg-teal-600 active:scale-95 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all shadow-2xs flex items-center gap-1.5"
              >
                <Send className="h-4 w-4" />
                <span>Request Gear</span>
              </button>

              {isFullManager && (
                <button
                  onClick={() => {
                    setEditingItem(null)
                    setFormName('')
                    setFormCategory('tents')
                    setFormCustomCategory('')
                    setFormQtyGood('1')
                    setFormQtyFair('0')
                    setFormQtyNeedsRepair('0')
                    setFormQtyDamaged('0')
                    setFormLocation('Main Depot')
                    setFormTroopId('')
                    setFormDescription('')
                    setIsAddEditModalOpen(true)
                  }}
                  className="bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all shadow-2xs flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Item</span>
                </button>
              )}
            </div>
          </div>

          {/* Row 2 (Mobile Only): Touch-Friendly Action Pill Strip */}
          <div className="grid grid-cols-3 gap-2 sm:hidden pt-0.5">
            <button
              onClick={() => {
                setCartItems([])
                setIsCheckoutModalOpen(true)
              }}
              className="col-span-1 bg-teal-700 active:bg-teal-800 text-white font-black py-2 px-2 rounded-xl text-[11px] transition-all shadow-2xs flex items-center justify-center gap-1 active:scale-95"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Request</span>
            </button>

            {isFullManager && (
              <>
                <button
                  onClick={handleStartAudit}
                  className="bg-purple-50 active:bg-purple-100 text-purple-900 font-black py-2 px-2 rounded-xl text-[11px] border border-purple-200 transition-all flex items-center justify-center gap-1 shadow-2xs active:scale-95"
                >
                  <ClipboardCheck className="h-3.5 w-3.5 text-purple-700" />
                  <span>Jard Count</span>
                </button>

                <button
                  onClick={() => {
                    setEditingItem(null)
                    setFormName('')
                    setFormCategory('tents')
                    setFormCustomCategory('')
                    setFormQtyGood('1')
                    setFormQtyFair('0')
                    setFormQtyNeedsRepair('0')
                    setFormQtyDamaged('0')
                    setFormLocation('Main Depot')
                    setFormTroopId('')
                    setFormDescription('')
                    setIsAddEditModalOpen(true)
                  }}
                  className="bg-slate-900 active:bg-slate-800 text-white font-black py-2 px-2 rounded-xl text-[11px] transition-all shadow-2xs flex items-center justify-center gap-1 active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Item</span>
                </button>
              </>
            )}
          </div>

          {/* Row 3: iOS Native Segmented Tab Control */}
          <div className="bg-slate-100/90 p-1 rounded-xl flex items-center gap-1 border border-slate-200/70">
            {isFullManager && (
              <button
                onClick={() => setActiveTab('catalog')}
                className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'catalog'
                    ? 'bg-teal-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Package className="h-3.5 w-3.5" />
                <span>Catalog ({inventory.length})</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('checkouts')}
              className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'checkouts'
                  ? 'bg-teal-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{isFullManager ? 'Loans' : 'My Loans'}</span>
              <span className="opacity-70 font-normal">({checkouts.length})</span>
              {pendingCheckoutsCount > 0 && isFullManager && (
                <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full ml-0.5">
                  {pendingCheckoutsCount}
                </span>
              )}
              {returnPendingCount > 0 && isFullManager && (
                <span className="bg-purple-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full ml-0.5">
                  {returnPendingCount}
                </span>
              )}
            </button>

            {isFullManager && (
              <button
                onClick={() => setActiveTab('writeoffs')}
                className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'writeoffs'
                    ? 'bg-teal-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Archive className="h-3.5 w-3.5" />
                <span>Voided ({writeoffs.length})</span>
              </button>
            )}

            {isGroupLeader && (
              <button
                onClick={() => setActiveTab('approvals')}
                className={`py-2 px-3 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                  activeTab === 'approvals'
                    ? 'bg-teal-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Approvals</span>
                {pendingApprovalsCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse ml-0.5">
                    {pendingApprovalsCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Search & Filter Bar (Quartermaster Catalog Tab Only) */}
          {activeTab === 'catalog' && isFullManager && (
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search gear by name, category, depot…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-medium"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setIsFilterSheetOpen(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 ${
                    activeFiltersCount > 0
                      ? 'bg-teal-700 text-white border-teal-800 shadow-2xs'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span>Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}</span>
                </button>
              </div>

              {/* Active Filter Tags */}
              {(selectedCategories.length > 0 || selectedLocations.length > 0 || selectedConditions.length > 0 || searchQuery) && (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] font-black uppercase text-slate-400 mr-1">Active:</span>

                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800">
                      &quot;{searchQuery}&quot;
                      <button onClick={() => setSearchQuery('')}><X className="h-2.5 w-2.5 text-slate-400 hover:text-rose-600" /></button>
                    </span>
                  )}

                  {selectedCategories.map((cId) => {
                    const meta = getCategoryMeta(cId)
                    return (
                      <span key={cId} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${meta.color}`}>
                        {meta.label}
                        <button onClick={() => setSelectedCategories(selectedCategories.filter((id) => id !== cId))}>
                          <X className="h-2.5 w-2.5 opacity-60 hover:opacity-100" />
                        </button>
                      </span>
                    )
                  })}

                  {selectedLocations.map((lId) => {
                    const loc = locationOptions.find((o) => o.id === lId)
                    return (
                      <span key={lId} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                        {loc?.label.split(' ')[0] || lId}
                        <button onClick={() => setSelectedLocations(selectedLocations.filter((id) => id !== lId))}>
                          <X className="h-2.5 w-2.5 text-slate-400 hover:text-rose-600" />
                        </button>
                      </span>
                    )
                  })}

                  {selectedConditions.map((cId) => {
                    const cond = CONDITIONS.find((c) => c.id === cId)
                    return (
                      <span key={cId} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                        {cond?.label.split(' ')[0] || cId}
                        <button onClick={() => setSelectedConditions(selectedConditions.filter((id) => id !== cId))}>
                          <X className="h-2.5 w-2.5 text-slate-400 hover:text-rose-600" />
                        </button>
                      </span>
                    )
                  })}

                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedCategories([])
                      setSelectedLocations([])
                      setSelectedConditions([])
                    }}
                    className="text-[10px] font-bold text-rose-600 hover:underline ml-1"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 1: NATIVE MOBILE CATALOG CARDS (WITH CONDITION BREAKDOWNS)
        ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'catalog' && isFullManager && (
          <div className="space-y-2">
            {filteredInventory.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400 space-y-2 shadow-xs">
                <Package className="h-8 w-8 mx-auto opacity-30" />
                <p className="font-bold text-slate-600 text-xs">No equipment matches the selected filters.</p>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedCategories([])
                      setSelectedLocations([])
                      setSelectedConditions([])
                    }}
                    className="text-xs font-bold text-teal-700 hover:underline"
                  >
                    Reset all filters
                  </button>
                )}
              </div>
            ) : (
              filteredInventory.map((item) => {
                const catMeta = getCategoryMeta(item.category)
                const troopName = getTroopName(item.troop_id)
                const pendingWriteoffQty = pendingWriteoffsMap[item.id] || 0
                const isAvailable = item.quantity_available > 0

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs space-y-2.5 transition-all hover:border-slate-300"
                  >
                    {/* Top Row: Full Name + Availability Pill */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <h3 className="font-black text-slate-900 text-sm leading-snug break-words">
                          {item.name}
                        </h3>

                        {/* Category & Condition Breakdown Row */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${catMeta.color}`}>
                            {catMeta.label}
                          </span>
                          {renderConditionBreakdownBadges(item)}
                          {pendingWriteoffQty > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-800 border border-rose-300">
                              ⚠️ Voiding ({pendingWriteoffQty})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stock Pill: Usable Available vs Total */}
                      <div className="shrink-0 text-right">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-xl text-xs font-black border ${
                            isAvailable
                              ? 'bg-teal-50 text-teal-900 border-teal-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {item.quantity_available} <span className="font-normal text-[10px] text-slate-400">/ {item.quantity_total}</span>
                        </span>
                        <span className="block text-[9px] text-slate-400 mt-0.5 font-bold">
                          {isAvailable ? `${item.quantity_available} ready to lend` : '0 usable in depot'}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Location & Actions */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100/80 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate">{item.location_stored || 'Main Depot'}</span>
                        <span>•</span>
                        <span className="truncate font-medium">{troopName ? troopName : 'Group Central'}</span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Manager Edit */}
                        <button
                          onClick={() => {
                            setEditingItem(item)
                            setFormName(item.name)
                            const matchCat = INVENTORY_CATEGORIES.find((c) => c.id === item.category)
                            if (matchCat) {
                              setFormCategory(item.category)
                              setFormCustomCategory('')
                            } else {
                              setFormCategory('custom')
                              setFormCustomCategory(item.category)
                            }
                            const b = getItemConditionBreakdown(item)
                            setFormQtyGood(String(b.good))
                            setFormQtyFair(String(b.fair))
                            setFormQtyNeedsRepair(String(b.needs_repair))
                            setFormQtyDamaged(String(b.damaged))
                            setFormLocation(item.location_stored || 'Main Depot')
                            setFormTroopId(item.troop_id || '')
                            setFormDescription(item.description || '')
                            setIsAddEditModalOpen(true)
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 active:scale-95"
                          title="Edit Equipment & Quantities"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>

                        {/* Manager Void */}
                        <button
                          onClick={() => {
                            setWriteoffItem(item)
                            setWriteoffQty('1')
                            setWriteoffReason(WRITEOFF_REASONS[0])
                            setWriteoffCustomReason('')
                            setWriteoffNotes('')
                            setIsWriteoffModalOpen(true)
                          }}
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 active:scale-95"
                          title="Decommission Damaged"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>

                        {/* Lend Button */}
                        <button
                          onClick={() => {
                            setCartItems([{ item, quantity: 1 }])
                            setIsCheckoutModalOpen(true)
                          }}
                          disabled={!isAvailable}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1 active:scale-95 ${
                            isAvailable
                              ? 'bg-teal-700 hover:bg-teal-600 text-white'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <Send className="h-3 w-3" />
                          <span>Lend</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 2: GROUPED LENDING & CHECKOUTS (WITH CONFIRMATION MODALS)
        ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'checkouts' && (
          <div className="space-y-3">
            {/* Status Filter Chips */}
            <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setCheckoutFilterStatus('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  checkoutFilterStatus === 'all' ? 'bg-slate-800 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Loans ({checkouts.length})
              </button>
              <button
                onClick={() => setCheckoutFilterStatus('requested')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                  checkoutFilterStatus === 'requested'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <Clock className="h-3 w-3" />
                <span>Pending ({pendingCheckoutsCount})</span>
              </button>
              <button
                onClick={() => setCheckoutFilterStatus('handed_out')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                  checkoutFilterStatus === 'handed_out'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200'
                }`}
              >
                <Package className="h-3 w-3" />
                <span>In Use</span>
              </button>
              <button
                onClick={() => setCheckoutFilterStatus('return_pending')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                  checkoutFilterStatus === 'return_pending'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
                }`}
              >
                <RefreshCw className="h-3 w-3" />
                <span>Awaiting Check-in ({returnPendingCount})</span>
              </button>
              <button
                onClick={() => setCheckoutFilterStatus('returned')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                  checkoutFilterStatus === 'returned'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>Returned</span>
              </button>
            </div>

            {/* Grouped Folders List */}
            {groupedCheckouts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-12 text-center text-slate-400 space-y-2">
                <Layers className="h-8 w-8 mx-auto opacity-30" />
                <p className="font-bold text-slate-600 text-xs">No equipment loans found in this status.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {groupedCheckouts.map((group) => {
                  const isExpanded = expandedGroupIds[group.key] ?? true
                  const isEvent = group.type === 'event'
                  const isTroop = group.type === 'troop'

                  const isApprovingAll = batchActionLoadingId === `${group.key}-approve`
                  const isReturningAll = batchActionLoadingId === `${group.key}-return-all`
                  const isCheckingInAll = batchActionLoadingId === `${group.key}-checkin-all`

                  return (
                    <div
                      key={group.key}
                      className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all"
                    >
                      {/* Group Header Card */}
                      <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
                        <button
                          type="button"
                          onClick={() => toggleGroupExpand(group.key)}
                          className="flex items-center gap-3 min-w-0 flex-1 text-left"
                        >
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                              isEvent
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : isTroop
                                ? 'bg-teal-50 text-teal-800 border-teal-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {isEvent ? <Tent className="h-4 w-4" /> : isTroop ? <Users className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-slate-900 text-sm truncate">{group.title}</span>
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate">{group.subtitle}</p>
                          </div>
                        </button>

                        {/* Batch Action Buttons on Header */}
                        <div className="flex items-center gap-2 flex-wrap shrink-0 justify-end">
                          {/* Quartermaster: Approve All Pending with Confirmation */}
                          {group.requestedCount > 0 && isFullManager && (
                            <button
                              type="button"
                              disabled={Boolean(batchActionLoadingId)}
                              onClick={() => {
                                setConfirmDialog({
                                  title: 'Confirm Handout Approval',
                                  message: `Are you sure you want to approve and hand out all ${group.requestedCount} pending gear item(s) for "${group.title}"? Stock will be deducted from depot.`,
                                  confirmLabel: 'Approve & Hand Out All',
                                  confirmStyle: 'amber',
                                  onConfirm: () => handleApproveAllPending(group.items, group.key),
                                })
                              }}
                              className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-2.5 py-1.5 rounded-xl text-xs shadow-2xs transition-colors flex items-center gap-1 disabled:opacity-50 active:scale-95"
                            >
                              {isApprovingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              <span>Approve All ({group.requestedCount})</span>
                            </button>
                          )}

                          {/* Leader: Mark All for Return with Confirmation */}
                          {group.inUseCount > 0 && (
                            <button
                              type="button"
                              disabled={Boolean(batchActionLoadingId)}
                              onClick={() => {
                                setConfirmDialog({
                                  title: 'Confirm Equipment Return',
                                  message: `Are you sure you want to mark all ${group.inUseCount} item(s) from "${group.title}" as returned to depot? The Quartermaster will inspect and check them in.`,
                                  confirmLabel: 'Yes, Mark All Returned',
                                  confirmStyle: 'teal',
                                  onConfirm: () => handleMarkAllForReturn(group.items, group.key),
                                })
                              }}
                              className="bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold px-2.5 py-1.5 rounded-xl text-xs border border-purple-200 transition-colors flex items-center gap-1 disabled:opacity-50 active:scale-95"
                            >
                              {isReturningAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                              <span>Return All ({group.inUseCount})</span>
                            </button>
                          )}

                          {/* Quartermaster: Check In All Returned with Confirmation */}
                          {group.returnPendingCount > 0 && isFullManager && (
                            <button
                              type="button"
                              disabled={Boolean(batchActionLoadingId)}
                              onClick={() => {
                                setConfirmDialog({
                                  title: 'Confirm Depot Check-In',
                                  message: `Are you sure you want to check in all ${group.returnPendingCount} returned item(s) for "${group.title}" into available depot stock (Condition: Good)?`,
                                  confirmLabel: 'Confirm Check-In & Restock All',
                                  confirmStyle: 'emerald',
                                  onConfirm: () => handleCheckInAllReturned(group.items, group.key),
                                })
                              }}
                              className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-2.5 py-1.5 rounded-xl text-xs shadow-2xs transition-colors flex items-center gap-1 disabled:opacity-50 active:scale-95"
                            >
                              {isCheckingInAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                              <span>Check-In All ({group.returnPendingCount})</span>
                            </button>
                          )}

                          {/* Toggle Expand */}
                          <button
                            type="button"
                            onClick={() => toggleGroupExpand(group.key)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform duration-200 ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Group Body */}
                      {isExpanded && (
                        <div className="divide-y divide-slate-100 bg-slate-50/50">
                          {group.items.map((checkout) => {
                            const itemName = getItemName(checkout.item_id)
                            const requesterName = getLeaderName(checkout.checked_out_to)
                            const isOverdue =
                              checkout.status === 'handed_out' &&
                              checkout.return_date &&
                              new Date(checkout.return_date) < new Date()

                            const isItemLoading = batchActionLoadingId === checkout.id

                            return (
                              <div
                                key={checkout.id}
                                className="p-3.5 sm:p-4 bg-white hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                              >
                                <div className="space-y-1 min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                      {itemName}
                                    </span>
                                    <span className="bg-teal-100 text-teal-900 px-2 py-0.5 rounded-md text-[11px] font-black">
                                      Qty: {checkout.quantity}
                                    </span>

                                    {checkout.status === 'requested' && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                        ⏳ Pending Approval
                                      </span>
                                    )}
                                    {checkout.status === 'handed_out' && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                        📦 In Use
                                      </span>
                                    )}
                                    {checkout.status === 'return_pending' && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200 animate-pulse">
                                        🔄 Returned • Awaiting QM Check-in
                                      </span>
                                    )}
                                    {checkout.status === 'returned' && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                        ✓ Returned ({checkout.returned_condition || 'Good'})
                                      </span>
                                    )}
                                    {checkout.status === 'rejected' && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                        ✕ Declined
                                      </span>
                                    )}
                                    {isOverdue && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                                        ⚠️ Overdue
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                                    <span>Requester: <strong className="text-slate-700">{requesterName}</strong></span>
                                    <span>•</span>
                                    <span>Dates: {checkout.checkout_date} → {checkout.return_date || 'Ongoing'}</span>
                                  </div>

                                  {checkout.notes && (
                                    <p className="text-[11px] text-slate-400 italic">Note: {checkout.notes}</p>
                                  )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1.5 shrink-0 justify-end">
                                  {/* Quartermaster Approve Single */}
                                  {checkout.status === 'requested' && isFullManager && (
                                    <>
                                      <button
                                        disabled={Boolean(batchActionLoadingId)}
                                        onClick={() => handleApproveHandout(checkout)}
                                        className="bg-teal-700 hover:bg-teal-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-2xs transition-colors flex items-center gap-1 disabled:opacity-50 active:scale-95"
                                      >
                                        {isItemLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                        <span>Approve</span>
                                      </button>
                                      <button
                                        disabled={Boolean(batchActionLoadingId)}
                                        onClick={() => handleDeclineCheckout(checkout)}
                                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-2.5 py-1.5 rounded-xl text-xs border border-rose-200 transition-colors disabled:opacity-50 active:scale-95"
                                      >
                                        Decline
                                      </button>
                                    </>
                                  )}

                                  {/* Requester Mark for Return Single */}
                                  {checkout.status === 'handed_out' && (
                                    <button
                                      disabled={Boolean(batchActionLoadingId)}
                                      onClick={() => handleMarkReturnPending(checkout)}
                                      className="bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold px-3 py-1.5 rounded-xl text-xs border border-purple-200 transition-colors flex items-center gap-1 shadow-2xs disabled:opacity-50 active:scale-95"
                                    >
                                      {isItemLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                      <span>Mark for Return</span>
                                    </button>
                                  )}

                                  {/* Quartermaster Inspect and Check-In with Detailed Breakdown Modal */}
                                  {(checkout.status === 'handed_out' || checkout.status === 'return_pending') && isFullManager && (
                                    <button
                                      disabled={Boolean(batchActionLoadingId)}
                                      onClick={() => {
                                        setInspectingCheckout(checkout)
                                        setReturnBreakdown({
                                          good: checkout.quantity,
                                          fair: 0,
                                          needs_repair: 0,
                                          damaged: 0,
                                        })
                                        setReturnInspectionNotes('')
                                      }}
                                      className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-2xs transition-colors flex items-center gap-1 disabled:opacity-50 active:scale-95"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      <span>Inspect & Check-In</span>
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
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 3: DECOMMISSIONED ARCHIVE (FULL MANAGER ONLY)
        ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'writeoffs' && isFullManager && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {writeoffs.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <Archive className="h-8 w-8 mx-auto opacity-30" />
                  <p className="font-bold text-slate-600 text-xs">No equipment has been voided yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {writeoffs.map((wo) => {
                    const itemName = getItemName(wo.item_id)
                    const reqLeader = getLeaderName(wo.requested_by)
                    const appLeader = wo.approved_by ? getLeaderName(wo.approved_by) : null

                    return (
                      <div
                        key={wo.id}
                        className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{itemName}</span>
                            <span className="bg-rose-100 text-rose-900 px-2 py-0.5 rounded-md text-xs font-black">
                              Voided Qty: {wo.quantity}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                              {wo.reason}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                wo.status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : wo.status === 'rejected'
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {wo.status === 'approved' ? '✓ Approved' : wo.status === 'rejected' ? '✕ Declined' : '⏳ Pending'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                            <span>Requested: {reqLeader}</span>
                            <span>•</span>
                            <span>Date: {new Date(wo.requested_at).toLocaleDateString()}</span>
                            {appLeader && <span>• Approved by: {appLeader}</span>}
                          </div>

                          {wo.notes && <p className="text-[11px] text-slate-400 italic">Notes: {wo.notes}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 4: LEADER APPROVALS (GROUP LEADER ONLY)
        ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'approvals' && isGroupLeader && (() => {
          const pendingWriteoffs = writeoffs.filter((w) => w.status === 'pending')

          return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {pendingWriteoffs.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 opacity-60" />
                  <p className="font-bold text-slate-700 text-sm">All caught up!</p>
                  <p className="text-xs text-slate-400">No pending write-off requests awaiting approval.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingWriteoffs.map((wo) => {
                    const item = inventory.find((i) => i.id === wo.item_id)
                    const reqLeader = getLeaderName(wo.requested_by)

                    return (
                      <div
                        key={wo.id}
                        className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-slate-900 text-sm">{item?.name || 'Item'}</span>
                            <span className="bg-rose-100 text-rose-900 px-2 py-0.5 rounded-md text-xs font-black">
                              Void {wo.quantity} of {item?.quantity_total || 0}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              {wo.reason}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                            <span>Requested by: {reqLeader}</span>
                            <span>•</span>
                            <span>Date: {new Date(wo.requested_at).toLocaleDateString()}</span>
                          </div>

                          {wo.notes && (
                            <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                              {wo.notes}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 justify-end">
                          <button
                            onClick={() => handleApproveWriteoff(wo)}
                            className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-2xs transition-colors flex items-center gap-1 active:scale-95"
                          >
                            <Check className="h-4 w-4" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleRejectWriteoff(wo)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-3 py-2 rounded-xl text-xs border border-rose-200 transition-colors flex items-center gap-1 active:scale-95"
                          >
                            <X className="h-4 w-4" />
                            <span>Decline</span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}

        {/* ═══════════════════════════════════════════════════════════════════════
            FULLSCREEN BOTTOM SHEET: STOCK COUNT / JARD WITH CONDITION BREAKDOWN
        ═══════════════════════════════════════════════════════════════════════ */}
        {isAuditModeOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[94vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto -mt-1 mb-1 sm:hidden shrink-0" />
              
              {/* Audit Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-800 shrink-0">
                    <ClipboardCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Stock Count (*Jard El Tejhizet*)</h3>
                    <p className="text-[11px] text-slate-500">Audit counts per condition tier (Good, Fair, Repair, Damaged)</p>
                  </div>
                </div>
                <button onClick={() => setIsAuditModeOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Progress Meter */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700">Audit Progress</span>
                  <span className="text-purple-900 font-black">
                    {auditProgressCount} / {inventory.length} items verified ({Math.round((auditProgressCount / Math.max(1, inventory.length)) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-700 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(auditProgressCount / Math.max(1, inventory.length)) * 100}%` }}
                  />
                </div>
              </div>

              {/* Location Filter & Match All */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">Storage Depot Rack / Section:</span>
                  <button
                    type="button"
                    onClick={() => handleAuditMatchAllVisible(auditVisibleItems)}
                    className="text-[11px] font-bold text-teal-700 hover:underline flex items-center gap-1"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Match All in Section</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    type="button"
                    onClick={() => setAuditLocationFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      auditLocationFilter === 'all'
                        ? 'bg-purple-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All Sections ({inventory.length})
                  </button>
                  {distinctDepotLocations.map((loc) => {
                    const countInLoc = inventory.filter((i) => i.location_stored?.trim() === loc).length
                    return (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setAuditLocationFilter(loc)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                          auditLocationFilter === loc
                            ? 'bg-purple-900 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {loc} ({countInLoc})
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Item Audit Cards List */}
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {auditVisibleItems.map((item) => {
                  const b = getItemConditionBreakdown(item)
                  const state = auditMap[item.id] || {
                    qtyGood: b.good,
                    qtyFair: b.fair,
                    qtyNeedsRepair: b.needs_repair,
                    qtyDamaged: b.damaged,
                    isAudited: false,
                  }
                  const onLoan = Math.max(0, item.quantity_total - item.quantity_available)
                  const inDepotExpected = item.quantity_total - onLoan
                  const countedTotal = state.qtyGood + state.qtyFair + state.qtyNeedsRepair + state.qtyDamaged
                  const diff = countedTotal - inDepotExpected

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                        state.isAudited
                          ? 'bg-white border-teal-300 shadow-2xs'
                          : 'bg-slate-50/70 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-slate-900 text-xs sm:text-sm">{item.name}</span>
                            {state.isAudited && (
                              <span className="bg-teal-100 text-teal-900 px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1">
                                <Check className="h-3 w-3" />
                                <span>Verified</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Location: <strong>{item.location_stored || 'Main Depot'}</strong>
                            {onLoan > 0 && <span className="ml-1.5 text-amber-700 font-bold">({onLoan} on loan in field)</span>}
                          </p>
                        </div>

                        {/* Quick Match button */}
                        <button
                          type="button"
                          onClick={() => handleAuditQuickMatch(item.id)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 active:scale-95 ${
                            state.isAudited && diff === 0
                              ? 'bg-teal-100 text-teal-900 border border-teal-300'
                              : 'bg-white border border-slate-300 text-slate-700 hover:bg-teal-50 hover:text-teal-900'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5 text-teal-700" />
                          <span>✓ Match ({inDepotExpected})</span>
                        </button>
                      </div>

                      {/* 4 Condition Steppers Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                        {/* 1. Good */}
                        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2 space-y-1">
                          <span className="text-[10px] font-bold text-emerald-900 block">🟢 Good Condition</span>
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => handleAuditConditionCountChange(item.id, 'qtyGood', state.qtyGood - 1)}
                              className="w-6 h-6 rounded bg-white font-black text-emerald-900 text-xs shadow-2xs"
                            >
                              -
                            </button>
                            <span className="font-black text-emerald-900 text-xs">{state.qtyGood}</span>
                            <button
                              type="button"
                              onClick={() => handleAuditConditionCountChange(item.id, 'qtyGood', state.qtyGood + 1)}
                              className="w-6 h-6 rounded bg-white font-black text-emerald-900 text-xs shadow-2xs"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* 2. Fair */}
                        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2 space-y-1">
                          <span className="text-[10px] font-bold text-amber-900 block">🟡 Fair Condition</span>
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => handleAuditConditionCountChange(item.id, 'qtyFair', state.qtyFair - 1)}
                              className="w-6 h-6 rounded bg-white font-black text-amber-900 text-xs shadow-2xs"
                            >
                              -
                            </button>
                            <span className="font-black text-amber-900 text-xs">{state.qtyFair}</span>
                            <button
                              type="button"
                              onClick={() => handleAuditConditionCountChange(item.id, 'qtyFair', state.qtyFair + 1)}
                              className="w-6 h-6 rounded bg-white font-black text-amber-900 text-xs shadow-2xs"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* 3. Needs Repair */}
                        <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-2 space-y-1">
                          <span className="text-[10px] font-bold text-orange-900 block">🟠 Needs Repair</span>
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => handleAuditConditionCountChange(item.id, 'qtyNeedsRepair', state.qtyNeedsRepair - 1)}
                              className="w-6 h-6 rounded bg-white font-black text-orange-900 text-xs shadow-2xs"
                            >
                              -
                            </button>
                            <span className="font-black text-orange-900 text-xs">{state.qtyNeedsRepair}</span>
                            <button
                              type="button"
                              onClick={() => handleAuditConditionCountChange(item.id, 'qtyNeedsRepair', state.qtyNeedsRepair + 1)}
                              className="w-6 h-6 rounded bg-white font-black text-orange-900 text-xs shadow-2xs"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* 4. Damaged */}
                        <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-2 space-y-1">
                          <span className="text-[10px] font-bold text-rose-900 block">🔴 Damaged</span>
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => handleAuditConditionCountChange(item.id, 'qtyDamaged', state.qtyDamaged - 1)}
                              className="w-6 h-6 rounded bg-white font-black text-rose-900 text-xs shadow-2xs"
                            >
                              -
                            </button>
                            <span className="font-black text-rose-900 text-xs">{state.qtyDamaged}</span>
                            <button
                              type="button"
                              onClick={() => handleAuditConditionCountChange(item.id, 'qtyDamaged', state.qtyDamaged + 1)}
                              className="w-6 h-6 rounded bg-white font-black text-rose-900 text-xs shadow-2xs"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Total & Discrepancy indicator */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-500">
                          Counted in Depot: <strong className="text-slate-900">{countedTotal}</strong> (Expected: {inDepotExpected})
                        </span>
                        {diff !== 0 ? (
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${
                              diff < 0
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {diff < 0 ? `⚠️ Missing ${Math.abs(diff)}` : `➕ Extra +${diff}`}
                          </span>
                        ) : (
                          <span className="text-teal-700 font-bold text-[11px]">✓ Exact Match</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Bottom Action Footer */}
              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAuditModeOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingAudit}
                  onClick={handleSaveStockCount}
                  className="flex-1 py-2.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-white font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5"
                >
                  {isSavingAudit ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                  <span>Save & Apply Stock Count</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            NATIVE ACTION SHEET: CONFIRMATION MODAL
        ═══════════════════════════════════════════════════════════════════════ */}
        {confirmDialog && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto -mt-1 mb-1 sm:hidden shrink-0" />
              
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mx-auto shadow-2xs">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h3 className="text-base font-black text-slate-900">{confirmDialog.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{confirmDialog.message}</p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isExecutingConfirm}
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-xs text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isExecutingConfirm}
                  onClick={async () => {
                    setIsExecutingConfirm(true)
                    try {
                      await confirmDialog.onConfirm()
                    } finally {
                      setIsExecutingConfirm(false)
                      setConfirmDialog(null)
                    }
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-white font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 ${
                    confirmDialog.confirmStyle === 'emerald'
                      ? 'bg-emerald-700 hover:bg-emerald-600'
                      : confirmDialog.confirmStyle === 'amber'
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : confirmDialog.confirmStyle === 'rose'
                      ? 'bg-rose-700 hover:bg-rose-600'
                      : 'bg-teal-700 hover:bg-teal-600'
                  }`}
                >
                  {isExecutingConfirm ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span>{confirmDialog.confirmLabel}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            MOBILE BOTTOM SHEET: MULTI-SELECT FILTERS
        ═══════════════════════════════════════════════════════════════════════ */}
        {isFilterSheetOpen && isFullManager && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end justify-center p-0">
            <div className="bg-white rounded-t-3xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto -mt-1 mb-1 shrink-0" />
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-teal-700" />
                  <h3 className="text-sm font-bold text-slate-900">Filter Equipment</h3>
                </div>
                <div className="flex items-center gap-2">
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={() => {
                        setSelectedCategories([])
                        setSelectedLocations([])
                        setSelectedConditions([])
                      }}
                      className="text-xs font-bold text-rose-600 hover:underline"
                    >
                      Reset
                    </button>
                  )}
                  <button onClick={() => setIsFilterSheetOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Categories</span>
                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {INVENTORY_CATEGORIES.map((cat) => {
                    const isChecked = selectedCategories.includes(cat.id)
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setSelectedCategories(selectedCategories.filter((id) => id !== cat.id))
                          } else {
                            setSelectedCategories([...selectedCategories, cat.id])
                          }
                        }}
                        className={`p-2 rounded-xl text-left text-xs font-bold border transition-all flex items-center justify-between ${
                          isChecked
                            ? 'bg-teal-700 text-white border-teal-800 shadow-2xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span className="truncate">{cat.label}</span>
                        {isChecked && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Locations */}
              {isFullManager && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Storage Locations</span>
                  <div className="space-y-1">
                    {locationOptions.map((loc) => {
                      const isChecked = selectedLocations.includes(loc.id)
                      return (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => {
                            if (isChecked) {
                              setSelectedLocations(selectedLocations.filter((id) => id !== loc.id))
                            } else {
                              setSelectedLocations([...selectedLocations, loc.id])
                            }
                          }}
                          className={`w-full p-2 rounded-xl text-left text-xs font-bold border transition-all flex items-center justify-between ${
                            isChecked
                              ? 'bg-teal-700 text-white border-teal-800 shadow-2xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          <span>{loc.label}</span>
                          {isChecked && <Check className="h-3.5 w-3.5 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Condition */}
              {isFullManager && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Condition</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {CONDITIONS.map((cond) => {
                      const isChecked = selectedConditions.includes(cond.id)
                      return (
                        <button
                          key={cond.id}
                          type="button"
                          onClick={() => {
                            if (isChecked) {
                              setSelectedConditions(selectedConditions.filter((id) => id !== cond.id))
                            } else {
                              setSelectedConditions([...selectedConditions, cond.id])
                            }
                          }}
                          className={`p-2 rounded-xl text-left text-xs font-bold border transition-all flex items-center justify-between ${
                            isChecked
                              ? 'bg-teal-700 text-white border-teal-800 shadow-2xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          <span>{cond.label}</span>
                          {isChecked && <Check className="h-3.5 w-3.5 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={() => setIsFilterSheetOpen(false)}
                className="w-full py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs shadow-2xs transition-colors"
              >
                Apply Filters ({filteredInventory.length} items)
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            BOTTOM SHEET 1: ADD / EDIT INVENTORY ITEM (EXPLICIT CONDITION QUANTITIES)
        ═══════════════════════════════════════════════════════════════════════ */}
        {isAddEditModalOpen && isFullManager && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto -mt-1 mb-2 sm:hidden shrink-0" />
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-teal-700" />
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingItem ? 'Edit Equipment & Quantities' : 'Add New Equipment to Inventory'}
                  </h3>
                </div>
                <button onClick={() => setIsAddEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Equipment Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 4-Person Ridge Tent, Coleman Gas Stove, 50m Sisal Rope"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-bold bg-white"
                  >
                    {INVENTORY_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label} ({cat.ar})
                      </option>
                    ))}
                    <option value="custom">➕ Add Custom Category...</option>
                  </select>

                  {formCategory === 'custom' && (
                    <input
                      type="text"
                      required
                      placeholder="Type custom category name…"
                      value={formCustomCategory}
                      onChange={(e) => setFormCustomCategory(e.target.value)}
                      className="w-full mt-2 px-3 py-2 text-xs rounded-xl border border-teal-300 focus:outline-none focus:border-teal-600 font-medium"
                    />
                  )}
                </div>

                {/* Condition Breakdown Inputs */}
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">Quantities per Condition Status *</span>
                    <span className="text-[11px] font-bold text-teal-800">
                      Total: {(parseInt(formQtyGood, 10) || 0) + (parseInt(formQtyFair, 10) || 0) + (parseInt(formQtyNeedsRepair, 10) || 0) + (parseInt(formQtyDamaged, 10) || 0)} items
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-800 mb-0.5">🟢 Good (جاهز وممتاز)</label>
                      <input
                        type="number"
                        min="0"
                        value={formQtyGood}
                        onChange={(e) => setFormQtyGood(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-emerald-200 focus:outline-none focus:border-emerald-600 font-bold bg-white text-emerald-950"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-amber-800 mb-0.5">🟡 Fair (صالح مع استعمال)</label>
                      <input
                        type="number"
                        min="0"
                        value={formQtyFair}
                        onChange={(e) => setFormQtyFair(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-amber-200 focus:outline-none focus:border-amber-600 font-bold bg-white text-amber-950"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-orange-800 mb-0.5">🟠 Needs Repair (صيانة)</label>
                      <input
                        type="number"
                        min="0"
                        value={formQtyNeedsRepair}
                        onChange={(e) => setFormQtyNeedsRepair(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-orange-200 focus:outline-none focus:border-orange-600 font-bold bg-white text-orange-950"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-rose-800 mb-0.5">🔴 Damaged (متضرر)</label>
                      <input
                        type="number"
                        min="0"
                        value={formQtyDamaged}
                        onChange={(e) => setFormQtyDamaged(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-rose-200 focus:outline-none focus:border-rose-600 font-bold bg-white text-rose-950"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 pt-0.5">
                    💡 Only items in <strong>Good</strong> and <strong>Fair</strong> condition are available for lending to leaders.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Storage Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Main Depot Locker B"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Unit Assignment</label>
                    <select
                      value={formTroopId}
                      onChange={(e) => setFormTroopId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-medium bg-white"
                    >
                      <option value="">Group Central Asset (عام لكل الفوج)</option>
                      {troops.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} (خاص للفرقة)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Item Notes / Specs (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Includes 12 metal pegs, 2 poles, canvas bag..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs shadow-2xs transition-colors flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>{editingItem ? 'Save Changes' : 'Add Item to Inventory'}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            BOTTOM SHEET 2: MULTI-ITEM LENDING REQUEST FORM (MOBILE OPTIMIZED)
        ═══════════════════════════════════════════════════════════════════════ */}
        {isCheckoutModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-3.5 max-h-[92vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto -mt-1 mb-1 sm:hidden shrink-0" />
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-teal-700" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {isQuartermaster ? 'Equipment Handout' : 'Equipment Lending Request (*Talab I3ara*)'}
                    </h3>
                    <p className="text-[11px] text-slate-500">Pick items to build your loan basket</p>
                  </div>
                </div>
                <button onClick={() => setIsCheckoutModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* 1. Selected Items Basket (Sticky View) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShoppingCart className="h-3.5 w-3.5 text-teal-700" />
                    <span className="text-xs font-bold text-slate-900">
                      Loan Basket ({cartItems.reduce((sum, ci) => sum + ci.quantity, 0)} items)
                    </span>
                  </div>
                  {cartItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCartItems([])}
                      className="text-[10px] font-bold text-rose-600 hover:underline"
                    >
                      Clear Basket
                    </button>
                  )}
                </div>

                {cartItems.length === 0 ? (
                  <p className="text-center text-[11px] text-slate-400 py-1.5">
                    Tap &quot;+ Add&quot; on any gear below to add to your loan basket.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {cartItems.map((ci) => (
                      <div
                        key={ci.item.id}
                        className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-slate-900 block truncate">{ci.item.name}</span>
                          <span className="text-[10px] text-teal-700 font-semibold">
                            {ci.item.quantity_available} usable in depot
                          </span>
                        </div>

                        {/* Large Stepper Buttons for Mobile */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQty(ci.item.id, ci.quantity - 1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center font-bold text-slate-700 text-sm"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-black text-teal-900">{ci.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQty(ci.item.id, ci.quantity + 1)}
                            disabled={ci.quantity >= ci.item.quantity_available}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 active:scale-95 flex items-center justify-center font-bold text-slate-700 text-sm"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(ci.item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 ml-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Available Gear Search & Filter */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-800 block">Available Group Inventory</span>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search available tents, stoves, ropes…"
                    value={checkoutItemSearch}
                    onChange={(e) => setCheckoutItemSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-medium"
                  />
                  {checkoutItemSearch && (
                    <button
                      onClick={() => setCheckoutItemSearch('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Horizontal Category Pill Filter */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
                  <button
                    type="button"
                    onClick={() => setCheckoutCategoryFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                      checkoutCategoryFilter === 'all'
                        ? 'bg-slate-800 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All
                  </button>
                  {INVENTORY_CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCheckoutCategoryFilter(c.id)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                        checkoutCategoryFilter === c.id
                          ? 'bg-teal-700 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {c.label.split(' ')[0]}
                    </button>
                  ))}
                </div>

                {/* Item Cards List */}
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {filteredCheckoutModalItems.length === 0 ? (
                    <p className="text-center text-slate-400 text-xs py-4">No available equipment matches search.</p>
                  ) : (
                    filteredCheckoutModalItems.map((item) => {
                      const cartEntry = cartItems.find((ci) => ci.item.id === item.id)
                      const catMeta = getCategoryMeta(item.category)

                      return (
                        <div
                          key={item.id}
                          className="p-2.5 bg-slate-50 hover:bg-slate-100/90 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 text-xs transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-bold text-slate-900 truncate">{item.name}</span>
                              <span className={`px-1 py-0.2 rounded text-[9px] font-bold border ${catMeta.color} shrink-0`}>
                                {catMeta.label.split(' ')[0]}
                              </span>
                            </div>
                            <span className="text-[10px] text-teal-700 font-semibold block mt-0.5">
                              {item.quantity_available} usable ready to lend
                            </span>
                          </div>

                          {cartEntry ? (
                            <div className="flex items-center gap-1 shrink-0 bg-teal-50 border border-teal-200 rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateCartQty(item.id, cartEntry.quantity - 1)}
                                className="w-6 h-6 rounded bg-white font-bold text-slate-700 text-xs shadow-2xs"
                              >
                                -
                              </button>
                              <span className="w-5 text-center font-bold text-teal-900 text-xs">
                                {cartEntry.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateCartQty(item.id, cartEntry.quantity + 1)}
                                disabled={cartEntry.quantity >= item.quantity_available}
                                className="w-6 h-6 rounded bg-white font-bold text-slate-700 text-xs shadow-2xs disabled:opacity-30"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddToCart(item)}
                              className="bg-teal-700 hover:bg-teal-600 active:scale-95 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-2xs transition-all flex items-center gap-1 shrink-0"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Add</span>
                            </button>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* 3. Scope & Dates Form */}
              <form onSubmit={handleBatchCheckout} className="space-y-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Activity Scope</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!canRequestForTroop}
                      onClick={() => setCheckoutScope('troop')}
                      className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                        checkoutScope === 'troop'
                          ? 'bg-teal-700 text-white border-teal-800 shadow-2xs'
                          : canRequestForTroop
                          ? 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                          : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      }`}
                    >
                      Troop Meeting / Hike
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutScope('event')}
                      className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                        checkoutScope === 'event'
                          ? 'bg-teal-700 text-white border-teal-800 shadow-2xs'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      Camp / Group Event
                    </button>
                  </div>
                  {!canRequestForTroop && (
                    <p className="text-[10px] text-amber-700 mt-1">
                      ⚠️ You are not assigned to a troop unit. Only event lending is available.
                    </p>
                  )}
                </div>

                {checkoutScope === 'troop' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Troop</label>
                    {isTroopLeader || userTroopId ? (
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Locked to your Troop:</span>
                        <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                          {getTroopName(userTroopId) || 'My Troop'}
                        </span>
                      </div>
                    ) : (
                      <select
                        value={checkoutTroopId}
                        onChange={(e) => setCheckoutTroopId(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-bold bg-white"
                      >
                        {troops.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Select Event / Camp</label>
                    {permittedEvents.length === 0 ? (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                        ⚠️ You are not assigned as an Event Leader or Quartermaster for any active event.
                      </div>
                    ) : (
                      <select
                        value={checkoutEventId}
                        onChange={(e) => setCheckoutEventId(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-bold bg-white"
                      >
                        {permittedEvents.map((ev) => (
                          <option key={ev.id} value={ev.id}>
                            {ev.title} ({new Date(ev.start_time).toLocaleDateString()})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Needed From</label>
                    <input
                      type="date"
                      required
                      value={checkoutDate}
                      onChange={(e) => setCheckoutDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Expected Return</label>
                    <input
                      type="date"
                      required
                      value={checkoutReturnDate}
                      onChange={(e) => setCheckoutReturnDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Activity Purpose / Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Pioneering project for patrol competition"
                    value={checkoutNotes}
                    onChange={(e) => setCheckoutNotes(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    cartItems.length === 0 ||
                    (checkoutScope === 'event' && permittedEvents.length === 0) ||
                    (checkoutScope === 'troop' && !canRequestForTroop)
                  }
                  className="w-full py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs shadow-2xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span>
                    {isQuartermaster
                      ? `Confirm & Hand Out (${cartItems.length} items)`
                      : `Submit Loan Request (${cartItems.length} items)`}
                  </span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            BOTTOM SHEET 3: RETURN & CONDITION BREAKDOWN INSPECTION
        ═══════════════════════════════════════════════════════════════════════ */}
        {inspectingCheckout && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto -mt-1 mb-2 sm:hidden shrink-0" />
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Return & Inspect Equipment</h3>
                  <p className="text-xs text-slate-500">
                    Inspecting {inspectingCheckout.quantity} item(s) from {getLeaderName(inspectingCheckout.checked_out_to)}
                  </p>
                </div>
                <button onClick={() => setInspectingCheckout(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCompleteReturn} className="space-y-3.5">
                {/* Condition Breakdown Steppers */}
                <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">Return Breakdown by Condition *</span>
                    <span className="text-[11px] font-bold text-teal-800">
                      Total: {returnBreakdown.good + returnBreakdown.fair + returnBreakdown.needs_repair + returnBreakdown.damaged} / {inspectingCheckout.quantity}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {/* Good */}
                    <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-emerald-200">
                      <span className="text-xs font-bold text-emerald-900">🟢 Good (جاهز وسليم كلياً)</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setReturnBreakdown({ ...returnBreakdown, good: Math.max(0, returnBreakdown.good - 1) })}
                          className="w-6 h-6 rounded bg-slate-100 font-bold text-slate-700"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-black text-emerald-950 text-xs">{returnBreakdown.good}</span>
                        <button
                          type="button"
                          onClick={() => setReturnBreakdown({ ...returnBreakdown, good: returnBreakdown.good + 1 })}
                          className="w-6 h-6 rounded bg-slate-100 font-bold text-slate-700"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Fair */}
                    <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-amber-200">
                      <span className="text-xs font-bold text-amber-900">🟡 Fair (صالح مع استعمال)</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setReturnBreakdown({ ...returnBreakdown, fair: Math.max(0, returnBreakdown.fair - 1) })}
                          className="w-6 h-6 rounded bg-slate-100 font-bold text-slate-700"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-black text-amber-950 text-xs">{returnBreakdown.fair}</span>
                        <button
                          type="button"
                          onClick={() => setReturnBreakdown({ ...returnBreakdown, fair: returnBreakdown.fair + 1 })}
                          className="w-6 h-6 rounded bg-slate-100 font-bold text-slate-700"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Needs Repair */}
                    <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-orange-200">
                      <span className="text-xs font-bold text-orange-900">🟠 Needs Repair (بحاجة لصيانة)</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setReturnBreakdown({ ...returnBreakdown, needs_repair: Math.max(0, returnBreakdown.needs_repair - 1) })}
                          className="w-6 h-6 rounded bg-slate-100 font-bold text-slate-700"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-black text-orange-950 text-xs">{returnBreakdown.needs_repair}</span>
                        <button
                          type="button"
                          onClick={() => setReturnBreakdown({ ...returnBreakdown, needs_repair: returnBreakdown.needs_repair + 1 })}
                          className="w-6 h-6 rounded bg-slate-100 font-bold text-slate-700"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Damaged */}
                    <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-rose-200">
                      <span className="text-xs font-bold text-rose-900">🔴 Damaged (متضرر / قطع ناقصة)</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setReturnBreakdown({ ...returnBreakdown, damaged: Math.max(0, returnBreakdown.damaged - 1) })}
                          className="w-6 h-6 rounded bg-slate-100 font-bold text-slate-700"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-black text-rose-950 text-xs">{returnBreakdown.damaged}</span>
                        <button
                          type="button"
                          onClick={() => setReturnBreakdown({ ...returnBreakdown, damaged: returnBreakdown.damaged + 1 })}
                          className="w-6 h-6 rounded bg-slate-100 font-bold text-slate-700"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Inspection Notes (Damages, Missing Parts)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. 1 peg missing from tent pouch, cleaned and dried before storage..."
                    value={returnInspectionNotes}
                    onChange={(e) => setReturnInspectionNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    returnBreakdown.good + returnBreakdown.fair + returnBreakdown.needs_repair + returnBreakdown.damaged !==
                      inspectingCheckout.quantity
                  }
                  className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-2xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <span>Confirm Return & Replenish Stock</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            BOTTOM SHEET 4: DECOMMISSION / WRITEOFF REQUEST
        ═══════════════════════════════════════════════════════════════════════ */}
        {isWriteoffModalOpen && writeoffItem && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto -mt-1 mb-2 sm:hidden shrink-0" />
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-rose-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Decommission Damaged Gear (*Talab Itlaf*)</h3>
                    <p className="text-xs text-slate-500">{writeoffItem.name}</p>
                  </div>
                </div>
                <button onClick={() => setIsWriteoffModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                <p className="font-bold">Group Leader Approval Required</p>
                <p className="text-[11px] text-rose-700">
                  Voided items will be flagged as pending write-off and sent to the Group Leader (*Chef de Groupe*) for final disposal sign-off.
                </p>
              </div>

              <form onSubmit={handleSubmitWriteoff} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Quantity to Decommission (out of {writeoffItem.quantity_total}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={writeoffItem.quantity_total}
                    required
                    value={writeoffQty}
                    onChange={(e) => setWriteoffQty(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-rose-600 font-bold text-rose-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Decommission *</label>
                  <select
                    value={writeoffReason}
                    onChange={(e) => setWriteoffReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-rose-600 font-bold bg-white text-slate-800"
                  >
                    {WRITEOFF_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>

                  {writeoffReason === 'Other / Custom reason' && (
                    <input
                      type="text"
                      required
                      placeholder="Type custom write-off reason…"
                      value={writeoffCustomReason}
                      onChange={(e) => setWriteoffCustomReason(e.target.value)}
                      className="w-full mt-2 px-3 py-2 text-xs rounded-xl border border-rose-300 focus:outline-none focus:border-rose-600 font-medium"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Damage Description & Incident Details</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Broken fabric during storm at camp, poles snapped, beyond repair..."
                    value={writeoffNotes}
                    onChange={(e) => setWriteoffNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-rose-600 font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs shadow-2xs transition-colors flex items-center justify-center gap-1.5 active:scale-95"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span>Submit Write-Off for Approval</span>
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardShell>
  )
}
