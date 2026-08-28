'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
    UtensilsCrossed, Plus, Search, AlertTriangle, Check, Trash2, Edit, Loader2,
    Package, ShoppingBag, ArrowUpDown, ChevronRight, Apple, Minus, Layers, Clock,
    Calendar, CheckCircle2, XCircle, Send, Sparkles, Filter, X
} from 'lucide-react'
import DashboardShell from '../DashboardShell'
import { formatDateDisplay } from '@/utils/dateTimeUtils'

export const PANTRY_CATEGORIES = [
    { id: 'grains_pasta', label: 'Grains, Rice & Pasta', ar: 'حبوب ورز ومعكرونة', color: 'bg-amber-50 text-amber-900 border-amber-200' },
    { id: 'canned_goods', label: 'Canned Goods & Legumes', ar: 'معلبات وبقوليات', color: 'bg-emerald-50 text-emerald-900 border-emerald-200' },
    { id: 'breakfast_spreads', label: 'Breakfast, Spreads & Jam', ar: 'ترويقة ومربى وحلاوة', color: 'bg-orange-50 text-orange-900 border-orange-200' },
    { id: 'spices_condiments', label: 'Spices, Salt & Sauces', ar: 'بهارات وملح وصلصات', color: 'bg-rose-50 text-rose-900 border-rose-200' },
    { id: 'oils_fats', label: 'Cooking & Olive Oils', ar: 'زيوت وسمنة', color: 'bg-yellow-50 text-yellow-900 border-yellow-200' },
    { id: 'beverages_tea', label: 'Tea, Coffee & Beverages', ar: 'شاي وقهوة ومشروبات', color: 'bg-purple-50 text-purple-900 border-purple-200' },
    { id: 'consumables_hygiene', label: 'Cleaning, Bags & Foil', ar: 'منظفات وأكياس وسانيتا', color: 'bg-cyan-50 text-cyan-900 border-cyan-200' },
    { id: 'other', label: 'Other Consumables', ar: 'أخرى / متنوع', color: 'bg-slate-50 text-slate-900 border-slate-200' },
]

export interface PantryBatch {
    id: string
    quantity: number
    expiry_date: string
    lot_number?: string
    notes?: string
}

export interface PantryItem {
    id: string
    group_id: string
    name: string
    category: string
    quantity_available: number
    quantity_total?: number
    unit: string
    min_threshold: number
    expiry_date?: string | null
    expiry_batches?: PantryBatch[] | null
    location_stored?: string | null
    notes?: string | null
    created_at?: string
    updated_at?: string
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
    approved_by?: string | null
    notes?: string | null
    created_at: string
    events?: { id: string; title: string; start_time: string }
    profiles?: { full_name: string }
    group_pantry_items?: { name: string; unit: string }
}

interface Props {
    groupId: string
    groupName: string
    currentRole: string
    userName: string
    userId?: string
    initialPantry: PantryItem[]
    initialRequests?: EventPantryRequest[]
}

function normalizePantryItem(item: PantryItem): PantryItem {
    let batches: PantryBatch[] = []
    if (item.expiry_batches && Array.isArray(item.expiry_batches) && item.expiry_batches.length > 0) {
        batches = item.expiry_batches
    } else if (item.expiry_date || item.quantity_available) {
        batches = [
            {
                id: 'b_' + item.id,
                quantity: Number(item.quantity_available) || 1,
                expiry_date: item.expiry_date || '',
                lot_number: 'Batch #1',
            }
        ]
    }
    return {
        ...item,
        expiry_batches: batches,
    }
}

