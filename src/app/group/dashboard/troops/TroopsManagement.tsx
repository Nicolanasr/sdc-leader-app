'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import DashboardShell from '../DashboardShell'
import { Menu, X, Plus, Users, Landmark, Layers, Edit, Trash2 } from 'lucide-react'

interface Troop {
  id: string
  name: string
  sectionName: string
  section_type_id?: string | null
}

interface SectionType {
  id: string
  name: string
}

interface Props {
  initialTroops: Troop[]
  sections: SectionType[]
  groupName: string
  groupId: string
  currentRole: string
  userName?: string
}

export default function TroopsManagement({
  initialTroops,
  sections,
  groupName,
  groupId,
  currentRole,
  userName,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [troops, setTroops] = useState<Troop[]>(initialTroops)

  // Creation & Edit modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTroop, setEditingTroop] = useState<Troop | null>(null)
  
  const [newTroopName, setNewTroopName] = useState('')
  const [sectionTypeId, setSectionTypeId] = useState('')
  const [editTroopName, setEditTroopName] = useState('')
  const [editSectionTypeId, setEditSectionTypeId] = useState('')

  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const showStatus = (text: string, type: 'success' | 'error') => {
    setStatusMessage({ text, type })
    setTimeout(() => setStatusMessage(null), 5000)
  }

  // Handle Logout
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Create Troop
  const handleCreateTroop = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTroopName.trim()) return

    setLoading(true)
    const { data, error } = await supabase
      .from('troops')
      .insert({
        name: newTroopName.trim(),
        group_id: groupId,
        section_type_id: sectionTypeId || null,
      })
      .select()

    setLoading(false)
    if (error) {
      showStatus(error.message, 'error')
    } else if (data) {
      const addedSectionName = sections.find((s) => s.id === sectionTypeId)?.name || 'Leadership & Council Unit'
      setTroops([
        ...troops,
        {
          id: data[0].id,
          name: data[0].name,
          sectionName: addedSectionName,
          section_type_id: sectionTypeId || null,
        },
      ])
      setNewTroopName('')
      setSectionTypeId('')
      setShowCreateModal(false)
      showStatus('Troop unit created successfully!', 'success')
    }
  }

  // Delete Troop
  const handleDeleteTroop = async (troop: Troop) => {
    if (!confirm(`Are you sure you want to delete "${troop.name}"?`)) return
    setLoading(true)
    const { error } = await supabase.from('troops').delete().eq('id', troop.id)
    setLoading(false)
    if (error) {
      showStatus(error.message, 'error')
    } else {
      setTroops((prev) => prev.filter((t) => t.id !== troop.id))
      showStatus('Troop unit deleted successfully.', 'success')
    }
  }

  // Save Edit Troop
  const handleSaveEditTroop = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTroop || !editTroopName.trim()) return

    setLoading(true)
    const { error } = await supabase
      .from('troops')
      .update({
        name: editTroopName.trim(),
        section_type_id: editSectionTypeId || null,
      })
      .eq('id', editingTroop.id)

    setLoading(false)
    if (error) {
      showStatus(error.message, 'error')
    } else {
      const addedSectionName = sections.find((s) => s.id === editSectionTypeId)?.name || 'Leadership & Council Unit'
      setTroops((prev) =>
        prev.map((t) =>
          t.id === editingTroop.id
            ? { ...t, name: editTroopName.trim(), sectionName: addedSectionName, section_type_id: editSectionTypeId || null }
            : t
        )
      )
      setShowEditModal(false)
      showStatus('Troop unit updated successfully!', 'success')
    }
  }

  const canManage = currentRole === 'chef_groupe' || currentRole === 'amin_serr_group'

  return (
    <DashboardShell groupName={groupName} currentRole={currentRole} userName={userName}>
        {statusMessage && (
            <div
              className={`mb-6 p-4 rounded-xl border text-sm text-center ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                  : 'bg-rose-50 border-rose-100 text-rose-800'
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Units & Troops</h2>
            {canManage && (
              <button
                onClick={() => {
                  setNewTroopName('')
                  setSectionTypeId('')
                  setShowCreateModal(true)
                }}
                className="inline-flex items-center gap-2 bg-teal-700 hover:bg-teal-600 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors text-xs"
              >
                <Plus className="h-4 w-4" />
                Create Unit / Troop
              </button>
            )}
          </header>

          <div className="space-y-6">
            <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Active Scout Units & Divisions</h3>
                <span className="text-xs font-semibold text-slate-400">{troops.length} Units</span>
              </div>
              <div className="divide-y divide-slate-100">
                {troops.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">No units or troops defined yet.</div>
                ) : (
                  troops.map((troop) => (
                    <div key={troop.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-slate-50/50 transition-colors">
                      <div>
                        <h4 className="font-bold text-slate-950 text-base">{troop.name}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">Unit ID: <span className="font-mono text-slate-500">{troop.id}</span></p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-teal-50 text-teal-800 border border-teal-100 shadow-xs">
                          {troop.sectionName}
                        </span>
                        {canManage && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingTroop(troop)
                                setEditTroopName(troop.name)
                                setEditSectionTypeId(troop.section_type_id || '')
                                setShowEditModal(true)
                              }}
                              className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                              title="Edit Troop Unit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTroop(troop)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Troop Unit"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

      {/* Create Troop Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-md p-4 sm:p-6 border border-slate-200 rounded-2xl shadow-xl space-y-4 max-h-[88vh] overflow-y-auto my-auto relative">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Create New Troop / Unit</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTroop} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Troop Unit Name</label>
                <input
                  type="text"
                  value={newTroopName}
                  onChange={(e) => setNewTroopName(e.target.value)}
                  required
                  placeholder="e.g. Troop Saint Marc or قيادة الفوج"
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Section Type</label>
                <select
                  value={sectionTypeId}
                  onChange={(e) => setSectionTypeId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none sm:text-sm"
                >
                  <option value="">-- Leadership / Council Unit (قيادة الفوج) --</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 bg-teal-700 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-xl text-xs shadow transition-colors disabled:bg-slate-300"
                >
                  {loading ? 'Creating…' : 'Create Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Troop Modal */}
      {showEditModal && editingTroop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-md p-4 sm:p-6 border border-slate-200 rounded-2xl shadow-xl space-y-4 max-h-[88vh] overflow-y-auto my-auto relative">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Edit Troop Unit</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTroop} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Troop Unit Name</label>
                <input
                  type="text"
                  value={editTroopName}
                  onChange={(e) => setEditTroopName(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Section Type</label>
                <select
                  value={editSectionTypeId}
                  onChange={(e) => setEditSectionTypeId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none sm:text-sm"
                >
                  <option value="">-- Leadership / Council Unit (قيادة الفوج) --</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="w-1/2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 bg-teal-700 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-xl text-xs shadow transition-colors disabled:bg-slate-300"
                >
                  {loading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
