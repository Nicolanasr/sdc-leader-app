'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import DashboardShell from '../DashboardShell'
import { Menu, X, Plus, Users, Landmark, Award, Briefcase, Shield, Layers, Edit, Trash2, Key, Copy, Check, Sparkles } from 'lucide-react'

interface LeaderRole {
  roleId?: string
  roleName: string
  troopId?: string | null
  troopName: string | null
  permissionScope: string
}

interface Leader {
  id: string
  profileId: string
  fullName: string
  email: string
  rank: string
  responsibilityIds?: string[]
  responsibilities: string[]
  roles: LeaderRole[]
}

interface Troop {
  id: string
  name: string
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

interface Props {
  initialLeaders: Leader[]
  troops: Troop[]
  currentRole: string
  groupId: string
  groupName: string
  ranks: Rank[]
  responsibilities: Responsibility[]
  roles: Role[]
  userName?: string
}

export default function LeadersManagement({
  initialLeaders,
  troops,
  currentRole,
  groupId,
  groupName,
  ranks,
  responsibilities,
  roles,
  userName,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [leaders, setLeaders] = useState<Leader[]>(initialLeaders)
  const canManage = ['chef_groupe', 'assistant_chef_groupe', 'amin_serr_group', 'configurator'].includes(currentRole)
  const canResetPassword = ['chef_groupe', 'assistant_chef_groupe', 'amin_serr_group', 'ka2ed_fer2a', 'configurator'].includes(currentRole)

  // Onboarding states
  const [showOnboardModal, setShowOnboardModal] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [rank, setRank] = useState(ranks[0]?.name || '')
  
  // Multi-select state arrays
  const [selectedResps, setSelectedResps] = useState<string[]>([])
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [troopId, setTroopId] = useState('')
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; pass: string } | null>(null)

  // Password reset states
  const [resettingLeader, setResettingLeader] = useState<Leader | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [requirePasswordChange, setRequirePasswordChange] = useState(true)
  const [resetSuccessData, setResetSuccessData] = useState<{ email: string; pass: string } | null>(null)
  const [copiedPass, setCopiedPass] = useState(false)

  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const showStatus = (text: string, type: 'success' | 'error') => {
    setStatusMessage({ text, type })
    setTimeout(() => setStatusMessage(null), 7000)
  }

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$'
    let pass = ''
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewPassword(pass)
  }

