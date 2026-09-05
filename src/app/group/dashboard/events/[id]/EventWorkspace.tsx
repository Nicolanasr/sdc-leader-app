'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import {
    Menu, X, ArrowLeft, Calendar, MapPin, DollarSign, Users, FileText,
    CheckCircle2, XCircle, Clock, ShieldAlert, Trash2, Plus, ExternalLink, Filter, Layers, Award, Edit, Edit3, Loader2, UploadCloud, FileSpreadsheet, Paperclip,
    Package, ShoppingCart, Send, Minus, RefreshCw, Search, UtensilsCrossed, Apple, ShoppingBag, Check, CheckSquare, Square, ChefHat, Sparkles, BookOpen, History, ChevronRight, UserPlus, Key, Copy,
    Link2, FolderOpen, Image as ImageIcon
} from 'lucide-react'
import DashboardShell from '../../DashboardShell'
import DashboardSidebar from '../../DashboardSidebar'
import {
    SCOUT_RECIPES_LIBRARY,
    STANDARD_INGREDIENTS_CATALOG,
    MealRecipeTemplate,
    RecipeIngredientTemplate,
    MasterCatalogIngredient
} from '@/utils/scoutMealRecipes'
import { toLocalDatetimeInputValue, formatLocalDateKey, formatDateDisplay, formatTimeDisplay } from '@/utils/dateTimeUtils'
import { triggerNotification, triggerRoleNotification } from '@/utils/notifications'

// ─── SEARCHABLE INGREDIENT COMBOBOX COMPONENT ─────────────────────────────────
interface SearchableIngredientComboboxProps {
    value: string
    groupPantryList: any[]
    onSelect: (item: {
        name: string
        category: 'pantry' | 'supermarket' | 'bakery' | 'butchery' | 'produce' | 'supplies'
        unit: 'g' | 'kg' | 'pieces' | 'cans' | 'loaves' | 'packs' | 'ml' | 'liters'
        portion_per_person?: number
    }) => void
    placeholder?: string
}

