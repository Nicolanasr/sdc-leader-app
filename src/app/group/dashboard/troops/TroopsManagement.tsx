'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Menu, X, Plus, Users, Landmark, Layers } from 'lucide-react'

interface Troop {
  id: string
  name: string
  sectionName: string
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

  // Creation states
  const [newTroopName, setNewTroopName] = useState('')
  const [sectionTypeId, setSectionTypeId] = useState('')

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
      const addedSectionName = sections.find((s) => s.id === sectionTypeId)?.name || 'Global (General)'
      setTroops([
        ...troops,
        {
          id: data[0].id,
          name: data[0].name,
          sectionName: addedSectionName,
        },
      ])
      setNewTroopName('')
      setSectionTypeId('')
      showStatus('Troop unit created successfully!', 'success')
      router.refresh()
    }
  }

  const canManage = currentRole === 'chef_groupe' || currentRole === 'amin_serr_group'

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden relative">
      {/* Mobile Menu Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-teal-900 text-white flex flex-col justify-between transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          <div className="p-6 border-b border-teal-800 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold tracking-tight">{groupName}</h1>
              <p className="text-xs text-teal-300 mt-1">Group Dashboard</p>
            </div>
            <button className="md:hidden text-teal-200" onClick={() => setIsMobileOpen(false)}>
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="p-4 space-y-1">
            <Link
              href="/group/dashboard"
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-semibold text-teal-100 hover:bg-teal-800 hover:text-white transition-colors"
            >
              <Landmark className="h-4 w-4" />
              Dashboard Overview
            </Link>
            <Link
              href="/group/dashboard/leaders"
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-semibold text-teal-100 hover:bg-teal-800 hover:text-white transition-colors"
            >
              <Users className="h-4 w-4" />
              Leaders & Council
            </Link>
            <Link
              href="/group/dashboard/troops"
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-semibold bg-teal-700 text-white"
            >
              <Layers className="h-4 w-4" />
              Units / Troops
            </Link>
            <Link
              href="/group/dashboard/members"
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-semibold text-teal-100 hover:bg-teal-800 hover:text-white transition-colors"
            >
              <Users className="h-4 w-4" />
              Youth Roster
            </Link>
            <div className="pt-4 pb-2 px-4 text-xs font-semibold text-teal-400 uppercase tracking-wider">
              Modules (Read-Only)
            </div>
            <div className="px-4 py-2 text-xs text-teal-300 italic">
              Financials and inventory sub-pages will appear here in the next dev phase.
            </div>
          </nav>
        </div>
        <div className="p-4 border-t border-teal-800">
          <button
            onClick={handleLogout}
            className="w-full text-center px-4 py-2 rounded-lg text-sm font-semibold text-teal-200 hover:bg-teal-800 hover:text-white transition-colors"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main dashboard content */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Header toolbar for Mobile */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between md:justify-end">
          <button className="md:hidden text-teal-900 p-1 focus:outline-none" onClick={() => setIsMobileOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <div className="text-right">
            <span className="text-xs text-slate-400 font-semibold block uppercase">Logged in as</span>
            <span className="text-sm font-bold text-teal-750">{userName || currentRole.replace(/_/g, ' ')}</span>
          </div>
        </header>

        <div className="px-3 sm:px-6 py-4 flex-1 space-y-4">
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

          <header className="mb-8">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Units & Troops</h2>
            <p className="text-sm text-slate-500 mt-1">
              Configure and view the active troops, units, and scout divisions for {groupName}.
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* List directory of current troops */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-800">Active Scout Units</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {troops.map((troop) => (
                    <div key={troop.id} className="p-6 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                      <div>
                        <h4 className="font-bold text-slate-950">{troop.name}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">ID: {troop.id}</p>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-100 shadow-xs">
                        Section: {troop.sectionName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Creation form card */}
            {canManage && (
              <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm self-start">
                <h3 className="text-lg font-semibold text-teal-800 mb-2">Create New Unit / Troop</h3>
                <p className="text-xs text-slate-500 mb-6">
                  Add a new troop unit and map it to an age section.
                </p>
                <form onSubmit={handleCreateTroop} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Troop Unit Name</label>
                    <input
                      type="text"
                      value={newTroopName}
                      onChange={(e) => setNewTroopName(e.target.value)}
                      required
                      placeholder="e.g. Troop Saint Marc"
                      className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Select Section Type</label>
                    <select
                      value={sectionTypeId}
                      onChange={(e) => setSectionTypeId(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                    >
                      <option value="">-- No Specific Section (Global Roster) --</option>
                      {sections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-teal-700 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-teal-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    Create Unit / Troop
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