  const handleSavePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resettingLeader) return
    if (newPassword.length < 6) {
      return showStatus('Password must be at least 6 characters.', 'error')
    }

    setLoading(true)
    try {
      const res = await fetch('/api/group/reset-leader-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: resettingLeader.id,
          newPassword,
          requirePasswordChange,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        showStatus(data.error || 'Failed to reset password', 'error')
      } else {
        setResetSuccessData({ email: resettingLeader.email, pass: newPassword })
        showStatus(`Password successfully updated for ${resettingLeader.fullName}!`, 'success')
      }
    } catch (err: any) {
      showStatus(err.message || 'Error occurred while resetting password', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Toggle checks helpers
  const toggleResp = (id: string) => {
    if (selectedResps.includes(id)) {
      setSelectedResps(selectedResps.filter((x) => x !== id))
    } else {
      setSelectedResps([...selectedResps, id])
    }
  }

  const toggleRole = (name: string) => {
    if (selectedRoles.includes(name)) {
      setSelectedRoles(selectedRoles.filter((x) => x !== name))
    } else {
      setSelectedRoles([...selectedRoles, name])
    }
  }

  // Edit & Delete states
  const [editingLeader, setEditingLeader] = useState<Leader | null>(null)
  const [editFullName, setEditFullName] = useState('')
  const [editRank, setEditRank] = useState('')
  const [editSelectedResps, setEditSelectedResps] = useState<string[]>([])
  const [editSelectedRoles, setEditSelectedRoles] = useState<string[]>([])
  const [editTroopId, setEditTroopId] = useState('')

  // Open Edit Modal
  const openEditModal = (leader: Leader) => {
    setEditingLeader(leader)
    setEditFullName(leader.fullName)
    setEditRank(leader.rank)
    setEditSelectedResps(leader.responsibilityIds || [])
    setEditSelectedRoles(leader.roles.map((r) => r.roleName))
    setEditTroopId(leader.roles.find((r) => r.troopId)?.troopId || '')
  }

  const toggleEditResp = (id: string) => {
    setEditSelectedResps((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleEditRole = (name: string) => {
    setEditSelectedRoles((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    )
  }

  // Delete Leader
  const handleDeleteLeader = async (leader: Leader) => {
    if (!confirm(`Are you sure you want to remove ${leader.fullName} from the leader council?`)) {
      return
    }

    setLoading(true)
    try {
      await supabase.from('user_roles').delete().eq('profile_id', leader.id).eq('group_id', groupId)
      await supabase.from('profile_responsibilities').delete().eq('profile_id', leader.id)

      setLeaders((prev) => prev.filter((l) => l.id !== leader.id))
      showStatus(`${leader.fullName} removed from council.`, 'success')
    } catch (err: any) {
      showStatus(err.message || 'Failed to remove leader.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Save Leader Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLeader) return

    if (!editFullName || editSelectedRoles.length === 0) {
      return showStatus('Please enter full name and select at least one role.', 'error')
    }

    const editActiveRolesObj = roles.filter((r) => editSelectedRoles.includes(r.name))
    const editIsTroopScoped = editActiveRolesObj.some((r) =>
      ['ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a'].includes(r.permission_scope)
    )

    if (editIsTroopScoped && !editTroopId) {
      return showStatus('Please select a troop unit for troop-scoped roles.', 'error')
    }

    setLoading(true)
    try {
      // 1. Update Profile
      const { error: profErr } = await supabase
        .from('profiles')
        .update({ full_name: editFullName, rank: editRank })
        .eq('id', editingLeader.id)

      if (profErr) throw profErr

      // 2. Sync Responsibilities
      await supabase.from('profile_responsibilities').delete().eq('profile_id', editingLeader.id)
      if (editSelectedResps.length > 0) {
        const respInserts = editSelectedResps.map((rId) => ({
          profile_id: editingLeader.id,
          responsibility_id: rId,
        }))
        await supabase.from('profile_responsibilities').insert(respInserts)
      }

      // 3. Sync User Roles
      await supabase.from('user_roles').delete().eq('profile_id', editingLeader.id).eq('group_id', groupId)
      const roleInserts = editActiveRolesObj.map((r) => ({
        profile_id: editingLeader.id,
        group_id: groupId,
        role_id: r.id,
        troop_id: ['ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a'].includes(r.permission_scope) ? editTroopId : null,
      }))
      await supabase.from('user_roles').insert(roleInserts)

      // Update local state
      const updatedRespsNames = responsibilities.filter((r) => editSelectedResps.includes(r.id)).map((r) => r.name)
      const updatedRoles = editActiveRolesObj.map((r) => ({
        roleId: r.id,
        roleName: r.name,
        troopId: ['ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a'].includes(r.permission_scope) ? editTroopId : null,
        troopName: troops.find((t) => t.id === editTroopId)?.name || null,
        permissionScope: r.permission_scope,
      }))

      setLeaders((prev) =>
        prev.map((l) =>
          l.id === editingLeader.id
            ? {
                ...l,
                fullName: editFullName,
                rank: editRank,
                responsibilityIds: editSelectedResps,
                responsibilities: updatedRespsNames,
                roles: updatedRoles,
              }
            : l
        )
      )

      showStatus(`${editFullName} updated successfully!`, 'success')
      setEditingLeader(null)
    } catch (err: any) {
      showStatus(err.message || 'Failed to update leader.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Handle Logout
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Dynamic scope inspection across selected roles
  const activeRolesObj = roles.filter((r) => selectedRoles.includes(r.name))
  const isTroopScoped = activeRolesObj.some((r) =>
    ['ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a'].includes(r.permission_scope)
  )

  // Submit invitation
  const handleOnboardLeader = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !fullName || selectedRoles.length === 0 || selectedResps.length === 0) {
      return showStatus('Please fill in name, email, at least one role, and one responsibility.', 'error')
    }

    if (isTroopScoped && !troopId) {
      return showStatus('Please select a target troop unit for your troop-level roles.', 'error')
    }

    setLoading(true)
    try {
      const res = await fetch('/api/group/onboard-leader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          fullName,
          rank,
          responsibilityIds: selectedResps,
          roleNames: selectedRoles,
          troopId: isTroopScoped ? troopId : null,
        }),
      })

      const result = await res.json()
      setLoading(false)

      if (!res.ok) {
        showStatus(result.error || 'Failed to onboard leader', 'error')
      } else {
        setEmail('')
        setFullName('')
        setSelectedResps([])
        setSelectedRoles([])
        setTroopId('')
        showStatus(`Leader onboarded successfully! Temporary Password: ${result.tempPassword}`, 'success')
        
        // Refresh server component data
        router.refresh()
      }
    } catch (err: any) {
      setLoading(false)
      showStatus(err.message || 'Network error occurred', 'error')
    }
  }

  // Map system role string to friendly label
  const formatRole = (role: string) => {
    const rolesMap: Record<string, string> = {
      chef_groupe: 'Chef de Groupe',
      assistant_chef_groupe: 'Assistant Chef',
      amin_serr_group: 'Amin Serr (Secretary)',
      amin_sandou2_group: 'Amin Sandou2 (Treasurer)',
      amin_tejhizet_group: 'Amin Tejhizet (Quartermaster)',
      mas2oul_toswir: 'Mas2oul Toswir (Media)',
      mas2oul_mounet: 'Mas2oul Mounet (Supplies)',
      ka2ed_idare: 'Ka2ed Idare (Council)',
      ka2ed_fer2a: 'Ka2ed Fer2a (Troop Leader)',
      mouse3ed_ka2ed_fer2a: 'Mouse3ed Fer2a (Assistant)',
    }
    return rolesMap[role] || role
  }

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
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Leaders & Council</h2>
            {canManage && (
              <button
                onClick={() => {
                  setEmail('')
                  setFullName('')
                  setSelectedResps([])
                  setSelectedRoles([])
                  setTroopId('')
                  setCreatedCredentials(null)
                  setShowOnboardModal(true)
                }}
                className="inline-flex items-center gap-2 bg-teal-700 hover:bg-teal-600 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors text-xs"
              >
                <Plus className="h-4 w-4" />
                Invite / Onboard Leader
              </button>
            )}
          </header>

          <div className="space-y-6">
            {/* Leaders Directory List */}
            <div className="w-full space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-800">Registered Council & Leaders</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {leaders.length === 0 ? (
                    <div className="p-6 text-slate-400 text-sm text-center">No leaders registered under this group.</div>
                  ) : (
                    leaders.map((leader) => (
                      <div key={leader.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1">
                          <h4 className="font-bold text-slate-900">{leader.fullName}</h4>
                          <p className="text-xs text-slate-500">{leader.email}</p>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              Rank: {leader.rank}
                            </span>
                            {leader.responsibilities.map((resp, idx) => (
                              <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-100">
                                {resp}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-start md:items-end gap-1.5">
                          {leader.roles.map((roleObj, idx) => (
                            <div key={idx} className="flex flex-col items-start md:items-end">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-900 text-white">
                                {formatRole(roleObj.roleName)}
                              </span>
                              {roleObj.troopName && (
                                <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                  Unit: <span className="text-teal-700 font-bold">{roleObj.troopName}</span>
                                </span>
                              )}
                            </div>
                          ))}
                          <div className="flex gap-2 pt-2 items-center">
                            {canResetPassword && (
                              <button
                                onClick={() => {
                                  setResettingLeader(leader)
                                  setNewPassword('')
                                  setResetSuccessData(null)
                                  setCopiedPass(false)
                                }}
                                className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors flex items-center gap-1"
                                title="Reset Leader Password"
                              >
                                <Key className="h-4 w-4" />
                              </button>
                            )}
                            {canManage && (
                              <>
                                <button
                                  onClick={() => openEditModal(leader)}
                                  className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                                  title="Edit Leader"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteLeader(leader)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete Leader"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Reset Password Modal */}
            {resettingLeader && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center">
                        <Key className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Reset Leader Password</h3>
                        <p className="text-xs text-slate-500">{resettingLeader.fullName} ({resettingLeader.email})</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setResettingLeader(null)
                        setResetSuccessData(null)
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {resetSuccessData ? (
                    <div className="space-y-4 pt-1">
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                        <p className="text-xs font-bold text-emerald-900">✓ Password Reset Successfully!</p>
                        <p className="text-xs text-emerald-800">Share these temporary credentials with the leader:</p>
                        <div className="bg-white p-3 rounded-xl border border-emerald-200 text-xs font-mono space-y-1">
                          <div><strong>Email:</strong> {resetSuccessData.email}</div>
                          <div><strong>New Password:</strong> {resetSuccessData.pass}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`Email: ${resetSuccessData.email}\nPassword: ${resetSuccessData.pass}`)
                            setCopiedPass(true)
                            setTimeout(() => setCopiedPass(false), 3000)
                          }}
                          className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                        >
                          {copiedPass ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          <span>{copiedPass ? 'Copied to Clipboard!' : 'Copy Credentials'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResettingLeader(null)
                            setResetSuccessData(null)
                          }}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSavePasswordReset} className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-bold text-slate-700">New Password</label>
                          <button
                            type="button"
                            onClick={handleGeneratePassword}
                            className="text-[11px] font-bold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1 hover:underline"
                          >
                            <Sparkles className="h-3 w-3" /> Auto-generate
                          </button>
                        </div>
                        <input
                          type="text"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength={6}
                          placeholder="At least 6 characters"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none font-mono"
                        />
                      </div>

                      <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={requirePasswordChange}
                          onChange={(e) => setRequirePasswordChange(e.target.checked)}
                          className="rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                        />
                        <span>Require password change upon next login</span>
                      </label>

                      <div className="pt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setResettingLeader(null)}
                          className="w-1/2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={loading || newPassword.length < 6}
                          className="w-1/2 bg-amber-700 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-xl text-xs shadow transition-colors disabled:bg-slate-300"
                        >
                          {loading ? 'Updating…' : 'Update Password'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* Edit Leader Modal */}
            {editingLeader && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="text-lg font-bold text-slate-900">Edit Leader — {editingLeader.fullName}</h3>
                    <button onClick={() => setEditingLeader(null)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <form onSubmit={handleSaveEdit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Full Name</label>
                      <input
                        type="text"
                        value={editFullName}
                        onChange={(e) => setEditFullName(e.target.value)}
                        required
                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Rank</label>
                      <select
                        value={editRank}
                        onChange={(e) => setEditRank(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                      >
                        {ranks.map((r) => (
                          <option key={r.id} value={r.name}>{r.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Responsibilities</label>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                        {responsibilities.map((r) => (
                          <label key={r.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editSelectedResps.includes(r.id)}
                              onChange={() => toggleEditResp(r.id)}
                              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                            <span>{r.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">System Permission Roles</label>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                        {roles.map((r) => (
                          <label key={r.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editSelectedRoles.includes(r.name)}
                              onChange={() => toggleEditRole(r.name)}
                              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                            <span>{formatRole(r.name)}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {roles.filter((r) => editSelectedRoles.includes(r.name)).some((r) => ['ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a'].includes(r.permission_scope)) && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">Target Troop Unit</label>
                        <select
                          value={editTroopId}
                          onChange={(e) => setEditTroopId(e.target.value)}
                          required
                          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none"
                        >
                          <option value="">-- Select Troop --</option>
                          {troops.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingLeader(null)}
                        className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-lg text-xs font-bold shadow disabled:bg-slate-300 transition-colors"
                      >
                        {loading ? 'Saving…' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

      {/* Onboard Leader Modal */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-xl p-4 sm:p-6 border border-slate-200 rounded-2xl shadow-xl space-y-4 max-h-[88vh] overflow-y-auto my-auto relative">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Onboard & Invite New Leader</h3>
              <button onClick={() => setShowOnboardModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleOnboardLeader} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="e.g. Nicolas Nasr"
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="e.g. leader@example.com"
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Leader Rank</label>
                <select
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none sm:text-sm"
                >
                  {ranks.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Responsibilities</label>
                <div className="space-y-1.5 max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                  {responsibilities.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedResps.includes(r.id)}
                        onChange={() => toggleResp(r.id)}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span>{r.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">System Permission Roles</label>
                <div className="space-y-1.5 max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                  {roles.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(r.name)}
                        onChange={() => toggleRole(r.name)}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span>{formatRole(r.name)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {isTroopScoped && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Target Troop Unit</label>
                  <select
                    value={troopId}
                    onChange={(e) => setTroopId(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none sm:text-sm"
                  >
                    <option value="">-- Choose Unit/Troop --</option>
                    {troops.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  className="w-1/2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 bg-teal-700 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-xl text-xs shadow transition-colors disabled:bg-slate-300"
                >
                  {loading ? 'Onboarding…' : 'Onboard Leader'}
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
