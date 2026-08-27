'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Menu, X, Shield, Award, Briefcase, Plus, Users, Landmark, Layers, Key } from 'lucide-react'

interface Commissariat {
  id: string
  name: string
}

interface Group {
  id: string
  name: string
  commissariat_id: string
}

interface SectionType {
  id: string
  name: string
  min_age: number | null
  max_age: number | null
}

interface Rank {
  id: string
  name: string
}

interface Responsibility {
  id: string
  name: string
}

interface Role {
  id: string
  name: string
  permission_scope: string
}

interface UserProfileRole {
  groups: any
  roles: any
}

interface UserProfile {
  id: string
  full_name: string
  email: string
  rank: string
  user_roles: UserProfileRole[]
}

interface Props {
  initialCommissariats: Commissariat[]
  initialGroups: Group[]
  initialSections: SectionType[]
  initialRanks: Rank[]
  initialResponsibilities: Responsibility[]
  initialRoles: Role[]
  initialProfiles: UserProfile[]
}

type TabType = 'commissariats' | 'groups' | 'sections' | 'ranks' | 'responsibilities' | 'roles' | 'leaders' | 'onboard'

export default function ConfiguratorDashboard({
  initialCommissariats,
  initialGroups,
  initialSections,
  initialRanks,
  initialResponsibilities,
  initialRoles,
  initialProfiles,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  // Mobile menu control
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('commissariats')

  // Lists state
  const [commissariats, setCommissariats] = useState<Commissariat[]>(initialCommissariats)
  const [groups, setGroups] = useState<Group[]>(initialGroups)
  const [sections, setSections] = useState<SectionType[]>(initialSections)
  const [ranks, setRanks] = useState<Rank[]>(initialRanks)
  const [responsibilities, setResponsibilities] = useState<Responsibility[]>(initialResponsibilities)
  const [roles, setRoles] = useState<Role[]>(initialRoles)
  const [profiles, setProfiles] = useState<UserProfile[]>(initialProfiles)

  // Form states
  const [commissariatName, setCommissariatName] = useState('')
  const [groupName, setGroupName] = useState('')
  const [groupCommissariatId, setGroupCommissariatId] = useState('')

  const [sectionName, setSectionName] = useState('')
  const [sectionMinAge, setSectionMinAge] = useState('')
  const [sectionMaxAge, setSectionMaxAge] = useState('')

  // Ranks form state
  const [newRankName, setNewRankName] = useState('')

  // Responsibilities form state
  const [newRespName, setNewRespName] = useState('')

  // Custom Roles form state
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleScope, setNewRoleScope] = useState('group_leader')

  // Onboard leader form state
  const [leaderEmail, setLeaderEmail] = useState('')
  const [leaderName, setLeaderName] = useState('')
  const [leaderRank, setLeaderRank] = useState(initialRanks[0]?.name || 'Woodbadge')
  const [leaderGroupId, setLeaderGroupId] = useState('')

  // Password reset state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUserName, setSelectedUserName] = useState('')
  const [overridePassword, setOverridePassword] = useState('')
  const [showResetModal, setShowResetModal] = useState(false)

  // Loading/Status states
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [loading, setLoading] = useState(false)

  const showStatus = (text: string, type: 'success' | 'error') => {
    setStatusMessage({ text, type })
    setTimeout(() => setStatusMessage(null), 7000)
  }

  // Handle Logout
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Add Commissariat
  const handleAddCommissariat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commissariatName.trim()) return

    setLoading(true)
    const { data, error } = await supabase
      .from('commissariats')
      .insert({ name: commissariatName })
      .select()

    setLoading(false)
    if (error) {
      showStatus(error.message, 'error')
    } else if (data) {
      setCommissariats([...commissariats, data[0]])
      setCommissariatName('')
      showStatus('Commissariat created successfully!', 'success')
      router.refresh()
    }
  }

  // Add Group
  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim() || !groupCommissariatId) return

    setLoading(true)
    const { data, error } = await supabase
      .from('groups')
      .insert({ name: groupName, commissariat_id: groupCommissariatId })
      .select()

    setLoading(false)
    if (error) {
      showStatus(error.message, 'error')
    } else if (data) {
      setGroups([...groups, data[0]])
      setGroupName('')
      showStatus('Group created successfully!', 'success')
      router.refresh()
    }
  }

  // Add Section Type
  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sectionName.trim()) return

    setLoading(true)
    const { data, error } = await supabase
      .from('section_types')
      .insert({
        name: sectionName,
        min_age: sectionMinAge ? parseInt(sectionMinAge) : null,
        max_age: sectionMaxAge ? parseInt(sectionMaxAge) : null,
      })
      .select()

    setLoading(false)
    if (error) {
      showStatus(error.message, 'error')
    } else if (data) {
      setSections([...sections, data[0]])
      setSectionName('')
      setSectionMinAge('')
      setSectionMaxAge('')
      showStatus('Section type created successfully!', 'success')
      router.refresh()
    }
  }

  // Add Rank
  const handleAddRank = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRankName.trim()) return

    setLoading(true)
    const { data, error } = await supabase
      .from('ranks')
      .insert({ name: newRankName.trim() })
      .select()

    setLoading(false)
    if (error) {
      showStatus(error.message, 'error')
    } else if (data) {
      setRanks([...ranks, data[0]])
      setNewRankName('')
      showStatus('Leader rank created successfully!', 'success')
      router.refresh()
    }
  }

  // Add Responsibility
  const handleAddResponsibility = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRespName.trim()) return

    setLoading(true)
    const { data, error } = await supabase
      .from('responsibilities')
      .insert({ name: newRespName.trim() })
      .select()

    setLoading(false)
    if (error) {
      showStatus(error.message, 'error')
    } else if (data) {
      setResponsibilities([...responsibilities, data[0]])
      setNewRespName('')
      showStatus('Responsibility created successfully!', 'success')
      router.refresh()
    }
  }

  // Add Custom Role
  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoleName.trim() || !newRoleScope) return

    setLoading(true)
    const { data, error } = await supabase
      .from('roles')
      .insert({ name: newRoleName.trim(), permission_scope: newRoleScope })
      .select()

    setLoading(false)
    if (error) {
      showStatus(error.message, 'error')
    } else if (data) {
      setRoles([...roles, data[0]])
      setNewRoleName('')
      showStatus('Permission role created successfully!', 'success')
      router.refresh()
    }
  }

  // Onboard Chef de Groupe
  const handleOnboardLeader = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leaderEmail || !leaderName || !leaderGroupId) return

    setLoading(true)
    try {
      const res = await fetch('/api/onboard-leader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: leaderEmail,
          fullName: leaderName,
          rank: leaderRank,
          groupId: leaderGroupId,
        }),
      })

      const result = await res.json()
      setLoading(false)

      if (!res.ok) {
        showStatus(result.error || 'Failed to onboard leader', 'error')
      } else {
        setLeaderEmail('')
        setLeaderName('')
        showStatus(`Chef de Groupe onboarded successfully! Temporary Password: ${result.tempPassword}`, 'success')
        router.refresh()
      }
    } catch (err: any) {
      setLoading(false)
      showStatus(err.message || 'Network error occurred', 'error')
    }
  }

  // Override User Password
  const handleOverridePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserId || !overridePassword) return

    setLoading(true)
    try {
      const res = await fetch('/api/configurator/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          newPassword: overridePassword,
        }),
      })

      const result = await res.json()
      setLoading(false)

      if (!res.ok) {
        showStatus(result.error || 'Failed to update user password.', 'error')
      } else {
        setShowResetModal(false)
        setOverridePassword('')
        setSelectedUserId(null)
        showStatus(`Password for ${selectedUserName} has been reset successfully!`, 'success')
      }
    } catch (err: any) {
      setLoading(false)
      showStatus(err.message || 'Network error occurred', 'error')
    }
  }

  const navigateTab = (tab: TabType) => {
    setActiveTab(tab)
    setIsMobileOpen(false) // Close menu drawer on mobile
  }

  const openResetModal = (id: string, name: string) => {
    setSelectedUserId(id)
    setSelectedUserName(name)
    setOverridePassword('')
    setShowResetModal(true)
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden relative">
      {/* Mobile Menu Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden transition-opacity"
        />
      )}

      {/* Password Reset Overlay Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md p-6 border border-slate-200 rounded-2xl shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Key className="h-5 w-5 text-teal-700" />
                Change Password
              </h3>
              <button onClick={() => setShowResetModal(false)} className="text-slate-450 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Update password for <span className="font-semibold text-slate-700">{selectedUserName}</span>. This will force them to change it again on next login.
            </p>
            <form onSubmit={handleOverridePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">New Password</label>
                <input
                  type="password"
                  value={overridePassword}
                  onChange={(e) => setOverridePassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 border border-slate-250 rounded-lg text-slate-700 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-lg text-sm font-semibold shadow disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sidebar navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-teal-900 text-white flex flex-col justify-between transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="p-6 border-b border-teal-800 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold tracking-tight">SDC Manager</h1>
              <p className="text-xs text-teal-300 mt-1">Configurator Panel</p>
            </div>
            <button className="md:hidden text-teal-200" onClick={() => setIsMobileOpen(false)}>
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="p-4 space-y-1">
            <button
              onClick={() => navigateTab('commissariats')}
              className={`flex items-center gap-3 w-full text-left px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'commissariats' ? 'bg-teal-700 text-white' : 'text-teal-100 hover:bg-teal-800'
              }`}
            >
              <Landmark className="h-4 w-4" />
              Commissariats
            </button>
            <button
              onClick={() => navigateTab('groups')}
              className={`flex items-center gap-3 w-full text-left px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'groups' ? 'bg-teal-700 text-white' : 'text-teal-100 hover:bg-teal-800'
              }`}
            >
              <Users className="h-4 w-4" />
              Scout Groups
            </button>
            <button
              onClick={() => navigateTab('sections')}
              className={`flex items-center gap-3 w-full text-left px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'sections' ? 'bg-teal-700 text-white' : 'text-teal-100 hover:bg-teal-800'
              }`}
            >
              <Layers className="h-4 w-4" />
              Dynamic Sections
            </button>
            <button
              onClick={() => navigateTab('ranks')}
              className={`flex items-center gap-3 w-full text-left px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'ranks' ? 'bg-teal-700 text-white' : 'text-teal-100 hover:bg-teal-800'
              }`}
            >
              <Award className="h-4 w-4" />
              Configurable Ranks
            </button>
            <button
              onClick={() => navigateTab('responsibilities')}
              className={`flex items-center gap-3 w-full text-left px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'responsibilities' ? 'bg-teal-700 text-white' : 'text-teal-100 hover:bg-teal-800'
              }`}
            >
              <Briefcase className="h-4 w-4" />
              Responsibilities
            </button>
            <button
              onClick={() => navigateTab('roles')}
              className={`flex items-center gap-3 w-full text-left px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'roles' ? 'bg-teal-700 text-white' : 'text-teal-100 hover:bg-teal-800'
              }`}
            >
              <Shield className="h-4 w-4" />
              System Roles
            </button>
            <button
              onClick={() => navigateTab('leaders')}
              className={`flex items-center gap-3 w-full text-left px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'leaders' ? 'bg-teal-700 text-white' : 'text-teal-100 hover:bg-teal-800'
              }`}
            >
              <Users className="h-4 w-4" />
              Leaders & Security
            </button>
            <button
              onClick={() => navigateTab('onboard')}
              className={`flex items-center gap-3 w-full text-left px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'onboard' ? 'bg-teal-700 text-white' : 'text-teal-100 hover:bg-teal-800'
              }`}
            >
              <Plus className="h-4 w-4" />
              Onboard Group Leader
            </button>
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
            <span className="text-sm font-bold text-teal-750">Configurator</span>
          </div>
        </header>

        <div className="p-6 md:p-8 flex-1">
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

          {/* Tab 1: Commissariats */}
          {activeTab === 'commissariats' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold tracking-tight text-slate-800">Regional Commissariats</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm self-start">
                  <h3 className="text-lg font-semibold mb-4 text-teal-800">Add Commissariat</h3>
                  <form onSubmit={handleAddCommissariat} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Commissariat Name</label>
                      <input
                        type="text"
                        value={commissariatName}
                        onChange={(e) => setCommissariatName(e.target.value)}
                        required
                        placeholder="e.g. Commissariat de Beyrouth"
                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-teal-700 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-teal-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      Create Regional Scope
                    </button>
                  </form>
                </div>
                <div className="lg:col-span-2 bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 text-teal-800">Registered Commissariats</h3>
                  {commissariats.length === 0 ? (
                    <p className="text-slate-400 text-sm">No regional commissariats added yet.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {commissariats.map((c) => (
                        <li key={c.id} className="py-3 text-sm font-medium text-slate-700">
                          {c.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Scout Groups */}
          {activeTab === 'groups' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold tracking-tight text-slate-800">Scout Groups</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm self-start">
                  <h3 className="text-lg font-semibold mb-4 text-teal-800">Add Scout Group</h3>
                  <form onSubmit={handleAddGroup} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Scout Group Name</label>
                      <input
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        required
                        placeholder="e.g. Groupe Saint Jean Marc"
                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Select Region</label>
                      <select
                        value={groupCommissariatId}
                        onChange={(e) => setGroupCommissariatId(e.target.value)}
                        required
                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                      >
                        <option value="">-- Select Regional Scope --</option>
                        {commissariats.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-teal-700 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-teal-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      Create Scout Group
                    </button>
                  </form>
                </div>
                <div className="lg:col-span-2 bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 text-teal-800">Registered Groups</h3>
                  {groups.length === 0 ? (
                    <p className="text-slate-400 text-sm">No scout groups added yet.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {groups.map((g) => (
                        <li key={g.id} className="py-3 flex justify-between items-center text-sm font-medium text-slate-700">
                          <span>{g.name}</span>
                          <span className="text-xs text-slate-400">
                            Region: {commissariats.find((c) => c.id === g.commissariat_id)?.name || 'Unknown'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Dynamic Sections */}
          {activeTab === 'sections' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold tracking-tight text-slate-800">Dynamic Sections</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm self-start">
                  <h3 className="text-lg font-semibold mb-4 text-teal-800">Add Section Type</h3>
                  <form onSubmit={handleAddSection} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Section Name</label>
                      <input
                        type="text"
                        value={sectionName}
                        onChange={(e) => setSectionName(e.target.value)}
                        required
                        placeholder="e.g. Kechefe"
                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Min Age (Years)</label>
                        <input
                          type="number"
                          value={sectionMinAge}
                          onChange={(e) => setSectionMinAge(e.target.value)}
                          placeholder="e.g. 12"
                          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Max Age (Years)</label>
                        <input
                          type="number"
                          value={sectionMaxAge}
                          onChange={(e) => setSectionMaxAge(e.target.value)}
                          placeholder="e.g. 16"
                          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-teal-700 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-teal-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      Create Section
                    </button>
                  </form>
                </div>
                <div className="lg:col-span-2 bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 text-teal-800">Dynamic Section Classifications</h3>
                  {sections.length === 0 ? (
                    <p className="text-slate-400 text-sm">No sections configured yet.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {sections.map((s) => (
                        <li key={s.id} className="py-3 flex justify-between items-center text-sm font-medium text-slate-700">
                          <span>{s.name}</span>
                          <span className="text-xs text-slate-400">
                            {s.min_age !== null && s.max_age !== null
                              ? `Suggested Age: ${s.min_age} - ${s.max_age} years`
                              : 'No age boundaries'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Configurable Ranks */}
          {activeTab === 'ranks' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold tracking-tight text-slate-800">Configurable Leader Ranks</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm self-start">
                  <h3 className="text-lg font-semibold mb-4 text-teal-800">Add Leader Rank</h3>
                  <form onSubmit={handleAddRank} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Rank Name</label>
                      <input
                        type="text"
                        value={newRankName}
                        onChange={(e) => setNewRankName(e.target.value)}
                        required
                        placeholder="e.g. Woodbadge"
                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-teal-700 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-teal-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      Create Rank
                    </button>
                  </form>
                </div>
                <div className="lg:col-span-2 bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 text-teal-800">Registered Ranks</h3>
                  {ranks.length === 0 ? (
                    <p className="text-slate-400 text-sm">No ranks configured yet.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {ranks.map((r) => (
                        <li key={r.id} className="py-3 text-sm font-medium text-slate-700">
                          {r.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Responsibilities */}
          {activeTab === 'responsibilities' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold tracking-tight text-slate-800">Responsibilities (Mahemm)</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm self-start">
                  <h3 className="text-lg font-semibold mb-4 text-teal-800">Add Responsibility</h3>
                  <form onSubmit={handleAddResponsibility} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Responsibility Name</label>
                      <input
                        type="text"
                        value={newRespName}
                        onChange={(e) => setNewRespName(e.target.value)}
                        required
                        placeholder="e.g. Group Treasurer"
                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-teal-700 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-teal-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      Create Responsibility
                    </button>
                  </form>
                </div>
                <div className="lg:col-span-2 bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 text-teal-800">Registered Responsibilities</h3>
                  {responsibilities.length === 0 ? (
                    <p className="text-slate-400 text-sm">No responsibilities configured yet.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {responsibilities.map((r) => (
                        <li key={r.id} className="py-3 text-sm font-medium text-slate-700">
                          {r.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 6: System Roles */}
          {activeTab === 'roles' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold tracking-tight text-slate-800">System Permission Roles</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm self-start">
                  <h3 className="text-lg font-semibold mb-4 text-teal-800">Add System Role</h3>
                  <form onSubmit={handleAddRole} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Role Name</label>
                      <input
                        type="text"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        required
                        placeholder="e.g. Assistant Treasurer"
                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Permission Scope (RLS Scope)</label>
                      <select
                        value={newRoleScope}
                        onChange={(e) => setNewRoleScope(e.target.value)}
                        required
                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                      >
                        <option value="configurator">Configurator (System Admin)</option>
                        <option value="chef_groupe">Chef de Groupe (Group Leader)</option>
                        <option value="assistant_chef_groupe">Assistant Chef de Groupe</option>
                        <option value="amin_serr_group">Amin Serr (Group Secretary)</option>
                        <option value="amin_sandou2_group">Amin Sandou2 (Group Treasurer)</option>
                        <option value="amin_tejhizet_group">Amin Tejhizet (Group Quartermaster)</option>
                        <option value="mas2oul_toswir">Mas2oul Toswir (Media)</option>
                        <option value="mas2oul_mounet">Mas2oul Mounet (Supplies)</option>
                        <option value="ka2ed_idare">Ka2ed Idare (Council)</option>
                        <option value="ka2ed_fer2a">Ka2ed Fer2a (Troop Leader)</option>
                        <option value="mouse3ed_ka2ed_fer2a">Mouse3ed Fer2a (Assistant Troop Leader)</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-teal-700 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-teal-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      Create Role
                    </button>
                  </form>
                </div>
                <div className="lg:col-span-2 bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 text-teal-800">Dynamic System Roles</h3>
                  {roles.length === 0 ? (
                    <p className="text-slate-400 text-sm">No permission roles configured yet.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {roles.map((r) => (
                        <li key={r.id} className="py-3 flex justify-between items-center text-sm font-medium text-slate-700">
                          <span>{r.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                            Scope: {r.permission_scope.replace(/_/g, ' ')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 7: Leaders Directory & Security Override */}
          {activeTab === 'leaders' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold tracking-tight text-slate-800">Leaders & Security Overview</h2>
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-800">Registered System Accounts</h3>
                </div>
                <div className="divide-y divide-slate-100 overflow-x-auto">
                  {profiles.length === 0 ? (
                    <div className="p-6 text-slate-400 text-sm text-center">No leader accounts registered.</div>
                  ) : (
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                          <th className="px-6 py-3">Leader Name</th>
                          <th className="px-6 py-3">Email Address</th>
                          <th className="px-6 py-3">Rank</th>
                          <th className="px-6 py-3">Scope / Roles</th>
                          <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                        {profiles.map((prof) => (
                          <tr key={prof.id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-4 font-bold text-slate-900">{prof.full_name}</td>
                            <td className="px-6 py-4 text-xs">{prof.email}</td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-500">{prof.rank || 'N/A'}</td>
                            <td className="px-6 py-4 space-y-1">
                              {prof.user_roles.length === 0 ? (
                                <span className="text-xs text-slate-400 italic">No assigned scopes</span>
                              ) : (
                                prof.user_roles.map((ur, idx) => {
                                  const getNestedName = (val: any) => {
                                    if (!val) return null
                                    if (Array.isArray(val)) return val[0]?.name || null
                                    return val.name || null
                                  }
                                  const roleName = getNestedName(ur.roles)
                                  const groupName = getNestedName(ur.groups)
                                  return (
                                    <div key={idx} className="flex items-center gap-1.5 flex-wrap">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-100">
                                        {roleName || 'N/A'}
                                      </span>
                                      {groupName && (
                                        <span className="text-[10px] text-slate-400 font-semibold">
                                          Group: {groupName}
                                        </span>
                                      )}
                                    </div>
                                  )
                                })
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => openResetModal(prof.id, prof.full_name)}
                                className="inline-flex items-center gap-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:border-teal-200 transition-colors text-xs"
                              >
                                <Key className="h-3.5 w-3.5" />
                                Reset Password
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 8: Onboard Group Leader */}
          {activeTab === 'onboard' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold tracking-tight text-slate-800">Onboard Group Leader</h2>
              <div className="max-w-xl bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-teal-800">Invite Chef de Groupe</h3>
                <p className="text-slate-500 text-sm mb-6">
                  Provision the first Leader (Chef de Groupe) for a Scout Group. This will create their database profile and display their temporary password.
                </p>
                <form onSubmit={handleOnboardLeader} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Select Scout Group</label>
                    <select
                      value={leaderGroupId}
                      onChange={(e) => setLeaderGroupId(e.target.value)}
                      required
                      className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                    >
                      <option value="">-- Choose Target Group --</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Leader Full Name</label>
                    <input
                      type="text"
                      value={leaderName}
                      onChange={(e) => setLeaderName(e.target.value)}
                      required
                      placeholder="e.g. Jean Dupont"
                      className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Email Address</label>
                    <input
                      type="email"
                      value={leaderEmail}
                      onChange={(e) => setLeaderEmail(e.target.value)}
                      required
                      placeholder="e.g. leader@cedres.org"
                      className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Leader Rank</label>
                    <select
                      value={leaderRank}
                      onChange={(e) => setLeaderRank(e.target.value)}
                      required
                      className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
                    >
                      {ranks.map((r) => (
                        <option key={r.id} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-teal-700 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-teal-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    Onboard Leader & Generate Credentials
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