function SearchableIngredientCombobox({
    value,
    groupPantryList,
    onSelect,
    placeholder = 'Select ingredient…',
}: SearchableIngredientComboboxProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategoryTab, setSelectedCategoryTab] = useState<'all' | 'pantry' | 'produce' | 'bakery' | 'butchery' | 'supermarket' | 'supplies'>('all')

    // Matched Pantry Stock Items
    const matchingPantry = useMemo(() => {
        return (groupPantryList || []).filter((p) => {
            const q = searchQuery.toLowerCase().trim()
            if (!q) return true
            return p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q))
        })
    }, [groupPantryList, searchQuery])

    // Matched Standard Catalog
    const matchingCatalog = useMemo(() => {
        return STANDARD_INGREDIENTS_CATALOG.filter((item) => {
            const q = searchQuery.toLowerCase().trim()
            if (selectedCategoryTab !== 'all' && selectedCategoryTab !== 'pantry' && item.category !== selectedCategoryTab) return false
            if (selectedCategoryTab === 'pantry' && !item.commonPantry) return false
            if (!q) return true
            return item.name.toLowerCase().includes(q) || (item.nameAr && item.nameAr.includes(q))
        })
    }, [searchQuery, selectedCategoryTab])

    const hasExactMatch = useMemo(() => {
        const q = searchQuery.toLowerCase().trim()
        if (!q) return false
        return (
            matchingPantry.some((p) => p.name.toLowerCase().trim() === q) ||
            STANDARD_INGREDIENTS_CATALOG.some((c) => c.name.toLowerCase().trim() === q)
        )
    }, [matchingPantry, searchQuery])

    return (
        <div className="flex-1">
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 bg-white hover:border-teal-500 hover:bg-teal-50/20 active:scale-[0.99] transition-all text-xs font-black text-slate-900 shadow-2xs text-left"
            >
                <span className={value ? 'text-slate-900 truncate' : 'text-slate-400 font-semibold truncate'}>
                    {value || placeholder}
                </span>
                <Search className="h-3.5 w-3.5 text-teal-700 shrink-0 ml-1.5" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-5 shadow-2xl border border-slate-200 space-y-3.5 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95">
                        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto -mt-1 mb-1 sm:hidden shrink-0" />

                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 shrink-0">
                            <div>
                                <h4 className="text-sm font-black text-slate-900">
                                    Select Food Ingredient
                                </h4>
                                <p className="text-[11px] text-slate-500 font-medium">
                                    Pick from Central Pantry depot stock or standard food library
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOpen(false)
                                    setSearchQuery('')
                                }}
                                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Search Input Bar */}
                        <div className="relative shrink-0">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-teal-700" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Type to search pantry stock, veggies, spices, meat, bread…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-600 focus:bg-white shadow-2xs"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Category Filter Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs font-bold shrink-0">
                            {(['all', 'pantry', 'produce', 'bakery', 'butchery', 'supermarket', 'supplies'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => setSelectedCategoryTab(tab)}
                                    className={`px-3 py-1.5 rounded-xl whitespace-nowrap capitalize transition-all ${selectedCategoryTab === tab
                                            ? 'bg-teal-900 text-white shadow-2xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    {tab === 'all' ? 'All (70+)' : tab === 'pantry' ? `📦 In Depot (${matchingPantry.length})` : tab}
                                </button>
                            ))}
                        </div>

                        {/* Results Container */}
                        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 divide-y divide-slate-100 min-h-[250px] max-h-[50vh]">
                            {/* Group 1: Central Pantry Matches */}
                            {(selectedCategoryTab === 'all' || selectedCategoryTab === 'pantry') && matchingPantry.length > 0 && (
                                <div className="space-y-1.5 pt-1">
                                    <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider block px-1">
                                        📦 In Central Pantry Depot ({matchingPantry.length})
                                    </span>
                                    {matchingPantry.map((p) => {
                                        let defaultPortion = 100
                                        if (['kg', 'liters', 'gallons'].includes(p.unit)) defaultPortion = 0.1
                                        else if (['g', 'ml'].includes(p.unit)) defaultPortion = 100
                                        else defaultPortion = 1

                                        return (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => {
                                                    onSelect({
                                                        name: p.name,
                                                        category: 'pantry',
                                                        unit: p.unit || 'g',
                                                        portion_per_person: defaultPortion,
                                                    })
                                                    setIsOpen(false)
                                                    setSearchQuery('')
                                                }}
                                                className="w-full text-left p-3 rounded-2xl hover:bg-teal-50 border border-slate-100 hover:border-teal-300 flex items-center justify-between gap-3 text-xs transition-all group bg-white shadow-2xs"
                                            >
                                                <div className="min-w-0 space-y-0.5">
                                                    <span className="font-black text-slate-900 group-hover:text-teal-950 block truncate text-sm">
                                                        {p.name}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 capitalize block">
                                                        {p.category || 'General Pantry'}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-black bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-xl shrink-0 border border-emerald-200">
                                                    {p.quantity_available} {p.unit} in stock
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Group 2: Master Standard Catalog Matches */}
                            {matchingCatalog.length > 0 && (
                                <div className="space-y-1.5 pt-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block px-1">
                                        ⭐ Standard Scout Food Library ({matchingCatalog.length})
                                    </span>
                                    {matchingCatalog.map((c, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => {
                                                onSelect({
                                                    name: c.name,
                                                    category: c.category,
                                                    unit: c.defaultUnit,
                                                    portion_per_person: c.defaultPortion,
                                                })
                                                setIsOpen(false)
                                                setSearchQuery('')
                                            }}
                                            className="w-full text-left p-3 rounded-2xl hover:bg-slate-100 border border-slate-100 hover:border-slate-300 flex items-center justify-between gap-3 text-xs transition-all group bg-white shadow-2xs"
                                        >
                                            <div className="min-w-0 space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-slate-900 group-hover:text-teal-950 truncate text-sm">
                                                        {c.name}
                                                    </span>
                                                    {c.nameAr && (
                                                        <span className="text-xs font-bold text-teal-800">
                                                            {c.nameAr}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[11px] text-slate-400 capitalize block">
                                                    {c.category} • Benchmark: {c.defaultPortion} {c.defaultUnit} / scout
                                                </span>
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl shrink-0 border border-slate-200">
                                                {c.defaultUnit}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Custom Ingredient Option when typing */}
                            {searchQuery.trim().length > 1 && !hasExactMatch && (
                                <div className="pt-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const formatted = searchQuery.trim().charAt(0).toUpperCase() + searchQuery.trim().slice(1)
                                            onSelect({
                                                name: formatted,
                                                category: 'supermarket',
                                                unit: 'g',
                                                portion_per_person: 100,
                                            })
                                            setIsOpen(false)
                                            setSearchQuery('')
                                        }}
                                        className="w-full p-3.5 rounded-2xl bg-teal-50 hover:bg-teal-100 text-teal-900 font-black text-xs border border-teal-300 flex items-center justify-center gap-2 shadow-2xs transition-all active:scale-95"
                                    >
                                        <Plus className="h-4 w-4 text-teal-700 shrink-0" />
                                        <span className="truncate">Add &quot;{searchQuery.trim()}&quot; as custom item</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

interface Leader {
    id: string
    fullName: string
    email: string
    rank: string
}

interface Member {
    id: string
    first_name: string
    last_name: string
    troop_id: string
    current_rank?: string | null
}

interface Troop {
    id: string
    name: string
}

interface EventStaff {
    id?: string
    event_id?: string
    profile_id: string
    event_role: string
    attendance_status?: string
    profiles?: { full_name: string }
}

interface EventParticipant {
    id?: string
    event_id?: string
    member_id: string
    attendance_status: string // 'present', 'absent'
    parent_consent: string // 'yes', 'pending', 'no'
    fee_paid: number
    payment_status: string // 'paid', 'partial', 'unpaid'
    notes?: string | null
    members?: {
        id: string
        first_name: string
        last_name: string
        troop_id: string
        current_rank?: string | null
    }
}

interface EventExpense {
    id?: string
    event_id?: string
    category: string
    description: string
    amount: number
    logged_by?: string | null
    created_at?: string
}

interface EventDocument {
    id?: string
    event_id?: string
    title: string
    file_url: string
    created_at?: string
}

export interface EventMealIngredient {
    id?: string
    meal_plan_id?: string
    event_id?: string
    name: string
    portion_per_person: number
    unit: 'g' | 'kg' | 'pieces' | 'cans' | 'loaves' | 'packs' | 'ml' | 'liters'
    category: 'bakery' | 'butchery' | 'produce' | 'supermarket' | 'pantry' | 'supplies'
}

export interface EventMealPlan {
    id: string
    event_id: string
    day_number: number
    meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'custom'
    meal_title: string
    recipe_name?: string | null
    headcount_override?: number | null
    notes?: string | null
    event_meal_ingredients?: EventMealIngredient[]
}

export interface EventShoppingListItem {
    id: string
    event_id: string
    name: string
    category: 'bakery' | 'butchery' | 'produce' | 'supermarket' | 'supplies'
    quantity_needed: number
    unit: string
    is_purchased: boolean
    purchased_by?: string | null
    estimated_cost?: number | null
    notes?: string | null
}

export interface EventPantryRequest {
    id: string
    event_id: string
    group_id: string
    pantry_item_id: string
    quantity: number
    unit: string
    status: 'requested' | 'approved' | 'received' | 'rejected'
    requested_by: string
    group_pantry_items?: { name: string; unit: string }
    notes?: string | null
    created_at?: string
}

interface EventItem {
    id: string
    title: string
    description?: string | null
    event_type: string
    start_time: string
    end_time: string
    location?: string | null
    scope: string
    group_id: string
    troop_id?: string | null
    participant_fee: number
    status: string
    event_staff?: EventStaff[]
    event_participants?: EventParticipant[]
    event_expenses?: EventExpense[]
    event_documents?: EventDocument[]
}

interface Props {
    event: EventItem
    troops: Troop[]
    leaders: Leader[]
    allMembers: Member[]
    initialCheckouts?: any[]
    groupInventory?: any[]
    initialMealPlans?: EventMealPlan[]
    initialGroupPantry?: any[]
    initialShoppingList?: EventShoppingListItem[]
    initialPantryRequests?: EventPantryRequest[]
    currentRole: string
    groupId: string
    groupName: string
    userProfileId: string
    userName: string
}
const BASE_STAFF_ROLES = [
    { key: 'ka2ed_mouskhayyam', campLabel: 'Camp Leader (قائد المخيِّم)', actLabel: 'Activity Leader (قائد النشاط)' },
    { key: 'mousa3ed_ka2ed_mouskhayyam', campLabel: 'Assistant Leader (مساعد قائد المخيِّم)', actLabel: 'Assistant Leader (مساعد قائد النشاط)' },
    { key: 'amin_serr_mouskhayyam', campLabel: 'Secretary (أمين سرّ المخيِّم)', actLabel: 'Secretary (أمين سرّ النشاط)' },
    { key: 'amin_sandou2_mouskhayyam', campLabel: 'Treasurer (أمين صندوق المخيِّم)', actLabel: 'Treasurer (أمين صندوق النشاط)' },
    { key: 'amin_tejhizet', campLabel: 'Logistics & Equipment (أمين تجهيزات)', actLabel: 'Logistics & Equipment (أمين تجهيزات)' },
    { key: 'mas2oul_matbakh', campLabel: 'Kitchen & Supplies (مسؤول المؤونة والتموين)', actLabel: 'Kitchen & Supplies (مسؤول المؤونة والتموين)' },
    { key: 'mas2oul_khedmet', campLabel: 'Services & First Aid (مسؤول الخدمات والخدمة)', actLabel: 'Services & First Aid (مسؤول الخدمات والخدمة)' },
    { key: 'mas2oul_saharat', campLabel: 'Campfire & Evenings (مسؤول السهرات والأنشطة)', actLabel: 'Campfire & Evenings (مسؤول السهرات والأنشطة)' },
]

function getRoleLabel(roleKey: string, eventType: string): string {
    const isCamp = eventType === 'camp'
    const found = BASE_STAFF_ROLES.find((r) => r.key === roleKey)
    if (found) return isCamp ? found.campLabel : found.actLabel
    return roleKey
}

const EXPENSE_CATEGORIES = [
    { key: 'food', label: 'Food & Kitchen (المطبخ والتغذية)' },
    { key: 'transport', label: 'Transportation (النقل والمواصلات)' },
    { key: 'equipment', label: 'Equipment Rental & Supplies (التجهيزات)' },
    { key: 'location', label: 'Location / Land Fee (بدل أرض المخيم)' },
    { key: 'program', label: 'Activities & Awards (البرنامج والجوائز)' },
    { key: 'misc', label: 'Miscellaneous (مصاريف متفرقة)' },
]

export default function EventWorkspace({
    event: initialEvent,
    troops,
    leaders,
    allMembers,
    initialCheckouts = [],
    groupInventory = [],
    initialMealPlans = [],
    initialGroupPantry = [],
    initialShoppingList = [],
    initialPantryRequests = [],
    currentRole,
    groupId,
    groupName,
    userProfileId,
    userName,
}: Props) {
    const router = useRouter()
    const supabase = createClient()

    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const [eventItem, setEventItem] = useState<EventItem>(initialEvent)
    const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

    // Leaders list with dynamic member additions
    const [leadersList, setLeadersList] = useState<Leader[]>(leaders)
    const [isProvisionMemberModalOpen, setIsProvisionMemberModalOpen] = useState(false)
    const [provisionMemberId, setProvisionMemberId] = useState('')
    const [provisionEmail, setProvisionEmail] = useState('')
    const [provisionPassword, setProvisionPassword] = useState('')
    const [provisionTargetRole, setProvisionTargetRole] = useState('')
    const [provisionSuccessData, setProvisionSuccessData] = useState<{ email: string; pass: string; name: string } | null>(null)
    const [copiedProvisionPass, setCopiedProvisionPass] = useState(false)
    const [memberSearchQuery, setMemberSearchQuery] = useState('')

    const filteredProvisionMembers = useMemo(() => {
        if (!memberSearchQuery.trim()) return allMembers
        const q = memberSearchQuery.toLowerCase()
        return allMembers.filter(
            (m) =>
                `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
                (m.current_rank && m.current_rank.toLowerCase().includes(q))
        )
    }, [allMembers, memberSearchQuery])

    const handleGenerateMemberPassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$'
        let pass = ''
        for (let i = 0; i < 10; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        setProvisionPassword(pass)
    }

    const handleProvisionMemberSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!provisionMemberId || !provisionEmail || !provisionPassword) {
            return showStatus('Please fill in all member login fields.', 'error')
        }

        setLoading(true)
        try {
            const res = await fetch('/api/group/onboard-member-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    memberId: provisionMemberId,
                    email: provisionEmail,
                    password: provisionPassword,
                }),
            })

            const data = await res.json()
            if (!res.ok) {
                showStatus(data.error || 'Failed to provision member login', 'error')
                setLoading(false)
                return
            }

            const newLeader: Leader = {
                id: data.profileId,
                fullName: `${data.fullName} (Scout Member)`,
                email: data.email,
                rank: 'Scout',
            }

            setLeadersList((prev) => [...prev.filter((l) => l.id !== data.profileId), newLeader])

            // If target role specified, assign them directly
            if (provisionTargetRole) {
                await supabase
                    .from('event_staff')
                    .delete()
                    .eq('event_id', eventItem.id)
                    .eq('event_role', provisionTargetRole)

                await supabase.from('event_staff').insert({
                    event_id: eventItem.id,
                    profile_id: data.profileId,
                    event_role: provisionTargetRole,
                    attendance_status: 'present',
                })

                const { data: updatedStaff } = await supabase
                    .from('event_staff')
                    .select('*, profiles(full_name)')
                    .eq('event_id', eventItem.id)

                if (updatedStaff) {
                    setEventItem((prev) => ({ ...prev, event_staff: updatedStaff }))
                }
            }

            setProvisionSuccessData({ email: data.email, pass: provisionPassword, name: data.fullName })
            showStatus(`Login successfully provisioned for ${data.fullName}!`, 'success')
        } catch (err: any) {
            showStatus(err.message || 'Error occurred', 'error')
        } finally {
            setLoading(false)
        }
    }

    // Equipment Checkouts state for this Event
    const [eventCheckouts, setEventCheckouts] = useState<any[]>(initialCheckouts)
    const [inventoryList, setInventoryList] = useState<any[]>(groupInventory)
    const [isEventCheckoutModalOpen, setIsEventCheckoutModalOpen] = useState(false)
    const [eventCartItems, setEventCartItems] = useState<Array<{ item: any; quantity: number }>>([])
    const [eventCheckoutSearch, setEventCheckoutSearch] = useState('')
    const [eventCheckoutDate, setEventCheckoutDate] = useState(
        formatLocalDateKey(initialEvent.start_time) || formatLocalDateKey(new Date())
    )
    const [eventReturnDate, setEventReturnDate] = useState(
        formatLocalDateKey(initialEvent.end_time) || formatLocalDateKey(new Date(Date.now() + 7 * 86400000))
    )
    const [eventCheckoutNotes, setEventCheckoutNotes] = useState('')

    // ── Camp Provisions & Meals (Mas2oul Mounet) State ───────────────────────────
    const [mealPlans, setMealPlans] = useState<EventMealPlan[]>(initialMealPlans)
    const [groupPantryList, setGroupPantryList] = useState<any[]>(initialGroupPantry)
    const [shoppingList, setShoppingList] = useState<EventShoppingListItem[]>(initialShoppingList)
    const [pantryRequests, setPantryRequests] = useState<EventPantryRequest[]>(initialPantryRequests)
    const [provisionsSubTab, setProvisionsSubTab] = useState<'menu' | 'sourcing' | 'shopping'>('menu')
    const [selectedCampDay, setSelectedCampDay] = useState<number>(1)
    const [shoppingFilter, setShoppingFilter] = useState<'all' | 'pending' | 'purchased'>('all')
    const [extraCampDays, setExtraCampDays] = useState<number>(0)

    // Previous Meals Cooked in Group State (Loaded from DB)
    const [previousGroupMeals, setPreviousGroupMeals] = useState<Array<{
        id: string
        title: string
        nameAr?: string
        meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'custom'
        notes?: string
        eventName?: string
        ingredients: Array<{
            name: string
            portion_per_person: number
            unit: 'g' | 'kg' | 'pieces' | 'cans' | 'loaves' | 'packs' | 'ml' | 'liters'
            category: 'bakery' | 'butchery' | 'produce' | 'supermarket' | 'pantry' | 'supplies'
        }>
    }>>([])

    // ── Unified Add Meal Modal State (Library / Previous vs Custom) ───────────────
    const [isAddMealModalOpen, setIsAddMealModalOpen] = useState(false)
    const [addMealTab, setAddMealTab] = useState<'library' | 'custom'>('library')
    const [addMealDay, setAddMealDay] = useState<number>(1)
    const [addMealSlotType, setAddMealSlotType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack' | 'custom'>('breakfast')
    const [addMealSlotTitle, setAddMealSlotTitle] = useState('Breakfast')
    const [addMealExistingPlanId, setAddMealExistingPlanId] = useState<string | undefined>(undefined)
    const [addMealSearchQuery, setAddMealSearchQuery] = useState('')
    const [addMealTypeFilter, setAddMealTypeFilter] = useState<'all' | 'breakfast' | 'lunch' | 'dinner' | 'snack'>('all')
    const [addMealSourceFilter, setAddMealSourceFilter] = useState<'all' | 'scout_recipes' | 'group_previous'>('all')

    // Custom Meal Builder Form State
    const [customMealTitle, setCustomMealTitle] = useState('')
    const [customMealHeadcountOverride, setCustomMealHeadcountOverride] = useState('')
    const [customMealNotes, setCustomMealNotes] = useState('')
    const [customMealIngredients, setCustomMealIngredients] = useState<EventMealIngredient[]>([])

    // Edit Meal Modal State
    const [isEditMealModalOpen, setIsEditMealModalOpen] = useState(false)
    const [editingMealPlan, setEditingMealPlan] = useState<EventMealPlan | null>(null)
    const [editMealTitle, setEditMealTitle] = useState('')
    const [editMealType, setEditMealType] = useState<any>('breakfast')
    const [editMealDay, setEditMealDay] = useState<number>(1)
    const [editMealHeadcount, setEditMealHeadcount] = useState('')
    const [editMealNotes, setEditMealNotes] = useState('')
    const [editMealIngredients, setEditMealIngredients] = useState<EventMealIngredient[]>([])

    const [isShoppingItemModalOpen, setIsShoppingItemModalOpen] = useState(false)
    const [shoppingItemName, setShoppingItemName] = useState('')
    const [shoppingItemCategory, setShoppingItemCategory] = useState<any>('supermarket')
    const [shoppingItemQty, setShoppingItemQty] = useState('1')
    const [shoppingItemUnit, setShoppingItemUnit] = useState('kg')
    const [shoppingItemEstCost, setShoppingItemEstCost] = useState('0')
    const [shoppingItemNotes, setShoppingItemNotes] = useState('')
    const [isSubmittingProvisions, setIsSubmittingProvisions] = useState(false)

    // Load Previous Group Meals from Supabase on mount
    useEffect(() => {
        const fetchGroupMealHistory = async () => {
            if (!groupId) return
            try {
                const { data: groupEvents } = await supabase
                    .from('events')
                    .select('id, title')
                    .eq('group_id', groupId)

                if (!groupEvents || groupEvents.length === 0) return
                const eventIds = groupEvents.map((e) => e.id)
                const eventMap = Object.fromEntries(groupEvents.map((e) => [e.id, e.title]))

                const { data: plans } = await supabase
                    .from('event_meal_plans')
                    .select(`
                        id, event_id, meal_title, recipe_name, meal_type, notes,
                        event_meal_ingredients (id, name, portion_per_person, unit, category)
                    `)
                    .in('event_id', eventIds)
                    .neq('is_deleted', true)

                if (plans && plans.length > 0) {
                    const uniqueMap = new Map<string, any>()
                    plans.forEach((p) => {
                        const title = (p.recipe_name || p.meal_title || '').trim()
                        if (!title) return
                        const ings = (p.event_meal_ingredients || []).map((ing: any) => ({
                            name: ing.name,
                            portion_per_person: Number(ing.portion_per_person) || 1,
                            unit: ing.unit,
                            category: ing.category,
                        }))
                        if (ings.length > 0 && !uniqueMap.has(title.toLowerCase())) {
                            uniqueMap.set(title.toLowerCase(), {
                                id: p.id,
                                title: title,
                                meal_type: p.meal_type || 'custom',
                                notes: p.notes || '',
                                eventName: eventMap[p.event_id] || 'Previous Camp',
                                ingredients: ings,
                            })
                        }
                    })
                    setPreviousGroupMeals(Array.from(uniqueMap.values()))
                }
            } catch (err) {
                console.error('Error fetching group meal history:', err)
            }
        }

        fetchGroupMealHistory()
    }, [groupId])

    const showStatus = (text: string, type: 'success' | 'error') => {
        setStatusMessage({ text, type })
        setTimeout(() => setStatusMessage(null), 7000)
    }

    // Staff Leader Attendance Update Handler
    const updateStaffAttendance = async (staffId: string, status: string) => {
        const { data: updated, error } = await supabase
            .from('event_staff')
            .update({ attendance_status: status })
            .eq('id', staffId)
            .select('*, profiles(full_name)')
            .single()

        if (!error && updated) {
            const updatedStaff = (eventItem.event_staff || []).map((s) =>
                s.id === staffId ? updated : s
            )
            setEventItem((prev) => ({ ...prev, event_staff: updatedStaff }))
        }
    }

    // ── Role & Permission Scoping ────────────────────────────────────────────────
    const isGroupLeader = ['chef_groupe', 'assistant_chef_groupe', 'configurator'].includes(currentRole)
    const isGroupAdmin = ['chef_groupe', 'assistant_chef_groupe', 'amin_serr_group', 'configurator'].includes(currentRole)
    const isGroupPantryOwner = ['amin_mounet_group', 'mas2oul_mounet'].includes(currentRole)
    const isGroupQuartermaster = currentRole === 'amin_tejhizet_group' || isGroupLeader

    const userAssignedRoles = (eventItem.event_staff || [])
        .filter((s) => s.profile_id === userProfileId)
        .map((s) => s.event_role)

    const isEventLeader = userAssignedRoles.includes('ka2ed_mouskhayyam')
    const canEditEvent = isGroupLeader || isEventLeader
    const isCampLeader = canEditEvent

    const isCampSecretary = userAssignedRoles.includes('amin_serr_mouskhayyam') || isCampLeader || isGroupAdmin
    const isCampTreasurer = userAssignedRoles.includes('amin_sandou2_mouskhayyam') || isCampLeader || isGroupAdmin
    const isEventQuartermaster = userAssignedRoles.includes('amin_tejhizet')
    const isQuartermaster = isGroupQuartermaster || isEventQuartermaster
    const canAccessEquipment = isQuartermaster || isEventLeader

    const isEventProvisionsMaster = userAssignedRoles.includes('mas2oul_matbakh') || userAssignedRoles.includes('mas2oul_mounet') || userAssignedRoles.includes('amin_mounet')
    const canAccessProvisions = isCampLeader || isEventProvisionsMaster || isGroupPantryOwner
    const canManageProvisions = canAccessProvisions

    // Determine allowed tabs for current user
    const availableTabs = useMemo(() => {
        const tabs: Array<{ key: 'hierarchy' | 'roster' | 'treasury' | 'equipment' | 'provisions' | 'documents'; label: string; icon: string }> = [
            { key: 'hierarchy', label: 'Staff Hierarchy', icon: '📋' },
        ]

        if (isCampSecretary || isCampLeader) {
            tabs.push({ key: 'roster', label: 'Scout Roster & Consent', icon: '👥' })
        }

        if (isCampTreasurer || isCampLeader) {
            tabs.push({ key: 'treasury', label: 'Camp Treasury & Expenses', icon: '💰' })
        }

        if (canAccessEquipment) {
            tabs.push({ key: 'equipment', label: 'Equipment & Logistics', icon: '⛺' })
        }

        if (canAccessProvisions) {
            tabs.push({ key: 'provisions', label: 'Provisions & Meals', icon: '🍞' })
        }

        tabs.push({ key: 'documents', label: 'Documents Repository', icon: '📁' })
        return tabs
    }, [isCampLeader, isCampSecretary, isCampTreasurer, canAccessEquipment, canAccessProvisions])

    const [activeTab, setActiveTab] = useState<'hierarchy' | 'roster' | 'treasury' | 'equipment' | 'provisions' | 'documents'>(availableTabs[0]?.key || 'hierarchy')

    // ── Calculated Camp Days & Headcount ─────────────────────────────────────────
    const totalCampDays = useMemo(() => {
        if (!eventItem.start_time) return 1 + extraCampDays
        if (!eventItem.end_time) return 1 + extraCampDays
        const start = new Date(eventItem.start_time)
        const end = new Date(eventItem.end_time)
        const diffMs = end.getTime() - start.getTime()
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1
        return Math.max(1, Math.min(30, days)) + extraCampDays
    }, [eventItem.start_time, eventItem.end_time, extraCampDays])

    const defaultCampHeadcount = useMemo(() => {
        const participantsCount = (eventItem.event_participants || []).length
        const staffCount = (eventItem.event_staff || []).length
        const total = participantsCount + staffCount
        return total > 0 ? total : 30 // fallback sensible default if roster not yet filled
    }, [eventItem.event_participants, eventItem.event_staff])

    // ── Roster Section Filtering & Splitting ────────────────────────────────────
    const [sectionFilter, setSectionFilter] = useState<string>('all')

    const participantsGroupedByTroop = useMemo(() => {
        const parts = eventItem.event_participants || []
        const map: Record<string, { troopName: string; participants: EventParticipant[] }> = {}

        for (const p of parts) {
            const tId = p.members?.troop_id || 'unassigned'
            const tName = troops.find((t) => t.id === tId)?.name || 'Unassigned Unit'

            if (sectionFilter !== 'all' && tId !== sectionFilter) continue

            if (!map[tId]) {
                map[tId] = { troopName: tName, participants: [] }
            }
            map[tId].participants.push(p)
        }

        return Object.values(map)
    }, [eventItem.event_participants, troops, sectionFilter])

    // Treasury & Transaction states
    const [isFeeCollectionsOpen, setIsFeeCollectionsOpen] = useState(false)
    const [isLogTransactionModalOpen, setIsLogTransactionModalOpen] = useState(false)
    const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense')
    const [paymentMethod, setPaymentMethod] = useState<string>('cash')

    // Single Role Editing State
    const [singleEditingRoleKey, setSingleEditingRoleKey] = useState<string | null>(null)
    const [singleSelectedProfileId, setSingleSelectedProfileId] = useState<string>('')

    const handleSaveSingleRole = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!singleEditingRoleKey) return
        setLoading(true)

        // Delete existing staff row for this single role
        await supabase
            .from('event_staff')
            .delete()
            .eq('event_id', eventItem.id)
            .eq('event_role', singleEditingRoleKey)

        // Insert new staff assignment if leader selected
        if (singleSelectedProfileId) {
            await supabase.from('event_staff').insert({
                event_id: eventItem.id,
                profile_id: singleSelectedProfileId,
                event_role: singleEditingRoleKey,
                attendance_status: 'present',
            })
        }

        // Refresh staff
        const { data: updatedStaff } = await supabase
            .from('event_staff')
            .select('*, profiles(full_name)')
            .eq('event_id', eventItem.id)

        if (updatedStaff) {
            setEventItem((prev) => ({ ...prev, event_staff: updatedStaff }))
        }

        setLoading(false)
        setSingleEditingRoleKey(null)
        showStatus('Role updated successfully!', 'success')
    }

    // ── Edit Event Details Controls ───────────────────────────────────────────
    const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false)
    const [editTitle, setEditTitle] = useState('')
    const [editDescription, setEditDescription] = useState('')
    const [editEventType, setEditEventType] = useState('camp')
    const [editScope, setEditScope] = useState('group')
    const [editTargetTroopId, setEditTargetTroopId] = useState('')
    const [editStartTime, setEditStartTime] = useState('')
    const [editEndTime, setEditEndTime] = useState('')
    const [editLocation, setEditLocation] = useState('')
    const [editParticipantFee, setEditParticipantFee] = useState('0')

    const openEditEventDetailsModal = () => {
        setEditTitle(eventItem.title)
        setEditDescription(eventItem.description || '')
        setEditEventType(eventItem.event_type)
        setEditScope(eventItem.scope)
        setEditTargetTroopId(eventItem.troop_id || '')
        setEditStartTime(toLocalDatetimeInputValue(eventItem.start_time))
        setEditEndTime(toLocalDatetimeInputValue(eventItem.end_time))
        setEditLocation(eventItem.location || '')
        setEditParticipantFee(String(eventItem.participant_fee || 0))
        setIsEditEventModalOpen(true)
    }

    const handleSaveEventDetails = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const { error: updateError } = await supabase
                .from('events')
                .update({
                    title: editTitle,
                    description: editDescription || null,
                    event_type: editEventType,
                    scope: editScope,
                    troop_id: editScope === 'troop' ? editTargetTroopId : null,
                    start_time: new Date(editStartTime).toISOString(),
                    end_time: new Date(editEndTime).toISOString(),
                    location: editLocation || null,
                    participant_fee: parseFloat(editParticipantFee) || 0,
                })
                .eq('id', eventItem.id)

            if (updateError) throw updateError

            const { data: updated, error: fetchError } = await supabase
                .from('events')
                .select('*, event_staff(*, profiles(full_name)), event_participants(*, members(first_name, last_name, troop_id, current_rank)), event_expenses(*), event_documents(*)')
                .eq('id', eventItem.id)
                .maybeSingle()

            if (fetchError || !updated) throw fetchError || new Error('Failed to retrieve updated event.')

            setEventItem(updated)
            setIsEditEventModalOpen(false)
            showStatus('Event details updated successfully!', 'success')
        } catch (err: any) {
            showStatus(err.message || 'Failed to update event details.', 'error')
        } finally {
            setLoading(false)
        }
    }

    // ── Edit Hierarchy Controls ──────────────────────────────────────────────
    const [isEditHierarchyModalOpen, setIsEditHierarchyModalOpen] = useState(false)
    const [hierarchyAssignments, setHierarchyAssignments] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(false)

    const openEditHierarchyModal = () => {
        const initialMap: Record<string, string> = {}
        for (const s of eventItem.event_staff || []) {
            initialMap[s.event_role] = s.profile_id
        }
        setHierarchyAssignments(initialMap)
        setIsEditHierarchyModalOpen(true)
    }

    const handleSaveHierarchy = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await supabase.from('event_staff').delete().eq('event_id', eventItem.id)

            const inserts = []
            for (const [roleKey, profileId] of Object.entries(hierarchyAssignments)) {
                if (profileId) {
                    inserts.push({
                        event_id: eventItem.id,
                        profile_id: profileId,
                        event_role: roleKey,
                    })
                }
            }

            let newStaffList: EventStaff[] = []
            if (inserts.length > 0) {
                const { data: sData, error: sErr } = await supabase
                    .from('event_staff')
                    .insert(inserts)
                    .select('*, profiles(full_name)')

                if (sErr) throw sErr
                newStaffList = sData || []

                // Dispatch notification to each newly assigned leader
                for (const staff of newStaffList) {
                    if (staff.profile_id) {
                        const roleTitle = getRoleLabel(staff.event_role, eventItem.event_type)
                        triggerNotification(staff.profile_id, {
                            title: `Assigned to Event Leadership: ${eventItem.title}`,
                            message: `You have been assigned as "${roleTitle}" for "${eventItem.title}". Click below to access your workspace.`,
                            actionUrl: `/group/dashboard/events/${eventItem.id}`,
                            category: 'events',
                        })
                    }
                }
            }

            setEventItem((prev) => ({ ...prev, event_staff: newStaffList }))
            setIsEditHierarchyModalOpen(false)
            showStatus('Event hierarchy (الهيكلية) updated successfully!', 'success')
        } catch (err: any) {
            showStatus(err.message || 'Failed to update event hierarchy.', 'error')
        } finally {
            setLoading(false)
        }
    }

    // ── Roster Edit Controls ──────────────────────────────────────────────────
    const [isEditRosterModalOpen, setIsEditRosterModalOpen] = useState(false)
    const [rosterSearch, setRosterSearch] = useState('')
    const [rosterTroopFilter, setRosterTroopFilter] = useState('all')

    const currentParticipantMemberIds = useMemo(() => {
        return new Set((eventItem.event_participants || []).map((p) => p.member_id))
    }, [eventItem.event_participants])

    const filteredGroupMembers = useMemo(() => {
        return allMembers.filter((m) => {
            if (rosterTroopFilter !== 'all' && m.troop_id !== rosterTroopFilter) {
                return false
            }
            if (rosterSearch.trim()) {
                const full = `${m.first_name} ${m.last_name}`.toLowerCase()
                if (!full.includes(rosterSearch.toLowerCase())) return false
            }
            return true
        })
    }, [allMembers, rosterTroopFilter, rosterSearch])

    const handleToggleMemberRoster = async (member: Member) => {
        const isEnrolled = currentParticipantMemberIds.has(member.id)

        if (isEnrolled) {
            const part = (eventItem.event_participants || []).find((p) => p.member_id === member.id)
            if (part?.id) {
                await supabase.from('event_participants').delete().eq('id', part.id)
                const updatedParts = (eventItem.event_participants || []).filter((p) => p.id !== part.id)
                setEventItem((prev) => ({ ...prev, event_participants: updatedParts }))
            }
        } else {
            const { data: newPart, error } = await supabase
                .from('event_participants')
                .insert({
                    event_id: eventItem.id,
                    member_id: member.id,
                    attendance_status: 'absent',
                    parent_consent: 'pending',
                    fee_paid: 0,
                    payment_status: 'unpaid',
                })
                .select('*, members(id, first_name, last_name, troop_id, current_rank)')
                .single()

            if (!error && newPart) {
                const updatedParts = [...(eventItem.event_participants || []), newPart]
                setEventItem((prev) => ({ ...prev, event_participants: updatedParts }))
            }
        }
    }

    const handleRemoveParticipant = async (participantId: string) => {
        await supabase.from('event_participants').delete().eq('id', participantId)
        const updatedParts = (eventItem.event_participants || []).filter((p) => p.id !== participantId)
        setEventItem((prev) => ({ ...prev, event_participants: updatedParts }))
        showStatus('Scout removed from event roster.', 'success')
    }

    const [updatingParticipantIds, setUpdatingParticipantIds] = useState<Record<string, boolean>>({})

    // Participant updates (Attendance, Consent, Fee) - Optimistic UI + Loading State
    const updateParticipant = async (participantId: string, updates: Partial<EventParticipant>) => {
        // Optimistic UI state update immediately
        setEventItem((prev) => ({
            ...prev,
            event_participants: (prev.event_participants || []).map((p) =>
                p.id === participantId ? { ...p, ...updates } : p
            ),
        }))

        setUpdatingParticipantIds((prev) => ({ ...prev, [participantId]: true }))

        const { data: updated, error } = await supabase
            .from('event_participants')
            .update(updates)
            .eq('id', participantId)
            .select('*, members(id, first_name, last_name, troop_id, current_rank)')
            .single()

        setUpdatingParticipantIds((prev) => {
            const next = { ...prev }
            delete next[participantId]
            return next
        })

        if (!error && updated) {
            setEventItem((prev) => ({
                ...prev,
                event_participants: (prev.event_participants || []).map((p) =>
                    p.id === participantId ? updated : p
                ),
            }))
        }
    }

    // ── Equipment Cart & Checkouts Handlers for Event ─────────────────────────
    const handleEventAddToCart = (item: any) => {
        const existing = eventCartItems.find((ci) => ci.item.id === item.id)
        if (existing) {
            if (existing.quantity < item.quantity_available) {
                setEventCartItems(
                    eventCartItems.map((ci) => (ci.item.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci))
                )
            }
        } else {
            setEventCartItems([...eventCartItems, { item, quantity: 1 }])
        }
    }

    const handleEventUpdateCartQty = (itemId: string, newQty: number) => {
        const item = inventoryList.find((i) => i.id === itemId)
        if (!item) return
        if (newQty <= 0) {
            setEventCartItems(eventCartItems.filter((ci) => ci.item.id !== itemId))
        } else {
            const validQty = Math.min(newQty, item.quantity_available)
            setEventCartItems(
                eventCartItems.map((ci) => (ci.item.id === itemId ? { ...ci, quantity: validQty } : ci))
            )
        }
    }

    const handleEventRemoveFromCart = (itemId: string) => {
        setEventCartItems(eventCartItems.filter((ci) => ci.item.id !== itemId))
    }

    const handleEventBatchCheckout = async (e: React.FormEvent) => {
        e.preventDefault()
        if (eventCartItems.length === 0) return showStatus('Please add at least one item.', 'error')

        setLoading(true)
        const isDirectHandout = isQuartermaster
        const newCheckouts: any[] = []

        try {
            for (const cartItem of eventCartItems) {
                const { data, error } = await supabase
                    .from('inventory_checkouts')
                    .insert({
                        item_id: cartItem.item.id,
                        group_id: groupId,
                        checked_out_to: userProfileId,
                        event_id: eventItem.id,
                        quantity: cartItem.quantity,
                        checkout_date: eventCheckoutDate,
                        return_date: eventReturnDate || null,
                        notes: eventCheckoutNotes.trim() || null,
                        status: isDirectHandout ? 'handed_out' : 'requested',
                        handed_out_by: isDirectHandout ? userProfileId : null,
                    })
                    .select('*')
                    .single()

                if (error) throw error
                newCheckouts.push(data)

                if (isDirectHandout) {
                    const newAvail = Math.max(0, cartItem.item.quantity_available - cartItem.quantity)
                    await supabase
                        .from('quartermaster_inventory')
                        .update({ quantity_available: newAvail })
                        .eq('id', cartItem.item.id)

                    setInventoryList((prev) =>
                        prev.map((it) => (it.id === cartItem.item.id ? { ...it, quantity_available: newAvail } : it))
                    )
                }
            }

            setLoading(false)
            setEventCheckouts((prev) => [...newCheckouts, ...prev])
            showStatus(
                isDirectHandout
                    ? `${eventCartItems.length} gear item(s) handed out to this event!`
                    : `Lending request for ${eventCartItems.length} item(s) submitted to the Quartermaster!`,
                'success'
            )
            setEventCartItems([])
            setIsEventCheckoutModalOpen(false)
        } catch (err: any) {
            setLoading(false)
            showStatus(err?.message || 'Error submitting loan request.', 'error')
        }
    }

    const handleEventMarkReturnPending = async (checkoutId: string) => {
        setLoading(true)
        const { data, error } = await supabase
            .from('inventory_checkouts')
            .update({ status: 'return_pending' })
            .eq('id', checkoutId)
            .select('*')
            .single()

        setLoading(false)
        if (error) {
            showStatus(error.message, 'error')
        } else {
            setEventCheckouts((prev) => prev.map((c) => (c.id === data.id ? data : c)))
            showStatus('Gear marked as returned to depot! Awaiting Quartermaster check-in.', 'success')
        }
    }

    // ── Treasury Expense Logging ────────────────────────────────────────────────
    const [expCategory, setExpCategory] = useState('food')
    const [expDesc, setExpDesc] = useState('')
    const [expAmount, setExpAmount] = useState('')

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!expDesc || !expAmount) return

        const amt = parseFloat(expAmount)
        if (isNaN(amt) || amt <= 0) return showStatus('Please enter a valid amount.', 'error')

        const isIncome = transactionType === 'income'
        const categoryToSave = isIncome ? `income_${paymentMethod}` : expCategory
        const descriptionToSave = isIncome ? `[INCOME: ${paymentMethod.toUpperCase()}] ${expDesc}` : expDesc

        const { data: expData, error } = await supabase
            .from('event_expenses')
            .insert({
                event_id: eventItem.id,
                category: categoryToSave,
                description: descriptionToSave,
                amount: amt,
                logged_by: userProfileId,
            })
            .select()
            .single()

        if (!error && expData) {
            const newExpenses = [expData, ...(eventItem.event_expenses || [])]
            setEventItem((prev) => ({ ...prev, event_expenses: newExpenses }))
            setExpDesc('')
            setExpAmount('')
            setIsLogTransactionModalOpen(false)
            showStatus(isIncome ? 'Income logged successfully!' : 'Expense logged successfully.', 'success')
        }
    }

    const handleDeleteExpense = async (expId: string) => {
        await supabase.from('event_expenses').delete().eq('id', expId)
        const newExpenses = (eventItem.event_expenses || []).filter((x) => x.id !== expId)
        setEventItem((prev) => ({ ...prev, event_expenses: newExpenses }))
    }

    // ── Provisions & Meals (Mas2oul Mounet) Calculated Memos ──────────────────
    const aggregatedIngredients = useMemo(() => {
        const map: Record<
            string,
            {
                name: string
                category: 'bakery' | 'butchery' | 'produce' | 'supermarket' | 'pantry' | 'supplies'
                unit: string
                totalAmount: number
                mealsCount: number
                matchedPantryItem?: any
                requestedFromPantryQty?: number
                pantryRequestStatus?: 'requested' | 'approved' | 'received' | 'rejected' | 'none'
            }
        > = {}

        mealPlans.forEach((plan) => {
            const headcount = plan.headcount_override || defaultCampHeadcount
            const ings = plan.event_meal_ingredients || []

            ings.forEach((ing) => {
                const rawAmt = Number(ing.portion_per_person) * headcount
                let finalAmt = rawAmt
                let finalUnit = ing.unit

                if (finalUnit === 'g' && finalAmt >= 1000) {
                    finalAmt = finalAmt / 1000
                    finalUnit = 'kg'
                } else if (finalUnit === 'ml' && finalAmt >= 1000) {
                    finalAmt = finalAmt / 1000
                    finalUnit = 'liters'
                }

                const key = `${ing.name.toLowerCase().trim()}_${finalUnit}`
                if (!map[key]) {
                    const ingNameLower = ing.name.toLowerCase().trim()
                    const cleanIngName = ing.name.replace(/\s*\((copy|\d+)\)\s*/gi, '').toLowerCase().trim()

                    // 1. Exact match on full name (e.g. if Central Pantry has "Canned Tuna (تونة) (Copy)")
                    let matchedPantry = groupPantryList.find(
                        (p) => p.name.toLowerCase().trim() === ingNameLower
                    )

                    // 2. If not found, match on clean name without (Copy)
                    if (!matchedPantry) {
                        matchedPantry = groupPantryList.find(
                            (p) => p.name.toLowerCase().trim() === cleanIngName
                        )
                    }

                    // 3. If still not found, check substring matches
                    if (!matchedPantry) {
                        matchedPantry = groupPantryList.find(
                            (p) =>
                                p.name.toLowerCase().trim().includes(cleanIngName) ||
                                cleanIngName.includes(p.name.toLowerCase().trim()) ||
                                p.name.toLowerCase().trim().includes(ingNameLower) ||
                                ingNameLower.includes(p.name.toLowerCase().trim())
                        )
                    }

                    const activeReq = pantryRequests.find(
                        (pr) => pr.pantry_item_id === matchedPantry?.id && pr.status !== 'rejected'
                    )
                    const rejectedReq = pantryRequests.find(
                        (pr) => pr.pantry_item_id === matchedPantry?.id && pr.status === 'rejected'
                    )

                    map[key] = {
                        name: ing.name,
                        category: ing.category,
                        unit: finalUnit,
                        totalAmount: 0,
                        mealsCount: 0,
                        matchedPantryItem: matchedPantry,
                        requestedFromPantryQty: activeReq?.quantity || 0,
                        pantryRequestStatus: (activeReq ? activeReq.status : rejectedReq ? 'rejected' : 'none') as 'requested' | 'approved' | 'rejected' | 'none',
                    }
                }

                map[key].totalAmount += finalAmt
                map[key].mealsCount += 1
            })
        })

        return Object.values(map)
    }, [mealPlans, defaultCampHeadcount, groupPantryList, pantryRequests])

    // ── Provisions & Meals Action Handlers ─────────────────────────────────────
    const handleOpenAddMealModal = (slotInfo: {
        dayNumber: number
        mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'custom'
        mealTitle: string
        existingPlanId?: string
    }) => {
        setAddMealDay(slotInfo.dayNumber)
        setAddMealSlotType(slotInfo.mealType)
        setAddMealSlotTitle(slotInfo.mealTitle)
        setAddMealExistingPlanId(slotInfo.existingPlanId)
        setAddMealSearchQuery('')
        setAddMealTypeFilter(slotInfo.mealType === 'custom' ? 'all' : (slotInfo.mealType as any))
        setAddMealSourceFilter('all')
        setAddMealTab('library')

        // Pre-fill custom form with slot defaults
        setCustomMealTitle('')
        setCustomMealHeadcountOverride('')
        setCustomMealNotes('')
        setCustomMealIngredients([])
        setIsAddMealModalOpen(true)
    }

    const handleSelectMealFromLibrary = async (mealTemplate: {
        title: string
        meal_type?: string
        notes?: string
        ingredients: Array<{
            name: string
            portion_per_person: number
            unit: 'g' | 'kg' | 'pieces' | 'cans' | 'loaves' | 'packs' | 'ml' | 'liters'
            category: 'bakery' | 'butchery' | 'produce' | 'supermarket' | 'pantry' | 'supplies'
        }>
    }) => {
        setIsSubmittingProvisions(true)

        try {
            let planId = addMealExistingPlanId
            let savedPlan: EventMealPlan

            if (planId) {
                const { data, error } = await supabase
                    .from('event_meal_plans')
                    .update({
                        recipe_name: mealTemplate.title,
                        meal_title: mealTemplate.title,
                        notes: mealTemplate.notes || null,
                    })
                    .eq('id', planId)
                    .select('*')
                    .single()
                if (error) throw error
                savedPlan = data
            } else {
                const { data, error } = await supabase
                    .from('event_meal_plans')
                    .insert({
                        event_id: eventItem.id,
                        day_number: addMealDay,
                        meal_type: addMealSlotType,
                        meal_title: mealTemplate.title,
                        recipe_name: mealTemplate.title,
                        notes: mealTemplate.notes || null,
                    })
                    .select('*')
                    .single()
                if (error) throw error
                savedPlan = data
                planId = data.id
            }

            await supabase.from('event_meal_ingredients').delete().eq('meal_plan_id', planId)

            const ingsToInsert = mealTemplate.ingredients.map((ing) => ({
                meal_plan_id: planId,
                event_id: eventItem.id,
                name: ing.name,
                portion_per_person: ing.portion_per_person,
                unit: ing.unit,
                category: ing.category,
            }))

            const { data: insertedIngs, error: ingsErr } = await supabase
                .from('event_meal_ingredients')
                .insert(ingsToInsert)
                .select('*')

            if (ingsErr) throw ingsErr

            const completePlan: EventMealPlan = {
                ...savedPlan,
                event_meal_ingredients: insertedIngs || [],
            }

            setMealPlans((prev) => {
                const exists = prev.some((p) => p.id === completePlan.id)
                if (exists) {
                    return prev.map((p) => (p.id === completePlan.id ? completePlan : p))
                }
                return [...prev, completePlan]
            })

            setIsAddMealModalOpen(false)
            showStatus(`Added "${mealTemplate.title}" to Day ${addMealDay}!`, 'success')
        } catch (err: any) {
            showStatus(err?.message || 'Failed to select meal.', 'error')
        } finally {
            setIsSubmittingProvisions(false)
        }
    }

    const handleDeleteMealPlan = async (planId: string) => {
        if (!confirm('Are you sure you want to remove this planned meal and its ingredients?')) return
        setIsSubmittingProvisions(true)

        try {
            await supabase.from('event_meal_plans').update({ is_deleted: true }).eq('id', planId)
            const remainingPlans = mealPlans.filter((p) => p.id !== planId)
            setMealPlans(remainingPlans)
            showStatus('Meal removed from camp schedule.', 'success')
        } catch (err: any) {
            showStatus(err?.message || 'Error deleting meal.', 'error')
        } finally {
            setIsSubmittingProvisions(false)
        }
    }

    const handleSaveCustomMeal = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!customMealTitle.trim()) {
            showStatus('Please enter a meal title.', 'error')
            return
        }

        setIsSubmittingProvisions(true)
        try {
            const hcOverride = customMealHeadcountOverride ? parseInt(customMealHeadcountOverride) : null

            let planId = addMealExistingPlanId
            let savedPlan: EventMealPlan

            if (planId) {
                const { data, error } = await supabase
                    .from('event_meal_plans')
                    .update({
                        meal_title: customMealTitle.trim(),
                        recipe_name: customMealTitle.trim(),
                        day_number: addMealDay,
                        meal_type: addMealSlotType,
                        headcount_override: hcOverride,
                        notes: customMealNotes.trim() || null,
                    })
                    .eq('id', planId)
                    .select('*')
                    .single()
                if (error) throw error
                savedPlan = data
            } else {
                const { data: planData, error: planErr } = await supabase
                    .from('event_meal_plans')
                    .insert({
                        event_id: eventItem.id,
                        day_number: addMealDay,
                        meal_type: addMealSlotType,
                        meal_title: customMealTitle.trim(),
                        recipe_name: customMealTitle.trim(),
                        headcount_override: hcOverride,
                        notes: customMealNotes.trim() || null,
                    })
                    .select('*')
                    .single()

                if (planErr) throw planErr
                savedPlan = planData
                planId = planData.id
            }

            await supabase.from('event_meal_ingredients').delete().eq('meal_plan_id', planId)

            let savedIngs: any[] = []
            if (customMealIngredients.length > 0) {
                const ingsToInsert = customMealIngredients.map((ing) => ({
                    meal_plan_id: planId,
                    event_id: eventItem.id,
                    name: ing.name.trim(),
                    portion_per_person: Number(ing.portion_per_person) || 1,
                    unit: ing.unit,
                    category: ing.category,
                }))

                const { data: insData, error: insErr } = await supabase
                    .from('event_meal_ingredients')
                    .insert(ingsToInsert)
                    .select('*')

                if (!insErr && insData) savedIngs = insData
            }

            const completePlan: EventMealPlan = {
                ...savedPlan,
                event_meal_ingredients: savedIngs,
            }

            setMealPlans((prev) => {
                const exists = prev.some((p) => p.id === completePlan.id)
                if (exists) {
                    return prev.map((p) => (p.id === completePlan.id ? completePlan : p))
                }
                return [...prev, completePlan]
            })

            setIsAddMealModalOpen(false)
            setCustomMealTitle('')
            setCustomMealIngredients([])
            setCustomMealHeadcountOverride('')
            setCustomMealNotes('')
            showStatus(`Saved custom meal "${completePlan.meal_title}"!`, 'success')
        } catch (err: any) {
            showStatus(err?.message || 'Failed to save custom meal.', 'error')
        } finally {
            setIsSubmittingProvisions(false)
        }
    }

    const handleOpenEditMeal = (plan: EventMealPlan) => {
        setEditingMealPlan(plan)
        setEditMealTitle(plan.recipe_name || plan.meal_title || 'Meal')
        setEditMealType(plan.meal_type || 'breakfast')
        setEditMealDay(plan.day_number || 1)
        setEditMealHeadcount(plan.headcount_override ? String(plan.headcount_override) : '')
        setEditMealNotes(plan.notes || '')
        setEditMealIngredients(
            (plan.event_meal_ingredients || []).map((ing) => ({
                id: ing.id,
                name: ing.name,
                portion_per_person: Number(ing.portion_per_person) || 1,
                unit: ing.unit || 'g',
                category: ing.category || 'supermarket',
            }))
        )
        setIsEditMealModalOpen(true)
    }

    const handleSaveEditedMeal = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingMealPlan || !editMealTitle.trim()) return
        setIsSubmittingProvisions(true)

        try {
            const hcOverride = editMealHeadcount ? parseInt(editMealHeadcount) : null

            const { data: updatedPlan, error: planErr } = await supabase
                .from('event_meal_plans')
                .update({
                    meal_title: editMealTitle.trim(),
                    recipe_name: editMealTitle.trim(),
                    meal_type: editMealType,
                    day_number: editMealDay,
                    headcount_override: hcOverride,
                    notes: editMealNotes.trim() || null,
                })
                .eq('id', editingMealPlan.id)
                .select('*')
                .single()

            if (planErr) throw planErr

            // Re-sync ingredients
            await supabase.from('event_meal_ingredients').delete().eq('meal_plan_id', editingMealPlan.id)

            let savedIngs: any[] = []
            if (editMealIngredients.length > 0) {
                const ingsToInsert = editMealIngredients.map((ing) => ({
                    meal_plan_id: editingMealPlan.id,
                    event_id: eventItem.id,
                    name: ing.name.trim(),
                    portion_per_person: Number(ing.portion_per_person) || 1,
                    unit: ing.unit,
                    category: ing.category,
                }))

                const { data: insData, error: insErr } = await supabase
                    .from('event_meal_ingredients')
                    .insert(ingsToInsert)
                    .select('*')

                if (!insErr && insData) savedIngs = insData
            }

            const completePlan: EventMealPlan = {
                ...updatedPlan,
                event_meal_ingredients: savedIngs,
            }

            setMealPlans((prev) =>
                prev.map((p) => (p.id === completePlan.id ? completePlan : p))
            )

            setIsEditMealModalOpen(false)
            setEditingMealPlan(null)
            showStatus(`Updated meal "${completePlan.meal_title}"!`, 'success')
        } catch (err: any) {
            showStatus(err?.message || 'Error updating meal.', 'error')
        } finally {
            setIsSubmittingProvisions(false)
        }
    }

    const handleRemoveCampDay = async (dayNumToRemove: number) => {
        if (totalCampDays <= 1) {
            showStatus('Camp schedule must have at least 1 day.', 'error')
            return
        }

        const mealsForDay = mealPlans.filter((m) => m.day_number === dayNumToRemove)
        const msg =
            mealsForDay.length > 0
                ? `Are you sure you want to delete Day ${dayNumToRemove}? ${mealsForDay.length} planned meals for Day ${dayNumToRemove} will also be deleted.`
                : `Are you sure you want to delete Day ${dayNumToRemove}?`

        if (!confirm(msg)) return

        setIsSubmittingProvisions(true)
        try {
            if (mealsForDay.length > 0) {
                await supabase
                    .from('event_meal_plans')
                    .update({ is_deleted: true })
                    .eq('event_id', eventItem.id)
                    .eq('day_number', dayNumToRemove)

                setMealPlans((prev) => prev.filter((m) => m.day_number !== dayNumToRemove))
            }

            setExtraCampDays((prev) => prev - 1)
            setSelectedCampDay((prev) => (prev >= dayNumToRemove ? Math.max(1, prev - 1) : prev))
            showStatus(`Day ${dayNumToRemove} removed.`, 'success')
        } catch (err: any) {
            showStatus(err?.message || 'Error removing day.', 'error')
        } finally {
            setIsSubmittingProvisions(false)
        }
    }

    // ── Smart Shopping List Sync Handler ───────────────────────────────────────
    const handleSyncShoppingListWithMeals = async () => {
        if (aggregatedIngredients.length === 0 && shoppingList.length === 0) {
            showStatus('No camp ingredients to sync.', 'error')
            return
        }

        setIsSubmittingProvisions(true)
        try {
            const remainingMap = new Map<string, { agg: any; remaining: number }>()
            aggregatedIngredients.forEach((agg) => {
                const norm = agg.name.toLowerCase().trim()
                const claimed = agg.requestedFromPantryQty || 0
                const rem = Math.max(0, agg.totalAmount - claimed)
                remainingMap.set(norm, { agg, remaining: rem })
            })

            let updatedList: EventShoppingListItem[] = []
            const toDeleteIds: string[] = []

            for (const item of shoppingList) {
                const norm = item.name.toLowerCase().trim()
                const match = remainingMap.get(norm)

                if (item.is_purchased) {
                    // Always preserve already purchased items!
                    updatedList.push(item)
                } else if (match && match.remaining > 0) {
                    const newQty = Math.round(match.remaining * 100) / 100
                    if (item.quantity_needed !== newQty || item.unit !== match.agg.unit) {
                        await supabase
                            .from('event_shopping_list_items')
                            .update({ quantity_needed: newQty, unit: match.agg.unit })
                            .eq('id', item.id)
                        updatedList.push({ ...item, quantity_needed: newQty, unit: match.agg.unit })
                    } else {
                        updatedList.push(item)
                    }
                } else {
                    // Removed from meals or 100% covered by pantry -> delete unpurchased item
                    toDeleteIds.push(item.id)
                }
            }

            if (toDeleteIds.length > 0) {
                await supabase.from('event_shopping_list_items').delete().in('id', toDeleteIds)
            }

            // Insert missing ingredients needed for camp
            const existingNorms = new Set(updatedList.map((i) => i.name.toLowerCase().trim()))
            const toInsert: any[] = []

            for (const [norm, { agg, remaining }] of remainingMap.entries()) {
                if (!existingNorms.has(norm) && remaining > 0) {
                    toInsert.push({
                        event_id: eventItem.id,
                        name: agg.name,
                        category: agg.category === 'pantry' ? 'supermarket' : agg.category,
                        quantity_needed: Math.round(remaining * 100) / 100,
                        unit: agg.unit,
                        is_purchased: false,
                    })
                }
            }

            if (toInsert.length > 0) {
                const { data: insertedData, error: insErr } = await supabase
                    .from('event_shopping_list_items')
                    .insert(toInsert)
                    .select('*')
                if (insErr) throw insErr
                if (insertedData) updatedList = [...insertedData, ...updatedList]
            }

            setShoppingList(updatedList)
            showStatus('Shopping list synced! Quantities updated and unneeded items removed.', 'success')
        } catch (err: any) {
            showStatus(err?.message || 'Failed to sync shopping list.', 'error')
        } finally {
            setIsSubmittingProvisions(false)
        }
    }

    const handleToggleShoppingItem = async (itemId: string, currentPurchased: boolean) => {
        const nextPurchased = !currentPurchased
        setShoppingList((prev) =>
            prev.map((item) =>
                item.id === itemId
                    ? {
                        ...item,
                        is_purchased: nextPurchased,
                        purchased_by: nextPurchased ? userProfileId : null,
                    }
                    : item
            )
        )

        await supabase
            .from('event_shopping_list_items')
            .update({
                is_purchased: nextPurchased,
                purchased_by: nextPurchased ? userProfileId : null,
            })
            .eq('id', itemId)
    }

    const handleAddShoppingItem = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!shoppingItemName.trim()) return

        const qty = parseFloat(shoppingItemQty) || 1
        const cost = parseFloat(shoppingItemEstCost) || 0

        const { data, error } = await supabase
            .from('event_shopping_list_items')
            .insert({
                event_id: eventItem.id,
                name: shoppingItemName.trim(),
                category: shoppingItemCategory,
                quantity_needed: qty,
                unit: shoppingItemUnit,
                estimated_cost: cost,
                notes: shoppingItemNotes.trim() || null,
                is_purchased: false,
            })
            .select('*')
            .single()

        if (error) {
            showStatus(error.message, 'error')
        } else {
            setShoppingList((prev) => [data, ...prev])
            setShoppingItemName('')
            setShoppingItemQty('1')
            setShoppingItemEstCost('0')
            setShoppingItemNotes('')
            setIsShoppingItemModalOpen(false)
            showStatus(`Added "${data.name}" to grocery shopping list!`, 'success')
        }
    }

    const handleDeleteShoppingItem = async (itemId: string) => {
        const { error } = await supabase.from('event_shopping_list_items').delete().eq('id', itemId)
        if (!error) {
            setShoppingList((prev) => prev.filter((i) => i.id !== itemId))
            showStatus('Item removed from shopping list.', 'success')
        }
    }

    const handleGenerateShoppingListFromMeals = async () => {
        if (aggregatedIngredients.length === 0) {
            showStatus('No ingredients found in your camp meal plans yet.', 'error')
            return
        }

        setIsSubmittingProvisions(true)
        try {
            const inserts = aggregatedIngredients.map((agg) => ({
                event_id: eventItem.id,
                name: agg.name,
                category: agg.category === 'pantry' ? 'supermarket' : agg.category,
                quantity_needed: Math.round(agg.totalAmount * 100) / 100,
                unit: agg.unit,
                is_purchased: false,
            }))

            const { data, error } = await supabase
                .from('event_shopping_list_items')
                .insert(inserts)
                .select('*')

            if (error) throw error

            setShoppingList((prev) => [...(data || []), ...prev])
            setProvisionsSubTab('shopping')
            showStatus(`Generated ${data?.length || 0} grocery items from camp meal plan!`, 'success')
        } catch (err: any) {
            showStatus(err?.message || 'Error generating shopping list.', 'error')
        } finally {
            setIsSubmittingProvisions(false)
        }
    }

    const handleRequestPantryItem = async (pantryItem: any, requestedQuantity: number, unit: string, recipeIngredientName?: string) => {
        if (!pantryItem || requestedQuantity <= 0) return
        setIsSubmittingProvisions(true)

        try {
            const existingReq = pantryRequests.find((pr) => pr.pantry_item_id === pantryItem.id)
            const noteForRecipe = recipeIngredientName && recipeIngredientName.toLowerCase().trim() !== pantryItem.name.toLowerCase().trim()
                ? `[For Camp Recipe: ${recipeIngredientName}]`
                : null

            if (existingReq) {
                const updatedNotes = noteForRecipe
                    ? existingReq.notes ? `${existingReq.notes} | ${noteForRecipe}` : noteForRecipe
                    : existingReq.notes

                const { data, error } = await supabase
                    .from('event_pantry_requests')
                    .update({
                        quantity: requestedQuantity,
                        unit: unit,
                        status: 'requested',
                        requested_by: userProfileId,
                        notes: updatedNotes,
                    })
                    .eq('id', existingReq.id)
                    .select('*, group_pantry_items(name, unit)')
                    .single()

                if (error) throw error

                setPantryRequests((prev) => prev.map((r) => (r.id === existingReq.id ? data : r)))
            } else {
                const { data, error } = await supabase
                    .from('event_pantry_requests')
                    .insert({
                        event_id: eventItem.id,
                        group_id: groupId,
                        pantry_item_id: pantryItem.id,
                        quantity: requestedQuantity,
                        unit: unit,
                        status: 'requested',
                        requested_by: userProfileId,
                        notes: noteForRecipe,
                    })
                    .select('*, group_pantry_items(name, unit)')
                    .single()

                if (error) throw error

                setPantryRequests((prev) => [data, ...prev])
            }

            // Dispatch notification to Group Pantry Master (Mas2oul Mounet)
            triggerRoleNotification(groupId, 'mas2oul_mounet', {
                title: `Pantry Transfer Request: ${eventItem.title}`,
                message: `${userName || 'Kitchen staff'} requested ${requestedQuantity} ${unit} of "${pantryItem.name}" for "${eventItem.title}".`,
                actionUrl: `/group/dashboard/events/${eventItem.id}`,
                category: 'pantry',
            })

            showStatus(`Submitted request for ${requestedQuantity} ${unit} of "${pantryItem.name}" from Group Pantry!`, 'success')
        } catch (err: any) {
            showStatus(err?.message || 'Error requesting from pantry.', 'error')
        } finally {
            setIsSubmittingProvisions(false)
        }
    }

    // ── Documents & Direct Storage Upload ──────────────────────────────────────
    const [docUploadMode, setDocUploadMode] = useState<'upload' | 'link'>('upload')
    const [docTitle, setDocTitle] = useState('')
    const [docUrl, setDocUrl] = useState('')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isUploadingFile, setIsUploadingFile] = useState(false)

    const [editingDocId, setEditingDocId] = useState<string | null>(null)
    const [editingDocTitle, setEditingDocTitle] = useState('')

    const handleUpdateDocumentTitle = async (docId: string) => {
        if (!editingDocTitle.trim()) return
        const { error } = await supabase.from('event_documents').update({ title: editingDocTitle.trim() }).eq('id', docId)
        if (!error) {
            const newDocs = (eventItem.event_documents || []).map((x) =>
                x.id === docId ? { ...x, title: editingDocTitle.trim() } : x
            )
            setEventItem((prev) => ({ ...prev, event_documents: newDocs }))
            setEditingDocId(null)
            showStatus('Document renamed.', 'success')
        } else {
            showStatus(error.message, 'error')
        }
    }

    const handleAddDocument = async (e: React.FormEvent) => {
        e.preventDefault()

        let finalFileUrl = ''
        let titleToUse = docTitle.trim()

        if (docUploadMode === 'link') {
            if (!docUrl.trim()) return showStatus('Please enter a valid Google Drive Folder or Album link.', 'error')
            if (!docUrl.startsWith('http://') && !docUrl.startsWith('https://')) {
                return showStatus('Link must start with https://', 'error')
            }
            finalFileUrl = docUrl.trim()
            if (!titleToUse) {
                if (finalFileUrl.includes('drive.google.com/drive/folders')) {
                    titleToUse = 'Google Drive Media Folder'
                } else if (finalFileUrl.includes('photos')) {
                    titleToUse = 'Google Photos Album'
                } else {
                    titleToUse = 'Event Media & Document Link'
                }
            }
        } else {
            if (!selectedFile) return showStatus('Please select a file from your device to upload.', 'error')
            if (!titleToUse) titleToUse = selectedFile.name.replace(/\.[^/.]+$/, '')

            setIsUploadingFile(true)
            const uploadFormData = new FormData()
            uploadFormData.append('file', selectedFile)

            const eventYear = eventItem.start_time ? new Date(eventItem.start_time).getFullYear() : new Date().getFullYear()
            const assignedTroopObj = troops.find((t) => t.id === eventItem.troop_id)
            const assignedTroopName = assignedTroopObj?.name || (eventItem.troop_id ? 'Troop Event' : 'Group Wide Events')

            uploadFormData.append('groupName', groupName || 'Scout Group')
            uploadFormData.append('troopName', assignedTroopName)
            uploadFormData.append('eventTitle', `${eventItem.title || 'Event'} (${eventYear})`)

            try {
                const res = await fetch('/api/documents/upload-gdrive', {
                    method: 'POST',
                    body: uploadFormData,
                })
                const gdriveRes = await res.json()

                if (res.ok && gdriveRes.webViewLink) {
                    finalFileUrl = gdriveRes.webViewLink
                } else {
                    setIsUploadingFile(false)
                    return showStatus(`Google Drive Upload Error: ${gdriveRes.error || 'Failed to upload file'}`, 'error')
                }
            } catch (err: any) {
                setIsUploadingFile(false)
                return showStatus(`Upload connection failed: ${err.message}`, 'error')
            }
            setIsUploadingFile(false)
        }

        const { data: docData, error } = await supabase
            .from('event_documents')
            .insert({
                event_id: eventItem.id,
                title: titleToUse,
                file_url: finalFileUrl,
                uploaded_by: userProfileId,
            })
            .select()
            .single()

        if (!error && docData) {
            const newDocs = [docData, ...(eventItem.event_documents || [])]
            setEventItem((prev) => ({ ...prev, event_documents: newDocs }))
            setDocTitle('')
            setDocUrl('')
            setSelectedFile(null)
            showStatus(docUploadMode === 'link' ? 'Drive folder / media link attached successfully!' : 'Document uploaded and attached successfully!', 'success')
        } else if (error) {
            showStatus(error.message, 'error')
        }
    }

    const handleDeleteDocument = async (docId: string) => {
        const { error } = await supabase.from('event_documents').delete().eq('id', docId)
        if (!error) {
            const newDocs = (eventItem.event_documents || []).filter((x) => x.id !== docId)
            setEventItem((prev) => ({ ...prev, event_documents: newDocs }))
            showStatus('Document removed.', 'success')
        }
    }

    // Handle Logout
    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const startDateStr = eventItem.start_time
        ? `${formatDateDisplay(eventItem.start_time)} · ${formatTimeDisplay(eventItem.start_time)}`
        : '—'
    const endDateStr = eventItem.end_time
        ? `${formatDateDisplay(eventItem.end_time)} · ${formatTimeDisplay(eventItem.end_time)}`
        : '—'

    return (
        <DashboardShell groupName={groupName} currentRole={currentRole} userName={userName}>
            {statusMessage && (
                <div
                    className={`p-4 rounded-xl border text-sm text-center ${statusMessage.type === 'success'
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                        : 'bg-rose-50 border-rose-100 text-rose-800'
                        }`}
                >
                    {statusMessage.text}
                </div>
            )}

            {/* Breadcrumb Back Button */}
            <div className="flex items-center justify-between">
                <Link
                    href="/group/dashboard/events"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:text-teal-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs transition-all active:scale-95"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to Events</span>
                </Link>
            </div>

            {/* Hero Event Banner */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-5 shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3.5">
                <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${eventItem.scope === 'group' ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}>
                            {eventItem.scope === 'group' ? 'Full Group' : 'Troop Unit'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 uppercase tracking-wider">
                            {eventItem.event_type}
                        </span>
                        {canEditEvent && (
                            <button
                                onClick={openEditEventDetailsModal}
                                className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-lg text-[10px] transition-colors"
                            >
                                <Edit className="h-3 w-3" /> Edit
                            </button>
                        )}
                    </div>
                    <h1 className="text-base sm:text-xl font-black text-slate-900 leading-tight">{eventItem.title}</h1>
                    {eventItem.description && <p className="text-[11px] text-slate-500 line-clamp-2">{eventItem.description}</p>}
                </div>

                <div className="bg-slate-50 border border-slate-200 p-2.5 sm:p-3 rounded-xl text-[11px] space-y-1 w-full md:w-auto md:shrink-0 md:min-w-60">
                    <div className="flex justify-between"><span className="text-slate-400 font-medium">Start:</span><span className="font-bold text-slate-800">{startDateStr}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400 font-medium">End:</span><span className="font-bold text-slate-800">{endDateStr}</span></div>
                    {eventItem.location && <div className="flex justify-between"><span className="text-slate-400 font-medium">Location:</span><span className="font-bold text-teal-800 truncate ml-2">{eventItem.location}</span></div>}
                    <div className="flex justify-between pt-1 border-t border-slate-200"><span className="text-slate-400 font-medium">Fee:</span><span className="font-black text-teal-800">${eventItem.participant_fee} / scout</span></div>
                </div>
            </div>

            {/* Role Access Notice */}
            {!canEditEvent && userAssignedRoles.length > 0 && (
                <div className="bg-teal-50 border border-teal-200 text-teal-900 text-xs px-3.5 py-2 rounded-xl font-medium flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-teal-700" />
                    <span>
                        Role Scoped Access: Assigned as <strong>{userAssignedRoles.map((r) => getRoleLabel(r, eventItem.event_type)).join(', ')}</strong>.
                    </span>
                </div>
            )}

            {/* Workspace Pill Navigation Tabs (Mobile Scrollable Pill Bar) */}
            <div className="bg-slate-100/90 p-1 rounded-xl flex overflow-x-auto gap-1 shrink-0 scrollbar-none border border-slate-200/70">
                {availableTabs.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap flex items-center gap-1.5 ${activeTab === t.key
                            ? 'bg-teal-800 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                            }`}
                    >
                        <span>{t.icon}</span>
                        <span>{t.label}</span>
                    </button>
                ))}
            </div>

            {/* ── TAB 1: STAFF HIERARCHY ───────────────────────────────────────────── */}
            {activeTab === 'hierarchy' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">
                                Event Staff Hierarchy ({eventItem.event_type === 'camp' ? 'هيكلية المخيّم' : 'هيكلية النشاط'})
                            </h3>
                            <p className="text-xs text-slate-500">Official leaders assigned to perform camp/event management duties.</p>
                        </div>
                        {canEditEvent && (
                            <button
                                onClick={openEditHierarchyModal}
                                className="inline-flex items-center gap-1.5 bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow transition-colors shrink-0"
                            >
                                <Edit className="h-4 w-4" />
                                Edit All Roles
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {BASE_STAFF_ROLES.map((r) => {
                            const label = getRoleLabel(r.key, eventItem.event_type)
                            const assigned = (eventItem.event_staff || []).find((s) => s.event_role === r.key)
                            return (
                                <div key={r.key} className={`rounded-xl p-4 flex flex-col justify-between border ${assigned ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/50 border-slate-150 opacity-75'}`}>
                                    <div className="flex justify-between items-start gap-2">
                                        <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">{label}</span>
                                        {canEditEvent && (
                                            <button
                                                onClick={() => {
                                                    setSingleSelectedProfileId(assigned?.profile_id || '')
                                                    setSingleEditingRoleKey(r.key)
                                                }}
                                                className="p-1 text-slate-400 hover:text-teal-700 rounded transition-colors"
                                                title="Edit this role"
                                            >
                                                <Edit className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-sm font-bold text-slate-900 mt-2">
                                        {assigned?.profiles?.full_name || <span className="text-slate-400 italic text-xs font-normal">Unassigned</span>}
                                    </p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ── EDIT EVENT HIERARCHY MODAL ────────────────────────────────────── */}
            {isEditHierarchyModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    Edit Staff Roles ({eventItem.event_type === 'camp' ? 'هيكلية المخيّم' : 'هيكلية النشاط'})
                                </h3>
                                <p className="text-xs text-slate-500">Assign leaders and senior scout members to official staff roles.</p>
                            </div>
                            <button onClick={() => setIsEditHierarchyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveHierarchy} className="space-y-4 flex-1 overflow-y-auto pr-1">
                            <div className="space-y-3">
                                {BASE_STAFF_ROLES.map((r) => (
                                    <div key={r.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                                        <label className="text-xs font-bold text-teal-900 sm:w-1/2">{getRoleLabel(r.key, eventItem.event_type)}</label>
                                        <select
                                            value={hierarchyAssignments[r.key] || ''}
                                            onChange={(e) => setHierarchyAssignments((prev) => ({ ...prev, [r.key]: e.target.value }))}
                                            className="sm:w-1/2 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none"
                                        >
                                            <option value="">-- Unassigned --</option>
                                            {leadersList.map((l) => (
                                                <option key={l.id} value={l.id}>{l.fullName}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>

                            <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl flex items-center justify-between gap-3">
                                <div className="text-xs text-teal-900">
                                    <strong>Want to assign a Scout Member?</strong> You can provision them a login account so they can perform their role duties.
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setProvisionTargetRole('')
                                        setProvisionMemberId('')
                                        setProvisionEmail('')
                                        setProvisionPassword('')
                                        setProvisionSuccessData(null)
                                        setIsProvisionMemberModalOpen(true)
                                    }}
                                    className="px-3 py-1.5 bg-teal-800 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors"
                                >
                                    <UserPlus className="h-3.5 w-3.5" />
                                    <span>Provision Member Login</span>
                                </button>
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditHierarchyModalOpen(false)}
                                    className="flex-1 py-2 border border-slate-300 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-xl text-xs font-bold shadow disabled:bg-slate-300 transition-colors flex items-center justify-center gap-1.5"
                                >
                                    {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    <span>{loading ? 'Saving Hierarchy…' : 'Save Hierarchy Changes'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── EDIT 1 SINGLE ROLE MODAL ────────────────────────────────────── */}
            {singleEditingRoleKey && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    Assign {getRoleLabel(singleEditingRoleKey, eventItem.event_type)}
                                </h3>
                                <p className="text-xs text-slate-500">Select a leader or scout member for this role.</p>
                            </div>
                            <button onClick={() => setSingleEditingRoleKey(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveSingleRole} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">Assigned Person</label>
                                <select
                                    value={singleSelectedProfileId}
                                    onChange={(e) => setSingleSelectedProfileId(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                                >
                                    <option value="">-- Unassigned --</option>
                                    {leadersList.map((l) => (
                                        <option key={l.id} value={l.id}>{l.fullName}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl space-y-1.5">
                                <p className="font-bold text-teal-900">Assign a Scout Member?</p>
                                <p className="text-[11px] text-teal-800 leading-tight">
                                    If this role is held by a scout, create their login account so they can perform their duties.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setProvisionTargetRole(singleEditingRoleKey)
                                        setProvisionMemberId('')
                                        setProvisionEmail('')
                                        setProvisionPassword('')
                                        setProvisionSuccessData(null)
                                        setIsProvisionMemberModalOpen(true)
                                    }}
                                    className="mt-1 w-full py-1.5 bg-teal-800 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    <UserPlus className="h-3.5 w-3.5" />
                                    <span>Provision Login for Member</span>
                                </button>
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setSingleEditingRoleKey(null)}
                                    className="flex-1 py-2 border border-slate-300 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-2 bg-teal-800 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow transition-colors disabled:bg-slate-300 flex items-center justify-center gap-1.5"
                                >
                                    {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    <span>{loading ? 'Saving…' : 'Save Role'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── PROVISION MEMBER LOGIN MODAL ─────────────────────────────────── */}
            {isProvisionMemberModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center">
                                    <UserPlus className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">Provision Member Login</h3>
                                    <p className="text-xs text-slate-500">Create login credentials for a scout member.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setIsProvisionMemberModalOpen(false)
                                    setProvisionSuccessData(null)
                                }}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {provisionSuccessData ? (
                            <div className="space-y-4 pt-1">
                                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                                    <p className="text-xs font-bold text-emerald-900">✓ Member Login Created & Role Assigned!</p>
                                    <p className="text-xs text-emerald-800">Share these login credentials with <strong>{provisionSuccessData.name}</strong>:</p>
                                    <div className="bg-white p-3 rounded-xl border border-emerald-200 text-xs font-mono space-y-1">
                                        <div><strong>Email:</strong> {provisionSuccessData.email}</div>
                                        <div><strong>Password:</strong> {provisionSuccessData.pass}</div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(`Scout Leader Portal Login:\nEmail: ${provisionSuccessData.email}\nPassword: ${provisionSuccessData.pass}`)
                                            setCopiedProvisionPass(true)
                                            setTimeout(() => setCopiedProvisionPass(false), 3000)
                                        }}
                                        className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                        {copiedProvisionPass ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        <span>{copiedProvisionPass ? 'Copied to Clipboard!' : 'Copy Credentials'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsProvisionMemberModalOpen(false)
                                            setProvisionSuccessData(null)
                                            setSingleEditingRoleKey(null)
                                        }}
                                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleProvisionMemberSubmit} className="space-y-4 text-xs">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Search & Select Scout Member</label>
                                    <div className="relative mb-1.5">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                        <input
                                            type="text"
                                            value={memberSearchQuery}
                                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                                            placeholder="Type scout name or rank to filter..."
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                                        />
                                    </div>
                                    <select
                                        value={provisionMemberId}
                                        onChange={(e) => {
                                            setProvisionMemberId(e.target.value)
                                            const m = allMembers.find((item) => item.id === e.target.value)
                                            if (m) {
                                                const autoEmail = `${m.first_name.toLowerCase().replace(/[^a-z0-9]/g, '')}.${m.last_name.toLowerCase().replace(/[^a-z0-9]/g, '')}@sdcsaintjeanmarc.org`
                                                setProvisionEmail(autoEmail)
                                                handleGenerateMemberPassword()
                                            }
                                        }}
                                        required
                                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                                    >
                                        <option value="">-- Choose Member ({filteredProvisionMembers.length} listed) --</option>
                                        {filteredProvisionMembers.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.first_name} {m.last_name} ({m.current_rank || 'Scout'})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Login Email</label>
                                    <input
                                        type="email"
                                        value={provisionEmail}
                                        onChange={(e) => setProvisionEmail(e.target.value)}
                                        required
                                        placeholder="scout.member@domain.com"
                                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none font-mono"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block font-bold text-slate-700">Initial Password</label>
                                        <button
                                            type="button"
                                            onClick={handleGenerateMemberPassword}
                                            className="text-[11px] font-bold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1 hover:underline"
                                        >
                                            <Sparkles className="h-3 w-3" /> Auto-generate
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={provisionPassword}
                                        onChange={(e) => setProvisionPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        placeholder="Min 6 characters"
                                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none font-mono"
                                    />
                                </div>

                                {provisionTargetRole && (
                                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                                        <span className="text-slate-500">Will be assigned to role:</span>{' '}
                                        <strong className="text-teal-900">{getRoleLabel(provisionTargetRole, eventItem.event_type)}</strong>
                                    </div>
                                )}

                                <div className="pt-3 border-t border-slate-100 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsProvisionMemberModalOpen(false)}
                                        className="flex-1 py-2 border border-slate-300 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading || !provisionMemberId || provisionPassword.length < 6}
                                        className="flex-1 py-2 bg-teal-800 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow transition-colors disabled:bg-slate-300 flex items-center justify-center gap-1.5"
                                    >
                                        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                        <span>{loading ? 'Creating Login…' : 'Create & Assign Login'}</span>
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* ── TAB 2: SCOUT ROSTER & CONSENT ───────────────────────────────────── */}
            {activeTab === 'roster' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                    {/* Header & Section Filter Pills */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Scout Participant Roster & Parent Consent</h3>
                            <p className="text-xs text-slate-500">Managed by Camp Secretary ({isCampSecretary ? 'You have edit access' : 'Read-only'}).</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {/* Section / Troop Filter Pills */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1"><Filter className="h-3.5 w-3.5" /> Unit:</span>
                                <button
                                    onClick={() => setSectionFilter('all')}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${sectionFilter === 'all' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    All Sections
                                </button>

                                {troops.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setSectionFilter(t.id)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${sectionFilter === t.id ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                    >
                                        {t.name}
                                    </button>
                                ))}
                            </div>

                            {isCampSecretary && (
                                <button
                                    onClick={() => setIsEditRosterModalOpen(true)}
                                    className="inline-flex items-center gap-1.5 bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow transition-colors"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add / Remove Scouts
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Roster Grouped by Troop / Section */}
                    <div className="space-y-6">

                        {participantsGroupedByTroop.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-xs italic">
                                No scout participants found for the selected section filter.
                            </div>
                        ) : (
                            participantsGroupedByTroop.map((group) => (
                                <div key={group.troopName} className="border border-slate-200 rounded-xl overflow-hidden">
                                    {/* Section Header Banner */}
                                    <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
                                        <span className="font-extrabold text-xs text-teal-900 uppercase tracking-wider flex items-center gap-2">
                                            <Layers className="h-4 w-4 text-teal-700" />
                                            Section Unit: {group.troopName} ({group.participants.length} Scouts)
                                        </span>
                                        <span className="text-xs text-slate-500 font-semibold">
                                            Present: {group.participants.filter((p) => p.attendance_status === 'present').length}
                                        </span>
                                    </div>

                                    <div className="divide-y divide-slate-100">
                                        {group.participants.map((p) => (
                                            <div key={p.id} className="p-3.5 bg-white flex items-center justify-between gap-3 text-xs">
                                                <div>
                                                    <p className="font-bold text-slate-900 text-sm">
                                                        {p.members?.first_name} {p.members?.last_name}
                                                    </p>
                                                    {p.members?.current_rank && p.members?.current_rank !== 'None' && (
                                                        <p className="text-[10px] text-slate-400 font-semibold">{p.members.current_rank}</p>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    {/* Attendance Toggle Only */}
                                                    <div>
                                                        <button
                                                            disabled={!isCampSecretary || updatingParticipantIds[p.id!]}
                                                            onClick={() => updateParticipant(p.id!, { attendance_status: p.attendance_status === 'present' ? 'absent' : 'present' })}
                                                            className={`px-4 py-1.5 rounded-lg font-bold border text-xs transition-colors inline-flex items-center gap-1.5 ${p.attendance_status === 'present' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                                        >
                                                            {updatingParticipantIds[p.id!] ? (
                                                                <>
                                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                                    <span>Updating…</span>
                                                                </>
                                                            ) : p.attendance_status === 'present' ? (
                                                                '✓ Attended'
                                                            ) : (
                                                                '✗ Absent'
                                                            )}
                                                        </button>
                                                    </div>

                                                    {isCampSecretary && (
                                                        <button
                                                            onClick={() => handleRemoveParticipant(p.id!)}
                                                            className="text-slate-300 hover:text-rose-600 p-1 transition-colors self-end sm:self-center"
                                                            title="Remove Scout from Event Roster"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ── EDIT EVENT ROSTER MODAL ────────────────────────────────────── */}
            {isEditRosterModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Manage Event Roster</h3>
                                <p className="text-xs text-slate-500">Toggle scouts to add or remove them from this camp/event roster.</p>
                            </div>
                            <button onClick={() => setIsEditRosterModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Filters */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 border-b border-slate-100">
                            <input
                                type="text"
                                placeholder="Search scout by name..."
                                value={rosterSearch}
                                onChange={(e) => setRosterSearch(e.target.value)}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none"
                            />
                            <select
                                value={rosterTroopFilter}
                                onChange={(e) => setRosterTroopFilter(e.target.value)}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                            >
                                <option value="all">All Group Sections</option>
                                {troops.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>

                        {/* Scouts List with Checkboxes */}
                        <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 p-2 bg-slate-50 space-y-1">
                            {filteredGroupMembers.length === 0 ? (
                                <div className="p-6 text-center text-xs text-slate-400">No scouts match your search.</div>
                            ) : (
                                filteredGroupMembers.map((m) => {
                                    const isEnrolled = currentParticipantMemberIds.has(m.id)
                                    const troopName = troops.find((t) => t.id === m.troop_id)?.name
                                    return (
                                        <label
                                            key={m.id}
                                            className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition-colors ${isEnrolled ? 'bg-teal-50 border-teal-200 text-teal-900' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isEnrolled}
                                                    onChange={() => handleToggleMemberRoster(m)}
                                                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                                                />
                                                <div>
                                                    <p className="font-bold text-sm">{m.first_name} {m.last_name}</p>
                                                    <p className="text-[10px] text-slate-400">Unit: {troopName || 'Unassigned'} {m.current_rank && `• ${m.current_rank}`}</p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isEnrolled ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                {isEnrolled ? '✓ In Roster' : '+ Excluded'}
                                            </span>
                                        </label>
                                    )
                                })
                            )}
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button
                                onClick={() => setIsEditRosterModalOpen(false)}
                                className="bg-teal-700 hover:bg-teal-600 text-white font-bold px-5 py-2 rounded-xl text-xs shadow"
                            >
                                Done Managing Roster
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB 3: CAMP TREASURY & EXPENSES ─────────────────────────────────── */}
            {activeTab === 'treasury' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                    <div className="border-b border-slate-100 pb-3">
                        <h3 className="text-lg font-bold text-slate-900">Camp Treasury & Categorized Expenses</h3>
                        <p className="text-xs text-slate-500">Managed by Camp Treasurer ({isCampTreasurer ? 'You have edit access' : 'Read-only'}).</p>
                    </div>

                    {/* Financial Balance Summary (Mobile Friendly) */}
                    {(() => {
                        const scoutFees = (eventItem.event_participants || []).reduce((acc, p) => acc + (p.fee_paid || 0), 0)
                        const otherIncome = (eventItem.event_expenses || [])
                            .filter((e) => (e.category && e.category.startsWith('income_')) || (e.description && e.description.startsWith('[INCOME')))
                            .reduce((acc, e) => acc + (e.amount || 0), 0)
                        const totalIncome = scoutFees + otherIncome

                        const totalExpenses = (eventItem.event_expenses || [])
                            .filter((e) => !(e.category && e.category.startsWith('income_')) && !(e.description && e.description.startsWith('[INCOME')))
                            .reduce((acc, e) => acc + (e.amount || 0), 0)

                        const netBalance = totalIncome - totalExpenses

                        return (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                                <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl shadow-2xs">
                                    <span className="block text-[11px] uppercase font-bold text-emerald-800 tracking-wider">Total Income (إيرادات)</span>
                                    <span className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1 block">+${totalIncome}</span>
                                </div>
                                <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl shadow-2xs">
                                    <span className="block text-[11px] uppercase font-bold text-rose-800 tracking-wider">Total Expenses (مصروفات)</span>
                                    <span className="text-xl sm:text-2xl font-extrabold text-rose-700 mt-1 block">-${totalExpenses}</span>
                                </div>
                                <div className={`p-3.5 border rounded-2xl shadow-2xs ${netBalance >= 0 ? 'bg-teal-50 border-teal-100 text-teal-900' : 'bg-amber-50 border-amber-100 text-amber-900'}`}>
                                    <span className="block text-[11px] uppercase font-bold tracking-wider">Net Camp Balance (صافي الصندوق)</span>
                                    <span className="text-xl sm:text-2xl font-extrabold mt-1 block">
                                        {netBalance >= 0 ? `+$${netBalance}` : `-$${Math.abs(netBalance)}`}
                                    </span>
                                </div>
                            </div>
                        )
                    })()}

                    {/* Participant Fee Collections & Scout Payments (Collapsible) */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <button
                            type="button"
                            onClick={() => setIsFeeCollectionsOpen(!isFeeCollectionsOpen)}
                            className="w-full bg-slate-100 px-4 py-3 border-b border-slate-200 flex justify-between items-center text-left hover:bg-slate-150 transition-colors"
                        >
                            <span className="font-extrabold text-xs text-teal-900 uppercase tracking-wider flex items-center gap-2">
                                <span>💵 Scout Fee Collections (${eventItem.participant_fee} / scout)</span>
                                <span className="text-[11px] font-normal text-slate-500">
                                    ({(eventItem.event_participants || []).filter((p) => p.fee_paid >= eventItem.participant_fee && eventItem.participant_fee > 0).length}/{(eventItem.event_participants || []).length} Paid)
                                </span>
                            </span>
                            <span className="text-xs font-bold text-teal-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                                {isFeeCollectionsOpen ? '▲ Hide List' : '▼ Expand Collections'}
                            </span>
                        </button>

                        {isFeeCollectionsOpen && (
                            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                                {(eventItem.event_participants || []).length === 0 ? (
                                    <div className="p-4 text-center text-xs text-slate-400">No scouts enrolled in this event roster.</div>
                                ) : (
                                    (eventItem.event_participants || []).map((p) => {
                                        const isFullyPaid = p.fee_paid >= eventItem.participant_fee && eventItem.participant_fee > 0
                                        const isPartial = p.fee_paid > 0 && !isFullyPaid

                                        return (
                                            <div key={p.id} className="p-3 bg-white flex items-center justify-between gap-3 text-xs">
                                                <div>
                                                    <p className="font-bold text-slate-900 text-sm">
                                                        {p.members?.first_name} {p.members?.last_name}
                                                    </p>
                                                    {p.members?.current_rank && (
                                                        <p className="text-[10px] text-slate-400 font-semibold">{p.members.current_rank}</p>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${isFullyPaid ? 'bg-emerald-100 text-emerald-800' : isPartial ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                                                        {isFullyPaid ? 'Paid' : isPartial ? 'Partial' : 'Unpaid'}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-slate-400 font-bold">$</span>
                                                        <input
                                                            disabled={!isCampTreasurer}
                                                            type="number"
                                                            value={p.fee_paid}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value) || 0
                                                                const status = val >= eventItem.participant_fee ? 'paid' : (val > 0 ? 'partial' : 'unpaid')
                                                                updateParticipant(p.id!, { fee_paid: val, payment_status: status })
                                                            }}
                                                            className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        )}
                    </div>

                    {/* Log Income / Expense Button */}
                    {isCampTreasurer && (
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsLogTransactionModalOpen(true)}
                                className="inline-flex items-center gap-2 bg-teal-800 hover:bg-teal-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow transition-all"
                            >
                                <Plus className="h-4 w-4" /> Log Income / Expense (إضافة إيراد أو مصروف)
                            </button>
                        </div>
                    )}

                    {/* Expenses Table */}
                    <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                        <div className="bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-500 uppercase flex justify-between">
                            <span>Category & Description</span>
                            <span>Amount ($)</span>
                        </div>
                        {(eventItem.event_expenses || []).length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-400">No financial transactions logged yet.</div>
                        ) : (
                            (eventItem.event_expenses || []).map((exp) => {
                                const isIncome = (exp.category && exp.category.startsWith('income_')) || (exp.description && exp.description.startsWith('[INCOME'))
                                return (
                                    <div key={exp.id} className="p-3.5 bg-white flex items-center justify-between text-xs gap-3">
                                        <div className="min-w-0">
                                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase mr-2.5 ${isIncome ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                                                {isIncome ? '🟢 Income' : exp.category}
                                            </span>
                                            <span className="font-semibold text-slate-900 truncate">{exp.description}</span>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className={`font-extrabold text-sm ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {isIncome ? `+$${exp.amount}` : `-$${exp.amount}`}
                                            </span>
                                            {isCampTreasurer && (
                                                <button onClick={() => handleDeleteExpense(exp.id!)} className="text-slate-400 hover:text-rose-600">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}

            {/* ── TAB 4: DOCUMENTS REPOSITORY ─────────────────────────────────────── */}
            {activeTab === 'documents' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                    <div className="border-b border-slate-100 pb-3">
                        <h3 className="text-lg font-bold text-slate-900">Documents & Event Attachments</h3>
                        <p className="text-xs text-slate-500">Store and access location maps, permission slips, program schedules, and official files.</p>
                    </div>

                    <form onSubmit={handleAddDocument} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <UploadCloud className="h-4 w-4 text-teal-700" />
                                <span>Event Media & Files Storage</span>
                            </h4>

                            {/* Mode Switcher */}
                            <div className="flex items-center bg-white border border-slate-200 p-0.5 rounded-xl shadow-2xs self-start sm:self-auto">
                                <button
                                    type="button"
                                    onClick={() => setDocUploadMode('upload')}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${docUploadMode === 'upload'
                                            ? 'bg-teal-800 text-white shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                >
                                    <UploadCloud className="h-3.5 w-3.5" />
                                    <span>Upload File</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDocUploadMode('link')}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${docUploadMode === 'link'
                                            ? 'bg-teal-800 text-white shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                >
                                    <Link2 className="h-3.5 w-3.5" />
                                    <span>Link Drive Folder / Album</span>
                                </button>
                            </div>
                        </div>

                        {docUploadMode === 'upload' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Document Title (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Camp Schedule PDF / Permission Slip"
                                        value={docTitle}
                                        onChange={(e) => setDocTitle(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-teal-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Choose File from Device</label>
                                    <input
                                        type="file"
                                        required
                                        onChange={(e) => {
                                            const f = e.target.files?.[0]
                                            if (f) {
                                                setSelectedFile(f)
                                                if (!docTitle) setDocTitle(f.name.replace(/\.[^/.]+$/, ''))
                                            }
                                        }}
                                        className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-teal-800 hover:file:bg-teal-100 cursor-pointer"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Album / Folder Title</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 📸 Official Camp Photo Album (Google Drive)"
                                            value={docTitle}
                                            onChange={(e) => setDocTitle(e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-teal-500 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Google Drive Folder / Album URL</label>
                                        <input
                                            type="url"
                                            required
                                            placeholder="https://drive.google.com/drive/folders/..."
                                            value={docUrl}
                                            onChange={(e) => setDocUrl(e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-teal-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                            </div>
                        )}

                        <div className="flex justify-end pt-1">
                            <button
                                type="submit"
                                disabled={docUploadMode === 'upload' ? (isUploadingFile || !selectedFile) : (!docUrl.trim())}
                                className="bg-teal-700 hover:bg-teal-600 text-white font-bold px-5 py-2.5 rounded-lg text-xs shadow disabled:bg-slate-300 transition-colors flex items-center gap-2"
                            >
                                {isUploadingFile ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Uploading to Google Drive…</span>
                                    </>
                                ) : docUploadMode === 'link' ? (
                                    <>
                                        <Link2 className="h-4 w-4" />
                                        <span>Attach Google Drive Album / Link</span>
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className="h-4 w-4" />
                                        <span>Upload File to Google Drive</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                        {(eventItem.event_documents || []).length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400">No documents or media attached to this event yet.</div>
                        ) : (
                            (eventItem.event_documents || []).map((doc) => {
                                const isDriveFolder = doc.file_url?.includes('drive.google.com/drive/folders') || doc.file_url?.includes('folder')
                                const isPhotosAlbum = doc.file_url?.includes('photos') || doc.title.toLowerCase().includes('photo') || doc.title.toLowerCase().includes('album')

                                return (
                                    <div key={doc.id} className="p-4 bg-white flex items-center justify-between gap-3 text-xs hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className={`p-2 rounded-lg shrink-0 ${isDriveFolder ? 'bg-amber-50 text-amber-800' : isPhotosAlbum ? 'bg-purple-50 text-purple-800' : 'bg-teal-50 text-teal-800'}`}>
                                                {isDriveFolder ? (
                                                    <FolderOpen className="h-4 w-4" />
                                                ) : isPhotosAlbum ? (
                                                    <ImageIcon className="h-4 w-4" />
                                                ) : (
                                                    <Paperclip className="h-4 w-4" />
                                                )}
                                            </div>
                                            {editingDocId === doc.id ? (
                                                <div className="flex-1 flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={editingDocTitle}
                                                        onChange={(e) => setEditingDocTitle(e.target.value)}
                                                        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-teal-500 focus:outline-none"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') doc.id && handleUpdateDocumentTitle(doc.id)
                                                            if (e.key === 'Escape') setEditingDocId(null)
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => doc.id && handleUpdateDocumentTitle(doc.id)}
                                                        className="p-1.5 text-teal-700 hover:bg-teal-50 rounded transition-colors"
                                                    >
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingDocId(null)}
                                                        className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition-colors"
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-bold text-slate-900 text-sm truncate block">{doc.title}</span>
                                                        {isDriveFolder && (
                                                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 uppercase">
                                                                Drive Folder
                                                            </span>
                                                        )}
                                                        {isPhotosAlbum && !isDriveFolder && (
                                                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-100 text-purple-900 uppercase">
                                                                Photo Album
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 truncate block">{doc.file_url}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            {editingDocId !== doc.id && (
                                                <a
                                                    href={doc.file_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 font-bold text-teal-800 bg-teal-50 px-3 py-1.5 rounded-lg hover:bg-teal-100 transition-colors"
                                                >
                                                    <span>{isDriveFolder ? 'Open Drive Folder' : isPhotosAlbum ? 'Open Photo Album' : 'Open File'}</span>
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                </a>
                                            )}

                                            {isCampSecretary && doc.id && editingDocId !== doc.id && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingDocId(doc.id || null)
                                                            setEditingDocTitle(doc.title)
                                                        }}
                                                        className="p-1.5 text-slate-300 hover:text-teal-600 transition-colors"
                                                        title="Edit Document Name"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => doc.id && handleDeleteDocument(doc.id)}
                                                        className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors"
                                                        title="Delete Document"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}

            {/* ── TAB 5: EQUIPMENT & LOGISTICS WORKSPACE ───────────────────────── */}
            {activeTab === 'equipment' && canAccessEquipment && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div>
                            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                                <Package className="h-5 w-5 text-teal-700" />
                                <span>Event Equipment & Logistics (*Tejhizet El Mouskhayyam*)</span>
                            </h3>
                            <p className="text-xs text-slate-500">
                                Manage equipment assigned to this event, submit new gear requests to the Quartermaster, and track returns.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setEventCartItems([])
                                setIsEventCheckoutModalOpen(true)
                            }}
                            className="bg-teal-700 hover:bg-teal-600 active:scale-95 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-2xs transition-all flex items-center gap-1.5 shrink-0"
                        >
                            <Send className="h-4 w-4" />
                            <span>Request Gear for this Event</span>
                        </button>
                    </div>

                    {/* Status Counters */}
                    <div className="grid grid-cols-3 gap-2.5">
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Requested</span>
                            <span className="text-lg font-black text-amber-900">
                                {eventCheckouts.filter((c) => c.status === 'requested').length}
                            </span>
                        </div>
                        <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-center">
                            <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">In Use at Camp</span>
                            <span className="text-lg font-black text-teal-900">
                                {eventCheckouts.filter((c) => c.status === 'handed_out' || c.status === 'return_pending').length}
                            </span>
                        </div>
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Returned</span>
                            <span className="text-lg font-black text-emerald-900">
                                {eventCheckouts.filter((c) => c.status === 'returned').length}
                            </span>
                        </div>
                    </div>

                    {/* Event Checkouts Table */}
                    <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                        {eventCheckouts.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 space-y-2">
                                <Package className="h-8 w-8 mx-auto opacity-30" />
                                <p className="text-xs font-bold text-slate-600">No equipment requested for this event yet.</p>
                                <p className="text-[11px] text-slate-400">Click &quot;Request Gear for this Event&quot; to borrow gear from the Quartermaster.</p>
                            </div>
                        ) : (
                            eventCheckouts.map((c) => {
                                const item = inventoryList.find((i) => i.id === c.item_id)
                                const itemName = item ? item.name : 'Equipment Item'
                                const requesterLeader = leaders.find((l) => l.id === c.checked_out_to)

                                return (
                                    <div key={c.id} className="p-3.5 sm:p-4 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                        <div className="space-y-1 min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-slate-900 text-sm">{itemName}</span>
                                                <span className="bg-teal-100 text-teal-900 px-2 py-0.5 rounded-md font-black">
                                                    Qty: {c.quantity}
                                                </span>
                                                {c.status === 'requested' && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                                        ⏳ Pending Approval
                                                    </span>
                                                )}
                                                {c.status === 'handed_out' && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                                        📦 In Use
                                                    </span>
                                                )}
                                                {c.status === 'return_pending' && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                                                        🔄 Returned • Awaiting Inspection
                                                    </span>
                                                )}
                                                {c.status === 'returned' && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                        ✓ Returned ({c.returned_condition || 'Good'})
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                                                <span>Requested by: <strong>{requesterLeader?.fullName || 'Leader'}</strong></span>
                                                <span>•</span>
                                                <span>Needed: {c.checkout_date} → {c.return_date || 'End of camp'}</span>
                                            </div>

                                            {c.notes && <p className="text-[11px] text-slate-400 italic">Note: {c.notes}</p>}
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            {c.status === 'handed_out' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleEventMarkReturnPending(c.id)}
                                                    className="bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold px-3 py-1.5 rounded-xl text-xs border border-purple-200 transition-colors flex items-center gap-1"
                                                >
                                                    <RefreshCw className="h-3.5 w-3.5" />
                                                    <span>Mark for Return</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
              TAB 5: CAMP PROVISIONS & MEALS (MAS2OUL MOUNET)
          ═══════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'provisions' && canAccessProvisions && (
                <div className="space-y-4">
                    {/* Provisions Header Banner */}
                    <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0 shadow-2xs">
                                <UtensilsCrossed className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                                    Camp Provisions & Meals (*Al Mounet*)
                                </h3>
                                <p className="text-xs text-slate-500 truncate sm:whitespace-normal">
                                    Plan daily menus, source from Central Pantry, and generate mobile grocery checklists for {defaultCampHeadcount} scouts.
                                </p>
                            </div>
                        </div>

                        {/* Sub-Tabs: Menu Planner / Sourcing / Grocery Checklist (Zero-Wrap Mobile Segment Control) */}
                        <div className="bg-slate-100/90 p-1 rounded-xl flex items-center gap-1 border border-slate-200/80">
                            <button
                                onClick={() => setProvisionsSubTab('menu')}
                                className={`flex-1 py-2 px-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${provisionsSubTab === 'menu'
                                    ? 'bg-teal-800 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                <Calendar className="h-3.5 w-3.5 shrink-0" />
                                <span className="hidden sm:inline">Daily Menu Planner</span>
                                <span className="sm:hidden">Menu</span>
                                <span className="opacity-75 font-normal">({mealPlans.length})</span>
                            </button>

                            <button
                                onClick={() => setProvisionsSubTab('sourcing')}
                                className={`flex-1 py-2 px-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${provisionsSubTab === 'sourcing'
                                    ? 'bg-teal-800 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                <Package className="h-3.5 w-3.5 shrink-0" />
                                <span className="hidden sm:inline">Ingredients & Pantry</span>
                                <span className="sm:hidden">Sourcing</span>
                                <span className="opacity-75 font-normal">({aggregatedIngredients.length})</span>
                            </button>

                            <button
                                onClick={() => setProvisionsSubTab('shopping')}
                                className={`flex-1 py-2 px-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${provisionsSubTab === 'shopping'
                                    ? 'bg-teal-800 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
                                <span className="hidden sm:inline">Grocery Checklist</span>
                                <span className="sm:hidden">Shopping</span>
                                <span className="opacity-75 font-normal">({shoppingList.length})</span>
                            </button>
                        </div>
                    </div>

                    {/* ── SUB-TAB 1: DAILY MENU PLANNER ── */}
                    {provisionsSubTab === 'menu' && (
                        <div className="space-y-4">
                            {/* Day Selector Bar + Outside + Meal Button Toolbar */}
                            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2.5">
                                {/* Left: Scrollable Day Pills */}
                                <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-0.5 min-w-0 flex-1">
                                    {Array.from({ length: totalCampDays }).map((_, idx) => {
                                        const dayNum = idx + 1
                                        const isSelected = selectedCampDay === dayNum
                                        const dayMeals = mealPlans.filter((m) => m.day_number === dayNum)

                                        return (
                                            <button
                                                key={dayNum}
                                                type="button"
                                                onClick={() => setSelectedCampDay(dayNum)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${isSelected
                                                    ? 'bg-slate-900 text-white shadow-xs'
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                    }`}
                                            >
                                                <span>Day {dayNum}</span>
                                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                                                    }`}>
                                                    {dayMeals.length}
                                                </span>
                                            </button>
                                        )
                                    })}

                                    {/* Add Day Button */}
                                    {canManageProvisions && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setExtraCampDays((prev) => prev + 1)
                                                setSelectedCampDay(totalCampDays + 1)
                                                showStatus(`Added Day ${totalCampDays + 1} to camp schedule!`, 'success')
                                            }}
                                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 flex items-center gap-1 shrink-0 active:scale-95"
                                            title="Add extra camp day"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            <span>Add Day</span>
                                        </button>
                                    )}
                                </div>

                                {/* Right: Fixed Outside Actions (+ Meal and Remove Day) */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {canManageProvisions && (
                                        <>
                                            {totalCampDays > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveCampDay(selectedCampDay)}
                                                    className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 flex items-center gap-1 shrink-0"
                                                    title={`Delete Day ${selectedCampDay}`}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    <span className="hidden md:inline">Remove Day {selectedCampDay}</span>
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleOpenAddMealModal({
                                                        dayNumber: selectedCampDay,
                                                        mealType: 'custom',
                                                        mealTitle: `Day ${selectedCampDay} Meal`,
                                                    })
                                                }}
                                                className="bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-black px-3 py-1.5 rounded-xl text-xs shadow-2xs transition-all flex items-center gap-1 shrink-0"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                <span>+ Meal</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* 4 Default Meal Slots + Custom Meals for Selected Day */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                {(() => {
                                    const dayMeals = mealPlans.filter((m) => m.day_number === selectedCampDay)

                                    const standardSlots: Array<{
                                        mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
                                        title: string
                                        icon: string
                                        color: string
                                    }> = [
                                            { mealType: 'breakfast', title: 'Breakfast (الترويقة)', icon: '☀️', color: 'border-amber-200 bg-amber-50/40' },
                                            { mealType: 'lunch', title: 'Lunch (الغداء)', icon: '🍲', color: 'border-teal-200 bg-teal-50/40' },
                                            { mealType: 'dinner', title: 'Dinner (العشاء)', icon: '🌙', color: 'border-indigo-200 bg-indigo-50/40' },
                                            { mealType: 'snack', title: 'Campfire Sahra & Snacks (سهرة النار)', icon: '🔥', color: 'border-orange-200 bg-orange-50/40' },
                                        ]

                                    const renderedSlotTypes = new Set<string>()

                                    return (
                                        <>
                                            {standardSlots.map((slot) => {
                                                renderedSlotTypes.add(slot.mealType)
                                                const existingMeal = dayMeals.find((m) => m.meal_type === slot.mealType)
                                                const headcount = existingMeal?.headcount_override || defaultCampHeadcount

                                                return (
                                                    <div
                                                        key={slot.mealType}
                                                        className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-sm transition-all p-4 flex flex-col justify-between gap-3 min-h-[170px]"
                                                    >
                                                        <div className="space-y-2">
                                                            {/* Slot Title Row */}
                                                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <span className="text-base">{slot.icon}</span>
                                                                    <span className="font-black text-slate-900 text-xs truncate">
                                                                        {slot.title}
                                                                    </span>
                                                                </div>

                                                                {existingMeal && (
                                                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                                                        👥 {headcount} portions
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Meal Body */}
                                                            {existingMeal ? (
                                                                <div className="space-y-2">
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <div className="min-w-0">
                                                                            <h4 className="font-black text-teal-900 text-sm truncate">
                                                                                {existingMeal.recipe_name || existingMeal.meal_title}
                                                                            </h4>
                                                                            {existingMeal.notes && (
                                                                                <p className="text-[11px] text-slate-500 line-clamp-1">
                                                                                    {existingMeal.notes}
                                                                                </p>
                                                                            )}
                                                                        </div>

                                                                        {canManageProvisions && (
                                                                            <div className="flex items-center gap-1 shrink-0">
                                                                                <button
                                                                                    onClick={() => handleOpenEditMeal(existingMeal)}
                                                                                    className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                                                                                    title="Edit meal & ingredients"
                                                                                >
                                                                                    <Edit3 className="h-3.5 w-3.5" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeleteMealPlan(existingMeal.id)}
                                                                                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                                                                                    title="Remove meal"
                                                                                >
                                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Scaled Ingredients Pills */}
                                                                    <div className="space-y-1 pt-1">
                                                                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                                            <span>Ingredients ({existingMeal.event_meal_ingredients?.length || 0})</span>
                                                                            {canManageProvisions && (
                                                                                <button
                                                                                    onClick={() => handleOpenEditMeal(existingMeal)}
                                                                                    className="text-teal-700 hover:underline capitalize"
                                                                                >
                                                                                    Customise
                                                                                </button>
                                                                            )}
                                                                        </div>

                                                                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto no-scrollbar">
                                                                            {(existingMeal.event_meal_ingredients || []).map((ing, idx) => {
                                                                                const rawTotal = Number(ing.portion_per_person) * headcount
                                                                                let displayAmount = rawTotal
                                                                                let displayUnit = ing.unit
                                                                                if (displayUnit === 'g' && displayAmount >= 1000) {
                                                                                    displayAmount = Math.round((displayAmount / 1000) * 10) / 10
                                                                                    displayUnit = 'kg'
                                                                                } else if (displayUnit === 'ml' && displayAmount >= 1000) {
                                                                                    displayAmount = Math.round((displayAmount / 1000) * 10) / 10
                                                                                    displayUnit = 'liters'
                                                                                } else {
                                                                                    displayAmount = Math.round(displayAmount * 10) / 10
                                                                                }

                                                                                return (
                                                                                    <span
                                                                                        key={idx}
                                                                                        className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 shrink-0"
                                                                                    >
                                                                                        {ing.name}: <strong>{displayAmount} {displayUnit}</strong>
                                                                                    </span>
                                                                                )
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="py-4 text-center space-y-1">
                                                                    <p className="text-xs text-slate-400 font-medium">No meal planned for this slot.</p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Footer Actions */}
                                                        {canManageProvisions && (
                                                            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                                                                {existingMeal ? (
                                                                    <>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleOpenEditMeal(existingMeal)}
                                                                            className="flex-1 py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition-all flex items-center justify-center gap-1 active:scale-95"
                                                                        >
                                                                            <Edit3 className="h-3 w-3 text-slate-600" />
                                                                            <span>Customise</span>
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                handleOpenAddMealModal({
                                                                                    dayNumber: selectedCampDay,
                                                                                    mealType: slot.mealType,
                                                                                    mealTitle: slot.title,
                                                                                    existingPlanId: existingMeal.id,
                                                                                })
                                                                            }}
                                                                            className="flex-1 py-1.5 px-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs border border-teal-200 transition-all flex items-center justify-center gap-1 active:scale-95"
                                                                        >
                                                                            <Sparkles className="h-3 w-3 text-teal-700" />
                                                                            <span>Switch Meal</span>
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            handleOpenAddMealModal({
                                                                                dayNumber: selectedCampDay,
                                                                                mealType: slot.mealType,
                                                                                mealTitle: slot.title,
                                                                                existingPlanId: undefined,
                                                                            })
                                                                        }}
                                                                        className="w-full py-2 px-3 rounded-xl bg-teal-800 hover:bg-teal-700 active:scale-95 text-white font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5"
                                                                    >
                                                                        <Plus className="h-3.5 w-3.5" />
                                                                        <span>+ Add Meal to Slot</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}

                                            {/* Any Custom / Additional Planned Meals for this Day */}
                                            {dayMeals
                                                .filter((m) => !renderedSlotTypes.has(m.meal_type) || m.meal_type === 'custom')
                                                .map((customMeal) => {
                                                    const headcount = customMeal.headcount_override || defaultCampHeadcount
                                                    return (
                                                        <div
                                                            key={customMeal.id}
                                                            className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-sm transition-all p-4 flex flex-col justify-between gap-3 min-h-[170px]"
                                                        >
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <span className="text-base">⭐</span>
                                                                        <span className="font-black text-slate-900 text-xs truncate">
                                                                            {customMeal.meal_title}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                                                        👥 {headcount} portions
                                                                    </span>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <h4 className="font-black text-teal-900 text-sm">
                                                                            {customMeal.recipe_name || customMeal.meal_title}
                                                                        </h4>
                                                                        {canManageProvisions && (
                                                                            <div className="flex items-center gap-1 shrink-0">
                                                                                <button
                                                                                    onClick={() => handleOpenEditMeal(customMeal)}
                                                                                    className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                                                                                    title="Edit meal & ingredients"
                                                                                >
                                                                                    <Edit3 className="h-3.5 w-3.5" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeleteMealPlan(customMeal.id)}
                                                                                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                                                                                    title="Remove meal"
                                                                                >
                                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Scaled Ingredients Pills */}
                                                                    <div className="space-y-1 pt-1">
                                                                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto no-scrollbar">
                                                                            {(customMeal.event_meal_ingredients || []).map((ing, idx) => {
                                                                                const rawTotal = Number(ing.portion_per_person) * headcount
                                                                                let displayAmount = rawTotal
                                                                                let displayUnit = ing.unit
                                                                                if (displayUnit === 'g' && displayAmount >= 1000) {
                                                                                    displayAmount = Math.round((displayAmount / 1000) * 10) / 10
                                                                                    displayUnit = 'kg'
                                                                                } else if (displayUnit === 'ml' && displayAmount >= 1000) {
                                                                                    displayAmount = Math.round((displayAmount / 1000) * 10) / 10
                                                                                    displayUnit = 'liters'
                                                                                }

                                                                                return (
                                                                                    <span
                                                                                        key={idx}
                                                                                        className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 shrink-0"
                                                                                    >
                                                                                        {ing.name}: <strong>{displayAmount} {displayUnit}</strong>
                                                                                    </span>
                                                                                )
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                        </>
                                    )
                                })()}
                            </div>
                        </div>
                    )}

                    {/* ── SUB-TAB 2: INGREDIENTS SOURCING & CENTRAL PANTRY ── */}
                    {provisionsSubTab === 'sourcing' && (
                        <div className="space-y-4">
                            {/* Sourcing Summary Header */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h4 className="font-black text-slate-900 text-sm">
                                        Master Ingredient Aggregator ({aggregatedIngredients.length} unique ingredients)
                                    </h4>
                                    <p className="text-xs text-slate-500">
                                        Scaled quantities across camp days, checked against Group Central Pantry stock.
                                    </p>
                                </div>

                                {canManageProvisions && (
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={handleSyncShoppingListWithMeals}
                                            disabled={isSubmittingProvisions}
                                            className="bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5"
                                            title="Sync quantities with Grocery Shopping Checklist"
                                        >
                                            <RefreshCw className="h-3.5 w-3.5" />
                                            <span>Sync with Grocery List</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {aggregatedIngredients.length === 0 ? (
                                <div className="bg-white p-12 text-center text-slate-400 space-y-2 rounded-2xl border border-slate-200">
                                    <Package className="h-8 w-8 mx-auto opacity-30" />
                                    <p className="font-bold text-slate-600 text-xs">No ingredients planned yet.</p>
                                    <p className="text-xs text-slate-400">Configure meals in the Daily Menu Planner to auto-calculate required ingredients.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {aggregatedIngredients.map((item, idx) => {
                                        const hasPantryMatch = Boolean(item.matchedPantryItem)
                                        const pantryStock = item.matchedPantryItem?.quantity_available || 0
                                        const claimedQty = item.requestedFromPantryQty || 0
                                        const remainingToBuy = Math.max(0, item.totalAmount - claimedQty)
                                        const shoppingMatch = shoppingList.find(
                                            (s) => s.name.toLowerCase().trim() === item.name.toLowerCase().trim()
                                        )
                                        const isAlreadyInShoppingList = Boolean(shoppingMatch)

                                        return (
                                            <div
                                                key={idx}
                                                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between gap-3"
                                            >
                                                <div className="space-y-2">
                                                    {/* Title & Category Badge */}
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                                                {item.category}
                                                            </span>
                                                            <h4 className="font-black text-slate-900 text-base leading-snug break-words">
                                                                {item.name}
                                                            </h4>
                                                        </div>

                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 shrink-0">
                                                            {item.mealsCount} {item.mealsCount === 1 ? 'meal' : 'meals'}
                                                        </span>
                                                    </div>

                                                    {/* Total Required Display */}
                                                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                                                        <div className="flex items-baseline justify-between text-xs">
                                                            <span className="text-slate-500 font-bold">Total Required:</span>
                                                            <span className="text-sm font-black text-slate-900">
                                                                {Math.round(item.totalAmount * 10) / 10} {item.unit}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Sourcing Breakdown: Pantry vs Still Need to Buy */}
                                                    {hasPantryMatch ? (
                                                        <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1.5">
                                                            <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                                                                <span className="flex items-center gap-1">
                                                                    <Package className="h-3.5 w-3.5 text-emerald-700" />
                                                                    <span>In Central Depot:</span>
                                                                </span>
                                                                <span>{pantryStock} {item.matchedPantryItem?.unit || item.unit} available</span>
                                                            </div>

                                                            {item.pantryRequestStatus === 'approved' && (
                                                                <div className="pt-1.5 border-t border-emerald-200/60 space-y-1 text-xs">
                                                                    <div className="text-[11px] font-bold text-emerald-800 flex items-center justify-between">
                                                                        <span>✓ Transferred from Depot:</span>
                                                                        <span>{claimedQty} {item.unit}</span>
                                                                    </div>
                                                                    <div className="text-[11px] font-black flex items-center justify-between">
                                                                        <span className={remainingToBuy > 0 ? 'text-amber-800' : 'text-emerald-800'}>
                                                                            {remainingToBuy > 0 ? '🛒 Still Need to Buy:' : '✓ Fully Covered by Depot'}
                                                                        </span>
                                                                        {remainingToBuy > 0 && (
                                                                            <span className="text-amber-900 bg-amber-100/90 px-1.5 py-0.2 rounded border border-amber-200">
                                                                                {Math.round(remainingToBuy * 10) / 10} {item.unit}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {item.pantryRequestStatus === 'requested' && (
                                                                <div className="pt-1.5 border-t border-amber-200 space-y-1 text-xs">
                                                                    <div className="text-[11px] font-bold text-amber-900 flex items-center justify-between">
                                                                        <span>⏳ Requested from Pantry:</span>
                                                                        <span>{claimedQty} {item.unit}</span>
                                                                    </div>
                                                                    <div className="text-[11px] font-black flex items-center justify-between">
                                                                        <span className={remainingToBuy > 0 ? 'text-amber-800' : 'text-emerald-800'}>
                                                                            {remainingToBuy > 0 ? '🛒 Still Need to Buy:' : '✓ 100% Covered once approved'}
                                                                        </span>
                                                                        {remainingToBuy > 0 && (
                                                                            <span className="text-amber-900 bg-amber-100/90 px-1.5 py-0.2 rounded border border-amber-200">
                                                                                {Math.round(remainingToBuy * 10) / 10} {item.unit}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {item.pantryRequestStatus === 'rejected' && (
                                                                <div className="pt-1.5 border-t border-rose-200 text-xs">
                                                                    <div className="text-[11px] font-bold text-rose-800 flex items-center justify-between">
                                                                        <span>❌ Request Declined:</span>
                                                                        <span className="bg-rose-100 px-1.5 py-0.2 rounded font-black text-rose-900">Need to buy: {Math.round(item.totalAmount * 10) / 10} {item.unit}</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 flex items-center justify-between">
                                                            <span className="flex items-center gap-1">
                                                                <ShoppingCart className="h-3.5 w-3.5 text-amber-700" />
                                                                <span>Local purchase:</span>
                                                            </span>
                                                            <span>Need to buy: {Math.round(item.totalAmount * 10) / 10} {item.unit}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Sourcing Action Buttons */}
                                                {canManageProvisions && (
                                                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                                                        {/* Pantry Request Button */}
                                                        {hasPantryMatch && (
                                                            item.pantryRequestStatus === 'requested' ? (
                                                                <div
                                                                    className="flex-1 py-1.5 px-2 rounded-xl bg-amber-50 text-amber-900 font-bold text-xs border border-amber-200 flex items-center justify-center gap-1 cursor-not-allowed opacity-90"
                                                                    title="Transfer request submitted and awaiting approval"
                                                                >
                                                                    <Clock className="h-3.5 w-3.5 text-amber-700" />
                                                                    <span>⏳ Requested ({claimedQty} {item.unit})</span>
                                                                </div>
                                                            ) : item.pantryRequestStatus === 'approved' ? (
                                                                <div
                                                                    className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-50 text-emerald-900 font-bold text-xs border border-emerald-200 flex items-center justify-center gap-1 cursor-default"
                                                                    title="Pantry stock approved for this camp"
                                                                >
                                                                    <Check className="h-3.5 w-3.5 text-emerald-700" />
                                                                    <span>✓ In Depot ({claimedQty} {item.unit})</span>
                                                                </div>
                                                            ) : item.pantryRequestStatus === 'rejected' ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRequestPantryItem(item.matchedPantryItem, Math.min(pantryStock, item.totalAmount), item.unit, item.name)}
                                                                    className="flex-1 py-1.5 px-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs border border-rose-200 transition-all flex items-center justify-center gap-1 active:scale-95"
                                                                    title="Declined by Pantry Master. Click to re-request"
                                                                >
                                                                    <Package className="h-3.5 w-3.5 text-rose-700" />
                                                                    <span>Re-request Depot</span>
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    disabled={pantryStock <= 0}
                                                                    onClick={() => handleRequestPantryItem(item.matchedPantryItem, Math.min(pantryStock, item.totalAmount), item.unit, item.name)}
                                                                    className="flex-1 py-1.5 px-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    <Package className="h-3.5 w-3.5" />
                                                                    <span>Claim from Pantry</span>
                                                                </button>
                                                            )
                                                        )}

                                                        {/* Grocery Shopping List Button */}
                                                        {isAlreadyInShoppingList ? (
                                                            shoppingMatch?.is_purchased ? (
                                                                <div className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200 flex items-center justify-center gap-1">
                                                                    <Check className="h-3.5 w-3.5 text-emerald-700" />
                                                                    <span>✓ Purchased ({shoppingMatch.quantity_needed} {shoppingMatch.unit})</span>
                                                                </div>
                                                            ) : remainingToBuy <= 0 ? (
                                                                <div className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-50 text-emerald-900 font-bold text-xs border border-emerald-200 flex items-center justify-center gap-1">
                                                                    <Check className="h-3.5 w-3.5 text-emerald-700" />
                                                                    <span>✓ Covered by Depot</span>
                                                                </div>
                                                            ) : shoppingMatch && shoppingMatch.quantity_needed !== Math.round(remainingToBuy * 100) / 100 ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={handleSyncShoppingListWithMeals}
                                                                    className="flex-1 py-1.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300 transition-all flex items-center justify-center gap-1 active:scale-95"
                                                                    title="Quantity changed - click to sync"
                                                                >
                                                                    <RefreshCw className="h-3 w-3 text-amber-700" />
                                                                    <span>Sync to {Math.round(remainingToBuy * 10) / 10} {item.unit}</span>
                                                                </button>
                                                            ) : (
                                                                <div className="flex-1 py-1.5 px-2 rounded-xl bg-teal-50 text-teal-800 font-bold text-xs border border-teal-200 flex items-center justify-center gap-1">
                                                                    <Check className="h-3.5 w-3.5 text-teal-700" />
                                                                    <span>On List ({shoppingMatch?.quantity_needed} {shoppingMatch?.unit})</span>
                                                                </div>
                                                            )
                                                        ) : (
                                                            remainingToBuy <= 0 ? (
                                                                <div
                                                                    className="flex-1 py-1.5 px-2 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs border border-slate-200 flex items-center justify-center gap-1 cursor-default"
                                                                    title="100% covered by central pantry depot. No local grocery purchase required."
                                                                >
                                                                    <Check className="h-3.5 w-3.5 text-slate-400" />
                                                                    <span>✓ Covered by Depot</span>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={async () => {
                                                                        const { data, error } = await supabase
                                                                            .from('event_shopping_list_items')
                                                                            .insert({
                                                                                event_id: eventItem.id,
                                                                                name: item.name,
                                                                                category: item.category === 'pantry' ? 'supermarket' : item.category,
                                                                                quantity_needed: Math.round(remainingToBuy * 100) / 100,
                                                                                unit: item.unit,
                                                                                is_purchased: false,
                                                                            })
                                                                            .select('*')
                                                                            .single()

                                                                        if (error) {
                                                                            showStatus(error.message, 'error')
                                                                        } else {
                                                                            setShoppingList((prev) => [data, ...prev])
                                                                            showStatus(`Added "${item.name}" (${Math.round(remainingToBuy * 10) / 10} ${item.unit}) to Grocery List!`, 'success')
                                                                        }
                                                                    }}
                                                                    className="flex-1 py-1.5 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1 active:scale-95"
                                                                >
                                                                    <Plus className="h-3.5 w-3.5" />
                                                                    <span>+ To Shopping ({Math.round(remainingToBuy * 10) / 10} {item.unit})</span>
                                                                </button>
                                                            )
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── SUB-TAB 3: INTERACTIVE MOBILE GROCERY SHOPPING CHECKLIST ── */}
                    {provisionsSubTab === 'shopping' && (
                        <div className="space-y-4">
                            {/* Shopping Controls & Progress */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <h4 className="font-black text-slate-900 text-sm">
                                            Camp Grocery Shopping Checklist
                                        </h4>
                                        <p className="text-xs text-slate-500">
                                            Touch item to mark as purchased. Organised by grocery sections.
                                        </p>
                                    </div>

                                    {canManageProvisions && (
                                        <button
                                            onClick={() => {
                                                setShoppingItemName('')
                                                setShoppingItemCategory('supermarket')
                                                setShoppingItemQty('1')
                                                setShoppingItemUnit('kg')
                                                setShoppingItemEstCost('0')
                                                setShoppingItemNotes('')
                                                setIsShoppingItemModalOpen(true)
                                            }}
                                            className="bg-teal-700 hover:bg-teal-600 active:scale-95 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 shrink-0"
                                        >
                                            <Plus className="h-4 w-4" />
                                            <span>Add Grocery Item</span>
                                        </button>
                                    )}
                                </div>

                                {/* Progress Bar */}
                                {shoppingList.length > 0 && (() => {
                                    const purchasedCount = shoppingList.filter((s) => s.is_purchased).length
                                    const pct = Math.round((purchasedCount / shoppingList.length) * 100)

                                    return (
                                        <div className="space-y-1.5 pt-1">
                                            <div className="flex items-center justify-between text-xs font-bold">
                                                <span className="text-slate-700">
                                                    Purchased: <strong>{purchasedCount} of {shoppingList.length} items</strong>
                                                </span>
                                                <span className="text-teal-700">{pct}% Complete</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-teal-600 transition-all duration-300 rounded-full"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })()}

                                {/* Filter Chips */}
                                <div className="flex items-center gap-1.5 pt-1">
                                    <button
                                        onClick={() => setShoppingFilter('all')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${shoppingFilter === 'all'
                                            ? 'bg-slate-900 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                    >
                                        All ({shoppingList.length})
                                    </button>
                                    <button
                                        onClick={() => setShoppingFilter('pending')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${shoppingFilter === 'pending'
                                            ? 'bg-amber-800 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                    >
                                        Pending ({shoppingList.filter((s) => !s.is_purchased).length})
                                    </button>
                                    <button
                                        onClick={() => setShoppingFilter('purchased')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${shoppingFilter === 'purchased'
                                            ? 'bg-emerald-800 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                    >
                                        Purchased ({shoppingList.filter((s) => s.is_purchased).length})
                                    </button>
                                </div>
                            </div>

                            {/* Grocery List by Category */}
                            {shoppingList.length === 0 ? (
                                <div className="bg-white p-12 text-center text-slate-400 space-y-2 rounded-2xl border border-slate-200">
                                    <ShoppingCart className="h-8 w-8 mx-auto opacity-30" />
                                    <p className="font-bold text-slate-600 text-xs">Your grocery checklist is empty.</p>
                                    <p className="text-xs text-slate-400">Click &quot;Auto-Generate Shopping List&quot; or manually add items.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {['bakery', 'butchery', 'produce', 'supermarket', 'supplies'].map((catKey) => {
                                        const catItems = shoppingList
                                            .filter((i) => (i.category || 'supermarket') === catKey)
                                            .filter((i) => {
                                                if (shoppingFilter === 'pending') return !i.is_purchased
                                                if (shoppingFilter === 'purchased') return i.is_purchased
                                                return true
                                            })

                                        if (catItems.length === 0) return null

                                        const catLabels: Record<string, string> = {
                                            bakery: '🍞 Bakery & Bread (الفرن والخبز)',
                                            butchery: '🥩 Butchery & Meat (الملحمة واللحوم)',
                                            produce: '🥦 Produce & Vegetables (الخضار والفواكه)',
                                            supermarket: '🛒 Supermarket & Dairy (السوبرماركت والألبان)',
                                            supplies: '🧼 Kitchen Supplies & Foil (مستلزمات المطبخ)',
                                        }

                                        return (
                                            <div
                                                key={catKey}
                                                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs"
                                            >
                                                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200/80 font-black text-xs text-slate-800">
                                                    {catLabels[catKey] || catKey} ({catItems.length})
                                                </div>

                                                <div className="divide-y divide-slate-100">
                                                    {catItems.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            onClick={() => canManageProvisions && handleToggleShoppingItem(item.id, item.is_purchased)}
                                                            className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-colors cursor-pointer ${item.is_purchased
                                                                ? 'bg-slate-50/60 opacity-60'
                                                                : 'hover:bg-slate-50/80'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div
                                                                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all ${item.is_purchased
                                                                        ? 'bg-emerald-600 border-emerald-600 text-white'
                                                                        : 'bg-white border-slate-300 text-transparent'
                                                                        }`}
                                                                >
                                                                    <Check className="h-4 w-4 stroke-[3]" />
                                                                </div>

                                                                <div className="min-w-0">
                                                                    <span
                                                                        className={`font-black text-sm block truncate ${item.is_purchased
                                                                            ? 'line-through text-slate-500'
                                                                            : 'text-slate-900'
                                                                            }`}
                                                                    >
                                                                        {item.name}
                                                                    </span>
                                                                    {item.notes && (
                                                                        <span className="text-[10px] text-slate-400 block truncate">
                                                                            {item.notes}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2.5 shrink-0">
                                                                <span className="text-xs font-black text-teal-900 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                                                                    {item.quantity_needed} {item.unit}
                                                                </span>

                                                                {canManageProvisions && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            handleDeleteShoppingItem(item.id)
                                                                        }}
                                                                        className="p-1 text-slate-300 hover:text-rose-600 transition-colors"
                                                                        title="Delete item"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── EDIT EVENT DETAILS MODAL ──────────────────────────────────── */}
            {isEditEventModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl max-w-xl w-full p-4 sm:p-6 space-y-4 shadow-2xl max-h-[88vh] overflow-y-auto my-auto">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <h3 className="text-lg font-bold text-slate-900">Edit Event / Camp Details</h3>
                            <button onClick={() => setIsEditEventModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEventDetails} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Event Title</label>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    required
                                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Description</label>
                                <textarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    rows={2}
                                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Event Type</label>
                                    <select
                                        value={editEventType}
                                        onChange={(e) => setEditEventType(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                                    >
                                        <option value="camp">⛺ Camp (مخيم)</option>
                                        <option value="hike">🥾 Hike (نشاط خلاء / مسير)</option>
                                        <option value="activity">🎯 General Activity (نشاط)</option>
                                        <option value="training">🏅 Training Course (دراسة / دراسة أطراس)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Scope</label>
                                    <select
                                        value={editScope}
                                        onChange={(e) => setEditScope(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                                    >
                                        <option value="group">Full Group Event (لكل الفوج)</option>
                                        <option value="troop">Troop Specific Event (نشاط فرقة)</option>
                                    </select>
                                </div>
                            </div>

                            {editScope === 'troop' && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Target Troop Unit</label>
                                    <select
                                        value={editTargetTroopId}
                                        onChange={(e) => setEditTargetTroopId(e.target.value)}
                                        required={editScope === 'troop'}
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                                    >
                                        <option value="">-- Select Troop --</option>
                                        {troops.map((t) => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Start Time</label>
                                    <input
                                        type="datetime-local"
                                        value={editStartTime}
                                        onChange={(e) => setEditStartTime(e.target.value)}
                                        required
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">End Time</label>
                                    <input
                                        type="datetime-local"
                                        value={editEndTime}
                                        onChange={(e) => setEditEndTime(e.target.value)}
                                        required
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Location</label>
                                    <input
                                        type="text"
                                        value={editLocation}
                                        onChange={(e) => setEditLocation(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Participant Fee ($)</label>
                                    <input
                                        type="number"
                                        value={editParticipantFee}
                                        onChange={(e) => setEditParticipantFee(e.target.value)}
                                        min="0"
                                        step="1"
                                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsEditEventModalOpen(false)}
                                    className="flex-1 py-2 border border-slate-300 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-xl text-xs font-bold shadow disabled:bg-slate-300 transition-colors flex items-center justify-center gap-1.5"
                                >
                                    {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    <span>{loading ? 'Saving Changes…' : 'Save Changes'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── LOG TRANSACTION MODAL (Income vs Expense) ────────────────────── */}
            {isLogTransactionModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Log Financial Transaction</h3>
                                <p className="text-xs text-slate-500">Log incoming money or outgoing expenses for this event.</p>
                            </div>
                            <button onClick={() => setIsLogTransactionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={(e) => {
                                handleAddExpense(e)
                                setIsLogTransactionModalOpen(false)
                            }}
                            className="space-y-4 text-xs"
                        >
                            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl font-bold">
                                <button
                                    type="button"
                                    onClick={() => setTransactionType('expense')}
                                    className={`py-2 rounded-lg transition-colors ${transactionType === 'expense' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'}`}
                                >
                                    🔻 Expense (مصروفات)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTransactionType('income')}
                                    className={`py-2 rounded-lg transition-colors ${transactionType === 'income' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'}`}
                                >
                                    🟢 Income (إيرادات / دخل)
                                </button>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method / Source</label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none"
                                >
                                    <option value="cash">💵 Cash (نقداً)</option>
                                    <option value="wish">📱 Wish Money (Wish)</option>
                                    <option value="omt">🏦 OMT</option>
                                    <option value="bank">🏛️ Bank Transfer (تحويل بنكي)</option>
                                    <option value="donation">🎁 External Donation (تبرع غريب)</option>
                                    <option value="fees">🎟️ Scout Roster Fees (اشتراكات الأفراد)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                                <select
                                    value={expCategory}
                                    onChange={(e) => setExpCategory(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none"
                                >
                                    {EXPENSE_CATEGORIES.map((c) => (
                                        <option key={c.key} value={c.key}>{c.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Bus transportation, Food purchase, Wish transfer"
                                    value={expDesc}
                                    onChange={(e) => setExpDesc(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Amount ($ USD)</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="any"
                                    placeholder="0.00"
                                    value={expAmount}
                                    onChange={(e) => setExpAmount(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none"
                                />
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsLogTransactionModalOpen(false)}
                                    className="flex-1 py-2 border border-slate-300 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-teal-800 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow transition-colors"
                                >
                                    Log Transaction
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── EVENT GEAR LENDING REQUEST MODAL ───────────────────────── */}
            {isEventCheckoutModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95">
                        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto -mt-1 mb-2 sm:hidden shrink-0" />
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5 text-teal-700" />
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">
                                        {isQuartermaster ? 'Hand Out Gear to this Event' : 'Request Event Equipment Lending'}
                                    </h3>
                                    <p className="text-xs text-slate-500">{eventItem.title}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsEventCheckoutModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Selected Items */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900">Selected Items ({eventCartItems.length})</span>
                                {eventCartItems.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setEventCartItems([])}
                                        className="text-[10px] font-bold text-rose-600 hover:underline"
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>

                            {eventCartItems.length === 0 ? (
                                <div className="p-3.5 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
                                    No items selected yet. Choose gear from the list below.
                                </div>
                            ) : (
                                <div className="space-y-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                                    {eventCartItems.map((ci) => (
                                        <div
                                            key={ci.item.id}
                                            className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between gap-2 text-xs"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <span className="font-bold text-slate-900 block truncate">{ci.item.name}</span>
                                                <span className="text-[10px] text-slate-400">Available in stock: {ci.item.quantity_available}</span>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEventUpdateCartQty(ci.item.id, ci.quantity - 1)}
                                                    className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700"
                                                >
                                                    -
                                                </button>
                                                <span className="w-6 text-center font-bold text-teal-800">{ci.quantity}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleEventUpdateCartQty(ci.item.id, ci.quantity + 1)}
                                                    disabled={ci.quantity >= ci.item.quantity_available}
                                                    className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40 flex items-center justify-center font-bold text-slate-700"
                                                >
                                                    +
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleEventRemoveFromCart(ci.item.id)}
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

                        {/* Available Gear Search */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                            <span className="text-xs font-bold text-slate-800 block">Available Group Inventory</span>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2 h-3 w-3 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search available tents, kitchen, lighting…"
                                    value={eventCheckoutSearch}
                                    onChange={(e) => setEventCheckoutSearch(e.target.value)}
                                    className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:border-teal-500"
                                />
                            </div>

                            <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                                {inventoryList
                                    .filter((i) => i.quantity_available > 0)
                                    .filter((i) =>
                                        eventCheckoutSearch
                                            ? i.name.toLowerCase().includes(eventCheckoutSearch.toLowerCase()) ||
                                            i.category.toLowerCase().includes(eventCheckoutSearch.toLowerCase())
                                            : true
                                    ).map((item) => {
                                        const inCart = eventCartItems.find((ci) => ci.item.id === item.id)
                                        return (
                                            <div
                                                key={item.id}
                                                className="p-1.5 px-2 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-between gap-2 text-xs"
                                            >
                                                <div className="min-w-0 flex-1 truncate">
                                                    <span className="font-bold text-slate-900">{item.name}</span>
                                                    <span className="text-[10px] text-teal-700 ml-1.5 font-semibold">
                                                        ({item.quantity_available} avail)
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleEventAddToCart(item)}
                                                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${inCart
                                                        ? 'bg-teal-100 text-teal-900 border border-teal-300'
                                                        : 'bg-teal-700 text-white hover:bg-teal-600 shadow-2xs'
                                                        }`}
                                                >
                                                    {inCart ? `Added (${inCart.quantity})` : '+ Add'}
                                                </button>
                                            </div>
                                        )
                                    })}
                            </div>
                        </div>

                        {/* Form Dates & Notes */}
                        <form onSubmit={handleEventBatchCheckout} className="space-y-3 pt-2 border-t border-slate-100">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Needed From</label>
                                    <input
                                        type="date"
                                        required
                                        value={eventCheckoutDate}
                                        onChange={(e) => setEventCheckoutDate(e.target.value)}
                                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Return Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={eventReturnDate}
                                        onChange={(e) => setEventReturnDate(e.target.value)}
                                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-medium"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Special Notes / Camp Purpose</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Needed for sub-camp pioneering competition"
                                    value={eventCheckoutNotes}
                                    onChange={(e) => setEventCheckoutNotes(e.target.value)}
                                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-medium"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || eventCartItems.length === 0}
                                className="w-full py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs shadow-2xs transition-colors flex items-center justify-center gap-1.5 disabled:bg-slate-300"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                <span>
                                    {loading
                                        ? 'Processing Gear…'
                                        : isQuartermaster
                                            ? `Hand Out Gear (${eventCartItems.length} items)`
                                            : `Submit Loan Request (${eventCartItems.length} items)`}
                                </span>
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* ═══════════════════════════════════════════════════════════════════════
              MODAL 1: UNIFIED ADD MEAL MODAL (LIBRARY & PREVIOUS vs CUSTOM)
          ═══════════════════════════════════════════════════════════════════════ */}
            {isAddMealModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-3.5 max-h-[92vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95">
                        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto -mt-1 mb-1 sm:hidden shrink-0" />

                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 shrink-0">
                                    <ChefHat className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900">
                                        Add Meal — Day {addMealDay} • {addMealSlotTitle.replace(/\s*\(.*\)/, '')}
                                    </h3>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsAddMealModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Top Mode Tabs: Library & Previous vs Custom */}
                        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
                            <button
                                type="button"
                                onClick={() => setAddMealTab('library')}
                                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${addMealTab === 'library'
                                    ? 'bg-white text-slate-900 shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                <BookOpen className="h-4 w-4 text-teal-700" />
                                <span>Recipe Library ({SCOUT_RECIPES_LIBRARY.length + previousGroupMeals.length})</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setAddMealTab('custom')}
                                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${addMealTab === 'custom'
                                    ? 'bg-white text-slate-900 shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                <Plus className="h-4 w-4 text-teal-700" />
                                <span>Custom Meal</span>
                            </button>
                        </div>

                        {/* ── TAB 1: RECIPE LIBRARY & PREVIOUS GROUP MEALS ── */}
                        {addMealTab === 'library' && (
                            <div className="space-y-3">
                                {/* Search Bar */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by recipe, Arabic name, or ingredient…"
                                        value={addMealSearchQuery}
                                        onChange={(e) => setAddMealSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-600 focus:bg-white transition-all"
                                    />
                                    {addMealSearchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setAddMealSearchQuery('')}
                                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Filters Strip */}
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 text-[11px] font-bold">
                                    {/* Meal Slot Type Filters */}
                                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                                        {(['all', 'breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setAddMealTypeFilter(type)}
                                                className={`px-2.5 py-1 rounded-lg capitalize whitespace-nowrap transition-all ${addMealTypeFilter === type
                                                    ? 'bg-slate-900 text-white shadow-2xs'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                            >
                                                {type === 'all' ? 'All Slots' : type}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Origin Source Filters */}
                                    <div className="flex items-center gap-1">
                                        {(['all', 'scout_recipes', 'group_previous'] as const).map((src) => (
                                            <button
                                                key={src}
                                                type="button"
                                                onClick={() => setAddMealSourceFilter(src)}
                                                className={`px-2 py-0.5 rounded-lg text-[10px] whitespace-nowrap transition-all ${addMealSourceFilter === src
                                                    ? 'bg-teal-100 text-teal-900 font-black border border-teal-300'
                                                    : 'text-slate-500 hover:bg-slate-100'
                                                    }`}
                                            >
                                                {src === 'all' ? 'All' : src === 'scout_recipes' ? '⭐ Recipes' : '📋 Past Camps'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Results Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                                    {(() => {
                                        // Merge standard library and previous group meals into a unified list
                                        const standardList = SCOUT_RECIPES_LIBRARY.map((r) => ({
                                            id: r.id,
                                            source: 'scout_recipe' as const,
                                            title: r.name,
                                            nameAr: r.nameAr,
                                            meal_type: r.meal_type,
                                            description: r.description,
                                            ingredients: r.ingredients.map((ing) => ({
                                                name: ing.name,
                                                portion_per_person: ing.portion_per_person,
                                                unit: ing.unit,
                                                category: ing.category,
                                            })),
                                        }))

                                        const previousList = previousGroupMeals.map((p) => ({
                                            id: p.id,
                                            source: 'group_previous' as const,
                                            title: p.title,
                                            nameAr: p.nameAr || '',
                                            meal_type: p.meal_type,
                                            description: p.notes ? `${p.notes} (From ${p.eventName})` : `Cooked in ${p.eventName}`,
                                            ingredients: p.ingredients,
                                        }))

                                        let combined = [...standardList, ...previousList]

                                        // Apply Source Filter
                                        if (addMealSourceFilter === 'scout_recipes') {
                                            combined = combined.filter((m) => m.source === 'scout_recipe')
                                        } else if (addMealSourceFilter === 'group_previous') {
                                            combined = combined.filter((m) => m.source === 'group_previous')
                                        }

                                        // Apply Type Filter
                                        if (addMealTypeFilter !== 'all') {
                                            combined = combined.filter((m) => m.meal_type === addMealTypeFilter)
                                        }

                                        // Apply Search Query Filter
                                        if (addMealSearchQuery.trim()) {
                                            const q = addMealSearchQuery.toLowerCase().trim()
                                            combined = combined.filter((m) => {
                                                const matchTitle = m.title.toLowerCase().includes(q)
                                                const matchAr = m.nameAr && m.nameAr.toLowerCase().includes(q)
                                                const matchDesc = m.description && m.description.toLowerCase().includes(q)
                                                const matchIng = m.ingredients.some((ing) => ing.name.toLowerCase().includes(q))
                                                return matchTitle || matchAr || matchDesc || matchIng
                                            })
                                        }

                                        if (combined.length === 0) {
                                            return (
                                                <div className="col-span-full p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                                                    <ChefHat className="h-6 w-6 mx-auto text-slate-400" />
                                                    <p className="text-xs font-bold text-slate-700">No matching meals found.</p>
                                                    <p className="text-[11px] text-slate-500">
                                                        Try adjusting your search or switch to &quot;➕ Custom Meal&quot;.
                                                    </p>
                                                </div>
                                            )
                                        }

                                        return combined.map((meal) => (
                                            <div
                                                key={meal.id}
                                                className="bg-slate-50 hover:bg-teal-50/40 p-3.5 rounded-2xl border border-slate-200 hover:border-teal-300 transition-all flex flex-col justify-between gap-3 group shadow-2xs"
                                            >
                                                <div className="space-y-1.5">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <h4 className="font-black text-slate-900 text-sm group-hover:text-teal-950 transition-colors truncate">
                                                                {meal.title}
                                                            </h4>
                                                            {meal.nameAr && (
                                                                <p className="text-[11px] font-bold text-teal-800">
                                                                    {meal.nameAr}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${meal.source === 'group_previous'
                                                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                                            : 'bg-teal-100 text-teal-900 border border-teal-200'
                                                            }`}>
                                                            {meal.source === 'group_previous' ? '📋 Past Camp' : '⭐ Recipe'}
                                                        </span>
                                                    </div>

                                                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                                        {meal.description}
                                                    </p>

                                                    {/* Ingredients scaled pill preview */}
                                                    <div className="pt-2 border-t border-slate-200/60">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                                                            Portions ({defaultCampHeadcount} scouts):
                                                        </span>
                                                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto no-scrollbar">
                                                            {meal.ingredients.map((ing, idx) => {
                                                                const rawTotal = Number(ing.portion_per_person) * defaultCampHeadcount
                                                                let displayAmt = rawTotal
                                                                let displayUnit = ing.unit
                                                                if (displayUnit === 'g' && displayAmt >= 1000) {
                                                                    displayAmt = Math.round((displayAmt / 1000) * 10) / 10
                                                                    displayUnit = 'kg'
                                                                } else if (displayUnit === 'ml' && displayAmt >= 1000) {
                                                                    displayAmt = Math.round((displayAmt / 1000) * 10) / 10
                                                                    displayUnit = 'liters'
                                                                } else {
                                                                    displayAmt = Math.round(displayAmt * 10) / 10
                                                                }

                                                                return (
                                                                    <span
                                                                        key={idx}
                                                                        className="px-1.5 py-0.5 rounded text-[10px] bg-white border border-slate-200 font-bold text-slate-700 shrink-0"
                                                                    >
                                                                        {ing.name}: <strong>{displayAmt} {displayUnit}</strong>
                                                                    </span>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    disabled={isSubmittingProvisions}
                                                    onClick={() => handleSelectMealFromLibrary(meal)}
                                                    className="w-full py-2 bg-teal-800 hover:bg-teal-700 active:scale-95 text-white font-bold rounded-xl text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5"
                                                >
                                                    {isSubmittingProvisions ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Check className="h-3.5 w-3.5" />
                                                    )}
                                                    <span>Select Meal</span>
                                                </button>
                                            </div>
                                        ))
                                    })()}
                                </div>
                            </div>
                        )}

                        {/* ── TAB 2: CUSTOM MEAL BUILDER ── */}
                        {addMealTab === 'custom' && (
                            <form onSubmit={handleSaveCustomMeal} className="space-y-3">
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Camp Day</label>
                                        <select
                                            value={addMealDay}
                                            onChange={(e) => setAddMealDay(parseInt(e.target.value))}
                                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-bold bg-white"
                                        >
                                            {Array.from({ length: totalCampDays }).map((_, idx) => (
                                                <option key={idx + 1} value={idx + 1}>
                                                    Day {idx + 1}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Slot Type</label>
                                        <select
                                            value={addMealSlotType}
                                            onChange={(e) => setAddMealSlotType(e.target.value as any)}
                                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-bold bg-white"
                                        >
                                            <option value="breakfast">☀️ Breakfast (ترويقة)</option>
                                            <option value="lunch">🍲 Lunch (غداء)</option>
                                            <option value="dinner">🌙 Dinner (عشاء)</option>
                                            <option value="snack">🔥 Campfire Sahra (سهرة)</option>
                                            <option value="custom">⭐ Custom Slot</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Meal Title *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Halloumi & Watermelon, Tuna Pasta…"
                                            value={customMealTitle}
                                            onChange={(e) => setCustomMealTitle(e.target.value)}
                                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-bold text-slate-900"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Portions (Scouts)</label>
                                        <input
                                            type="number"
                                            placeholder={`${defaultCampHeadcount}`}
                                            value={customMealHeadcountOverride}
                                            onChange={(e) => setCustomMealHeadcountOverride(e.target.value)}
                                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-bold text-slate-900"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Prep Notes</label>
                                    <input
                                        type="text"
                                        placeholder="Optional cooking notes or instructions…"
                                        value={customMealNotes}
                                        onChange={(e) => setCustomMealNotes(e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-medium"
                                    />
                                </div>

                                {/* Ingredients Builder using Searchable Combobox */}
                                <div className="space-y-2 pt-2 border-t border-slate-100">
                                    <div className="flex items-center justify-between gap-2">
                                        <label className="text-xs font-black text-slate-900 block">
                                            Ingredients ({customMealIngredients.length})
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCustomMealIngredients((prev) => [
                                                    ...prev,
                                                    { name: '', portion_per_person: 100, unit: 'g', category: 'supermarket' },
                                                ])
                                            }}
                                            className="text-xs font-black text-teal-800 hover:text-teal-900 bg-teal-50 border border-teal-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 active:scale-95 shadow-2xs"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            <span>Add Ingredient</span>
                                        </button>
                                    </div>

                                    {customMealIngredients.length === 0 ? (
                                        <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400">
                                            <p className="font-bold text-slate-600">No ingredients added yet.</p>
                                            <p className="text-[11px] text-slate-400">Click &quot;+ Add Ingredient&quot; above to select from pantry depot or food library.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                            {customMealIngredients.map((ing, idx) => {
                                                const headcount = customMealHeadcountOverride ? parseInt(customMealHeadcountOverride) || defaultCampHeadcount : defaultCampHeadcount
                                                const totalCalculated = Math.round(Number(ing.portion_per_person) * headcount * 10) / 10

                                                return (
                                                    <div key={idx} className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs shadow-2xs">
                                                        <div className="flex items-center gap-2">
                                                            {/* Searchable Combobox */}
                                                            <SearchableIngredientCombobox
                                                                value={ing.name}
                                                                groupPantryList={groupPantryList}
                                                                onSelect={(selected) => {
                                                                    setCustomMealIngredients((prev) =>
                                                                        prev.map((item, i) =>
                                                                            i === idx
                                                                                ? {
                                                                                    ...item,
                                                                                    name: selected.name,
                                                                                    category: selected.category,
                                                                                    unit: selected.unit,
                                                                                    portion_per_person: selected.portion_per_person || item.portion_per_person,
                                                                                }
                                                                                : item
                                                                        )
                                                                    )
                                                                }}
                                                            />

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setCustomMealIngredients((prev) => prev.filter((_, i) => i !== idx))
                                                                }}
                                                                className="p-2 text-slate-400 hover:text-rose-600 shrink-0 rounded-xl hover:bg-rose-50 transition-colors"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-3 gap-2 items-center">
                                                            <div>
                                                                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Portion / Scout</label>
                                                                <input
                                                                    type="number"
                                                                    step="any"
                                                                    min="0.01"
                                                                    required
                                                                    value={ing.portion_per_person}
                                                                    onChange={(e) => {
                                                                        const val = parseFloat(e.target.value) || 1
                                                                        setCustomMealIngredients((prev) =>
                                                                            prev.map((item, i) => (i === idx ? { ...item, portion_per_person: val } : item))
                                                                        )
                                                                    }}
                                                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900"
                                                                />
                                                            </div>

                                                            <div>
                                                                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Unit</label>
                                                                <select
                                                                    value={ing.unit}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value as any
                                                                        setCustomMealIngredients((prev) =>
                                                                            prev.map((item, i) => (i === idx ? { ...item, unit: val } : item))
                                                                        )
                                                                    }}
                                                                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900"
                                                                >
                                                                    <option value="g">g (Grams)</option>
                                                                    <option value="kg">kg (Kg)</option>
                                                                    <option value="pieces">pieces (حبة)</option>
                                                                    <option value="cans">cans (علبة)</option>
                                                                    <option value="loaves">loaves (خبز)</option>
                                                                    <option value="packs">packs (كيس)</option>
                                                                    <option value="ml">ml</option>
                                                                    <option value="liters">liters</option>
                                                                </select>
                                                            </div>

                                                            <div className="pt-3">
                                                                <span className="text-[11px] font-black text-teal-800 bg-teal-50 px-2 py-1.5 rounded-lg border border-teal-200 block text-center truncate">
                                                                    👥 {totalCalculated} {ing.unit}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-2 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddMealModalOpen(false)}
                                        className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-700 hover:bg-slate-100"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingProvisions}
                                        className="flex-1 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs shadow-2xs transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        {isSubmittingProvisions ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                        <span>Save Custom Meal</span>
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
              MODAL 3: ADD AD-HOC GROCERY SHOPPING ITEM
          ═══════════════════════════════════════════════════════════════════════ */}
            {isShoppingItemModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95">
                        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto -mt-1 mb-2 sm:hidden shrink-0" />
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-sm font-black text-slate-900">
                                Add Grocery Item to Checklist
                            </h3>
                            <button
                                onClick={() => setIsShoppingItemModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddShoppingItem} className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Item Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Arabic Bread, Drinking Water Gallons…"
                                    value={shoppingItemName}
                                    onChange={(e) => setShoppingItemName(e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                                    <select
                                        value={shoppingItemCategory}
                                        onChange={(e) => setShoppingItemCategory(e.target.value as any)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-bold bg-white"
                                    >
                                        <option value="supermarket">🛒 Supermarket</option>
                                        <option value="bakery">🍞 Bakery</option>
                                        <option value="butchery">🥩 Butchery</option>
                                        <option value="produce">🥦 Produce</option>
                                        <option value="supplies">🧼 Supplies</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Unit *</label>
                                    <select
                                        value={shoppingItemUnit}
                                        onChange={(e) => setShoppingItemUnit(e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-bold bg-white"
                                    >
                                        <option value="kg">kg</option>
                                        <option value="g">g</option>
                                        <option value="pieces">pieces</option>
                                        <option value="cans">cans</option>
                                        <option value="loaves">loaves</option>
                                        <option value="packs">packs</option>
                                        <option value="liters">liters</option>
                                        <option value="gallons">gallons</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Quantity *</label>
                                    <input
                                        type="number"
                                        step="any"
                                        min="0.1"
                                        required
                                        value={shoppingItemQty}
                                        onChange={(e) => setShoppingItemQty(e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-bold text-teal-900"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Cost ($)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        min="0"
                                        value={shoppingItemEstCost}
                                        onChange={(e) => setShoppingItemEstCost(e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-medium"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Notes (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Brand, store location, size"
                                    value={shoppingItemNotes}
                                    onChange={(e) => setShoppingItemNotes(e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-medium"
                                />
                            </div>

                            <div className="pt-2 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsShoppingItemModalOpen(false)}
                                    className="flex-1 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-700 hover:bg-slate-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingProvisions}
                                    className="flex-1 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs shadow-2xs transition-colors flex items-center justify-center gap-1.5 disabled:bg-slate-300"
                                >
                                    {isSubmittingProvisions ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                                    <span>{isSubmittingProvisions ? 'Adding…' : 'Add Item'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════
              MODAL 4: EDIT MEAL & CUSTOMISE INGREDIENTS
          ═══════════════════════════════════════════════════════════════════════ */}
            {isEditMealModalOpen && editingMealPlan && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-3.5 max-h-[92vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95">
                        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto -mt-1 mb-1 sm:hidden shrink-0" />
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2">
                                <Edit3 className="h-5 w-5 text-teal-800" />
                                <h3 className="text-sm font-black text-slate-900">
                                    Edit Meal Plan
                                </h3>
                            </div>
                            <button
                                onClick={() => {
                                    setIsEditMealModalOpen(false)
                                    setEditingMealPlan(null)
                                }}
                                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEditedMeal} className="space-y-3">
                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Camp Day</label>
                                    <select
                                        value={editMealDay}
                                        onChange={(e) => setEditMealDay(parseInt(e.target.value))}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-bold bg-white"
                                    >
                                        {Array.from({ length: totalCampDays }).map((_, idx) => (
                                            <option key={idx + 1} value={idx + 1}>
                                                Day {idx + 1}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Slot Type</label>
                                    <select
                                        value={editMealType}
                                        onChange={(e) => setEditMealType(e.target.value as any)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-bold bg-white"
                                    >
                                        <option value="breakfast">☀️ Breakfast (ترويقة)</option>
                                        <option value="lunch">🍲 Lunch (غداء)</option>
                                        <option value="dinner">🌙 Dinner (عشاء)</option>
                                        <option value="snack">🔥 Campfire Sahra (سهرة)</option>
                                        <option value="custom">⭐ Custom Slot</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Meal Title *</label>
                                    <input
                                        type="text"
                                        required
                                        value={editMealTitle}
                                        onChange={(e) => setEditMealTitle(e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-bold text-slate-900"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Portions (Scouts)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder={`${defaultCampHeadcount}`}
                                        value={editMealHeadcount}
                                        onChange={(e) => setEditMealHeadcount(e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-bold text-slate-900"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Prep Notes</label>
                                <input
                                    type="text"
                                    placeholder="Optional notes or instructions…"
                                    value={editMealNotes}
                                    onChange={(e) => setEditMealNotes(e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-medium"
                                />
                            </div>

                            {/* Ingredients Builder using Searchable Combobox */}
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                                <div className="flex items-center justify-between gap-2">
                                    <label className="text-xs font-black text-slate-900 block">
                                        Ingredients ({editMealIngredients.length})
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditMealIngredients((prev) => [
                                                ...prev,
                                                { name: '', portion_per_person: 100, unit: 'g', category: 'supermarket' },
                                            ])
                                        }}
                                        className="text-xs font-black text-teal-800 hover:text-teal-900 bg-teal-50 border border-teal-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 active:scale-95 shadow-2xs"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>Add Ingredient</span>
                                    </button>
                                </div>

                                {editMealIngredients.length === 0 ? (
                                    <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400">
                                        <p className="font-bold text-slate-600">No ingredients added yet.</p>
                                        <p className="text-[11px] text-slate-400">Click &quot;+ Add Ingredient&quot; above to select from pantry depot or food library.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                        {editMealIngredients.map((ing, idx) => {
                                            const headcount = editMealHeadcount ? parseInt(editMealHeadcount) || defaultCampHeadcount : defaultCampHeadcount
                                            const totalCalculated = Math.round(Number(ing.portion_per_person) * headcount * 10) / 10

                                            return (
                                                <div key={idx} className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs shadow-2xs">
                                                    <div className="flex items-center gap-2">
                                                        <SearchableIngredientCombobox
                                                            value={ing.name}
                                                            groupPantryList={groupPantryList}
                                                            onSelect={(selected) => {
                                                                setEditMealIngredients((prev) =>
                                                                    prev.map((item, i) =>
                                                                        i === idx
                                                                            ? {
                                                                                ...item,
                                                                                name: selected.name,
                                                                                category: selected.category,
                                                                                unit: selected.unit,
                                                                                portion_per_person: selected.portion_per_person || item.portion_per_person,
                                                                            }
                                                                            : item
                                                                    )
                                                                )
                                                            }}
                                                        />

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditMealIngredients((prev) => prev.filter((_, i) => i !== idx))
                                                            }}
                                                            className="p-2 text-slate-400 hover:text-rose-600 shrink-0 rounded-xl hover:bg-rose-50 transition-colors"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-2 items-center">
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Portion / Scout</label>
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                min="0.01"
                                                                required
                                                                value={ing.portion_per_person}
                                                                onChange={(e) => {
                                                                    const val = parseFloat(e.target.value) || 1
                                                                    setEditMealIngredients((prev) =>
                                                                        prev.map((item, i) => (i === idx ? { ...item, portion_per_person: val } : item))
                                                                    )
                                                                }}
                                                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Unit</label>
                                                            <select
                                                                value={ing.unit}
                                                                onChange={(e) => {
                                                                    const val = e.target.value as any
                                                                    setEditMealIngredients((prev) =>
                                                                        prev.map((item, i) => (i === idx ? { ...item, unit: val } : item))
                                                                    )
                                                                }}
                                                                className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900"
                                                            >
                                                                <option value="g">g (Grams)</option>
                                                                <option value="kg">kg (Kg)</option>
                                                                <option value="pieces">pieces (حبة)</option>
                                                                <option value="cans">cans (علبة)</option>
                                                                <option value="loaves">loaves (خبز)</option>
                                                                <option value="packs">packs (كيس)</option>
                                                                <option value="ml">ml</option>
                                                                <option value="liters">liters</option>
                                                            </select>
                                                        </div>

                                                        <div className="pt-3">
                                                            <span className="text-[11px] font-black text-teal-800 bg-teal-50 px-2 py-1.5 rounded-lg border border-teal-200 block text-center truncate">
                                                                👥 {totalCalculated} {ing.unit}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="pt-2 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditMealModalOpen(false)
                                        setEditingMealPlan(null)
                                    }}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-700 hover:bg-slate-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingProvisions}
                                    className="flex-1 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs shadow-2xs transition-colors flex items-center justify-center gap-1.5"
                                >
                                    {isSubmittingProvisions ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                    <span>Save Meal Changes</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardShell>
    )
}
