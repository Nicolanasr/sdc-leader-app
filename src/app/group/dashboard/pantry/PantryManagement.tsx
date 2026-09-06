'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { createClient } from '@/utils/supabase/client'
import {
    UtensilsCrossed, Plus, Search, AlertTriangle, Check, Trash2, Edit, Loader2,
    Package, ShoppingBag, ArrowUpDown, ChevronRight, Apple, Minus, Layers, Clock,
    Calendar, CheckCircle2, XCircle, Send, Sparkles, Filter, X, ChevronDown, Tag,
    Scale, Info, Download, FileSpreadsheet, FileText, SlidersHorizontal, RotateCcw,
    ChevronUp
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
    
    // ── Search & Filter States ──
    const [search, setSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [selectedBrands, setSelectedBrands] = useState<string[]>([])
    const [brandSearchQuery, setBrandSearchQuery] = useState('')
    const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false)
    const brandDropdownRef = useRef<HTMLDivElement>(null)

    const [selectedLocation, setSelectedLocation] = useState<string>('all')
    const [statusFilter, setStatusFilter] = useState<'all' | 'low_stock' | 'expiring_soon' | 'expired'>('all')
    const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'expiry_asc' | 'qty_desc' | 'qty_asc' | 'category'>('name_asc')
    
    // Collapsible lot states for compact minimalism
    const [expandedLots, setExpandedLots] = useState<Record<string, boolean>>({})

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
    const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

    // Permissions
    const isGroupAdmin = ['chef_groupe', 'assistant_chef_groupe', 'configurator'].includes(currentRole)
    const isProvisionsLeader = currentRole === 'amin_mounet_group' || currentRole === 'mas2oul_mounet' || isGroupAdmin

    // Close popovers on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
                setIsCategoryDropdownOpen(false)
            }
            if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
                setIsExportDropdownOpen(false)
            }
            if (brandDropdownRef.current && !brandDropdownRef.current.contains(event.target as Node)) {
                setIsBrandDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const showStatus = (text: string, type: 'success' | 'error') => {
        setStatusMessage({ text, type })
        setTimeout(() => setStatusMessage(null), 6000)
    }

    const toggleExpandLots = (itemId: string) => {
        setExpandedLots((prev) => ({ ...prev, [itemId]: !prev[itemId] }))
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

    // ── Derive All Available Brands with Counts ──
    const allBrandsWithCounts = useMemo(() => {
        const map = new Map<string, number>()
        pantryList.forEach((item) => {
            (item.expiry_batches || []).forEach((b) => {
                const bName = (b.brand || '').trim()
                if (bName) {
                    map.set(bName, (map.get(bName) || 0) + (Number(b.quantity) || 1))
                }
            })
        })
        return Array.from(map.entries())
            .map(([brand, count]) => ({ brand, count }))
            .sort((a, b) => a.brand.localeCompare(b.brand))
    }, [pantryList])

    const filteredBrandList = useMemo(() => {
        if (!brandSearchQuery.trim()) return allBrandsWithCounts
        const q = brandSearchQuery.toLowerCase()
        return allBrandsWithCounts.filter((b) => b.brand.toLowerCase().includes(q))
    }, [allBrandsWithCounts, brandSearchQuery])

    const toggleBrandSelection = (brandName: string) => {
        setSelectedBrands((prev) =>
            prev.includes(brandName) ? prev.filter((b) => b !== brandName) : [...prev, brandName]
        )
    }

    // ── Derive All Available Storage Locations ──
    const allLocations = useMemo(() => {
        const locs = new Set<string>()
        pantryList.forEach((item) => {
            if (item.location_stored && item.location_stored.trim()) {
                locs.add(item.location_stored.trim())
            }
        })
        return Array.from(locs).sort((a, b) => a.localeCompare(b))
    }, [pantryList])

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

    // ── Requests Approvals & Dynamic FIFO Lot Fulfillment ──
    const [fulfillingRequest, setFulfillingRequest] = useState<{
        request: EventPantryRequest
        pantryItem: PantryItem
        batchAllocations: Record<string, number>
        generalStockAllocated: number
        fulfillNotes: string
    } | null>(null)

    // State for giving extra / custom items directly to a camp
    const [isGiveExtraModalOpen, setIsGiveExtraModalOpen] = useState(false)
    const [giveExtraTargetEvent, setGiveExtraTargetEvent] = useState<{
        eventId: string
        eventTitle: string
    } | null>(null)
    const [extraSelectedItemId, setExtraSelectedItemId] = useState<string>('')
    const [extraQuantity, setExtraQuantity] = useState<string>('1')
    const [extraUnit, setExtraUnit] = useState<string>('cans')
    const [extraNotes, setExtraNotes] = useState<string>('')
    const [extraBatchAllocations, setExtraBatchAllocations] = useState<Record<string, number>>({})
    const [extraItemSearch, setExtraItemSearch] = useState('')

    const handleStartApproveRequest = (req: EventPantryRequest) => {
        if (!isProvisionsLeader) return
        const pantryItem = pantryList.find((p) => p.id === req.pantry_item_id)
        if (!pantryItem) {
            handleApproveRequestDirect(req)
            return
        }

        const batches = pantryItem.expiry_batches || []

        // Auto-calculate FIFO allocation (earliest expiry date first)
        const sortedBatches = [...batches].sort((a, b) => {
            if (!a.expiry_date) return 1
            if (!b.expiry_date) return -1
            return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
        })

        let remainingToAllocate = Number(req.quantity) || 0
        const allocations: Record<string, number> = {}

        sortedBatches.forEach((b) => {
            if (remainingToAllocate <= 0) {
                allocations[b.id] = 0
                return
            }
            const availableInBatch = Number(b.quantity) || 0
            const take = Math.min(availableInBatch, remainingToAllocate)
            allocations[b.id] = take
            remainingToAllocate -= take
        })

        const batchSum = sortedBatches.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0)
        const unbatchedStock = Math.max(0, (Number(pantryItem.quantity_available) || 0) - batchSum)
        const generalAllocated = Math.min(unbatchedStock, Math.max(0, remainingToAllocate))

        setFulfillingRequest({
            request: req,
            pantryItem,
            batchAllocations: allocations,
            generalStockAllocated: generalAllocated,
            fulfillNotes: '',
        })
    }

    const handleApproveRequestDirect = async (req: EventPantryRequest, targetItem?: PantryItem) => {
        if (!isProvisionsLeader) return
        setIsSubmitting(true)
        try {
            const { error: reqErr } = await supabase
                .from('event_pantry_requests')
                .update({ status: 'approved', approved_by: userId })
                .eq('id', req.id)
            if (reqErr) throw reqErr

            const pantryItem = targetItem || pantryList.find((p) => p.id === req.pantry_item_id)
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

    const handleConfirmFulfillment = async () => {
        if (!fulfillingRequest) return
        setIsSubmitting(true)
        const { request, pantryItem, batchAllocations, generalStockAllocated, fulfillNotes } = fulfillingRequest

        try {
            const updatedBatches: PantryBatch[] = []
            let lotsDeducted = 0

            ;(pantryItem.expiry_batches || []).forEach((b) => {
                const deducted = batchAllocations[b.id] || 0
                lotsDeducted += deducted
                const remainingQty = Math.max(0, (Number(b.quantity) || 0) - deducted)
                if (remainingQty > 0) {
                    updatedBatches.push({
                        ...b,
                        quantity: remainingQty,
                    })
                }
            })

            const totalDeducted = lotsDeducted + (Number(generalStockAllocated) || 0)
            const newTotalQty = Math.max(0, (pantryItem.quantity_available || 0) - totalDeducted)

            const sortedDates = updatedBatches
                .map((b) => b.expiry_date)
                .filter(Boolean)
                .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
            const newExpiryDate = sortedDates.length > 0 ? sortedDates[0] : null

            const { error: itemErr } = await supabase
                .from('group_pantry_items')
                .update({
                    quantity_available: newTotalQty,
                    expiry_batches: updatedBatches.length > 0 ? updatedBatches : null,
                    expiry_date: newExpiryDate,
                })
                .eq('id', pantryItem.id)

            if (itemErr) throw itemErr

            const fulfilledBatchesData = Object.entries(batchAllocations)
                .filter(([_, q]) => q > 0)
                .map(([bId, q]) => {
                    const found = (pantryItem.expiry_batches || []).find((b) => b.id === bId)
                    return {
                        id: bId,
                        brand: found?.brand || 'Standard',
                        package_size: found?.package_size || '',
                        expiry_date: found?.expiry_date || pantryItem.expiry_date || '',
                        quantity: q,
                    }
                })

            if (generalStockAllocated > 0) {
                fulfilledBatchesData.push({
                    id: 'std_stock_' + Date.now(),
                    brand: 'Standard Depot Stock',
                    package_size: '',
                    expiry_date: pantryItem.expiry_date || '',
                    quantity: generalStockAllocated,
                })
            }

            const lotSummary = Object.entries(batchAllocations)
                .filter(([_, q]) => q > 0)
                .map(([bId, q]) => {
                    const found = (pantryItem.expiry_batches || []).find((b) => b.id === bId)
                    return `${q}x ${found?.brand || ''} ${found?.package_size || ''}`
                })
                .join(', ')

            const generalSummary = generalStockAllocated > 0 ? `${generalStockAllocated}x Standard Stock` : null
            const allLotsGiven = [lotSummary, generalSummary].filter(Boolean).join(' + ')

            const isDifferentQty = totalDeducted !== Number(request.quantity)
            const noteDetails = [
                isDifferentQty ? `[Fulfilled: ${totalDeducted} ${pantryItem.unit} (Orig requested: ${request.quantity})]` : null,
                allLotsGiven ? `[Lots: ${allLotsGiven}]` : null,
                fulfillNotes ? `[Note: ${fulfillNotes}]` : null,
                fulfilledBatchesData.length > 0 ? `[FulfilledLotsData:${JSON.stringify(fulfilledBatchesData)}]` : null,
            ].filter(Boolean).join(' ')

            const { error: reqErr } = await supabase
                .from('event_pantry_requests')
                .update({
                    status: 'approved',
                    approved_by: userId,
                    quantity: totalDeducted > 0 ? totalDeducted : request.quantity,
                    notes: noteDetails || null,
                })
                .eq('id', request.id)

            if (reqErr) throw reqErr

            setPantryList((prev) =>
                prev.map((p) =>
                    p.id === pantryItem.id
                        ? {
                              ...p,
                              quantity_available: newTotalQty,
                              expiry_batches: updatedBatches,
                              expiry_date: newExpiryDate,
                          }
                        : p
                )
            )

            setRequestsList((prev) =>
                prev.map((r) =>
                    r.id === request.id
                        ? {
                              ...r,
                              status: 'approved',
                              quantity: totalDeducted > 0 ? totalDeducted : request.quantity,
                              notes: noteDetails || null,
                          }
                        : r
                )
            )

            setFulfillingRequest(null)
            showStatus(`Approved and deducted ${totalDeducted} ${pantryItem.unit} of "${pantryItem.name}"!`, 'success')
        } catch (err: any) {
            showStatus(err.message || 'Failed to fulfill request.', 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Handlers for Giving Extra / Custom Provisions Directly to Camp
    const handleOpenGiveExtraModal = (eventId: string, eventTitle: string) => {
        setGiveExtraTargetEvent({ eventId, eventTitle })
        const firstItem = pantryList[0]
        if (firstItem) {
            setExtraSelectedItemId(firstItem.id)
            setExtraUnit(firstItem.unit || 'cans')
            setExtraQuantity('1')
            const allocations: Record<string, number> = {}
            const sortedBatches = [...(firstItem.expiry_batches || [])].sort((a, b) => {
                if (!a.expiry_date) return 1
                if (!b.expiry_date) return -1
                return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
            })
            let remaining = 1
            sortedBatches.forEach((b) => {
                const avail = Number(b.quantity) || 0
                const take = Math.min(avail, remaining)
                allocations[b.id] = take
                remaining -= take
            })
            setExtraBatchAllocations(allocations)
        }
        setExtraNotes('')
        setExtraItemSearch('')
        setIsGiveExtraModalOpen(true)
    }

    const handleSelectExtraItem = (itemId: string) => {
        setExtraSelectedItemId(itemId)
        const item = pantryList.find((p) => p.id === itemId)
        if (item) {
            setExtraUnit(item.unit || 'cans')
            const qtyNum = parseFloat(extraQuantity) || 1
            const allocations: Record<string, number> = {}
            const sortedBatches = [...(item.expiry_batches || [])].sort((a, b) => {
                if (!a.expiry_date) return 1
                if (!b.expiry_date) return -1
                return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
            })
            let remaining = qtyNum
            sortedBatches.forEach((b) => {
                const avail = Number(b.quantity) || 0
                const take = Math.min(avail, remaining)
                allocations[b.id] = take
                remaining -= take
            })
            setExtraBatchAllocations(allocations)
        }
    }

    const handleGiveExtraItemToCamp = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!giveExtraTargetEvent || !extraSelectedItemId) return
        setIsSubmitting(true)
        try {
            const pantryItem = pantryList.find((p) => p.id === extraSelectedItemId)
            if (!pantryItem) throw new Error('Pantry item not found')

            const qtyToGive = parseFloat(extraQuantity) || 0
            if (qtyToGive <= 0) throw new Error('Please enter a valid quantity')

            // Calculate deducted batches
            const updatedBatches: PantryBatch[] = []
            let totalDeducted = 0

            if (pantryItem.expiry_batches && pantryItem.expiry_batches.length > 0) {
                pantryItem.expiry_batches.forEach((b) => {
                    const deducted = extraBatchAllocations[b.id] || 0
                    totalDeducted += deducted
                    const remainingQty = Math.max(0, (Number(b.quantity) || 0) - deducted)
                    if (remainingQty > 0) {
                        updatedBatches.push({ ...b, quantity: remainingQty })
                    }
                })
            } else {
                totalDeducted = qtyToGive
            }

            const newTotalQty = Math.max(0, (pantryItem.quantity_available || 0) - (totalDeducted > 0 ? totalDeducted : qtyToGive))
            const sortedDates = updatedBatches
                .map((b) => b.expiry_date)
                .filter(Boolean)
                .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
            const newExpiryDate = sortedDates.length > 0 ? sortedDates[0] : null

            const extraBatchesData = Object.entries(extraBatchAllocations)
                .filter(([_, q]) => q > 0)
                .map(([bId, q]) => {
                    const found = (pantryItem.expiry_batches || []).find((b) => b.id === bId)
                    return {
                        id: bId,
                        brand: found?.brand || 'Standard',
                        package_size: found?.package_size || '',
                        expiry_date: found?.expiry_date || pantryItem.expiry_date || '',
                        quantity: q,
                    }
                })

            await supabase
                .from('group_pantry_items')
                .update({
                    quantity_available: newTotalQty,
                    expiry_batches: updatedBatches.length > 0 ? updatedBatches : null,
                    expiry_date: newExpiryDate,
                })
                .eq('id', pantryItem.id)

            const lotSummary = Object.entries(extraBatchAllocations)
                .filter(([_, q]) => q > 0)
                .map(([bId, q]) => {
                    const found = (pantryItem.expiry_batches || []).find((b) => b.id === bId)
                    return `${q}x ${found?.brand || ''} ${found?.package_size || ''}`
                })
                .join(', ')

            const noteText = [
                extraNotes.trim() ? extraNotes.trim() : null,
                lotSummary ? `[Lots: ${lotSummary}]` : null,
                `[Given directly by Pantry Master]`,
                extraBatchesData.length > 0 ? `[FulfilledLotsData:${JSON.stringify(extraBatchesData)}]` : null,
            ].filter(Boolean).join(' ')

            const { data: newReq, error: reqErr } = await supabase
                .from('event_pantry_requests')
                .insert({
                    event_id: giveExtraTargetEvent.eventId,
                    group_id: groupId,
                    pantry_item_id: pantryItem.id,
                    quantity: totalDeducted > 0 ? totalDeducted : qtyToGive,
                    unit: extraUnit || pantryItem.unit,
                    status: 'approved',
                    requested_by: userId,
                    approved_by: userId,
                    notes: noteText,
                })
                .select('*, events(id, title, start_time), profiles:requested_by(full_name), group_pantry_items(name, unit)')
                .single()

            if (reqErr) throw reqErr

            setPantryList((prev) =>
                prev.map((p) =>
                    p.id === pantryItem.id
                        ? {
                              ...p,
                              quantity_available: newTotalQty,
                              expiry_batches: updatedBatches,
                              expiry_date: newExpiryDate,
                          }
                        : p
                )
            )

            setRequestsList((prev) => [newReq, ...prev])
            setIsGiveExtraModalOpen(false)
            showStatus(`Gave ${totalDeducted || qtyToGive} ${extraUnit || pantryItem.unit} of "${pantryItem.name}" directly to ${giveExtraTargetEvent.eventTitle}!`, 'success')
        } catch (err: any) {
            showStatus(err.message || 'Failed to give custom items.', 'error')
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
                .update({ status: 'rejected', approved_by: userId })
                .eq('id', req.id)
            if (reqErr) throw reqErr

            setRequestsList((prev) => prev.map((r) => (r.id === req.id ? { ...r, status: 'rejected' } : r)))
            showStatus(`Declined provision transfer for ${req.events?.title || 'Camp'}.`, 'success')
        } catch (err: any) {
            showStatus(err.message || 'Failed to decline request.', 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    // ── Returning Unused Food / Lots after Camp ──
    const [returningRequest, setReturningRequest] = useState<{
        request: EventPantryRequest
        pantryItem: PantryItem
        returnBatches: Array<{
            id: string
            brand: string
            package_size: string
            quantity: number
            originalGiven: number
            expiry_date: string
        }>
        returnNotes: string
    } | null>(null)

    const handleOpenReturnModal = (req: EventPantryRequest) => {
        if (req.notes?.includes('[Returned')) {
            showStatus('This provision item has already been processed for return.', 'error')
            return
        }

        const pantryItem = pantryList.find((p) => p.id === req.pantry_item_id)
        if (!pantryItem) {
            showStatus('Pantry item not found in database', 'error')
            return
        }

        const noteText = req.notes || ''
        const batches = pantryItem.expiry_batches || []
        
        let returnBatchesList: Array<{
            id: string
            brand: string
            package_size: string
            quantity: number
            originalGiven: number
            expiry_date: string
        }> = []

        // 1. First, check for structured [FulfilledLotsData:...] in notes
        const jsonMatch = noteText.match(/\[FulfilledLotsData:(.*?)\]/)
        if (jsonMatch && jsonMatch[1]) {
            try {
                const parsed = JSON.parse(jsonMatch[1])
                if (Array.isArray(parsed) && parsed.length > 0) {
                    returnBatchesList = parsed.map((b) => ({
                        id: b.id || 'ret_' + Math.random().toString(36).substr(2, 6),
                        brand: b.brand || 'Standard',
                        package_size: b.package_size || '',
                        quantity: Number(b.quantity) || 0,
                        originalGiven: Number(b.quantity) || 0,
                        expiry_date: b.expiry_date || '',
                    }))
                }
            } catch (e) {
                console.error('Failed to parse FulfilledLotsData', e)
            }
        }

        // 2. If no JSON data, parse human-readable [Lots: 5x Kiane 185g, 1x Deli 185g + 30x Standard Stock]
        if (returnBatchesList.length === 0 && noteText) {
            const lotsMatch = noteText.match(/\[Lots:\s*(.*?)\]/)
            if (lotsMatch && lotsMatch[1]) {
                const rawParts = lotsMatch[1].split(/[+,]/).map((s) => s.trim()).filter(Boolean)
                rawParts.forEach((part) => {
                    const itemMatch = part.match(/^(\d+(?:\.\d+)?)\s*x\s*(.*)$/i)
                    if (itemMatch) {
                        const qty = parseFloat(itemMatch[1]) || 0
                        const lotDesc = itemMatch[2].trim()
                        if (qty > 0) {
                            // Extract package size if at the end e.g. "185g", "1kg", "500g"
                            const sizeMatch = lotDesc.match(/(\d+\s*(?:g|kg|ml|l|cans|packs|pieces|oz))\b/i)
                            const size = sizeMatch ? sizeMatch[1] : ''
                            const brandName = size ? lotDesc.replace(size, '').trim() : lotDesc

                            const matchingBatch = batches.find(
                                (b) => (b.brand && brandName.toLowerCase().includes(b.brand.toLowerCase())) ||
                                       (b.brand && b.brand.toLowerCase().includes(brandName.toLowerCase()))
                            )

                            returnBatchesList.push({
                                id: matchingBatch?.id || 'ret_' + Math.random().toString(36).substr(2, 6),
                                brand: matchingBatch?.brand || brandName || 'Standard',
                                package_size: matchingBatch?.package_size || size || '',
                                quantity: qty,
                                originalGiven: qty,
                                expiry_date: matchingBatch?.expiry_date || pantryItem.expiry_date || '',
                            })
                        }
                    }
                })
            }
        }

        // 3. Fallback: FIFO allocation from pantryItem batches or standard single lot
        if (returnBatchesList.length === 0) {
            const sorted = [...batches].sort((a, b) => {
                if (!a.expiry_date) return 1
                if (!b.expiry_date) return -1
                return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
            })
            let rem = Number(req.quantity) || 0
            sorted.forEach((b) => {
                if (rem <= 0) return
                const take = Math.min(Number(b.quantity) || 0, rem)
                if (take > 0) {
                    returnBatchesList.push({
                        id: b.id,
                        brand: b.brand || 'Standard',
                        package_size: b.package_size || '',
                        quantity: take,
                        originalGiven: take,
                        expiry_date: b.expiry_date || '',
                    })
                    rem -= take
                }
            })
            if (rem > 0) {
                returnBatchesList.push({
                    id: 'std_stock_' + Date.now(),
                    brand: 'Standard Depot Stock',
                    package_size: '',
                    quantity: rem,
                    originalGiven: rem,
                    expiry_date: pantryItem.expiry_date || '',
                })
            }
        }

        setReturningRequest({
            request: req,
            pantryItem,
            returnBatches: returnBatchesList,
            returnNotes: '',
        })
    }

    const handleConfirmReturn = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!returningRequest) return
        setIsSubmitting(true)
        const { request, pantryItem, returnBatches, returnNotes } = returningRequest

        try {
            const totalReturning = returnBatches.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0)
            if (totalReturning <= 0) throw new Error('Please enter at least 1 returned package quantity')

            let updatedBatches = [...(pantryItem.expiry_batches || [])]

            returnBatches.filter((b) => Number(b.quantity) > 0).forEach((ret) => {
                // If it is standard depot stock (unbatched), we just increment total stock
                if (ret.brand === 'Standard Depot Stock' || !ret.brand) {
                    return
                }

                const existingIdx = updatedBatches.findIndex(
                    (b) => b.id === ret.id || (b.brand === ret.brand && b.package_size === ret.package_size && b.expiry_date === ret.expiry_date)
                )
                if (existingIdx >= 0) {
                    updatedBatches[existingIdx] = {
                        ...updatedBatches[existingIdx],
                        quantity: (Number(updatedBatches[existingIdx].quantity) || 0) + Number(ret.quantity),
                    }
                } else {
                    updatedBatches.push({
                        id: 'lot_ret_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                        quantity: Number(ret.quantity),
                        brand: ret.brand || '',
                        package_size: ret.package_size || '',
                        expiry_date: ret.expiry_date || '',
                        notes: `[Returned from ${request.events?.title || 'Camp'}]`,
                    })
                }
            })

            const newTotalQty = (Number(pantryItem.quantity_available) || 0) + totalReturning
            const sortedDates = updatedBatches
                .map((b) => b.expiry_date)
                .filter(Boolean)
                .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
            const newExpiryDate = sortedDates.length > 0 ? sortedDates[0] : null

            const { error: itemErr } = await supabase
                .from('group_pantry_items')
                .update({
                    quantity_available: newTotalQty,
                    expiry_batches: updatedBatches.length > 0 ? updatedBatches : null,
                    expiry_date: newExpiryDate,
                })
                .eq('id', pantryItem.id)

            if (itemErr) throw itemErr

            const returnDateStr = new Date().toLocaleDateString('en-GB')
            const returnNote = `[Returned ${totalReturning} ${pantryItem.unit} on ${returnDateStr}${returnNotes ? ': ' + returnNotes : ''}]`
            const updatedNotes = request.notes ? `${request.notes} | ${returnNote}` : returnNote

            const { error: reqErr } = await supabase
                .from('event_pantry_requests')
                .update({
                    notes: updatedNotes,
                })
                .eq('id', request.id)

            if (reqErr) throw reqErr

            setPantryList((prev) =>
                prev.map((p) =>
                    p.id === pantryItem.id
                        ? {
                              ...p,
                              quantity_available: newTotalQty,
                              expiry_batches: updatedBatches,
                              expiry_date: newExpiryDate,
                          }
                        : p
                )
            )

            setRequestsList((prev) =>
                prev.map((r) => (r.id === request.id ? { ...r, notes: updatedNotes } : r))
            )

            setReturningRequest(null)
            showStatus(`Returned ${totalReturning} ${pantryItem.unit} of "${pantryItem.name}" to Central Pantry!`, 'success')
        } catch (err: any) {
            showStatus(err.message || 'Failed to return items', 'error')
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
            rejectedCount: number
        }> = {}

        requestsList.forEach((req) => {
            if (requestStatusFilter === 'pending' && req.status !== 'requested') return
            if (requestStatusFilter === 'approved' && req.status !== 'approved' && req.status !== 'received') return
            if (requestStatusFilter === 'rejected' && req.status !== 'rejected') return

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
                    rejectedCount: 0,
                }
            }

            map[eventId].items.push(req)
            if (req.status === 'requested') {
                map[eventId].pendingCount += 1
            } else if (req.status === 'approved' || req.status === 'received') {
                map[eventId].approvedCount += 1
            } else if (req.status === 'rejected') {
                map[eventId].rejectedCount += 1
            }
        })

        return Object.values(map)
    }, [requestsList, requestStatusFilter])

    const pendingRequestsCount = useMemo(
        () => requestsList.filter((r) => r.status === 'requested').length,
        [requestsList]
    )
    const approvedRequestsCount = useMemo(
        () => requestsList.filter((r) => r.status === 'approved' || r.status === 'received').length,
        [requestsList]
    )
    const rejectedRequestsCount = useMemo(
        () => requestsList.filter((r) => r.status === 'rejected').length,
        [requestsList]
    )

    // ── Filtered & Sorted Inventory List ──
    const filteredPantry = useMemo(() => {
        const now = new Date()

        const list = pantryList.filter((item) => {
            // 1. Category Filter
            if (selectedCategory !== 'all' && item.category !== selectedCategory) return false

            // 2. Storage Location Filter
            if (selectedLocation !== 'all' && (item.location_stored || '').trim() !== selectedLocation) return false

            // 3. Multi-Select Brand Filter
            if (selectedBrands.length > 0) {
                const hasAnySelectedBrand = (item.expiry_batches || []).some(
                    (b) => b.brand && selectedBrands.includes(b.brand.trim())
                )
                if (!hasAnySelectedBrand) return false
            }

            // 4. Status Filter
            const isLow = (item.quantity_available || 0) <= (item.min_threshold || 0)
            if (statusFilter === 'low_stock' && !isLow) return false

            const hasExpiringSoon = (item.expiry_batches || []).some((b) => {
                if (!b.expiry_date) return false
                const days = (new Date(b.expiry_date).getTime() - now.getTime()) / (1000 * 3600 * 24)
                return days >= 0 && days <= 45
            }) || (item.expiry_date ? ((new Date(item.expiry_date).getTime() - now.getTime()) / (1000 * 3600 * 24) >= 0 && (new Date(item.expiry_date).getTime() - now.getTime()) / (1000 * 3600 * 24) <= 45) : false)

            if (statusFilter === 'expiring_soon' && !hasExpiringSoon) return false

            const hasExpired = (item.expiry_batches || []).some((b) => {
                if (!b.expiry_date) return false
                const days = (new Date(b.expiry_date).getTime() - now.getTime()) / (1000 * 3600 * 24)
                return days < 0
            }) || (item.expiry_date ? (new Date(item.expiry_date).getTime() - now.getTime()) < 0 : false)

            if (statusFilter === 'expired' && !hasExpired) return false

            // 5. Search Query (across name, location, notes, brands, sizes, lot notes)
            if (search.trim()) {
                const q = search.toLowerCase()
                const matchName = (item.name || '').toLowerCase().includes(q)
                const matchLocation = (item.location_stored || '').toLowerCase().includes(q)
                const matchNotes = (item.notes || '').toLowerCase().includes(q)
                const matchBatches = (item.expiry_batches || []).some(
                    (b) =>
                        (b.brand && b.brand.toLowerCase().includes(q)) ||
                        (b.package_size && b.package_size.toLowerCase().includes(q)) ||
                        (b.lot_number && b.lot_number.toLowerCase().includes(q)) ||
                        (b.expiry_date && b.expiry_date.toLowerCase().includes(q)) ||
                        (b.notes && b.notes.toLowerCase().includes(q))
                )
                if (!matchName && !matchLocation && !matchNotes && !matchBatches) return false
            }

            return true
        })

        // Sorting Logic
        return list.sort((a, b) => {
            if (sortBy === 'name_asc') return a.name.localeCompare(b.name)
            if (sortBy === 'name_desc') return b.name.localeCompare(a.name)
            if (sortBy === 'qty_desc') return (Number(b.quantity_available) || 0) - (Number(a.quantity_available) || 0)
            if (sortBy === 'qty_asc') return (Number(a.quantity_available) || 0) - (Number(b.quantity_available) || 0)
            if (sortBy === 'category') return a.category.localeCompare(b.category)
            if (sortBy === 'expiry_asc') {
                if (!a.expiry_date) return 1
                if (!b.expiry_date) return -1
                return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
            }
            return 0
        })
    }, [pantryList, selectedCategory, selectedBrands, selectedLocation, statusFilter, search, sortBy])

    const lowStockCount = useMemo(
        () => pantryList.filter((i) => (i.quantity_available || 0) <= (i.min_threshold || 0)).length,
        [pantryList]
    )

    const expiringSoonCount = useMemo(() => {
        const now = new Date()
        return pantryList.filter((i) => {
            const hasBatch = (i.expiry_batches || []).some((b) => {
                if (!b.expiry_date) return false
                const days = (new Date(b.expiry_date).getTime() - now.getTime()) / (1000 * 3600 * 24)
                return days >= 0 && days <= 45
            })
            if (hasBatch) return true
            if (!i.expiry_date) return false
            const days = (new Date(i.expiry_date).getTime() - now.getTime()) / (1000 * 3600 * 24)
            return days >= 0 && days <= 45
        }).length
    }, [pantryList])

    const expiredCount = useMemo(() => {
        const now = new Date()
        return pantryList.filter((i) => {
            const hasBatch = (i.expiry_batches || []).some((b) => {
                if (!b.expiry_date) return false
                const days = (new Date(b.expiry_date).getTime() - now.getTime()) / (1000 * 3600 * 24)
                return days < 0
            })
            if (hasBatch) return true
            if (!i.expiry_date) return false
            return new Date(i.expiry_date).getTime() - now.getTime() < 0
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

    const hasActiveFilters = selectedCategory !== 'all' || selectedBrands.length > 0 || selectedLocation !== 'all' || statusFilter !== 'all' || search.trim() !== ''

    const handleClearAllFilters = () => {
        setSelectedCategory('all')
        setSelectedBrands([])
        setSelectedLocation('all')
        setStatusFilter('all')
        setSearch('')
    }

    return (
        <DashboardShell
            groupName={groupName}
            currentRole={currentRole}
            userName={userName}
        >
            <div className="w-full pb-24 space-y-2.5 sm:space-y-3">
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

                {/* ── TOP HEADER CARD (Minimalist Clean Standard) ── */}
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
                                {totalPackagesCount} items stocked • {pantryList.length} products
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
                        {/* ── SUMMARY & STATUS PILL SELECTORS (COMPACT MINIMALIST) ── */}
                        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                            <button
                                onClick={() => setStatusFilter('all')}
                                className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border shadow-2xs text-center transition-all ${
                                    statusFilter === 'all'
                                        ? 'bg-teal-900 text-white border-teal-950 font-black'
                                        : 'bg-white text-slate-800 border-slate-200 hover:border-teal-700'
                                }`}
                            >
                                <span className={`text-[9px] sm:text-[10px] font-bold uppercase block ${statusFilter === 'all' ? 'text-teal-200' : 'text-slate-400'}`}>
                                    All Stock
                                </span>
                                <span className="text-xs sm:text-sm font-black">
                                    {totalPackagesCount}
                                </span>
                            </button>

                            <button
                                onClick={() => setStatusFilter(statusFilter === 'low_stock' ? 'all' : 'low_stock')}
                                className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border shadow-2xs text-center transition-all ${
                                    statusFilter === 'low_stock'
                                        ? 'bg-amber-600 text-white border-amber-700 font-black'
                                        : 'bg-white text-slate-800 border-slate-200 hover:border-amber-400'
                                }`}
                            >
                                <span className={`text-[9px] sm:text-[10px] font-bold uppercase block ${statusFilter === 'low_stock' ? 'text-amber-100' : 'text-slate-400'}`}>
                                    Low Stock
                                </span>
                                <span className="text-xs sm:text-sm font-black">
                                    {lowStockCount}
                                </span>
                            </button>

                            <button
                                onClick={() => setStatusFilter(statusFilter === 'expiring_soon' ? 'all' : 'expiring_soon')}
                                className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border shadow-2xs text-center transition-all ${
                                    statusFilter === 'expiring_soon'
                                        ? 'bg-amber-500 text-white border-amber-600 font-black'
                                        : 'bg-white text-slate-800 border-slate-200 hover:border-amber-400'
                                }`}
                            >
                                <span className={`text-[9px] sm:text-[10px] font-bold uppercase block ${statusFilter === 'expiring_soon' ? 'text-amber-100' : 'text-slate-400'}`}>
                                    Exp &lt;45d
                                </span>
                                <span className="text-xs sm:text-sm font-black">
                                    {expiringSoonCount}
                                </span>
                            </button>

                            <button
                                onClick={() => setStatusFilter(statusFilter === 'expired' ? 'all' : 'expired')}
                                className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border shadow-2xs text-center transition-all ${
                                    statusFilter === 'expired'
                                        ? 'bg-rose-600 text-white border-rose-700 font-black'
                                        : 'bg-white text-slate-800 border-slate-200 hover:border-rose-400'
                                }`}
                            >
                                <span className={`text-[9px] sm:text-[10px] font-bold uppercase block ${statusFilter === 'expired' ? 'text-rose-100' : 'text-slate-400'}`}>
                                    Expired
                                </span>
                                <span className="text-xs sm:text-sm font-black">
                                    {expiredCount}
                                </span>
                            </button>
                        </div>

                        {/* ── SEARCH, FILTER & SORT CONTROLS BAR ── */}
                        <div className="bg-white border border-slate-200/90 p-2.5 sm:p-3 rounded-2xl shadow-2xs space-y-2">
                            {/* Search bar */}
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search product, brand (Lipton, Darina), size, shelf…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-8 pr-7 py-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium focus:border-teal-700 focus:outline-none"
                                />
                                {search && (
                                    <button
                                        onClick={() => setSearch('')}
                                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* Dropdown Filters Row */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {/* Searchable Multi-Select Brand Popover */}
                                <div className="relative" ref={brandDropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
                                        className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 shadow-2xs ${
                                            selectedBrands.length > 0
                                                ? 'bg-teal-800 text-white border-teal-900 font-black'
                                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                        }`}
                                    >
                                        <span>🏷️ Brands</span>
                                        {selectedBrands.length > 0 && (
                                            <span className="bg-white text-teal-950 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                                                {selectedBrands.length}
                                            </span>
                                        )}
                                        <ChevronDown className="h-3 w-3 opacity-60" />
                                    </button>

                                    {isBrandDropdownOpen && (
                                        <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2.5 space-y-2 animate-in fade-in">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                                                <span className="text-xs font-black text-slate-800">Select Brands</span>
                                                {selectedBrands.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedBrands([])}
                                                        className="text-[10px] text-rose-600 hover:underline font-bold"
                                                    >
                                                        Clear ({selectedBrands.length})
                                                    </button>
                                                )}
                                            </div>

                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-2 h-3 w-3 text-slate-400" />
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    placeholder="Search brands…"
                                                    value={brandSearchQuery}
                                                    onChange={(e) => setBrandSearchQuery(e.target.value)}
                                                    className="w-full pl-7 pr-2 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-700 font-medium"
                                                />
                                            </div>

                                            <div className="max-h-48 overflow-y-auto space-y-0.5 pr-0.5">
                                                {filteredBrandList.length === 0 ? (
                                                    <p className="text-[11px] text-slate-400 text-center py-2">No brands found</p>
                                                ) : (
                                                    filteredBrandList.map((item) => {
                                                        const isChecked = selectedBrands.includes(item.brand)
                                                        return (
                                                            <label
                                                                key={item.brand}
                                                                className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer text-xs transition-colors ${
                                                                    isChecked
                                                                        ? 'bg-teal-50 text-teal-900 font-bold'
                                                                        : 'hover:bg-slate-50 text-slate-700'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={() => toggleBrandSelection(item.brand)}
                                                                        className="rounded text-teal-800 focus:ring-teal-700 h-3.5 w-3.5 shrink-0"
                                                                    />
                                                                    <span className="truncate">{item.brand}</span>
                                                                </div>
                                                                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                                                    x{item.count}
                                                                </span>
                                                            </label>
                                                        )
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Sort Selector */}
                                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl text-xs">
                                    <ArrowUpDown className="h-3 w-3 text-slate-500 shrink-0" />
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                        className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                                    >
                                        <option value="name_asc">Name (A → Z)</option>
                                        <option value="name_desc">Name (Z → A)</option>
                                        <option value="expiry_asc">⏰ Earliest Expiry</option>
                                        <option value="qty_desc">📦 Stock (High → Low)</option>
                                        <option value="qty_asc">⚠️ Stock (Low → High)</option>
                                        <option value="category">Category</option>
                                    </select>
                                </div>

                                {/* Storage Shelf Selector */}
                                {allLocations.length > 0 && (
                                    <select
                                        value={selectedLocation}
                                        onChange={(e) => setSelectedLocation(e.target.value)}
                                        className="bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer max-w-[120px] truncate"
                                    >
                                        <option value="all">📍 All Shelves</option>
                                        {allLocations.map((loc) => (
                                            <option key={loc} value={loc}>
                                                {loc}
                                            </option>
                                        ))}
                                    </select>
                                )}

                                {/* Reset All Filters */}
                                {hasActiveFilters && (
                                    <button
                                        onClick={handleClearAllFilters}
                                        className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 text-xs font-bold flex items-center gap-1 transition-colors ml-auto"
                                        title="Clear all active filters"
                                    >
                                        <RotateCcw className="h-3 w-3" />
                                        <span className="text-[10px]">Reset</span>
                                    </button>
                                )}
                            </div>

                            {/* Active Brand Badges Strip (1-tap remove) */}
                            {selectedBrands.length > 0 && (
                                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pt-0.5">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase shrink-0">Selected:</span>
                                    {selectedBrands.map((b) => (
                                        <button
                                            key={b}
                                            onClick={() => toggleBrandSelection(b)}
                                            className="px-1.5 py-0.2 rounded-md bg-teal-100 text-teal-900 text-[10px] font-bold flex items-center gap-1 shrink-0 hover:bg-rose-100 hover:text-rose-900 transition-colors"
                                        >
                                            <span>{b}</span>
                                            <span>✕</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Category Filter Chips */}
                            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5 pt-1 border-t border-slate-100">
                                <button
                                    onClick={() => setSelectedCategory('all')}
                                    className={`px-2.5 py-0.8 rounded-xl text-xs font-bold shrink-0 transition-all ${
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
                                            className={`px-2.5 py-0.8 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1 ${
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

                        {/* ── PANTRY ITEMS GRID / LIST (COMPACT MINIMALIST) ── */}
                        {filteredPantry.length === 0 ? (
                            <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center space-y-3 shadow-2xs">
                                <UtensilsCrossed className="h-10 w-10 text-slate-300 mx-auto" />
                                <div>
                                    <h3 className="text-sm font-bold text-slate-700">No matching pantry items found</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Try adjusting your search query, brand, or status filter.
                                    </p>
                                </div>
                                {hasActiveFilters && (
                                    <button
                                        onClick={handleClearAllFilters}
                                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3.5 py-2 rounded-xl text-xs shadow-2xs inline-flex items-center gap-1.5 active:scale-95"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5 text-teal-800" />
                                        <span>Reset All Filters</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {filteredPantry.map((item) => {
                                    const catCfg = getCategoryObj(item.category)
                                    const isLow = (item.quantity_available || 0) <= (item.min_threshold || 0)
                                    const batches = item.expiry_batches || []
                                    const now = new Date()

                                    // Filter the lots displayed on this card if a specific search/brand/status filter is active
                                    let displayedBatches = batches
                                    const q = search.trim().toLowerCase()
                                    const isSpecificSearch = q !== '' && !item.name.toLowerCase().includes(q)

                                    if (selectedBrands.length > 0) {
                                        displayedBatches = displayedBatches.filter(
                                            (b) => b.brand && selectedBrands.includes(b.brand.trim())
                                        )
                                    }

                                    if (isSpecificSearch) {
                                        displayedBatches = displayedBatches.filter(
                                            (b) =>
                                                (b.brand && b.brand.toLowerCase().includes(q)) ||
                                                (b.package_size && b.package_size.toLowerCase().includes(q)) ||
                                                (b.lot_number && b.lot_number.toLowerCase().includes(q)) ||
                                                (b.expiry_date && b.expiry_date.toLowerCase().includes(q)) ||
                                                (b.notes && b.notes.toLowerCase().includes(q))
                                        )
                                    }

                                    if (statusFilter === 'expiring_soon') {
                                        displayedBatches = displayedBatches.filter((b) => {
                                            if (!b.expiry_date) return false
                                            const days = (new Date(b.expiry_date).getTime() - now.getTime()) / (1000 * 3600 * 24)
                                            return days >= 0 && days <= 45
                                        })
                                    }

                                    if (statusFilter === 'expired') {
                                        displayedBatches = displayedBatches.filter((b) => {
                                            if (!b.expiry_date) return false
                                            const days = (new Date(b.expiry_date).getTime() - now.getTime()) / (1000 * 3600 * 24)
                                            return days < 0
                                        })
                                    }

                                    // Compute total for displayed batches or total item
                                    const computedTotal = computeTotalWeightOrVolume(
                                        displayedBatches.length > 0 ? displayedBatches : batches
                                    )
                                    const isBatchFiltered = displayedBatches.length < batches.length

                                    // Collapse lots if there are > 4 lots to keep mobile clean
                                    const isExpanded = expandedLots[item.id] || hasActiveFilters
                                    const visibleBatches = isExpanded ? displayedBatches : displayedBatches.slice(0, 4)
                                    const hiddenCount = displayedBatches.length - visibleBatches.length

                                    return (
                                        <div
                                            key={item.id}
                                            className={`bg-white border rounded-2xl p-3 sm:p-3.5 shadow-2xs transition-all space-y-2 flex flex-col justify-between ${
                                                isLow ? 'border-amber-300 bg-amber-50/15' : 'border-slate-200/90'
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
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                                                            {item.name}
                                                        </h3>
                                                        {item.notes && (
                                                            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                                                                {item.notes}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Quantity + Weight / Volume Badge */}
                                                    <div className="text-right shrink-0">
                                                        <div className="flex items-baseline justify-end gap-1 flex-wrap">
                                                            <span className="text-xs sm:text-sm font-black text-teal-950">
                                                                {isBatchFiltered
                                                                    ? displayedBatches.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0)
                                                                    : item.quantity_available}{' '}
                                                                {item.unit}
                                                            </span>
                                                            {computedTotal && (
                                                                <span className="text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200/80">
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

                                                {/* ── BATCHES & GRAMMAGE BREAKDOWN (COLLAPSIBLE & MINIMALIST) ── */}
                                                {displayedBatches.length > 0 && (
                                                    <div className="space-y-1 pt-0.5">
                                                        <div className="flex items-center justify-between gap-1">
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">
                                                                Lots ({displayedBatches.length}
                                                                {isBatchFiltered && ` of ${batches.length}`}):
                                                            </span>
                                                            {isBatchFiltered && (
                                                                <span className="text-[9px] font-black px-1 py-0.1 rounded bg-teal-100 text-teal-900 border border-teal-200">
                                                                    Filtered
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-wrap gap-1">
                                                            {visibleBatches.map((b, bIdx) => {
                                                                const daysToExp = b.expiry_date
                                                                    ? (new Date(b.expiry_date).getTime() - now.getTime()) / (1000 * 3600 * 24)
                                                                    : null
                                                                const isExpired = daysToExp !== null && daysToExp < 0
                                                                const isExpSoon = daysToExp !== null && daysToExp >= 0 && daysToExp <= 45

                                                                return (
                                                                    <span
                                                                        key={b.id || bIdx}
                                                                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md flex items-center gap-1 border ${
                                                                            isExpired
                                                                                ? 'bg-rose-50 text-rose-900 border-rose-300'
                                                                                : isExpSoon
                                                                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                                                                : 'bg-slate-50 text-slate-700 border-slate-200'
                                                                        }`}
                                                                    >
                                                                        <span className="font-black text-teal-900">x{b.quantity}</span>
                                                                        {b.brand && <span className="font-bold text-slate-800">{b.brand}</span>}
                                                                        {b.package_size && (
                                                                            <span className="bg-amber-100/70 text-amber-900 px-1 py-0.1 rounded font-bold text-[9px]">
                                                                                {b.package_size}
                                                                            </span>
                                                                        )}
                                                                        {b.expiry_date && (
                                                                            <span className={`font-mono text-[9px] ${isExpired ? 'text-rose-700 font-bold' : isExpSoon ? 'text-amber-700 font-bold' : 'text-slate-400'}`}>
                                                                                ({formatExpiryShort(b.expiry_date)})
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                )
                                                            })}

                                                            {/* Expand / Collapse Button */}
                                                            {hiddenCount > 0 && !hasActiveFilters && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleExpandLots(item.id)}
                                                                    className="text-[9px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-1.5 py-0.5 rounded-md transition-colors"
                                                                >
                                                                    +{hiddenCount} more lots ▾
                                                                </button>
                                                            )}

                                                            {isExpanded && displayedBatches.length > 4 && !hasActiveFilters && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleExpandLots(item.id)}
                                                                    className="text-[9px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded-md transition-colors"
                                                                >
                                                                    Show less ▴
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Strip: Edit & Delete (Subtle Minimalist) */}
                                            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-end gap-1">
                                                {isProvisionsLeader && (
                                                    <>
                                                        <button
                                                            onClick={() => handleOpenEditModal(item)}
                                                            className="p-1 text-slate-400 hover:text-teal-800 hover:bg-teal-50 rounded-lg transition-colors"
                                                            title="Edit item & batches"
                                                        >
                                                            <Edit className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeletePantryItem(item.id, item.name)}
                                                            className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title="Delete item"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
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
                                Approved ({approvedRequestsCount})
                            </button>
                            <button
                                onClick={() => setRequestStatusFilter('rejected')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    requestStatusFilter === 'rejected'
                                        ? 'bg-rose-700 text-white shadow-2xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                Declined ({rejectedRequestsCount})
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
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {isProvisionsLeader && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenGiveExtraModal(group.eventId, group.eventTitle)}
                                                            className="text-[10px] font-bold bg-white hover:bg-teal-50 text-teal-800 border border-teal-200 px-2 py-1 rounded-xl transition-all flex items-center gap-1 shadow-2xs active:scale-95"
                                                            title="Give custom or extra pantry items to this camp"
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                            <span>+ Give Custom Item</span>
                                                        </button>
                                                    )}
                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
                                                        {group.pendingCount} Pending
                                                    </span>
                                                </div>
                                            ) : group.approvedCount > 0 ? (
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {isProvisionsLeader && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenGiveExtraModal(group.eventId, group.eventTitle)}
                                                            className="text-[10px] font-bold bg-white hover:bg-teal-50 text-teal-800 border border-teal-200 px-2 py-1 rounded-xl transition-all flex items-center gap-1 shadow-2xs active:scale-95"
                                                            title="Give custom or extra pantry items to this camp"
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                            <span>+ Give Custom Item</span>
                                                        </button>
                                                    )}
                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-200 shrink-0">
                                                        ✓ Approved
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
                                                        ✕ Declined
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="divide-y divide-slate-100 p-2 space-y-2">
                                            {group.items.map((req) => {
                                                const pantryItem = pantryList.find((p) => p.id === req.pantry_item_id)
                                                const batches = pantryItem?.expiry_batches || []

                                                // Suggested FIFO lots preview
                                                const sortedBatches = [...batches].sort((a, b) => {
                                                    if (!a.expiry_date) return 1
                                                    if (!b.expiry_date) return -1
                                                    return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
                                                })
                                                let remainingToPick = Number(req.quantity) || 1
                                                const suggestedLots: Array<{ brand: string; size: string; exp: string; qty: number }> = []
                                                sortedBatches.forEach((b) => {
                                                    if (remainingToPick <= 0) return
                                                    const avail = Number(b.quantity) || 0
                                                    const take = Math.min(avail, remainingToPick)
                                                    if (take > 0) {
                                                        suggestedLots.push({
                                                            brand: b.brand || 'Standard',
                                                            size: b.package_size || '',
                                                            exp: b.expiry_date || '',
                                                            qty: take,
                                                        })
                                                        remainingToPick -= take
                                                    }
                                                })

                                                // If there's still quantity needed and unbatched stock is available in depot:
                                                const batchSum = sortedBatches.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0)
                                                const unbatchedStock = Math.max(0, (Number(pantryItem?.quantity_available) || 0) - batchSum)
                                                const takeFromUnbatched = Math.min(unbatchedStock, Math.max(0, remainingToPick))
                                                if (takeFromUnbatched > 0) {
                                                    suggestedLots.push({
                                                        brand: 'Standard Depot Stock',
                                                        size: '',
                                                        exp: '',
                                                        qty: takeFromUnbatched,
                                                    })
                                                    remainingToPick -= takeFromUnbatched
                                                }

                                                const totalCovered = suggestedLots.reduce((acc, l) => acc + l.qty, 0)
                                                const hasShortage = remainingToPick > 0

                                                return (
                                                    <div
                                                        key={req.id}
                                                        className="p-3 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 transition-all space-y-2"
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="min-w-0">
                                                                <h5 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                                                                    {req.group_pantry_items?.name || pantryItem?.name || 'Item'}
                                                                </h5>
                                                                <p className="text-[10px] text-slate-500 mt-0.5">
                                                                    Requested: <strong>{req.quantity} {req.unit}</strong>
                                                                    {pantryItem && (
                                                                        <span className="text-slate-400 ml-1.5">
                                                                            (In Depot: {pantryItem.quantity_available} {pantryItem.unit})
                                                                        </span>
                                                                    )}
                                                                </p>
                                                                {req.notes && (
                                                                    <p className="text-[10px] text-teal-800 font-medium mt-1 bg-teal-50/70 p-1 rounded-md border border-teal-100">
                                                                        {req.notes}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            <div className="shrink-0 text-right">
                                                                {req.status === 'requested' && (
                                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                                                                        ⏳ Pending Pickup
                                                                    </span>
                                                                )}
                                                                {(req.status === 'approved' || req.status === 'received') && (
                                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-200">
                                                                        ✓ Approved / Given
                                                                    </span>
                                                                )}
                                                                {req.status === 'rejected' && (
                                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
                                                                        ✕ Declined
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* If requested: Show Suggested Lots to Hand Out (FIFO) & Change Lots button */}
                                                        {req.status === 'requested' && isProvisionsLeader && (
                                                            <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-2.5 space-y-1.5">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] font-bold text-amber-950 uppercase tracking-wide flex items-center gap-1">
                                                                        <Clock className="h-3 w-3 text-amber-700" />
                                                                        <span>Suggested Pick by Expiry Date (FIFO):</span>
                                                                    </span>
                                                                    <span className={`text-[9px] font-black ${hasShortage ? 'text-rose-700' : 'text-emerald-800'}`}>
                                                                        {totalCovered} / {req.quantity} {req.unit} {hasShortage ? `(${remainingToPick} short)` : 'Covered'}
                                                                    </span>
                                                                </div>

                                                                {suggestedLots.length > 0 ? (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {suggestedLots.map((lot, lIdx) => (
                                                                            <span
                                                                                key={lIdx}
                                                                                className="text-[10px] bg-white border border-amber-200 px-1.5 py-0.5 rounded-md text-slate-800 font-medium shadow-2xs flex items-center gap-1"
                                                                            >
                                                                                <span className="font-black text-teal-900">x{lot.qty}</span>
                                                                                <span>{lot.brand}</span>
                                                                                {lot.size && <span className="text-amber-900 font-bold">{lot.size}</span>}
                                                                                {lot.exp && <span className="font-mono text-[9px] text-slate-400">({formatExpiryShort(lot.exp)})</span>}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-[10px] text-amber-800 font-medium">
                                                                        Standard stock will be deducted from central stock.
                                                                    </p>
                                                                )}

                                                                <div className="pt-1.5 flex items-center justify-end gap-1.5 border-t border-amber-200/50">
                                                                    <button
                                                                        onClick={() => handleRejectRequest(req)}
                                                                        className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all"
                                                                    >
                                                                        Decline
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleStartApproveRequest(req)}
                                                                        className="px-3 py-1 bg-teal-800 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 active:scale-95"
                                                                    >
                                                                        <Edit className="h-3 w-3" />
                                                                        <span>Review & Change Lots / Qty</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* If approved: Show Return Unused Food Button (Disabled if already returned) */}
                                                        {req.status === 'approved' && isProvisionsLeader && (() => {
                                                            const isAlreadyReturned = req.notes?.includes('[Returned')
                                                            return (
                                                                <div className="pt-1 flex items-center justify-end">
                                                                    {isAlreadyReturned ? (
                                                                        <button
                                                                            type="button"
                                                                            disabled
                                                                            className="px-2.5 py-1 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg text-xs font-bold cursor-not-allowed opacity-80 flex items-center gap-1"
                                                                            title="Unused provisions have already been returned to Central Pantry"
                                                                        >
                                                                            <Check className="h-3 w-3 text-emerald-700" />
                                                                            <span>Returned to Depot ✓</span>
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleOpenReturnModal(req)}
                                                                            className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 text-teal-900 hover:border-teal-300 border border-slate-200 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 active:scale-95"
                                                                            title="Return unused food & lots from this camp back to Central Pantry"
                                                                        >
                                                                            <RotateCcw className="h-3 w-3 text-teal-700" />
                                                                            <span>🔄 Return Unused Food / Lots</span>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )
                                                        })()}
                                                    </div>
                                                )
                                            })}
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
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs overflow-y-auto">
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

                {/* ══════════════════════════════════════════════════════════
                    MODAL: FULFILL CAMP REQUEST & FIFO LOT DEDUCTION
                ══════════════════════════════════════════════════════════ */}
                {fulfillingRequest && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs overflow-y-auto">
                        <div className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-5 shadow-2xl border border-slate-200 space-y-3 max-h-[92vh] overflow-y-auto my-auto animate-in fade-in">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-teal-800" />
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 leading-tight">
                                            Fulfill Request: {fulfillingRequest.request.quantity} {fulfillingRequest.request.unit} {fulfillingRequest.pantryItem.name}
                                        </h3>
                                        <p className="text-[10px] text-slate-500">
                                            {fulfillingRequest.request.events?.title || 'Camp Activity'} • By {fulfillingRequest.request.profiles?.full_name || 'Leader'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setFulfillingRequest(null)}
                                    className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
                                <Clock className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                                <div>
                                    <strong>Suggested FIFO Pick (First In, First Out):</strong>
                                    <p className="text-[10px] opacity-90 mt-0.5">
                                        Oldest expiration lots are auto-selected. You can adjust the deducted amounts or fulfill custom quantities below.
                                    </p>
                                </div>
                            </div>

                            {/* Lots allocation breakdown */}
                            <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                                {(fulfillingRequest.pantryItem.expiry_batches || []).map((batch) => {
                                    const allocated = fulfillingRequest.batchAllocations[batch.id] || 0
                                    const maxQty = Number(batch.quantity) || 0
                                    return (
                                        <div
                                            key={batch.id}
                                            className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                                                allocated > 0
                                                    ? 'bg-teal-50/70 border-teal-300 shadow-2xs'
                                                    : 'bg-slate-50 border-slate-200 opacity-60'
                                            }`}
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-xs font-black text-slate-900">
                                                        {batch.brand || 'Standard'}
                                                    </span>
                                                    {batch.package_size && (
                                                        <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded">
                                                            {batch.package_size}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                                                    <span>Stock: <strong>{batch.quantity}</strong></span>
                                                    {batch.expiry_date && (
                                                        <span className="font-mono text-emerald-700 font-bold">
                                                            Exp: {formatExpiryShort(batch.expiry_date)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Take Qty Stepper */}
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Deduct:</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={maxQty}
                                                    step="any"
                                                    value={allocated}
                                                    onChange={(e) => {
                                                        const val = Math.max(0, Math.min(maxQty, parseFloat(e.target.value) || 0))
                                                        setFulfillingRequest((prev) => {
                                                            if (!prev) return null
                                                            return {
                                                                ...prev,
                                                                batchAllocations: {
                                                                    ...prev.batchAllocations,
                                                                    [batch.id]: val,
                                                                },
                                                            }
                                                        })
                                                    }}
                                                    className="w-16 px-2 py-1 text-xs font-black rounded-lg border border-slate-300 bg-white text-center focus:border-teal-700 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    )
                                })}

                                {/* Standard / Unbatched General Depot Stock Row */}
                                {(() => {
                                    const batchSum = (fulfillingRequest.pantryItem.expiry_batches || []).reduce((acc, b) => acc + (Number(b.quantity) || 0), 0)
                                    const maxGeneralStock = Math.max(0, (Number(fulfillingRequest.pantryItem.quantity_available) || 0) - batchSum)

                                    if (maxGeneralStock <= 0 && (!fulfillingRequest.generalStockAllocated || fulfillingRequest.generalStockAllocated <= 0)) {
                                        return null
                                    }

                                    return (
                                        <div
                                            className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                                                fulfillingRequest.generalStockAllocated > 0
                                                    ? 'bg-teal-50/70 border-teal-300 shadow-2xs'
                                                    : 'bg-slate-50 border-slate-200 opacity-60'
                                            }`}
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-xs font-black text-slate-900">
                                                        Standard Depot Stock
                                                    </span>
                                                    <span className="text-[10px] font-bold bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded">
                                                        General / Unbatched
                                                    </span>
                                                </div>
                                                <div className="text-[10px] text-slate-500 mt-0.5">
                                                    <span>Available Depot Stock: <strong>{maxGeneralStock}</strong></span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Deduct:</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={maxGeneralStock}
                                                    step="any"
                                                    value={fulfillingRequest.generalStockAllocated}
                                                    onChange={(e) => {
                                                        const val = Math.max(0, Math.min(maxGeneralStock, parseFloat(e.target.value) || 0))
                                                        setFulfillingRequest((prev) => prev ? { ...prev, generalStockAllocated: val } : null)
                                                    }}
                                                    className="w-16 px-2 py-1 text-xs font-black rounded-lg border border-slate-300 bg-white text-center focus:border-teal-700 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    )
                                })()}
                            </div>

                            {/* Optional Handout Note */}
                            <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">
                                    Pantry Master Note (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Substituted brand, gave extra cans, partial fulfillment…"
                                    value={fulfillingRequest.fulfillNotes}
                                    onChange={(e) =>
                                        setFulfillingRequest((prev) =>
                                            prev ? { ...prev, fulfillNotes: e.target.value } : null
                                        )
                                    }
                                    className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-700 focus:outline-none font-medium"
                                />
                            </div>

                            {/* Total Allocated Summary */}
                            {(() => {
                                const lotsAllocated = Object.values(fulfillingRequest.batchAllocations).reduce((acc, q) => acc + q, 0)
                                const totalAllocated = lotsAllocated + (Number(fulfillingRequest.generalStockAllocated) || 0)
                                const requestedQty = Number(fulfillingRequest.request.quantity) || 0
                                const isExact = totalAllocated === requestedQty
                                return (
                                    <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-black ${
                                        isExact ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-teal-50 text-teal-900 border-teal-300'
                                    }`}>
                                        <div>
                                            <span>Total Deducted:</span>
                                            {!isExact && (
                                                <span className="text-[10px] font-medium block text-teal-800">
                                                    Custom quantity: {totalAllocated} {fulfillingRequest.request.unit} (Requested: {requestedQty})
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-sm font-black">
                                            {totalAllocated} {fulfillingRequest.request.unit}
                                        </span>
                                    </div>
                                )
                            })()}

                            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setFulfillingRequest(null)}
                                    className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                                >
                                    Cancel
                                </button>
                                {(() => {
                                    const lotsAllocated = Object.values(fulfillingRequest.batchAllocations).reduce((acc, q) => acc + q, 0)
                                    const totalAllocated = lotsAllocated + (Number(fulfillingRequest.generalStockAllocated) || 0)
                                    return (
                                        <button
                                            type="button"
                                            disabled={isSubmitting || totalAllocated <= 0}
                                            onClick={handleConfirmFulfillment}
                                            className="bg-teal-800 hover:bg-teal-700 active:scale-95 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-2xs flex items-center gap-1 disabled:opacity-50"
                                        >
                                            <Check className="h-3.5 w-3.5" />
                                            <span>{isSubmitting ? 'Deducting…' : 'Confirm & Deduct Lots'}</span>
                                        </button>
                                    )
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════
                    MODAL: GIVE EXTRA / CUSTOM PROVISION TO CAMP
                ══════════════════════════════════════════════════════════ */}
                {isGiveExtraModalOpen && giveExtraTargetEvent && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs overflow-y-auto">
                        <div className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-5 shadow-2xl border border-slate-200 space-y-3.5 max-h-[92vh] overflow-y-auto my-auto animate-in fade-in">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <div className="flex items-center gap-2">
                                    <UtensilsCrossed className="h-4 w-4 text-teal-800" />
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 leading-tight">
                                            Give Custom Provision to Camp
                                        </h3>
                                        <p className="text-[10px] text-slate-500">
                                            Target: <strong>⛺ {giveExtraTargetEvent.eventTitle}</strong>
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsGiveExtraModalOpen(false)}
                                    className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                                >
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={handleGiveExtraItemToCamp} className="space-y-3">
                                {/* Item Selector with Search */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                                        Select Pantry Item *
                                    </label>
                                    <select
                                        required
                                        value={extraSelectedItemId}
                                        onChange={(e) => handleSelectExtraItem(e.target.value)}
                                        className="w-full px-3 py-2 text-xs font-black rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-teal-700 focus:outline-none cursor-pointer"
                                    >
                                        {pantryList.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.name} ({item.quantity_available} {item.unit} available)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Quantity & Unit */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                                            Quantity to Give *
                                        </label>
                                        <input
                                            type="number"
                                            min="0.1"
                                            step="any"
                                            required
                                            value={extraQuantity}
                                            onChange={(e) => {
                                                const val = e.target.value
                                                setExtraQuantity(val)
                                                // Recalculate FIFO allocations
                                                const item = pantryList.find((p) => p.id === extraSelectedItemId)
                                                if (item) {
                                                    const qtyNum = parseFloat(val) || 0
                                                    const allocations: Record<string, number> = {}
                                                    const sortedBatches = [...(item.expiry_batches || [])].sort((a, b) => {
                                                        if (!a.expiry_date) return 1
                                                        if (!b.expiry_date) return -1
                                                        return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
                                                    })
                                                    let remaining = qtyNum
                                                    sortedBatches.forEach((b) => {
                                                        const avail = Number(b.quantity) || 0
                                                        const take = Math.min(avail, remaining)
                                                        allocations[b.id] = take
                                                        remaining -= take
                                                    })
                                                    setExtraBatchAllocations(allocations)
                                                }
                                            }}
                                            className="w-full px-3 py-1.5 text-xs font-black rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-700 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                                            Unit
                                        </label>
                                        <input
                                            type="text"
                                            value={extraUnit}
                                            onChange={(e) => setExtraUnit(e.target.value)}
                                            className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-700 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Lot Allocations if item has lots */}
                                {(() => {
                                    const selectedItem = pantryList.find((p) => p.id === extraSelectedItemId)
                                    const batches = selectedItem?.expiry_batches || []
                                    if (batches.length === 0) return null

                                    return (
                                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                                                    Deduct from specific lots ({batches.length}):
                                                </span>
                                                <span className="text-[9px] text-teal-800 font-bold">
                                                    FIFO Pre-calculated
                                                </span>
                                            </div>

                                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                                                {batches.map((batch) => {
                                                    const allocated = extraBatchAllocations[batch.id] || 0
                                                    const maxQty = Number(batch.quantity) || 0
                                                    return (
                                                        <div
                                                            key={batch.id}
                                                            className={`p-2 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                                                                allocated > 0
                                                                    ? 'bg-teal-50/70 border-teal-300'
                                                                    : 'bg-white border-slate-200 opacity-70'
                                                            }`}
                                                        >
                                                            <div className="min-w-0">
                                                                <span className="font-black text-slate-800">
                                                                    {batch.brand || 'Standard'}
                                                                </span>
                                                                {batch.package_size && (
                                                                    <span className="ml-1 text-[10px] font-bold bg-amber-100 text-amber-900 px-1 py-0.1 rounded">
                                                                        {batch.package_size}
                                                                    </span>
                                                                )}
                                                                <span className="text-[10px] text-slate-400 block">
                                                                    Avail: {batch.quantity} • Exp: {formatExpiryShort(batch.expiry_date)}
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Take:</span>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max={maxQty}
                                                                    step="any"
                                                                    value={allocated}
                                                                    onChange={(e) => {
                                                                        const val = Math.max(0, Math.min(maxQty, parseFloat(e.target.value) || 0))
                                                                        setExtraBatchAllocations((prev) => ({
                                                                            ...prev,
                                                                            [batch.id]: val,
                                                                        }))
                                                                    }}
                                                                    className="w-14 px-1.5 py-1 text-xs font-black rounded-lg border border-slate-300 bg-white text-center"
                                                                />
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })()}

                                {/* Notes */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                                        Handout Reason / Notes (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Extra breakfast ration, camp snack, requested verbally…"
                                        value={extraNotes}
                                        onChange={(e) => setExtraNotes(e.target.value)}
                                        className="w-full px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-700 focus:outline-none"
                                    />
                                </div>

                                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsGiveExtraModalOpen(false)}
                                        className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || parseFloat(extraQuantity) <= 0}
                                        className="bg-teal-800 hover:bg-teal-700 active:scale-95 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-2xs flex items-center gap-1 disabled:opacity-50"
                                    >
                                        <Check className="h-3.5 w-3.5" />
                                        <span>{isSubmitting ? 'Allocating…' : 'Allocate & Deduct Stock'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════
                    MODAL: RETURN UNUSED FOOD / LOTS TO CENTRAL PANTRY
                ══════════════════════════════════════════════════════════ */}
                {returningRequest && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs overflow-y-auto">
                        <div className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-5 shadow-2xl border border-slate-200 space-y-3.5 max-h-[92vh] overflow-y-auto my-auto animate-in fade-in">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <div className="flex items-center gap-2">
                                    <RotateCcw className="h-4 w-4 text-teal-800" />
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 leading-tight">
                                            Return Unused Food to Central Pantry
                                        </h3>
                                        <p className="text-[10px] text-slate-500">
                                            {returningRequest.pantryItem.name} • From: <strong>⛺ {returningRequest.request.events?.title || 'Camp'}</strong>
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setReturningRequest(null)}
                                    className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                                >
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={handleConfirmReturn} className="space-y-3">
                                <div className="bg-teal-50/60 p-2.5 rounded-xl border border-teal-200/80 text-[11px] text-teal-950 space-y-1">
                                    <div className="flex items-center justify-between font-bold">
                                        <span>Original Handed Out:</span>
                                        <span className="text-teal-900 font-black">{returningRequest.request.quantity} {returningRequest.request.unit}</span>
                                    </div>
                                    <p className="text-[10px] text-teal-800 opacity-90">
                                        Specify how many packages/cans were returned unopened. The returned amounts will be merged directly back into the matching lot batches and central stock.
                                    </p>
                                </div>

                                {/* Return lots list with quick fill controls */}
                                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                                            Returned Packages by Lot / Expiry:
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setReturningRequest((prev) => {
                                                        if (!prev) return null
                                                        const updated = prev.returnBatches.map((b) => ({
                                                            ...b,
                                                            quantity: b.originalGiven || 0,
                                                        }))
                                                        return { ...prev, returnBatches: updated }
                                                    })
                                                }}
                                                className="text-[9px] font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 px-1.5 py-0.5 rounded-md transition-colors"
                                                title="Prefill all lots with full original given amounts"
                                            >
                                                ⚡ All Given
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setReturningRequest((prev) => {
                                                        if (!prev) return null
                                                        const updated = prev.returnBatches.map((b) => ({
                                                            ...b,
                                                            quantity: 0,
                                                        }))
                                                        return { ...prev, returnBatches: updated }
                                                    })
                                                }}
                                                className="text-[9px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded-md transition-colors"
                                                title="Zero out all returned lots"
                                            >
                                                0️⃣ Clear All
                                            </button>
                                        </div>
                                    </div>
                                    {returningRequest.returnBatches.map((batch, bIdx) => (
                                        <div
                                            key={batch.id || bIdx}
                                            className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                                                batch.quantity > 0 ? 'bg-teal-50/80 border-teal-300 shadow-2xs' : 'bg-slate-50 border-slate-200 opacity-60'
                                            }`}
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-xs font-black text-slate-900">
                                                        {batch.brand || 'Standard'}
                                                    </span>
                                                    {batch.package_size && (
                                                        <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded">
                                                            {batch.package_size}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                                                    <span>Given: <strong>{batch.originalGiven || 0}</strong></span>
                                                    {batch.expiry_date && (
                                                        <span className="font-mono text-slate-400">
                                                            Exp: {formatExpiryShort(batch.expiry_date)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Return:</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={batch.originalGiven || undefined}
                                                    step="any"
                                                    value={batch.quantity}
                                                    onChange={(e) => {
                                                        const val = Math.max(0, parseFloat(e.target.value) || 0)
                                                        setReturningRequest((prev) => {
                                                            if (!prev) return null
                                                            const updated = [...prev.returnBatches]
                                                            updated[bIdx] = { ...updated[bIdx], quantity: val }
                                                            return { ...prev, returnBatches: updated }
                                                        })
                                                    }}
                                                    className="w-16 px-2 py-1 text-xs font-black rounded-lg border border-slate-300 bg-white text-center focus:border-teal-700 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Return Notes */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                                        Return Reason / Condition Notes (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Unopened cans returned after 3-day camp, surplus dry goods…"
                                        value={returningRequest.returnNotes}
                                        onChange={(e) =>
                                            setReturningRequest((prev) => (prev ? { ...prev, returnNotes: e.target.value } : null))
                                        }
                                        className="w-full px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-700 focus:outline-none"
                                    />
                                </div>

                                {/* Total Returning Summary */}
                                {(() => {
                                    const totalReturning = returningRequest.returnBatches.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0)
                                    return (
                                        <div className="p-2.5 rounded-xl border bg-emerald-50 text-emerald-900 border-emerald-300 flex items-center justify-between text-xs font-black">
                                            <span>Total Returning to Central Stock:</span>
                                            <span className="text-sm font-black">{totalReturning} {returningRequest.request.unit}</span>
                                        </div>
                                    )
                                })()}

                                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setReturningRequest(null)}
                                        className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || returningRequest.returnBatches.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0) <= 0}
                                        className="bg-teal-800 hover:bg-teal-700 active:scale-95 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-2xs flex items-center gap-1 disabled:opacity-50"
                                    >
                                        <Check className="h-3.5 w-3.5" />
                                        <span>{isSubmitting ? 'Returning…' : 'Confirm Return to Central Stock'}</span>
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
