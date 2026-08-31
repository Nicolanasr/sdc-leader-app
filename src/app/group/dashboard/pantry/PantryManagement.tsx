'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { createClient } from '@/utils/supabase/client'
import {
    UtensilsCrossed, Plus, Search, AlertTriangle, Check, Trash2, Edit, Loader2,
    Package, ShoppingBag, ArrowUpDown, ChevronRight, Apple, Minus, Layers, Clock,
    Calendar, CheckCircle2, XCircle, Send, Sparkles, Filter, X, ChevronDown, Tag,
    Scale, Info, Download, FileSpreadsheet, FileText
} from 'lucide-react'
import DashboardShell from '../DashboardShell'
import { formatDateDisplay } from '@/utils/dateTimeUtils'

// ── Default Scout Pantry Categories ──
export const DEFAULT_PANTRY_CATEGORIES = [
    { id: 'rice_grains', label: 'Rice, Grains & Pulses', ar: 'رز وحبوب وبقوليات', color: 'bg-amber-50 text-amber-900 border-amber-200' },
    { id: 'pasta', label: 'Pasta & Noodles', ar: 'معكرونة وباستا', color: 'bg-yellow-50 text-yellow-900 border-yellow-200' },
    { id: 'dairy_milk', label: 'Milk & Dairy', ar: 'حليب ومشتقاته', color: 'bg-blue-50 text-blue-900 border-blue-200' },
    { id: 'salt_baking', label: 'Salt, Sugar & Flour', ar: 'ملح وسكر وطحين', color: 'bg-slate-100 text-slate-900 border-slate-300' },
    { id: 'canned_goods', label: 'Canned Goods & Legumes', ar: 'معلبات وبقوليات', color: 'bg-emerald-50 text-emerald-900 border-emerald-200' },
    { id: 'breakfast_spreads', label: 'Breakfast, Spreads & Jam', ar: 'ترويقة ومربى وحلاوة', color: 'bg-orange-50 text-orange-900 border-orange-200' },
    { id: 'spices_condiments', label: 'Spices, Salt & Sauces', ar: 'بهارات وملح وصلصات', color: 'bg-rose-50 text-rose-900 border-rose-200' },
    { id: 'oils_fats', label: 'Cooking & Olive Oils', ar: 'زيوت وسمنة', color: 'bg-amber-50 text-amber-900 border-amber-200' },
    { id: 'beverages_tea', label: 'Tea, Coffee & Beverages', ar: 'شاي وقهوة ومشروبات', color: 'bg-purple-50 text-purple-900 border-purple-200' },
    { id: 'consumables_hygiene', label: 'Cleaning, Bags & Foil', ar: 'منظفات وأكياس وسانيتا', color: 'bg-cyan-50 text-cyan-900 border-cyan-200' },
    { id: 'other', label: 'Other Consumables', ar: 'أخرى / متنوع', color: 'bg-slate-50 text-slate-900 border-slate-200' },
]

export interface PantryBatch {
    id: string
    quantity: number
    package_size?: string      // e.g. "400g", "750g", "900g", "1kg", "500g", "300g", "5L", "sachet"
    brand?: string             // e.g. "Nido", "Klim", "Carry", "Pasta Zara", "Arbella"
    expiry_date: string        // e.g. "2027-06-30" or "06/2027"
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

// ── Smart Aggregator for Total Weight (kg/g), Volume (L/ml), Sachets, Pieces ──
export function computeTotalWeightOrVolume(batches?: PantryBatch[] | null): string | null {
    if (!batches || batches.length === 0) return null

    let totalGrams = 0
    let hasGrams = false
    let totalLiters = 0
    let hasLiters = false
    let totalSachets = 0
    let hasSachets = false
    let totalPieces = 0
    let hasPieces = false

    batches.forEach((b) => {
        const qty = Number(b.quantity) || 1
        const raw = (b.package_size || '').trim().toLowerCase()
        if (!raw) return

        // 1. Check for sachets / bags / tea bags (e.g. "25 sachets", "60 sachets", "100 bags")
        const sachetMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:sachet|sachets|bag|bags|tea\s*bag|tea\s*bags|enveloppe|enveloppes)/i)
        if (sachetMatch) {
            totalSachets += parseFloat(sachetMatch[1]) * qty
            hasSachets = true
            return
        }

        // 2. Check for kg (e.g. "1kg", "1.5kg", "2 kg (Indian Basmati)", "5kg (American)", "1kg (Fine)")
        const kgMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo|kilogram|kilograms|kilos)\b/i)
        if (kgMatch) {
            totalGrams += parseFloat(kgMatch[1]) * 1000 * qty
            hasGrams = true
            return
        }

        // 3. Check for grams (e.g. "500g Strawberry", "900g (Fine)", "500g (Coarse)", "185g", "750g Mango", "400g")
        const gMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:g|gm|gms|gram|grams)\b/i)
        if (gMatch) {
            totalGrams += parseFloat(gMatch[1]) * qty
            hasGrams = true
            return
        }

        // 4. Check for liters (e.g. "3l", "1.8l", "0.85l", "5 l", "1.5 liters")
        const lMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:l|liter|liters|litre|litres)\b/i)
        if (lMatch) {
            totalLiters += parseFloat(lMatch[1]) * qty
            hasLiters = true
            return
        }

        // 5. Check for ml (e.g. "750ml", "500ml", "250 ml")
        const mlMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:ml|milliliter|milliliters)\b/i)
        if (mlMatch) {
            totalLiters += (parseFloat(mlMatch[1]) / 1000) * qty
            hasLiters = true
            return
        }

        // 6. Check for pieces / portions (e.g. "12 pieces", "6 portions")
        const pcsMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:pcs|piece|pieces|portion|portions)\b/i)
        if (pcsMatch) {
            totalPieces += parseFloat(pcsMatch[1]) * qty
            hasPieces = true
            return
        }
    })

    if (hasSachets && totalSachets > 0) {
        const formatted = Number.isInteger(totalSachets) ? totalSachets.toLocaleString() : totalSachets.toFixed(1)
        return `${formatted} sachets`
    }

    if (hasGrams && totalGrams > 0) {
        if (totalGrams >= 1000) {
            const kgVal = totalGrams / 1000
            const formatted = Number.isInteger(kgVal) ? kgVal.toString() : kgVal.toFixed(2).replace(/\.?0+$/, '')
            return `${formatted} kg`
        }
        return `${Math.round(totalGrams)} g`
    }

    if (hasLiters && totalLiters > 0) {
        const formatted = Number.isInteger(totalLiters) ? totalLiters.toString() : totalLiters.toFixed(2).replace(/\.?0+$/, '')
        return `${formatted} L`
    }

    if (hasPieces && totalPieces > 0) {
        const formatted = Number.isInteger(totalPieces) ? totalPieces.toLocaleString() : totalPieces.toFixed(1)
        return `${formatted} pcs`
    }

    return null
}

