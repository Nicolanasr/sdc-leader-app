'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  UtensilsCrossed, Plus, Search, Filter, AlertTriangle, Check, Trash2, Edit, Loader2,
  Package, ShoppingBag, ArrowUpDown, ChevronRight, Apple, Minus, Layers
} from 'lucide-react'
import DashboardShell from '../DashboardShell'

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

export interface PantryItem {
  id: string
  group_id: string
  name: string
  category: string
  quantity_available: number
  unit: string
  min_threshold: number
  notes?: string | null
  created_at?: string
  updated_at?: string
}

interface Props {
  groupId: string
  groupName: string
  currentRole: string
  userName: string
  initialPantry: PantryItem[]
}

export default function PantryManagement({
  groupId,
  groupName,
  currentRole,
  userName,
  initialPantry,
}: Props) {
  const supabase = createClient()

  const [pantryList, setPantryList] = useState<PantryItem[]>(initialPantry)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null)
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState('grains_pasta')
  const [formQuantity, setFormQuantity] = useState('1')
  const [formUnit, setFormUnit] = useState('kg')
  const [formMinThreshold, setFormMinThreshold] = useState('2')
  const [formNotes, setFormNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Permissions
  const isGroupAdmin = ['chef_groupe', 'assistant_chef_groupe', 'configurator'].includes(currentRole)
  const isProvisionsLeader = currentRole === 'amin_mounet_group' || currentRole === 'mas2oul_mounet' || isGroupAdmin

  const showStatus = (text: string, type: 'success' | 'error') => {
    setStatusMessage({ text, type })
    setTimeout(() => setStatusMessage(null), 6000)
  }

  // Filtered items
  const filteredItems = useMemo(() => {
    return pantryList.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false
      if (filterLowStockOnly && item.quantity_available > (item.min_threshold || 0)) return false
      if (search.trim()) {
        const query = search.toLowerCase()
        const matchName = item.name.toLowerCase().includes(query)
        const matchCategory = item.category.toLowerCase().includes(query)
        const matchNotes = (item.notes || '').toLowerCase().includes(query)
        if (!matchName && !matchCategory && !matchNotes) return false
      }
      return true
    })
  }, [pantryList, selectedCategory, filterLowStockOnly, search])

  // Low stock counter
  const lowStockCount = useMemo(() => {
    return pantryList.filter((i) => i.quantity_available <= (i.min_threshold || 0)).length
  }, [pantryList])

  // Fast stock stepper (+1 / -1)
  const handleQuickAdjustStock = async (item: PantryItem, delta: number) => {
    if (!isProvisionsLeader) return
    const newQty = Math.max(0, Number(item.quantity_available) + delta)

    setPantryList((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, quantity_available: newQty } : i))
    )

    const { error } = await supabase
      .from('group_pantry_items')
      .update({ quantity_available: newQty, updated_at: new Date().toISOString() })
      .eq('id', item.id)

    if (error) {
      showStatus('Failed to update quantity.', 'error')
      // Rollback
      setPantryList((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, quantity_available: item.quantity_available } : i))
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
    setFormNotes('')
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (item: PantryItem) => {
    setEditingItem(item)
    setFormName(item.name)
    setFormCategory(item.category)
    setFormQuantity(String(item.quantity_available))
    setFormUnit(item.unit)
    setFormMinThreshold(String(item.min_threshold || 0))
    setFormNotes(item.notes || '')
    setIsModalOpen(true)
  }

  const handleSavePantryItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      showStatus('Please enter an item name.', 'error')
      return
    }

    setIsSubmitting(true)
    const qty = parseFloat(formQuantity) || 0
    const minThresh = parseFloat(formMinThreshold) || 0

    try {
      if (editingItem) {
        // Update
        const { data, error } = await supabase
          .from('group_pantry_items')
          .update({
            name: formName.trim(),
            category: formCategory,
            quantity_available: qty,
            unit: formUnit,
            min_threshold: minThresh,
            notes: formNotes.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingItem.id)
          .select('*')
          .single()

        if (error) throw error
        setPantryList((prev) => prev.map((i) => (i.id === data.id ? data : i)))
        showStatus(`Updated "${data.name}" successfully!`, 'success')
      } else {
        // Insert
        const { data, error } = await supabase
          .from('group_pantry_items')
          .insert({
            group_id: groupId,
            name: formName.trim(),
            category: formCategory,
            quantity_available: qty,
            unit: formUnit,
            min_threshold: minThresh,
            notes: formNotes.trim() || null,
          })
          .select('*')
          .single()

        if (error) throw error
        setPantryList((prev) => [data, ...prev])
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

    const { error } = await supabase.from('group_pantry_items').delete().eq('id', itemId)
    if (error) {
      showStatus(error.message, 'error')
    } else {
      setPantryList((prev) => prev.filter((i) => i.id !== itemId))
      showStatus(`Deleted "${itemName}" from pantry.`, 'success')
    }
  }

  return (
    <DashboardShell groupName={groupName} currentRole={currentRole} userName={userName}>
      <div className="w-full pb-16 space-y-4">
        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 ${
              statusMessage.type === 'success'
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
                <span>Group Central Pantry</span>
                <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                  مؤونة الفوج
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Bulk non-perishable consumables stock, grains, canned supplies, oils, and hygiene for camps.
              </p>
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

        {/* ── METRICS & SUMMARY BAR ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Items</span>
            <span className="text-xl font-black text-slate-900">{pantryList.length}</span>
          </div>

          <div
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={`p-3.5 rounded-2xl border shadow-2xs space-y-0.5 cursor-pointer transition-all ${
              lowStockCount > 0
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

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Categories</span>
            <span className="text-xl font-black text-slate-900">{PANTRY_CATEGORIES.length}</span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lead Manager</span>
            <span className="text-xs font-black text-teal-900 truncate block">
              {isProvisionsLeader ? 'Authorized Leader' : 'Quartermaster / Food Lead'}
            </span>
          </div>
        </div>

        {/* ── SEARCH & CATEGORY PILLS ── */}
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

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({pantryList.length})
            </button>

            {PANTRY_CATEGORIES.map((cat) => {
              const count = pantryList.filter((i) => i.category === cat.id).length
              const isSel = selectedCategory === cat.id

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSel
                      ? 'bg-teal-800 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSel ? 'bg-teal-900 text-teal-200' : 'bg-slate-200 text-slate-700'
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
            <p className="font-bold text-slate-700 text-sm">No pantry items found.</p>
            <p className="text-xs text-slate-400">
              {search ? 'Try adjusting your search filters.' : 'Click "Add Stock Item" to add bulk goods to the central pantry.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredItems.map((item) => {
              const catObj = PANTRY_CATEGORIES.find((c) => c.id === item.category)
              const isLowStock = item.quantity_available <= (item.min_threshold || 0)

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border p-4 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between gap-3 ${
                    isLowStock ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Category & Low Stock Badges */}
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        catObj?.color || 'bg-slate-100 text-slate-800 border-slate-200'
                      }`}>
                        {catObj?.label || item.category}
                      </span>

                      {isLowStock && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Low Stock</span>
                        </span>
                      )}
                    </div>

                    {/* Title & Notes */}
                    <div>
                      <h3 className="font-black text-slate-900 text-sm leading-snug">
                        {item.name}
                      </h3>
                      {catObj?.ar && (
                        <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                          {catObj.ar}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-[11px] text-slate-500 mt-1 italic line-clamp-2">
                          {item.notes}
                        </p>
                      )}
                    </div>

                    {/* Stock Value & Minimum Threshold */}
                    <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">In Stock</span>
                        <div className="flex items-baseline gap-1">
                          <span className={`text-xl font-black ${isLowStock ? 'text-rose-700' : 'text-teal-900'}`}>
                            {item.quantity_available}
                          </span>
                          <span className="text-xs font-bold text-slate-500">{item.unit}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Min Alert</span>
                        <span className="text-xs font-bold text-slate-600">
                          {item.min_threshold || 0} {item.unit}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fast Stock Steppers & Actions */}
                  {isProvisionsLeader && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleQuickAdjustStock(item, -1)}
                          disabled={item.quantity_available <= 0}
                          className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 active:scale-95 disabled:opacity-40 flex items-center justify-center text-slate-700 font-black shadow-2xs"
                          title="Decrease stock by 1"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="px-1.5 text-xs font-black text-slate-800">
                          {item.quantity_available}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuickAdjustStock(item, 1)}
                          className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 active:scale-95 flex items-center justify-center text-slate-700 font-black shadow-2xs"
                          title="Increase stock by 1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-800 hover:bg-slate-100 transition-colors"
                          title="Edit item details"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePantryItem(item.id, item.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── CREATE / EDIT MODAL ── */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto -mt-1 mb-2 sm:hidden shrink-0" />
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="h-5 w-5 text-teal-700" />
                  <h3 className="text-sm font-black text-slate-900">
                    {editingItem ? 'Edit Pantry Stock Item' : 'Add Central Pantry Item'}
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
                    placeholder="e.g. Basmati Rice, Canned Tuna, Olive Oil…"
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
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-bold bg-white"
                    >
                      {PANTRY_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Measurement Unit *</label>
                    <select
                      value={formUnit}
                      onChange={(e) => setFormUnit(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-bold bg-white"
                    >
                      <option value="kg">kg (Kilograms)</option>
                      <option value="g">g (Grams)</option>
                      <option value="cans">cans (علبة)</option>
                      <option value="pieces">pieces (حبة)</option>
                      <option value="packs">packs (كيس / مغلف)</option>
                      <option value="liters">liters (ليتر)</option>
                      <option value="loaves">loaves (ربطة خبز)</option>
                      <option value="gallons">gallons (غالون)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Quantity in Stock *</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={formQuantity}
                      onChange={(e) => setFormQuantity(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-bold text-teal-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Min Threshold Alert</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={formMinThreshold}
                      onChange={(e) => setFormMinThreshold(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Storage Notes / Brand (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Depot Shelf C2, Expiry Dec 2027, Lebanese Brand…"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-medium"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs shadow-2xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    <span>{editingItem ? 'Save Changes' : 'Add to Pantry'}</span>
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
