'use client'

import { useState, useTransition } from 'react'
import {
  FlaskConical,
  X,
  Search,
  Tent,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react'

export interface TestUser {
  id: string
  fullName: string
  email: string
  role: string
  roleLabel: string
  troopName?: string | null
  rank?: string | null
}

interface Props {
  users: TestUser[]
  onLoginAs: (email: string) => Promise<{ error?: string } | void>
}

export default function TestLoginModal({ users, onLoginAs }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all')
  const [activeEmail, setActiveEmail] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Filter users based on search and role filter
  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase().trim()
    const matchesSearch =
      !q ||
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.roleLabel && u.roleLabel.toLowerCase().includes(q)) ||
      (u.troopName && u.troopName.toLowerCase().includes(q))

    if (!matchesSearch) return false

    if (selectedRoleFilter === 'all') return true
    if (selectedRoleFilter === 'group') {
      return [
        'chef_groupe',
        'assistant_chef_groupe',
        'amin_serr_group',
        'amin_sandou2_group',
        'amin_tejhizet_group',
        'mas2oul_mounet',
        'mas2oul_toswir',
        'ka2ed_idare',
      ].includes(u.role)
    }
    if (selectedRoleFilter === 'troops') {
      return ['ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a'].includes(u.role)
    }
    if (selectedRoleFilter === 'admin') {
      return u.role === 'configurator'
    }

    return true
  })

  const handleSelectUser = (email: string) => {
    setErrorMessage(null)
    setActiveEmail(email)

    startTransition(async () => {
      const res = await onLoginAs(email)
      if (res && res.error) {
        setErrorMessage(res.error)
        setActiveEmail(null)
      }
    })
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-amber-300/80 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-900 text-xs font-bold transition-all shadow-2xs active:scale-[0.99] group"
      >
        <FlaskConical className="h-4 w-4 text-amber-700 transition-transform group-hover:rotate-12" />
        <span>🧪 Test Mode: Login As Leader</span>
        <span className="ml-1 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-200/70 text-amber-900 border border-amber-300">
          {users.length} accounts
        </span>
      </button>

      {/* Slide-over / Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-teal-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                  <FlaskConical className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-black tracking-tight">Test Login As Leader</h3>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-400 text-slate-950">
                      Dev / Staging
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Instant 1-click authentication without password or email rate limit
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Filter Tabs & Search */}
            <div className="p-3 sm:p-4 border-b border-slate-100 bg-slate-50/70 space-y-2.5 shrink-0">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by leader name, role, email, or troop..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                {[
                  { id: 'all', label: `All (${users.length})` },
                  { id: 'group', label: 'Group Council (مجلس الفوج)' },
                  { id: 'troops', label: 'Troop Chiefs (قادة الفرق)' },
                  { id: 'admin', label: 'Configurator' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedRoleFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                      selectedRoleFilter === tab.id
                        ? 'bg-teal-800 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error banner if any */}
            {errorMessage && (
              <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 shrink-0">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* User List */}
            <div className="p-3 sm:p-4 overflow-y-auto flex-1 divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-1">
                  <p className="text-xs font-semibold">No leaders matched your search filter.</p>
                  <p className="text-[11px]">Try searching by first name or clearing the filter.</p>
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrentActive = activeEmail === u.email && isPending

                  return (
                    <div
                      key={u.id}
                      className="py-2.5 px-2 hover:bg-teal-50/40 rounded-xl transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-teal-100/70 border border-teal-200 text-teal-800 flex items-center justify-center font-black text-xs shrink-0 uppercase">
                          {u.fullName.slice(0, 2)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-slate-900 group-hover:text-teal-900 truncate">
                              {u.fullName}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-100 text-slate-700 border border-slate-200 truncate">
                              {u.roleLabel}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-400 truncate mt-0.5">
                            <span className="truncate">{u.email}</span>
                            {u.troopName && (
                              <>
                                <span>•</span>
                                <span className="font-semibold text-teal-700 flex items-center gap-0.5 truncate">
                                  <Tent className="h-3 w-3 shrink-0" />
                                  <span>{u.troopName}</span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleSelectUser(u.email)}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-2xs active:scale-95 disabled:opacity-60"
                      >
                        {isCurrentActive ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Signing in...</span>
                          </>
                        ) : (
                          <>
                            <span>Log In</span>
                            <ArrowRight className="h-3 w-3" />
                          </>
                        )}
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-400 shrink-0">
              ⚜️ Scouts des Cèdres • Saint Jean Marc • Development Impersonation
            </div>
          </div>
        </div>
      )}
    </>
  )
}