export default function PantryManagement({
    groupId,
    groupName,
    currentRole,
    userName,
    userId,
    initialPantry,
    initialRequests = [],
}: Props) {
    const supabase = createClient()

    const [activeView, setActiveView] = useState<'inventory' | 'requests'>('inventory')
    const [pantryList, setPantryList] = useState<PantryItem[]>(() => initialPantry.map(normalizePantryItem))
    const [requestsList, setRequestsList] = useState<EventPantryRequest[]>(initialRequests)
    const [search, setSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [filterLowStockOnly, setFilterLowStockOnly] = useState(false)
    const [filterExpiringSoonOnly, setFilterExpiringSoonOnly] = useState(false)
    const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<PantryItem | null>(null)
    const [formName, setFormName] = useState('')
    const [formCategory, setFormCategory] = useState('grains_pasta')
    const [formQuantity, setFormQuantity] = useState('1')
    const [formUnit, setFormUnit] = useState('kg')
    const [formMinThreshold, setFormMinThreshold] = useState('2')
    const [formExpiryDate, setFormExpiryDate] = useState('')
    const [formBatches, setFormBatches] = useState<PantryBatch[]>([])
    const [formLocation, setFormLocation] = useState('Pantry Shelf A')
    const [formNotes, setFormNotes] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Permissions
    const isGroupAdmin = ['chef_groupe', 'assistant_chef_groupe', 'configurator'].includes(currentRole)
    const isProvisionsLeader = currentRole === 'amin_mounet_group' || currentRole === 'mas2oul_mounet' || isGroupAdmin

    const showStatus = (text: string, type: 'success' | 'error') => {
        setStatusMessage({ text, type })
        setTimeout(() => setStatusMessage(null), 6000)
    }

    const handleAddBatch = () => {
        const newBatch: PantryBatch = {
            id: 'batch_' + Date.now(),
            quantity: 1,
            expiry_date: '',
            lot_number: `Lot #${formBatches.length + 1}`,
        }
        setFormBatches((prev) => [...prev, newBatch])
    }

    const handleRemoveBatch = (batchId: string) => {
        setFormBatches((prev) => {
            const filtered = prev.filter((b) => b.id !== batchId)
            return filtered.length > 0 ? filtered : [
                { id: 'batch_' + Date.now(), quantity: 1, expiry_date: '', lot_number: 'Batch #1' }
            ]
        })
    }

    const handleUpdateBatch = (batchId: string, field: keyof PantryBatch, val: any) => {
        setFormBatches((prev) => prev.map((b) => (b.id === batchId ? { ...b, [field]: val } : b)))
    }

    // Calculate expiring soon (< 30 days)
    const isItemExpiringSoon = (expiryDate?: string | null) => {
        if (!expiryDate) return false
        const expTime = new Date(expiryDate).getTime()
        const now = Date.now()
        const diffDays = (expTime - now) / (1000 * 60 * 60 * 24)
        return diffDays >= 0 && diffDays <= 30
    }

    const isItemExpired = (expiryDate?: string | null) => {
        if (!expiryDate) return false
        return new Date(expiryDate).getTime() < Date.now()
    }

    // Filtered items
    const filteredItems = useMemo(() => {
        return pantryList.filter((item) => {
            if (selectedCategory !== 'all' && item.category !== selectedCategory) return false
            if (filterLowStockOnly && item.quantity_available > (item.min_threshold || 0)) return false
            if (filterExpiringSoonOnly && !isItemExpiringSoon(item.expiry_date) && !isItemExpired(item.expiry_date)) {
                return false
            }
            if (search.trim()) {
                const query = search.toLowerCase()
                const matchName = item.name.toLowerCase().includes(query)
                const matchCategory = item.category.toLowerCase().includes(query)
                const matchNotes = (item.notes || '').toLowerCase().includes(query)
                const matchLoc = (item.location_stored || '').toLowerCase().includes(query)
                if (!matchName && !matchCategory && !matchNotes && !matchLoc) return false
            }
            return true
        })
    }, [pantryList, selectedCategory, filterLowStockOnly, filterExpiringSoonOnly, search])

    // Low stock counter
    const lowStockCount = useMemo(() => {
        return pantryList.filter((i) => i.quantity_available <= (i.min_threshold || 0)).length
    }, [pantryList])

    // Expiring soon counter
    const expiringSoonCount = useMemo(() => {
        return pantryList.filter((i) => isItemExpiringSoon(i.expiry_date) || isItemExpired(i.expiry_date)).length
    }, [pantryList])

    // Pending event requests counter
    const pendingRequestsCount = useMemo(() => {
        return requestsList.filter((r) => r.status === 'requested').length
    }, [requestsList])

    // Fast stock stepper (+1 / -1)
    const handleQuickAdjustStock = async (item: PantryItem, delta: number) => {
        if (!isProvisionsLeader) return
        const newQty = Math.max(0, Number(item.quantity_available) + delta)

        let updatedBatches = item.expiry_batches ? [...item.expiry_batches] : []
        if (updatedBatches.length > 0) {
            updatedBatches[0] = {
                ...updatedBatches[0],
                quantity: Math.max(0, Number(updatedBatches[0].quantity) + delta),
            }
        }

        setPantryList((prev) =>
            prev.map((i) =>
                i.id === item.id
                    ? { ...i, quantity_available: newQty, expiry_batches: updatedBatches }
                    : i
            )
        )

        const updatePayload: any = { quantity_available: newQty }
        if (updatedBatches.length > 0) {
            updatePayload.expiry_batches = updatedBatches
        }

        let { error } = await supabase
            .from('group_pantry_items')
            .update(updatePayload)
            .eq('id', item.id)

        if (error && error.message?.includes('expiry_batches')) {
            delete updatePayload.expiry_batches
            const retryRes = await supabase
                .from('group_pantry_items')
                .update(updatePayload)
                .eq('id', item.id)
            error = retryRes.error
        }

        if (error) {
            showStatus('Failed to update quantity.', 'error')
            // Rollback
            setPantryList((prev) =>
                prev.map((i) => (i.id === item.id ? item : i))
            )
        }
    }

    const handleOpenCreateModal = () => {
        setEditingItem(null)
        setFormName('')
        setFormCategory('grains_pasta')
        setFormQuantity('1')
        setFormUnit('kg')
        setFormMinThreshold('2')
        setFormExpiryDate('')
        setFormLocation('Pantry Shelf A')
        setFormNotes('')
        setFormBatches([
            {
                id: 'batch_' + Date.now(),
                quantity: 1,
                expiry_date: '',
                lot_number: 'Batch #1',
            }
        ])
        setIsModalOpen(true)
    }

    const handleOpenEditModal = (item: PantryItem) => {
        setEditingItem(item)
        setFormName(item.name)
        setFormCategory(item.category)
        setFormQuantity(String(item.quantity_available))
        setFormUnit(item.unit)
        setFormMinThreshold(String(item.min_threshold || 0))
        setFormExpiryDate(item.expiry_date || '')
        setFormLocation(item.location_stored || 'Pantry Shelf A')
        setFormNotes(item.notes || '')
        const normalized = normalizePantryItem(item)
        setFormBatches(
            normalized.expiry_batches && normalized.expiry_batches.length > 0
                ? normalized.expiry_batches
                : [
                    {
                        id: 'batch_' + Date.now(),
                        quantity: Number(item.quantity_available) || 1,
                        expiry_date: item.expiry_date || '',
                        lot_number: 'Batch #1',
                    }
                ]
        )
        setIsModalOpen(true)
    }

    const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'pending' | 'approved'>('all')

    const groupedRequestsByEvent = useMemo(() => {
        const map: Record<string, {
            eventId: string
            eventTitle: string
            eventStartDate?: string
            requesterName?: string
            items: EventPantryRequest[]
            pendingCount: number
            approvedCount: number
        }> = {}

        requestsList.forEach((req) => {
            if (requestStatusFilter === 'pending' && req.status !== 'requested') return
            if (requestStatusFilter === 'approved' && req.status !== 'approved' && req.status !== 'received') return

            const eventId = req.event_id || 'unassigned'
            const eventTitle = req.events?.title || 'Camp Activity'
            const eventStartDate = req.events?.start_time
            const requesterName = req.profiles?.full_name || 'Leader'

            if (!map[eventId]) {
                map[eventId] = {
                    eventId,
                    eventTitle,
                    eventStartDate,
                    requesterName,
                    items: [],
                    pendingCount: 0,
                    approvedCount: 0,
                }
            }

            map[eventId].items.push(req)
            if (req.status === 'requested') {
                map[eventId].pendingCount += 1
            } else {
                map[eventId].approvedCount += 1
            }
        })

        return Object.values(map)
    }, [requestsList, requestStatusFilter])

    const handleSavePantryItem = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formName.trim()) {
            showStatus('Please enter an item name.', 'error')
            return
        }

        setIsSubmitting(true)
        const qty = parseFloat(formQuantity) || 0
        const minThresh = parseFloat(formMinThreshold) || 0

        // If multiple batches are added, compute total quantity & earliest expiry date
        let finalQty = qty
        let finalExpiry = formExpiryDate || null

        if (formBatches.length > 0) {
            finalQty = formBatches.reduce((acc, b) => acc + (parseFloat(String(b.quantity)) || 0), 0)
            const sortedDates = formBatches
                .map((b) => b.expiry_date)
                .filter(Boolean)
                .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
            if (sortedDates.length > 0) {
                finalExpiry = sortedDates[0]
            }
        }

        try {
            if (editingItem) {
                // Update
                const payload: any = {
                    name: formName.trim(),
                    category: formCategory,
                    quantity_available: finalQty,
                    unit: formUnit,
                    expiry_date: finalExpiry,
                    expiry_batches: formBatches.length > 0 ? formBatches : null,
                    location_stored: formLocation.trim() || null,
                    notes: formNotes.trim() || null,
                }

                let res = await supabase
                    .from('group_pantry_items')
                    .update({ ...payload, min_threshold: minThresh })
                    .eq('id', editingItem.id)
                    .select('*')
                    .single()

                if (res.error && (res.error.message?.includes('expiry_batches') || res.error.message?.includes('min_threshold'))) {
                    // Fallback without unsupported columns
                    const safePayload = { ...payload }
                    delete safePayload.expiry_batches
                    if (formBatches.length > 0) {
                        const batchNote = `[Batches: ${formBatches.map(b => `${b.quantity}x exp ${b.expiry_date}`).join(', ')}]`
                        safePayload.notes = safePayload.notes ? `${safePayload.notes} | ${batchNote}` : batchNote
                    }
                    res = await supabase
                        .from('group_pantry_items')
                        .update(safePayload)
                        .eq('id', editingItem.id)
                        .select('*')
                        .single()
                }

                if (res.error) throw res.error
                const data = res.data
                setPantryList((prev) => prev.map((i) => (i.id === data.id ? { ...data, expiry_batches: formBatches } : i)))
                showStatus(`Updated "${data.name}" successfully with ${formBatches.length > 0 ? formBatches.length + ' expiry batch(es)' : 'stock details'}!`, 'success')
            } else {
                // Insert
                const payload: any = {
                    group_id: groupId,
                    name: formName.trim(),
                    category: formCategory,
                    quantity_available: finalQty,
                    quantity_total: finalQty,
                    unit: formUnit,
                    expiry_date: finalExpiry,
                    expiry_batches: formBatches.length > 0 ? formBatches : null,
                    location_stored: formLocation.trim() || 'Pantry Shelf A',
                    notes: formNotes.trim() || null,
                }

                let res = await supabase
                    .from('group_pantry_items')
                    .insert({ ...payload, min_threshold: minThresh })
                    .select('*')
                    .single()

                if (res.error && (res.error.message?.includes('expiry_batches') || res.error.message?.includes('min_threshold'))) {
                    // Fallback without unsupported columns
                    const safePayload = { ...payload }
                    delete safePayload.expiry_batches
                    if (formBatches.length > 0) {
                        const batchNote = `[Batches: ${formBatches.map(b => `${b.quantity}x exp ${b.expiry_date}`).join(', ')}]`
                        safePayload.notes = safePayload.notes ? `${safePayload.notes} | ${batchNote}` : batchNote
                    }
                    res = await supabase
                        .from('group_pantry_items')
                        .insert(safePayload)
                        .select('*')
                        .single()
                }

                if (res.error) throw res.error
                const data = res.data
                setPantryList((prev) => [{ ...data, expiry_batches: formBatches }, ...prev])
                showStatus(`Added "${data.name}" to central pantry!`, 'success')
            }

            setIsModalOpen(false)
        } catch (err: any) {
            showStatus(err?.message || 'Error saving pantry item.', 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeletePantryItem = async (itemId: string, itemName: string) => {
        if (!confirm(`Are you sure you want to delete "${itemName}" from the pantry?`)) return

        const { error } = await supabase
            .from('group_pantry_items')
            .update({ is_deleted: true })
            .eq('id', itemId)

        if (error) {
            showStatus(error.message, 'error')
        } else {
            setPantryList((prev) => prev.filter((i) => i.id !== itemId))
            showStatus(`Deleted "${itemName}" from pantry.`, 'success')
        }
    }

    // Handle Approve / Fulfill Event Pantry Request
    const handleApproveRequest = async (request: EventPantryRequest) => {
        const { error } = await supabase
            .from('event_pantry_requests')
            .update({
                status: 'approved',
                approved_by: userId || null,
            })
            .eq('id', request.id)

        if (error) {
            showStatus(error.message, 'error')
        } else {
            // Deduct from group pantry stock
            const pantryItem = pantryList.find((p) => p.id === request.pantry_item_id)
            if (pantryItem) {
                const newQty = Math.max(0, pantryItem.quantity_available - request.quantity)
                await supabase
                    .from('group_pantry_items')
                    .update({ quantity_available: newQty })
                    .eq('id', pantryItem.id)

                setPantryList((prev) =>
                    prev.map((p) => (p.id === pantryItem.id ? { ...p, quantity_available: newQty } : p))
                )
            }

            setRequestsList((prev) =>
                prev.map((r) => (r.id === request.id ? { ...r, status: 'approved' } : r))
            )
            showStatus(`Approved transfer of ${request.quantity} ${request.unit} to ${request.events?.title || 'Camp'}!`, 'success')
        }
    }

    const handleApproveAllForEvent = async (eventRequests: EventPantryRequest[], eventTitle: string) => {
        const pendingItems = eventRequests.filter((r) => r.status === 'requested')
        if (pendingItems.length === 0) return

        setIsSubmitting(true)
        try {
            for (const req of pendingItems) {
                await supabase
                    .from('event_pantry_requests')
                    .update({ status: 'approved', approved_by: userId || null })
                    .eq('id', req.id)

                const pantryItem = pantryList.find((p) => p.id === req.pantry_item_id)
                if (pantryItem) {
                    const newQty = Math.max(0, pantryItem.quantity_available - req.quantity)
                    await supabase
                        .from('group_pantry_items')
                        .update({ quantity_available: newQty })
                        .eq('id', pantryItem.id)

                    setPantryList((prev) =>
                        prev.map((p) => (p.id === pantryItem.id ? { ...p, quantity_available: newQty } : p))
                    )
                }
            }

            setRequestsList((prev) =>
                prev.map((r) =>
                    pendingItems.some((pi) => pi.id === r.id) ? { ...r, status: 'approved' } : r
                )
            )

            showStatus(`Approved all ${pendingItems.length} provisions items for ${eventTitle}!`, 'success')
        } catch (err: any) {
            showStatus(err?.message || 'Failed to batch approve requests.', 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeclineRequest = async (request: EventPantryRequest) => {
        if (!confirm(`Are you sure you want to decline this request for ${request.quantity} ${request.unit} of ${request.group_pantry_items?.name || 'this item'}?`)) return

        const { error } = await supabase
            .from('event_pantry_requests')
            .update({
                status: 'rejected',
                approved_by: userId || null,
            })
            .eq('id', request.id)

        if (error) {
            showStatus(error.message, 'error')
        } else {
            setRequestsList((prev) =>
                prev.map((r) => (r.id === request.id ? { ...r, status: 'rejected' } : r))
            )
            showStatus(`Declined pantry transfer for ${request.events?.title || 'Camp'}.`, 'success')
        }
    }

    const handleDeclineAllForEvent = async (eventRequests: EventPantryRequest[], eventTitle: string) => {
        const pendingItems = eventRequests.filter((r) => r.status === 'requested')
        if (pendingItems.length === 0) return

        if (!confirm(`Are you sure you want to decline all ${pendingItems.length} pending requests for ${eventTitle}?`)) return

        setIsSubmitting(true)
        try {
            const pendingIds = pendingItems.map((r) => r.id)
            const { error } = await supabase
                .from('event_pantry_requests')
                .update({ status: 'rejected', approved_by: userId || null })
                .in('id', pendingIds)

            if (error) throw error

            setRequestsList((prev) =>
                prev.map((r) =>
                    pendingIds.includes(r.id) ? { ...r, status: 'rejected' } : r
                )
            )

            showStatus(`Declined all ${pendingItems.length} pending requests for ${eventTitle}.`, 'success')
        } catch (err: any) {
            showStatus(err?.message || 'Failed to decline requests.', 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <DashboardShell groupName={groupName} currentRole={currentRole} userName={userName}>
            <div className="w-full pb-16 space-y-4">
                {/* Status Toast */}
                {statusMessage && (
                    <div
                        className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 ${statusMessage.type === 'success'
                            ? 'bg-teal-900 text-white'
                            : 'bg-rose-600 text-white'
                            }`}
                    >
                        <span>{statusMessage.text}</span>
                        <button onClick={() => setStatusMessage(null)} className="opacity-70 hover:opacity-100">
                            ✕
                        </button>
                    </div>
                )}

                {/* ── TOP HEADER ── */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0 shadow-2xs">
                            <UtensilsCrossed className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <span>Group Pantry</span>
                            </h1>
                        </div>
                    </div>

                    {isProvisionsLeader && (
                        <button
                            onClick={handleOpenCreateModal}
                            className="bg-teal-800 hover:bg-teal-700 active:scale-95 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 shrink-0"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Add Stock Item</span>
                        </button>
                    )}
                </div>

                {/* ── SEGMENTED VIEW BAR (Stock vs Event Requests) ── */}
                <div className="bg-slate-100/90 p-1 rounded-xl flex items-center gap-1 border border-slate-200/80">
                    <button
                        onClick={() => setActiveView('inventory')}
                        className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeView === 'inventory'
                            ? 'bg-teal-800 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        <Package className="h-3.5 w-3.5" />
                        <span>Inventory</span>
                        <span className="opacity-75 font-normal">({pantryList.length})</span>
                    </button>

                    <button
                        onClick={() => setActiveView('requests')}
                        className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeView === 'requests'
                            ? 'bg-teal-800 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        <Send className="h-3.5 w-3.5" />
                        <span>Requests</span>
                        {pendingRequestsCount > 0 ? (
                            <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                                {pendingRequestsCount} new
                            </span>
                        ) : (
                            <span className="opacity-75 font-normal">({requestsList.length})</span>
                        )}
                    </button>
                </div>

                {activeView === 'inventory' && (
                    <>
                        {/* ── METRICS & SUMMARY BAR (With Expiry Tile) ── */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">

                            {/* Low Stock Filter Tile */}
                            <div
                                onClick={() => {
                                    setFilterLowStockOnly(!filterLowStockOnly)
                                    setFilterExpiringSoonOnly(false)
                                }}
                                className={`p-3.5 rounded-2xl border shadow-2xs space-y-0.5 cursor-pointer transition-all ${lowStockCount > 0
                                    ? filterLowStockOnly
                                        ? 'bg-rose-800 text-white border-rose-800'
                                        : 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100/70'
                                    : 'bg-white text-slate-900 border-slate-200'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${filterLowStockOnly ? 'text-rose-200' : 'text-rose-700'}`}>
                                        Low Stock Alert
                                    </span>
                                    {lowStockCount > 0 && <AlertTriangle className="h-3.5 w-3.5" />}
                                </div>
                                <span className="text-xl font-black">{lowStockCount} items</span>
                            </div>

                            {/* Expiring Soon Filter Tile */}
                            <div
                                onClick={() => {
                                    setFilterExpiringSoonOnly(!filterExpiringSoonOnly)
                                    setFilterLowStockOnly(false)
                                }}
                                className={`p-3.5 rounded-2xl border shadow-2xs space-y-0.5 cursor-pointer transition-all ${expiringSoonCount > 0
                                    ? filterExpiringSoonOnly
                                        ? 'bg-amber-800 text-white border-amber-800'
                                        : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100/70'
                                    : 'bg-white text-slate-900 border-slate-200'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${filterExpiringSoonOnly ? 'text-amber-200' : 'text-amber-700'}`}>
                                        Expiring Soon (&lt;30d)
                                    </span>
                                    {expiringSoonCount > 0 && <Clock className="h-3.5 w-3.5" />}
                                </div>
                                <span className="text-xl font-black">{expiringSoonCount} items</span>
                            </div>
                        </div>

                        {/* ── SEARCH & CLEAN CATEGORY PILLS (Fixed Underline Bug) ── */}
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search pantry by item name, spices, cans, tea, notes…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-medium transition-all"
                                />
                            </div>

                            {/* Clean Horizontal Filter Pills - zero scrollbar artifacts */}
                            <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-0.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedCategory('all')
                                        setFilterLowStockOnly(false)
                                        setFilterExpiringSoonOnly(false)
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${selectedCategory === 'all' && !filterLowStockOnly && !filterExpiringSoonOnly
                                        ? 'bg-slate-900 text-white shadow-2xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    All ({pantryList.length})
                                </button>

                                {/* Expiring Soon Chip Filter */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFilterExpiringSoonOnly(!filterExpiringSoonOnly)
                                        setFilterLowStockOnly(false)
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 ${filterExpiringSoonOnly
                                        ? 'bg-amber-800 text-white shadow-2xs'
                                        : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                                        }`}
                                >
                                    <Clock className="h-3 w-3" />
                                    <span>Expiring Soon</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${filterExpiringSoonOnly ? 'bg-amber-900 text-amber-200' : 'bg-amber-200/70 text-amber-900'
                                        }`}>
                                        {expiringSoonCount}
                                    </span>
                                </button>

                                {PANTRY_CATEGORIES.map((cat) => {
                                    const count = pantryList.filter((i) => i.category === cat.id).length
                                    const isSel = selectedCategory === cat.id && !filterExpiringSoonOnly && !filterLowStockOnly

                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedCategory(cat.id)
                                                setFilterLowStockOnly(false)
                                                setFilterExpiringSoonOnly(false)
                                            }}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${isSel
                                                ? 'bg-teal-800 text-white shadow-2xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                        >
                                            <span>{cat.label}</span>
                                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSel ? 'bg-teal-900 text-teal-200' : 'bg-slate-200 text-slate-700'
                                                }`}>
                                                {count}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* ── PANTRY ITEMS GRID ── */}
                        {filteredItems.length === 0 ? (
                            <div className="bg-white p-12 text-center text-slate-400 space-y-2 rounded-2xl border border-slate-200">
                                <UtensilsCrossed className="h-10 w-10 mx-auto opacity-30" />
                                <p className="font-bold text-slate-700 text-sm">No pantry items match your filters.</p>
                                <p className="text-xs text-slate-400">
                                    {search || filterLowStockOnly || filterExpiringSoonOnly
                                        ? 'Try resetting your search filters.'
                                        : 'Click "Add Stock Item" to add bulk goods to the central pantry.'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {filteredItems.map((item) => {
                                    const catObj = PANTRY_CATEGORIES.find((c) => c.id === item.category)
                                    const isLowStock = item.quantity_available <= (item.min_threshold || 0)
                                    const isExpiring = isItemExpiringSoon(item.expiry_date)
                                    const isExpired = isItemExpired(item.expiry_date)

                                    return (
                                        <div
                                            key={item.id}
                                            className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-sm transition-all p-4 flex flex-col justify-between gap-3"
                                        >
                                            <div className="space-y-2">
                                                {/* Header: Name, Category, & Expiry */}
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                                            {catObj?.label || item.category}
                                                        </span>
                                                        <h3 className="font-black text-slate-900 text-base leading-snug break-words">
                                                            {item.name}
                                                        </h3>
                                                    </div>

                                                    {catObj?.ar && (
                                                        <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-1.5 py-0.5 rounded shrink-0">
                                                            {catObj.ar}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Location & Expiry Status */}
                                                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                                    {item.location_stored && (
                                                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                                            📍 {item.location_stored}
                                                        </span>
                                                    )}

                                                    {item.expiry_date && (
                                                        <span
                                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${isExpired
                                                                ? 'bg-rose-100 text-rose-900 border border-rose-200'
                                                                : isExpiring
                                                                    ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                                                    : 'bg-slate-100 text-slate-600'
                                                                }`}
                                                        >
                                                            <Clock className="h-2.5 w-2.5" />
                                                            <span>
                                                                {isExpired ? 'Expired: ' : isExpiring ? 'Expiring: ' : 'Exp: '}
                                                                {formatDateDisplay(item.expiry_date)}
                                                            </span>
                                                        </span>
                                                    )}
                                                </div>

                                                {item.expiry_batches && item.expiry_batches.length > 0 && (
                                                    <div className="pt-1">
                                                        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 space-y-1.5 shadow-2xs">
                                                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-700">
                                                                <span className="flex items-center gap-1.5 text-amber-900 font-black">
                                                                    <Layers className="h-3.5 w-3.5 text-amber-800" />
                                                                    <span>
                                                                        {item.expiry_batches.length === 1 ? '1 Expiry Batch' : `${item.expiry_batches.length} Expiry Batches (FIFO)`}
                                                                    </span>
                                                                </span>
                                                                <span className="text-[9px] text-slate-400 font-semibold">Tracked Lots</span>
                                                            </div>
                                                            <div className="space-y-1">
                                                                {item.expiry_batches.map((batch, idx) => {
                                                                    const bExp = isItemExpired(batch.expiry_date)
                                                                    const bSoon = isItemExpiringSoon(batch.expiry_date)
                                                                    return (
                                                                        <div
                                                                            key={batch.id || idx}
                                                                            className="flex items-center justify-between text-[11px] bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80 shadow-2xs"
                                                                        >
                                                                            <span className="font-bold text-slate-900 flex items-center gap-1 truncate">
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-teal-800 shrink-0" />
                                                                                <span>{batch.quantity} {item.unit}</span>
                                                                                {batch.lot_number && (
                                                                                    <span className="text-[10px] text-slate-500 font-normal truncate">
                                                                                        • {batch.lot_number}
                                                                                    </span>
                                                                                )}
                                                                            </span>
                                                                            <span
                                                                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ml-1.5 ${bExp
                                                                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                                                                    : bSoon
                                                                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                                                        : batch.expiry_date
                                                                                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                                                                            : 'bg-slate-100 text-slate-500'
                                                                                    }`}
                                                                            >
                                                                                {batch.expiry_date ? formatDateDisplay(batch.expiry_date) : 'No exp date'}
                                                                            </span>
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {item.notes && (
                                                    <p className="text-[11px] text-slate-500 line-clamp-2 italic bg-slate-50 p-2 rounded-xl border border-slate-100">
                                                        {item.notes}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Footer: Quantity Stepper & Edit */}
                                            <div className="space-y-2 pt-2 border-t border-slate-100">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-400 block uppercase">In Stock</span>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-xl font-black text-slate-900">{item.quantity_available}</span>
                                                            <span className="text-xs font-bold text-teal-800">{item.unit}</span>
                                                        </div>
                                                    </div>

                                                    <div className="text-right">
                                                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Min Alert</span>
                                                        <span className="text-xs font-bold text-slate-600">{item.min_threshold || 0} {item.unit}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between gap-2">
                                                    {/* Fast - / + stepper */}
                                                    {isProvisionsLeader ? (
                                                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleQuickAdjustStock(item, -1)}
                                                                disabled={item.quantity_available <= 0}
                                                                className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center text-slate-700 font-black shadow-2xs active:scale-95"
                                                            >
                                                                <Minus className="h-3.5 w-3.5" />
                                                            </button>
                                                            <span className="w-8 text-center text-xs font-black text-teal-900">
                                                                {item.quantity_available}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleQuickAdjustStock(item, 1)}
                                                                className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 flex items-center justify-center text-slate-700 font-black shadow-2xs active:scale-95"
                                                            >
                                                                <Plus className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-bold text-slate-500">Read-only</span>
                                                    )}

                                                    {isProvisionsLeader && (
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenEditModal(item)}
                                                                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                                                title="Edit item"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeletePantryItem(item.id, item.name)}
                                                                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                                title="Delete item"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* ── EVENT PANTRY REQUESTS VIEW (Grouped by Camp / Event) ── */}
                {activeView === 'requests' && (
                    <div className="space-y-4">
                        {/* Filter pills for requests */}
                        <div className="flex items-center justify-between gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1">
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setRequestStatusFilter('all')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${requestStatusFilter === 'all'
                                        ? 'bg-teal-800 text-white shadow-2xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    <span>All Requests</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${requestStatusFilter === 'all' ? 'bg-teal-900 text-teal-200' : 'bg-slate-200 text-slate-700'
                                        }`}>
                                        {requestsList.length}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setRequestStatusFilter('pending')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${requestStatusFilter === 'pending'
                                        ? 'bg-amber-600 text-white shadow-2xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    <span>Pending Approval</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${requestStatusFilter === 'pending' ? 'bg-amber-700 text-amber-100' : 'bg-slate-200 text-slate-700'
                                        }`}>
                                        {pendingRequestsCount}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setRequestStatusFilter('approved')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${requestStatusFilter === 'approved'
                                        ? 'bg-emerald-700 text-white shadow-2xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    <span>Approved / Transferred</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${requestStatusFilter === 'approved' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 text-slate-700'
                                        }`}>
                                        {requestsList.length - pendingRequestsCount}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {groupedRequestsByEvent.length === 0 ? (
                            <div className="bg-white p-12 text-center text-slate-400 space-y-2 rounded-2xl border border-slate-200">
                                <Send className="h-8 w-8 mx-auto opacity-30" />
                                <p className="font-bold text-slate-700 text-sm">No transfer requests match this filter.</p>
                                <p className="text-xs text-slate-400">When camp leaders request provisions from Central Pantry, they will appear grouped by camp here.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {groupedRequestsByEvent.map((group) => {
                                    const hasPending = group.pendingCount > 0

                                    return (
                                        <div
                                            key={group.eventId}
                                            className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden transition-all"
                                        >
                                            {/* Group Header (Camp Card Header) */}
                                            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-base">⛺</span>
                                                        <h4 className="font-black text-slate-900 text-sm sm:text-base">
                                                            {group.eventTitle}
                                                        </h4>
                                                        {hasPending ? (
                                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                                                                {group.pendingCount} Pending
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                                                                ✓ All Approved
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                                                        {group.eventStartDate && (
                                                            <span>Camp Date: <strong>{formatDateDisplay(group.eventStartDate)}</strong></span>
                                                        )}
                                                        <span>•</span>
                                                        <span>Requester: <strong>{group.requesterName}</strong></span>
                                                        <span>•</span>
                                                        <span>{group.items.length} {group.items.length === 1 ? 'item' : 'items'}</span>
                                                    </div>
                                                </div>

                                                {/* Batch Approve / Decline Actions */}
                                                {hasPending && isProvisionsLeader && (
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            type="button"
                                                            disabled={isSubmitting}
                                                            onClick={() => handleDeclineAllForEvent(group.items, group.eventTitle)}
                                                            className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 active:scale-95 font-bold px-3 py-2 rounded-xl text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                            <span>Decline Pending</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={isSubmitting}
                                                            onClick={() => handleApproveAllForEvent(group.items, group.eventTitle)}
                                                            className="bg-teal-800 hover:bg-teal-700 active:scale-95 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                            <span>Approve All ({group.pendingCount})</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* List of items requested for this Camp */}
                                            <div className="divide-y divide-slate-100">
                                                {group.items.map((req) => {
                                                    const isPending = req.status === 'requested'
                                                    const isApproved = req.status === 'approved'
                                                    const isRejected = req.status === 'rejected'
                                                    const pantryItem = pantryList.find((p) => p.id === req.pantry_item_id)
                                                    const availableStock = pantryItem?.quantity_available || 0
                                                    const isLowOrInsufficient = availableStock < req.quantity

                                                    return (
                                                        <div
                                                            key={req.id}
                                                            className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                                                        >
                                                            <div className="space-y-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <h5 className="font-black text-slate-900 text-sm">
                                                                        {req.group_pantry_items?.name || pantryItem?.name || 'Pantry Item'}
                                                                    </h5>
                                                                    <span className="bg-teal-50 text-teal-900 border border-teal-200 px-2 py-0.5 rounded-lg text-xs font-black">
                                                                        {req.quantity} {req.unit}
                                                                    </span>
                                                                    <span
                                                                        className={`text-[10px] font-black px-2 py-0.5 rounded-md ${isApproved
                                                                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                                                            : isRejected
                                                                                ? 'bg-rose-100 text-rose-900 border border-rose-200'
                                                                                : 'bg-amber-100 text-amber-900 border border-amber-200'
                                                                            }`}
                                                                    >
                                                                        {isApproved ? '✓ Transferred' : isRejected ? '❌ Declined' : '⏳ Awaiting Transfer'}
                                                                    </span>
                                                                </div>

                                                                <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                                                                    <span>In Central Depot: <strong>{availableStock} {pantryItem?.unit || req.unit}</strong></span>
                                                                    {isPending && isLowOrInsufficient && (
                                                                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                                                            ⚠️ Depot has only {availableStock} {pantryItem?.unit || req.unit}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {isPending && isProvisionsLeader && (
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeclineRequest(req)}
                                                                        className="w-full sm:w-auto bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold px-3 py-1.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1 active:scale-95"
                                                                    >
                                                                        <X className="h-3.5 w-3.5" />
                                                                        <span>Decline</span>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleApproveRequest(req)}
                                                                        className="w-full sm:w-auto bg-teal-800 hover:bg-teal-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-2xs transition-all flex items-center justify-center gap-1 active:scale-95"
                                                                    >
                                                                        <Check className="h-3.5 w-3.5" />
                                                                        <span>Approve & Deduct</span>
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ── CREATE / EDIT MODAL (With Expiry Date & Location) ── */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95">
                            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto -mt-1 mb-2 sm:hidden shrink-0" />

                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-2">
                                    <UtensilsCrossed className="h-5 w-5 text-teal-800" />
                                    <h3 className="text-sm font-black text-slate-900">
                                        {editingItem ? 'Edit Pantry Stock Item' : 'Add Central Pantry Consumable'}
                                    </h3>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={handleSavePantryItem} className="space-y-3.5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Item Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. White Basmati Rice, Canned Tuna, Olive Oil…"
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-medium"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                                        <select
                                            value={formCategory}
                                            onChange={(e) => setFormCategory(e.target.value)}
                                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-medium bg-white"
                                        >
                                            {PANTRY_CATEGORIES.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Unit of Measure *</label>
                                        <select
                                            value={formUnit}
                                            onChange={(e) => setFormUnit(e.target.value)}
                                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-bold bg-white"
                                        >
                                            <option value="kg">kg (Kilograms)</option>
                                            <option value="g">g (Grams)</option>
                                            <option value="liters">liters (L)</option>
                                            <option value="cans">cans (علبة)</option>
                                            <option value="packs">packs (باكيت / كيس)</option>
                                            <option value="bottles">bottles (قنينة)</option>
                                            <option value="boxes">boxes (كرتونة)</option>
                                            <option value="pieces">pieces (حبة)</option>
                                            <option value="loaves">loaves (ربطة خبز)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            {formBatches.length > 0 ? 'Total Stock (From Batches)' : 'Available Quantity *'}
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            min="0"
                                            required
                                            disabled={formBatches.length > 0}
                                            value={formBatches.length > 0 ? formBatches.reduce((acc, b) => acc + (parseFloat(String(b.quantity)) || 0), 0) : formQuantity}
                                            onChange={(e) => setFormQuantity(e.target.value)}
                                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-bold disabled:bg-slate-50 disabled:text-teal-900"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Low Stock Alert Threshold</label>
                                        <input
                                            type="number"
                                            step="any"
                                            min="0"
                                            value={formMinThreshold}
                                            onChange={(e) => setFormMinThreshold(e.target.value)}
                                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-bold"
                                        />
                                    </div>
                                </div>

                                <div className={formBatches.length === 0 ? "grid grid-cols-2 gap-3" : "w-full"}>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Storage Shelf / Depot</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Shelf A-2, Bin 1"
                                            value={formLocation}
                                            onChange={(e) => setFormLocation(e.target.value)}
                                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-medium"
                                        />
                                    </div>

                                    {formBatches.length === 0 && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Expiry Date (Optional)</label>
                                            <input
                                                type="date"
                                                value={formExpiryDate}
                                                onChange={(e) => setFormExpiryDate(e.target.value)}
                                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-medium"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* ── MULTI-BATCH EXPIRATION LOTS SECTION ── */}
                                <div className="p-3 sm:p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-2xl space-y-3 shadow-2xs">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center shrink-0">
                                                <Layers className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-xs font-black text-slate-900 leading-tight truncate">
                                                    Expiry Batches / Lots
                                                </h4>
                                                <span className="text-[10px] font-bold text-amber-800 block">
                                                    تواريخ انتهاء متعددة
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleAddBatch}
                                            className="text-[11px] font-black bg-amber-800 hover:bg-amber-700 active:scale-95 text-white px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shrink-0 shadow-2xs"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            <span>Add Batch</span>
                                        </button>
                                    </div>

                                    {formBatches.length === 0 ? (
                                        <p className="text-[11px] text-amber-900/80 leading-relaxed bg-amber-100/50 p-2.5 rounded-xl border border-amber-200/50">
                                            Have stock expiring on different dates? Tap <strong>Add Batch</strong> to record separate quantities and expiration dates per lot (FIFO enabled).
                                        </p>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {formBatches.map((batch, idx) => (
                                                <div
                                                    key={batch.id}
                                                    className="bg-white p-3 rounded-2xl border border-amber-200/90 shadow-2xs space-y-2.5"
                                                >
                                                    {/* Top row: Lot # / Note and Delete */}
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                                            <span className="text-[10px] font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md shrink-0">
                                                                Lot #{idx + 1}
                                                            </span>
                                                            <input
                                                                type="text"
                                                                placeholder="Note / Lot # (Optional)"
                                                                value={batch.lot_number || ''}
                                                                onChange={(e) => handleUpdateBatch(batch.id, 'lot_number', e.target.value)}
                                                                className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600 font-medium placeholder:text-slate-400"
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveBatch(batch.id)}
                                                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors shrink-0 active:scale-95"
                                                            title="Remove batch"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>

                                                    {/* Bottom row: Qty & Expiry Date (Responsive 2-col) */}
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                                                Qty ({formUnit}) *
                                                            </label>
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                min="0.1"
                                                                required
                                                                placeholder="Quantity"
                                                                value={batch.quantity}
                                                                onChange={(e) => handleUpdateBatch(batch.id, 'quantity', parseFloat(e.target.value) || 0)}
                                                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600 font-black text-slate-900"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                                                Expiry Date *
                                                            </label>
                                                            <input
                                                                type="date"
                                                                required
                                                                value={batch.expiry_date}
                                                                onChange={(e) => handleUpdateBatch(batch.id, 'expiry_date', e.target.value)}
                                                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600 font-medium text-slate-900"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">General Notes</label>
                                    <textarea
                                        rows={2}
                                        placeholder="e.g. Donated stock, brand name, specific storage instructions..."
                                        value={formNotes}
                                        onChange={(e) => setFormNotes(e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-medium"
                                    />
                                </div>

                                <div className="pt-2 flex gap-2 pb-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-700 active:scale-95 text-white font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5"
                                    >
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                        <span>{editingItem ? 'Save Changes' : 'Add to Stock'}</span>
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