// ── Fast Expiry Date Parser Utility ──
export function parseExpiryInput(input: string): string {
    if (!input) return ''
    const trimmed = input.trim()

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed
    }

    const mmYyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{2})$/)
    if (mmYyMatch) {
        const month = parseInt(mmYyMatch[1], 10)
        const year = 2000 + parseInt(mmYyMatch[2], 10)
        if (month >= 1 && month <= 12) {
            const lastDay = new Date(year, month, 0).getDate()
            return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
        }
    }

    const mmYyyyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{4})$/)
    if (mmYyyyMatch) {
        const month = parseInt(mmYyyyMatch[1], 10)
        const year = parseInt(mmYyyyMatch[2], 10)
        if (month >= 1 && month <= 12) {
            const lastDay = new Date(year, month, 0).getDate()
            return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
        }
    }

    return trimmed
}

// Formats an ISO date into clean "MM/YY" for scout display
export function formatExpiryShort(dateStr?: string | null): string {
    if (!dateStr) return '—'
    const parsed = new Date(dateStr)
    if (isNaN(parsed.getTime())) return dateStr
    const mm = String(parsed.getMonth() + 1).padStart(2, '0')
    const yy = String(parsed.getFullYear()).slice(-2)
    return `${mm}/${yy}`
}

function normalizePantryItem(item: PantryItem): PantryItem {
    let batches: PantryBatch[] = []
    if (item.expiry_batches && Array.isArray(item.expiry_batches) && item.expiry_batches.length > 0) {
        batches = item.expiry_batches.map((b, idx) => ({
            id: b.id || `b_${item.id}_${idx}`,
            quantity: Number(b.quantity) || 1,
            package_size: b.package_size || '',
            brand: b.brand || '',
            expiry_date: b.expiry_date || '',
            lot_number: b.lot_number || `Lot #${idx + 1}`,
            notes: b.notes || '',
        }))
    } else if (item.expiry_date || item.quantity_available) {
        batches = [
            {
                id: 'b_' + item.id,
                quantity: Number(item.quantity_available) || 1,
                package_size: '',
                brand: '',
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

    // Dynamic Categories State
    const [customCategories, setCustomCategories] = useState<Array<{ id: string; label: string; ar?: string; color: string }>>([])
    const [categorySearchQuery, setCategorySearchQuery] = useState('')
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false)
    const categoryDropdownRef = useRef<HTMLDivElement>(null)

    // Export Dropdown State
    const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false)
    const exportDropdownRef = useRef<HTMLDivElement>(null)

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<PantryItem | null>(null)
    const [formName, setFormName] = useState('')
    const [formCategory, setFormCategory] = useState('rice_grains')
    const [formQuantity, setFormQuantity] = useState('1')
    const [formUnit, setFormUnit] = useState('cans')
    const [formMinThreshold, setFormMinThreshold] = useState('2')
    const [formExpiryDate, setFormExpiryDate] = useState('')
    const [formBatches, setFormBatches] = useState<PantryBatch[]>([])
    const [formLocation, setFormLocation] = useState('Pantry Shelf A')
    const [formNotes, setFormNotes] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Request filters
    const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'pending' | 'approved'>('all')

    // Permissions
    const isGroupAdmin = ['chef_groupe', 'assistant_chef_groupe', 'configurator'].includes(currentRole)
    const isProvisionsLeader = currentRole === 'amin_mounet_group' || currentRole === 'mas2oul_mounet' || isGroupAdmin

    // Close category and export dropdowns on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
                setIsCategoryDropdownOpen(false)
            }
            if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
                setIsExportDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const showStatus = (text: string, type: 'success' | 'error') => {
        setStatusMessage({ text, type })
        setTimeout(() => setStatusMessage(null), 6000)
    }

    // ── Derive All Available Categories ──
    const allCategories = useMemo(() => {
        const map = new Map<string, { id: string; label: string; ar?: string; color: string }>()

        DEFAULT_PANTRY_CATEGORIES.forEach((c) => map.set(c.id, c))

        pantryList.forEach((item) => {
            if (item.category && !map.has(item.category)) {
                const cleanLabel = item.category
                    .split('_')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ')
                map.set(item.category, {
                    id: item.category,
                    label: cleanLabel,
                    color: 'bg-teal-50 text-teal-900 border-teal-200',
                })
            }
        })

        customCategories.forEach((c) => map.set(c.id, c))

        return Array.from(map.values())
    }, [pantryList, customCategories])

    const filteredCategoryOptions = useMemo(() => {
        if (!categorySearchQuery.trim()) return allCategories
        const q = categorySearchQuery.toLowerCase()
        return allCategories.filter(
            (c) =>
                c.label.toLowerCase().includes(q) ||
                c.id.toLowerCase().includes(q) ||
                (c.ar && c.ar.includes(q))
        )
    }, [allCategories, categorySearchQuery])

    const handleCreateCustomCategory = (nameToCreate: string) => {
        const trimmed = nameToCreate.trim()
        if (!trimmed) return
        const newId = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_')
        const newCategoryObj = {
            id: newId,
            label: trimmed,
            color: 'bg-indigo-50 text-indigo-900 border-indigo-200',
        }
        setCustomCategories((prev) => [...prev.filter((c) => c.id !== newId), newCategoryObj])
        setFormCategory(newId)
        setCategorySearchQuery('')
        setIsCategoryDropdownOpen(false)
        showStatus(`Category "${trimmed}" added!`, 'success')
    }

    // ── Batch Handlers ──
    const handleAddBatch = () => {
        const newBatch: PantryBatch = {
            id: 'batch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            quantity: 1,
            package_size: '400g',
            brand: '',
            expiry_date: '',
            lot_number: `Lot #${formBatches.length + 1}`,
        }
        setFormBatches((prev) => [...prev, newBatch])
    }

    const handleRemoveBatch = (batchId: string) => {
        setFormBatches((prev) => prev.filter((b) => b.id !== batchId))
    }

    const handleUpdateBatch = (batchId: string, field: keyof PantryBatch, val: any) => {
        setFormBatches((prev) =>
            prev.map((b) => {
                if (b.id !== batchId) return b
                if (field === 'expiry_date') {
                    return { ...b, expiry_date: parseExpiryInput(val) }
                }
                return { ...b, [field]: val }
            })
        )
    }

    // ── Modal Open Handlers ──
    const handleOpenCreateModal = () => {
        setEditingItem(null)
        setFormName('')
        setFormCategory('rice_grains')
        setFormQuantity('1')
        setFormUnit('cans')
        setFormMinThreshold('2')
        setFormExpiryDate('')
        setFormLocation('Pantry Shelf A')
        setFormNotes('')
        setFormBatches([
            {
                id: 'batch_' + Date.now(),
                quantity: 1,
                package_size: '400g',
                brand: '',
                expiry_date: '',
                lot_number: 'Batch #1',
            }
        ])
        setCategorySearchQuery('')
        setIsCategoryDropdownOpen(false)
        setIsModalOpen(true)
    }

    const handleOpenEditModal = (item: PantryItem) => {
        setEditingItem(item)
        setFormName(item.name)
        setFormCategory(item.category)
        setFormQuantity(String(item.quantity_available))
        setFormUnit(item.unit || 'cans')
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
                        package_size: '',
                        brand: '',
                        expiry_date: item.expiry_date || '',
                        lot_number: 'Batch #1',
                    }
                ]
        )
        setCategorySearchQuery('')
        setIsCategoryDropdownOpen(false)
        setIsModalOpen(true)
    }

    // ── Save Form (POST / PUT) ──
    const handleSavePantryItem = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formName.trim()) {
            showStatus('Please enter an item name.', 'error')
            return
        }

        setIsSubmitting(true)
        const qty = parseFloat(formQuantity) || 0
        const minThresh = parseFloat(formMinThreshold) || 0

        let finalQty = qty
        let finalExpiry = parseExpiryInput(formExpiryDate) || null

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
                    const safePayload = { ...payload }
                    delete safePayload.expiry_batches
                    if (formBatches.length > 0) {
                        const batchNote = `[Batches: ${formBatches.map(b => `${b.quantity}x ${b.brand ? b.brand + ' ' : ''}${b.package_size ? b.package_size + ' ' : ''}exp ${b.expiry_date}`).join(', ')}]`
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
                showStatus(`Updated "${data.name}" successfully!`, 'success')
            } else {
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
                    const safePayload = { ...payload }
                    delete safePayload.expiry_batches
                    if (formBatches.length > 0) {
                        const batchNote = `[Batches: ${formBatches.map(b => `${b.quantity}x ${b.brand ? b.brand + ' ' : ''}${b.package_size ? b.package_size + ' ' : ''}exp ${b.expiry_date}`).join(', ')}]`
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
                showStatus(`Added "${data.name}" to Group Pantry!`, 'success')
            }
            setIsModalOpen(false)
        } catch (err: any) {
            showStatus(err.message || 'Error saving item.', 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    // ── Delete Item ──
    const handleDeletePantryItem = async (itemId: string, itemName: string) => {
        if (!isProvisionsLeader) return
        if (!confirm(`Are you sure you want to delete "${itemName}" from the pantry?`)) return

        setPantryList((prev) => prev.filter((i) => i.id !== itemId))

        const { error } = await supabase
            .from('group_pantry_items')
            .update({ is_deleted: true })
            .eq('id', itemId)

        if (error) {
            showStatus('Failed to delete item from database.', 'error')
        } else {
            showStatus(`"${itemName}" deleted.`, 'success')
        }
    }

    // ── Requests Approvals ──
    const handleApproveRequest = async (req: EventPantryRequest) => {
        if (!isProvisionsLeader) return
        setIsSubmitting(true)
        try {
            const { error: reqErr } = await supabase
                .from('event_pantry_requests')
                .update({ status: 'approved', approved_by: userId })
                .eq('id', req.id)
            if (reqErr) throw reqErr

            const pantryItem = pantryList.find((p) => p.id === req.pantry_item_id)
            if (pantryItem) {
                const newQty = Math.max(0, (pantryItem.quantity_available || 0) - req.quantity)
                await supabase.from('group_pantry_items').update({ quantity_available: newQty }).eq('id', pantryItem.id)
                setPantryList((prev) => prev.map((p) => (p.id === pantryItem.id ? { ...p, quantity_available: newQty } : p)))
            }

            setRequestsList((prev) => prev.map((r) => (r.id === req.id ? { ...r, status: 'approved' } : r)))
            showStatus(`Approved provision transfer for ${req.events?.title || 'Camp'}.`, 'success')
        } catch (err: any) {
            showStatus(err.message || 'Failed to approve request.', 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleRejectRequest = async (req: EventPantryRequest) => {
        if (!isProvisionsLeader) return
        setIsSubmitting(true)
        try {
            const { error: reqErr } = await supabase
                .from('event_pantry_requests')
                .update({ status: 'rejected' })
                .eq('id', req.id)
            if (reqErr) throw reqErr

            setRequestsList((prev) => prev.map((r) => (r.id === req.id ? { ...r, status: 'rejected' } : r)))
            showStatus(`Declined request.`, 'success')
        } catch (err: any) {
            showStatus(err.message || 'Failed to decline request.', 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    // ── Excel (.xlsx) Multi-Sheet Export ──
    const handleExportExcel = () => {
        try {
            const wb = XLSX.utils.book_new()

            // 1. Sheet 1: Detailed Lots & Packages Breakdown
            const detailedRows: any[] = []
            pantryList.forEach((item) => {
                const catObj = getCategoryObj(item.category)
                const batches = item.expiry_batches || []
                const totalCalculated = computeTotalWeightOrVolume(batches)

                if (batches.length > 0) {
                    batches.forEach((b) => {
                        let status = '🟢 OK'
                        if (b.expiry_date) {
                            const days = (new Date(b.expiry_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24)
                            if (days < 0) status = '🔴 Expired'
                            else if (days <= 45) status = '🟡 Expiring Soon'
                        }
                        detailedRows.push({
                            'Category': catObj.label,
                            'Product Name': item.name,
                            'Brand / Subtype': b.brand || '—',
                            'Format / Size': b.package_size || '—',
                            'Quantity': b.quantity,
                            'Unit': item.unit,
                            'Product Total Weight/Vol': totalCalculated || '—',
                            'Expiry Date': b.expiry_date || '—',
                            'Expiry (Short)': formatExpiryShort(b.expiry_date),
                            'Freshness Status': status,
                            'Storage Location': item.location_stored || '—',
                            'Lot Note': b.lot_number || b.notes || '—',
                        })
                    })
                } else {
                    detailedRows.push({
                        'Category': catObj.label,
                        'Product Name': item.name,
                        'Brand / Subtype': '—',
                        'Format / Size': '—',
                        'Quantity': item.quantity_available,
                        'Unit': item.unit,
                        'Product Total Weight/Vol': '—',
                        'Expiry Date': item.expiry_date || '—',
                        'Expiry (Short)': formatExpiryShort(item.expiry_date),
                        'Freshness Status': '🟢 OK',
                        'Storage Location': item.location_stored || '—',
                        'Lot Note': item.notes || '—',
                    })
                }
            })

            const wsDetailed = XLSX.utils.json_to_sheet(detailedRows)
            wsDetailed['!cols'] = [
                { wch: 24 }, // Category
                { wch: 30 }, // Product Name
                { wch: 20 }, // Brand
                { wch: 20 }, // Format / Size
                { wch: 10 }, // Quantity
                { wch: 10 }, // Unit
                { wch: 22 }, // Total Weight/Vol
                { wch: 14 }, // Expiry Date
                { wch: 14 }, // Expiry Short
                { wch: 18 }, // Status
                { wch: 18 }, // Location
                { wch: 24 }, // Notes
            ]
            XLSX.utils.book_append_sheet(wb, wsDetailed, 'Detailed Stock (Lots)')

            // 2. Sheet 2: Summary by Product & Category
            const summaryRows = pantryList.map((item) => {
                const catObj = getCategoryObj(item.category)
                const batchesCount = item.expiry_batches?.length || 1
                const totalWeightVol = computeTotalWeightOrVolume(item.expiry_batches)
                const isLow = (item.quantity_available || 0) <= (item.min_threshold || 0)
                return {
                    'Category': catObj.label,
                    'Product Name': item.name,
                    'Total Available Stock': item.quantity_available,
                    'Unit': item.unit,
                    'Total Weight / Volume': totalWeightVol || '—',
                    'Number of Lots': batchesCount,
                    'Earliest Expiry': item.expiry_date || '—',
                    'Stock Level': isLow ? '⚠️ Low Stock' : '✅ Sufficient',
                    'Min Threshold': item.min_threshold || 0,
                    'Storage Location': item.location_stored || '—',
                    'Notes': item.notes || '—',
                }
            })
            const wsSummary = XLSX.utils.json_to_sheet(summaryRows)
            wsSummary['!cols'] = [
                { wch: 24 }, // Category
                { wch: 30 }, // Product Name
                { wch: 20 }, // Total Stock
                { wch: 10 }, // Unit
                { wch: 22 }, // Total Weight/Vol
                { wch: 14 }, // Lots
                { wch: 16 }, // Earliest Expiry
                { wch: 16 }, // Level
                { wch: 14 }, // Min Threshold
                { wch: 18 }, // Location
                { wch: 28 }, // Notes
            ]
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary by Product')

            const today = new Date().toISOString().split('T')[0]
            const filename = `${groupName.replace(/[^a-zA-Z0-9_-]/g, '_')}_Pantry_Inventory_${today}.xlsx`
            XLSX.writeFile(wb, filename)
            setIsExportDropdownOpen(false)
            showStatus('Excel workbook exported successfully!', 'success')
        } catch (err: any) {
            showStatus(err.message || 'Failed to export Excel file.', 'error')
        }
    }

    // ── CSV Export with UTF-8 BOM for Arabic Support ──
    const handleExportCSV = () => {
        try {
            const headers = ['Category', 'Product Name', 'Brand', 'Format / Size', 'Quantity', 'Unit', 'Total Weight/Vol', 'Expiry Date', 'Location', 'Notes']
            const rows: string[][] = []

            pantryList.forEach((item) => {
                const catObj = getCategoryObj(item.category)
                const batches = item.expiry_batches || []
                const totalCalculated = computeTotalWeightOrVolume(batches) || ''

                if (batches.length > 0) {
                    batches.forEach((b) => {
                        rows.push([
                            catObj.label,
                            item.name,
                            b.brand || '',
                            b.package_size || '',
                            String(b.quantity),
                            item.unit,
                            totalCalculated,
                            b.expiry_date || '',
                            item.location_stored || '',
                            b.lot_number || b.notes || item.notes || '',
                        ])
                    })
                } else {
                    rows.push([
                        catObj.label,
                        item.name,
                        '',
                        '',
                        String(item.quantity_available),
                        item.unit,
                        '',
                        item.expiry_date || '',
                        item.location_stored || '',
                        item.notes || '',
                    ])
                }
            })

            const csvContent = '\uFEFF' + [headers, ...rows]
                .map((row) => row.map((cell) => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
                .join('\r\n')

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            const today = new Date().toISOString().split('T')[0]
            link.setAttribute('href', url)
            link.setAttribute('download', `${groupName.replace(/[^a-zA-Z0-9_-]/g, '_')}_Pantry_${today}.csv`)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            setIsExportDropdownOpen(false)
            showStatus('CSV file exported successfully!', 'success')
        } catch (err: any) {
            showStatus(err.message || 'Failed to export CSV.', 'error')
        }
    }

    // ── Group Requests by Event / Camp ──
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

    const pendingRequestsCount = useMemo(
        () => requestsList.filter((r) => r.status === 'requested').length,
        [requestsList]
    )

    // ── Filtered Inventory List ──
    const filteredPantry = useMemo(() => {
        return pantryList.filter((item) => {
            if (selectedCategory !== 'all' && item.category !== selectedCategory) return false

            const isLow = (item.quantity_available || 0) <= (item.min_threshold || 0)
            if (filterLowStockOnly && !isLow) return false

            if (filterExpiringSoonOnly) {
                if (!item.expiry_date) return false
                const expDate = new Date(item.expiry_date)
                const now = new Date()
                const daysDiff = (expDate.getTime() - now.getTime()) / (1000 * 3600 * 24)
                if (daysDiff > 45) return false
            }

            if (search.trim()) {
                const q = search.toLowerCase()
                const matchName = (item.name || '').toLowerCase().includes(q)
                const matchLocation = (item.location_stored || '').toLowerCase().includes(q)
                const matchNotes = (item.notes || '').toLowerCase().includes(q)
                const matchBatches = (item.expiry_batches || []).some(
                    (b) =>
                        (b.brand && b.brand.toLowerCase().includes(q)) ||
                        (b.package_size && b.package_size.toLowerCase().includes(q)) ||
                        (b.lot_number && b.lot_number.toLowerCase().includes(q))
                )
                if (!matchName && !matchLocation && !matchNotes && !matchBatches) return false
            }

            return true
        })
    }, [pantryList, selectedCategory, filterLowStockOnly, filterExpiringSoonOnly, search])

    const lowStockCount = useMemo(
        () => pantryList.filter((i) => (i.quantity_available || 0) <= (i.min_threshold || 0)).length,
        [pantryList]
    )

    const expiringSoonCount = useMemo(() => {
        const now = new Date()
        return pantryList.filter((i) => {
            if (!i.expiry_date) return false
            const exp = new Date(i.expiry_date)
            return (exp.getTime() - now.getTime()) / (1000 * 3600 * 24) <= 45
        }).length
    }, [pantryList])

    const totalPackagesCount = useMemo(() => {
        return pantryList.reduce((acc, item) => acc + (Number(item.quantity_available) || 0), 0)
    }, [pantryList])

    const getCategoryObj = (catId: string) => {
        return allCategories.find((c) => c.id === catId) || {
            id: catId,
            label: catId.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            color: 'bg-slate-100 text-slate-800 border-slate-200',
        }
    }

    return (
        <DashboardShell
            groupName={groupName}
            currentRole={currentRole}
            userName={userName}
        >
            <div className="w-full pb-24 space-y-3">
                {/* Status Toast */}
                {statusMessage && (
                    <div
                        className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-2xs animate-in fade-in ${
                            statusMessage.type === 'success'
                                ? 'bg-teal-900 text-white'
                                : 'bg-rose-600 text-white'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            {statusMessage.type === 'success' ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                            ) : (
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                            )}
                            <span>{statusMessage.text}</span>
                        </div>
                        <button
                            onClick={() => setStatusMessage(null)}
                            className="opacity-70 hover:opacity-100"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* ── TOP HEADER CARD (Unified Minimalist Standard) ── */}
                <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-row items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0 shadow-2xs">
                            <UtensilsCrossed className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight truncate">
                                Provisions & Central Pantry (المؤونة)
                            </h1>
                            <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                                {totalPackagesCount} items stocked • {pantryList.length} unique products
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {/* Export Dropdown */}
                        <div className="relative" ref={exportDropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                                className="bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold px-2.5 sm:px-3 py-1.5 rounded-xl text-xs border border-slate-300 transition-all flex items-center gap-1 shadow-2xs"
                                title="Export pantry stock to Excel or CSV"
                            >
                                <Download className="h-3.5 w-3.5 text-teal-800" />
                                <span className="hidden sm:inline">Export</span>
                                <ChevronDown className="h-3 w-3 opacity-60" />
                            </button>

                            {isExportDropdownOpen && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-1.5 space-y-1 animate-in fade-in">
                                    <button
                                        type="button"
                                        onClick={handleExportExcel}
                                        className="w-full text-left p-2 rounded-xl hover:bg-emerald-50 hover:text-emerald-900 text-slate-800 text-xs font-bold flex items-center gap-2 transition-colors"
                                    >
                                        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                        <div>
                                            <span className="block leading-tight">Excel Workbook</span>
                                            <span className="text-[9px] text-slate-400 font-normal">.xlsx with multi-sheets</span>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleExportCSV}
                                        className="w-full text-left p-2 rounded-xl hover:bg-teal-50 hover:text-teal-900 text-slate-800 text-xs font-bold flex items-center gap-2 transition-colors"
                                    >
                                        <FileText className="h-4 w-4 text-teal-600" />
                                        <div>
                                            <span className="block leading-tight">Standard CSV</span>
                                            <span className="text-[9px] text-slate-400 font-normal">.csv (UTF-8 Arabic)</span>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>

                        {isProvisionsLeader && (
                            <button
                                onClick={handleOpenCreateModal}
                                className="bg-teal-800 hover:bg-teal-700 active:scale-95 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-2xs transition-all flex items-center gap-1"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>+ Add Item</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* ── SEGMENTED VIEW BAR: INVENTORY vs CAMP REQUESTS ── */}
                {requestsList.length > 0 && (
                    <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-2xs">
                        <button
                            onClick={() => setActiveView('inventory')}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                activeView === 'inventory'
                                    ? 'bg-white text-teal-900 shadow-xs font-black'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Package className="h-3.5 w-3.5" />
                            <span>Central Inventory ({pantryList.length})</span>
                        </button>

                        <button
                            onClick={() => setActiveView('requests')}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                activeView === 'requests'
                                    ? 'bg-white text-teal-900 shadow-xs font-black'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <span>⛺ Camp Requests</span>
                            {pendingRequestsCount > 0 && (
                                <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
                                    {pendingRequestsCount}
                                </span>
                            )}
                        </button>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════
                    VIEW 1: CENTRAL PANTRY INVENTORY
                ══════════════════════════════════════════════════════════ */}
                {activeView === 'inventory' && (
                    <>
                        {/* ── SUMMARY KPIS ── */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 shadow-2xs text-center">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Stock</span>
                                <span className="text-sm sm:text-base font-black text-slate-900">{totalPackagesCount} pkgs</span>
                            </div>

                            <button
                                onClick={() => {
                                    setFilterLowStockOnly(!filterLowStockOnly)
                                    setFilterExpiringSoonOnly(false)
                                }}
                                className={`p-2.5 sm:p-3 rounded-2xl border shadow-2xs text-center transition-all ${
                                    filterLowStockOnly
                                        ? 'bg-amber-500 text-white border-amber-600'
                                        : 'bg-white text-slate-900 border-slate-200/90 hover:border-amber-400'
                                }`}
                            >
                                <span className={`text-[10px] font-bold uppercase block ${filterLowStockOnly ? 'text-amber-100' : 'text-slate-500'}`}>
                                    Low Stock
                                </span>
                                <span className="text-sm sm:text-base font-black">
                                    {lowStockCount} items
                                </span>
                            </button>

                            <button
                                onClick={() => {
                                    setFilterExpiringSoonOnly(!filterExpiringSoonOnly)
                                    setFilterLowStockOnly(false)
                                }}
                                className={`p-2.5 sm:p-3 rounded-2xl border shadow-2xs text-center transition-all ${
                                    filterExpiringSoonOnly
                                        ? 'bg-rose-600 text-white border-rose-700'
                                        : 'bg-white text-slate-900 border-slate-200/90 hover:border-rose-400'
                                }`}
                            >
                                <span className={`text-[10px] font-bold uppercase block ${filterExpiringSoonOnly ? 'text-rose-100' : 'text-slate-500'}`}>
                                    Expiring Soon
                                </span>
                                <span className="text-sm sm:text-base font-black">
                                    {expiringSoonCount} items
                                </span>
                            </button>
                        </div>

                        {/* ── SEARCH & DYNAMIC CATEGORY FILTER BAR ── */}
                        <div className="bg-white border border-slate-200/90 p-2.5 sm:p-3 rounded-2xl shadow-2xs space-y-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name, brand (Nido, Klim, Bahar), size (400g, 900g, 1kg), shelf…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-8 pr-3 py-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium focus:border-teal-700 focus:outline-none"
                                />
                            </div>

                            {/* Dynamic Category Chips (Mobile Horizontal Scrollable) */}
                            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
                                <button
                                    onClick={() => setSelectedCategory('all')}
                                    className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 transition-all ${
                                        selectedCategory === 'all'
                                            ? 'bg-teal-800 text-white shadow-2xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    All ({pantryList.length})
                                </button>
                                {allCategories.map((cat) => {
                                    const count = pantryList.filter((i) => i.category === cat.id).length
                                    if (count === 0 && selectedCategory !== cat.id) return null
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setSelectedCategory(cat.id)}
                                            className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1 ${
                                                selectedCategory === cat.id
                                                    ? 'bg-teal-800 text-white shadow-2xs'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            <span>{cat.label}</span>
                                            <span className="opacity-75">({count})</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* ── PANTRY ITEMS GRID / LIST ── */}
                        {filteredPantry.length === 0 ? (
                            <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center space-y-3 shadow-2xs">
                                <UtensilsCrossed className="h-10 w-10 text-slate-300 mx-auto" />
                                <div>
                                    <h3 className="text-sm font-bold text-slate-700">No pantry items found</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Add your first provision item with brands, sizes, and expiry dates.
                                    </p>
                                </div>
                                {isProvisionsLeader && (
                                    <button
                                        onClick={handleOpenCreateModal}
                                        className="bg-teal-800 hover:bg-teal-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-2xs inline-flex items-center gap-1.5 active:scale-95"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>Add New Item</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {filteredPantry.map((item) => {
                                    const catCfg = getCategoryObj(item.category)
                                    const isLow = (item.quantity_available || 0) <= (item.min_threshold || 0)
                                    const batches = item.expiry_batches || []
                                    const computedTotal = computeTotalWeightOrVolume(batches)

                                    return (
                                        <div
                                            key={item.id}
                                            className={`bg-white border rounded-2xl p-3.5 shadow-2xs transition-all space-y-2.5 flex flex-col justify-between ${
                                                isLow ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200/90'
                                            }`}
                                        >
                                            <div className="space-y-1.5">
                                                {/* Top Category Badge + Shelf Location */}
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${catCfg.color}`}>
                                                        {catCfg.label}
                                                    </span>
                                                    {item.location_stored && (
                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                            📍 {item.location_stored}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Item Title & Stock Display (Dual Unit: Count + Weight/Volume) */}
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                                                            {item.name}
                                                        </h3>
                                                        {item.notes && (
                                                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                                                {item.notes}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Quantity + Weight / Volume Badge */}
                                                    <div className="text-right shrink-0">
                                                        <div className="flex items-baseline justify-end gap-1.5 flex-wrap">
                                                            <span className="text-sm sm:text-base font-black text-teal-950">
                                                                {item.quantity_available} {item.unit}
                                                            </span>
                                                            {computedTotal && (
                                                                <span className="text-[11px] sm:text-xs font-black px-2 py-0.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200/80">
                                                                    {computedTotal}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {isLow && (
                                                            <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-md inline-block mt-0.5">
                                                                Low Stock
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* ── BATCHES & GRAMMAGE BREAKDOWN CHIPS ── */}
                                                {batches.length > 0 && (
                                                    <div className="space-y-1 pt-1">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                                                            Package Lots ({batches.length}):
                                                        </span>
                                                        <div className="flex flex-wrap gap-1">
                                                            {batches.map((b, bIdx) => (
                                                                <span
                                                                    key={b.id || bIdx}
                                                                    className="text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-2xs"
                                                                >
                                                                    <span className="font-black text-teal-900">x{b.quantity}</span>
                                                                    {b.brand && <span className="font-bold">{b.brand}</span>}
                                                                    {b.package_size && (
                                                                        <span className="bg-amber-100 text-amber-900 px-1 py-0.1 rounded font-black text-[9px]">
                                                                            {b.package_size}
                                                                        </span>
                                                                    )}
                                                                    {b.expiry_date && (
                                                                        <span className="text-slate-500 font-mono text-[9px]">
                                                                            ({formatExpiryShort(b.expiry_date)})
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Strip: Edit & Delete (No +- stepper) */}
                                            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">
                                                {isProvisionsLeader && (
                                                    <>
                                                        <button
                                                            onClick={() => handleOpenEditModal(item)}
                                                            className="p-1.5 text-slate-600 hover:text-teal-800 hover:bg-teal-50 rounded-lg transition-colors"
                                                            title="Edit item & batches"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeletePantryItem(item.id, item.name)}
                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title="Delete item"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* ══════════════════════════════════════════════════════════
                    VIEW 2: CAMP PANTRY REQUESTS
                ══════════════════════════════════════════════════════════ */}
                {activeView === 'requests' && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                            <button
                                onClick={() => setRequestStatusFilter('all')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    requestStatusFilter === 'all'
                                        ? 'bg-teal-800 text-white shadow-2xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                All ({requestsList.length})
                            </button>
                            <button
                                onClick={() => setRequestStatusFilter('pending')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    requestStatusFilter === 'pending'
                                        ? 'bg-amber-600 text-white shadow-2xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                Pending ({pendingRequestsCount})
                            </button>
                            <button
                                onClick={() => setRequestStatusFilter('approved')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    requestStatusFilter === 'approved'
                                        ? 'bg-emerald-700 text-white shadow-2xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                Approved ({requestsList.length - pendingRequestsCount})
                            </button>
                        </div>

                        {groupedRequestsByEvent.length === 0 ? (
                            <div className="bg-white p-8 text-center text-slate-400 space-y-2 rounded-2xl border border-slate-200 shadow-2xs">
                                <Send className="h-8 w-8 mx-auto opacity-40" />
                                <p className="font-bold text-slate-700 text-sm">No transfer requests match this filter.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {groupedRequestsByEvent.map((group) => (
                                    <div
                                        key={group.eventId}
                                        className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden"
                                    >
                                        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <h4 className="font-black text-slate-900 text-xs sm:text-sm truncate">
                                                    ⛺ {group.eventTitle}
                                                </h4>
                                                <p className="text-[10px] text-slate-500 truncate">
                                                    By {group.requesterName} • {group.items.length} requested items
                                                </p>
                                            </div>
                                            {group.pendingCount > 0 ? (
                                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
                                                    {group.pendingCount} Pending
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-200 shrink-0">
                                                    ✓ Approved
                                                </span>
                                            )}
                                        </div>

                                        <div className="divide-y divide-slate-100 p-2 space-y-1">
                                            {group.items.map((req) => (
                                                <div
                                                    key={req.id}
                                                    className="p-2.5 rounded-xl flex items-center justify-between gap-2 hover:bg-slate-50"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-black text-slate-800 truncate">
                                                            {req.group_pantry_items?.name || 'Item'}
                                                        </p>
                                                        <p className="text-[10px] text-slate-500">
                                                            Requested: <strong>{req.quantity} {req.unit}</strong>
                                                        </p>
                                                    </div>

                                                    {req.status === 'requested' && isProvisionsLeader ? (
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                                onClick={() => handleRejectRequest(req)}
                                                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-lg text-xs font-bold transition-all"
                                                            >
                                                                Decline
                                                            </button>
                                                            <button
                                                                onClick={() => handleApproveRequest(req)}
                                                                className="px-2.5 py-1 bg-teal-800 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
                                                            >
                                                                Approve
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 capitalize">
                                                            {req.status}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════
                    MODAL: ADD / EDIT PANTRY ITEM & MULTI-BATCHES
                ══════════════════════════════════════════════════════════ */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs overflow-y-auto">
                        <div className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-5 shadow-2xl border border-slate-200 space-y-3.5 max-h-[92vh] overflow-y-auto my-auto animate-in fade-in">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <div className="flex items-center gap-2">
                                    <UtensilsCrossed className="h-4 w-4 text-teal-800" />
                                    <h3 className="text-sm font-black text-slate-900">
                                        {editingItem ? 'Edit Provision Item' : 'Add Pantry Item (المؤونة)'}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                                >
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={handleSavePantryItem} className="space-y-3">
                                {/* Item Name */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                                        Item Name / Product *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Powdered Milk (حليب), Salt (ملح), Farfalle Pasta, Rice…"
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        className="w-full px-3 py-1.5 text-xs sm:text-sm font-black rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-700 focus:outline-none"
                                    />
                                </div>

                                {/* Dynamic Searchable Category Selector */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div className="relative" ref={categoryDropdownRef}>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                                            Category *
                                        </label>
                                        <div
                                            onClick={() => setIsCategoryDropdownOpen(true)}
                                            className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between cursor-pointer focus-within:border-teal-700 focus-within:bg-white"
                                        >
                                            <span className="truncate">
                                                {getCategoryObj(formCategory).label}
                                            </span>
                                            <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                        </div>

                                        {/* Dropdown Popup with Search & + Create */}
                                        {isCategoryDropdownOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 space-y-1.5 max-h-56 overflow-y-auto animate-in fade-in">
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    placeholder="Search or type new category…"
                                                    value={categorySearchQuery}
                                                    onChange={(e) => setCategorySearchQuery(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault()
                                                            if (categorySearchQuery.trim()) {
                                                                handleCreateCustomCategory(categorySearchQuery)
                                                            }
                                                        }
                                                    }}
                                                    className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-700 font-medium"
                                                />

                                                <div className="space-y-0.5">
                                                    {filteredCategoryOptions.map((c) => (
                                                        <button
                                                            key={c.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setFormCategory(c.id)
                                                                setIsCategoryDropdownOpen(false)
                                                                setCategorySearchQuery('')
                                                            }}
                                                            className={`w-full text-left px-2 py-1 rounded-lg text-xs font-bold flex items-center justify-between transition-colors ${
                                                                formCategory === c.id
                                                                    ? 'bg-teal-50 text-teal-900 font-black'
                                                                    : 'hover:bg-slate-100 text-slate-700'
                                                            }`}
                                                        >
                                                            <span>{c.label}</span>
                                                            {c.ar && <span className="text-[10px] text-slate-400">{c.ar}</span>}
                                                        </button>
                                                    ))}

                                                    {/* If typed category not in list, offer + Create */}
                                                    {categorySearchQuery.trim() &&
                                                        !allCategories.some(
                                                            (c) => c.label.toLowerCase() === categorySearchQuery.trim().toLowerCase()
                                                        ) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCreateCustomCategory(categorySearchQuery)}
                                                                className="w-full text-left p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-black flex items-center gap-1.5 transition-colors mt-1"
                                                            >
                                                                <Plus className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                                                                <span>+ Create &quot;{categorySearchQuery.trim()}&quot;</span>
                                                            </button>
                                                        )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                                            Default Unit of Measure *
                                        </label>
                                        <select
                                            value={formUnit}
                                            onChange={(e) => setFormUnit(e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:border-teal-700 focus:outline-none"
                                        >
                                            <option value="cans">cans (علبة)</option>
                                            <option value="packs">packs / bags (كيس / باكيت)</option>
                                            <option value="kg">kg (Kilograms)</option>
                                            <option value="g">g (Grams)</option>
                                            <option value="bottles">bottles (قنينة)</option>
                                            <option value="jars">jars (مرطبان)</option>
                                            <option value="boxes">boxes (كرتونة)</option>
                                            <option value="pieces">pieces (حبة)</option>
                                            <option value="liters">liters (L)</option>
                                            <option value="loaves">loaves (ربطة)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                                            Storage Shelf / Depot
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Shelf A, Bin 2"
                                            value={formLocation}
                                            onChange={(e) => setFormLocation(e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 focus:border-teal-700 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                                            Low Stock Alert Level
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formMinThreshold}
                                            onChange={(e) => setFormMinThreshold(e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 focus:border-teal-700 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* ── BATCHES & GRAMMAGE LOT BUILDER ── */}
                                <div className="p-3 bg-amber-50/70 border border-amber-200/90 rounded-2xl space-y-2.5 shadow-2xs">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <Layers className="h-4 w-4 text-amber-800 shrink-0" />
                                            <div>
                                                <h4 className="text-xs font-black text-slate-900 leading-tight">
                                                    Package Lots & Formats ({formBatches.length})
                                                </h4>
                                                <span className="text-[10px] text-amber-900">
                                                    Track different brands, sizes (e.g. 1kg, 400g, sachet, 5L), and expiry dates
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleAddBatch}
                                            className="text-xs font-bold bg-amber-800 hover:bg-amber-700 active:scale-95 text-white px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 shrink-0 shadow-2xs"
                                        >
                                            <Plus className="h-3 w-3" />
                                            <span>Add Lot</span>
                                        </button>
                                    </div>

                                    {/* Quick format suggestion chips */}
                                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5 pt-0.5">
                                        <span className="text-[9px] font-bold text-amber-800 uppercase shrink-0">Quick sizes:</span>
                                        {['1kg', '400g', '750g', '900g', '500g', '185g', '300g', '700g', 'sachet', '1L', '5L'].map((sz) => (
                                            <button
                                                key={sz}
                                                type="button"
                                                onClick={() => {
                                                    if (formBatches.length > 0) {
                                                        const lastIdx = formBatches.length - 1
                                                        handleUpdateBatch(formBatches[lastIdx].id, 'package_size', sz)
                                                    }
                                                }}
                                                className="px-1.5 py-0.2 rounded-md bg-amber-100/80 hover:bg-amber-200 text-amber-900 text-[10px] font-black border border-amber-300/60 shrink-0 transition-colors"
                                            >
                                                +{sz}
                                            </button>
                                        ))}
                                    </div>

                                    {formBatches.length === 0 ? (
                                        <p className="text-[11px] text-amber-900/80 bg-amber-100/60 p-2 rounded-xl">
                                            Tap <strong>Add Lot</strong> to enter quantities with specific brands (e.g. Nido, Klim), formats (1kg, 400g, sachet, 5L), and expiry dates (e.g. 6/27).
                                        </p>
                                    ) : (
                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
                                            {formBatches.map((batch, idx) => (
                                                <div
                                                    key={batch.id}
                                                    className="bg-white p-2.5 rounded-xl border border-amber-200/90 shadow-2xs space-y-2"
                                                >
                                                    {/* Row 1: Brand / Subtype + Format / Size + Delete */}
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Brand / Type (Nido, Carry, Farfalle)…"
                                                            value={batch.brand || ''}
                                                            onChange={(e) =>
                                                                handleUpdateBatch(batch.id, 'brand', e.target.value)
                                                            }
                                                            className="flex-1 px-2 py-1 text-xs font-black rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-700 focus:outline-none"
                                                        />

                                                        <input
                                                            type="text"
                                                            placeholder="Size (1kg, 400g, sachet, 5L)…"
                                                            value={batch.package_size || ''}
                                                            onChange={(e) =>
                                                                handleUpdateBatch(batch.id, 'package_size', e.target.value)
                                                            }
                                                            className="w-28 sm:w-32 px-2 py-1 text-xs font-bold text-center rounded-lg border border-slate-200 bg-amber-50/50 text-amber-900 focus:bg-white focus:border-teal-700 focus:outline-none"
                                                        />

                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveBatch(batch.id)}
                                                            className="p-1 text-slate-400 hover:text-rose-600 shrink-0"
                                                            title="Remove lot"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>

                                                    {/* Row 2: Quantity + Expiry Date Picker */}
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="block text-[9px] font-bold text-slate-400 uppercase">
                                                                Qty (Packages) *
                                                            </label>
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                min="0.1"
                                                                required
                                                                value={batch.quantity}
                                                                onChange={(e) =>
                                                                    handleUpdateBatch(
                                                                        batch.id,
                                                                        'quantity',
                                                                        parseFloat(e.target.value) || 0
                                                                    )
                                                                }
                                                                className="w-full px-2 py-1 text-xs font-black rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-[9px] font-bold text-slate-400 uppercase">
                                                                Expiry Date
                                                            </label>
                                                            <input
                                                                type="date"
                                                                value={batch.expiry_date || ''}
                                                                onChange={(e) =>
                                                                    handleUpdateBatch(batch.id, 'expiry_date', e.target.value)
                                                                }
                                                                className="w-full px-2 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-slate-800"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="bg-teal-800 hover:bg-teal-700 active:scale-95 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-2xs flex items-center gap-1 disabled:opacity-50"
                                    >
                                        <Check className="h-3.5 w-3.5" />
                                        <span>{isSubmitting ? 'Saving…' : 'Save to Pantry'}</span>
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
