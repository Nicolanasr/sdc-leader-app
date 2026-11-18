'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Lock,
  Unlock,
  Search,
  Tent,
  ArrowRight,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react'

export interface SwitchUser {
  id: string
  fullName: string
  email: string
  role: string
  roleLabel: string
  troopName?: string | null
  rank?: string | null
}

interface Props {
  unlocked: boolean
  users: SwitchUser[]
  onUnlock: (passcode: string) => Promise<{ error?: string; ok?: boolean }>
  onLock: () => Promise<void>
  onLoginAs: (email: string) => Promise<{ error?: string } | void>
}

export default function AdminSwitchClient({
  unlocked,
  users,
  onUnlock,
  onLock,
  onLoginAs,
}: Props) {
  const router = useRouter()
  const [passcode, setPasscode] = useState('')
  const [search, setSearch] = useState('')
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all')
  const [activeEmail, setActiveEmail] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!passcode.trim()) return
    setErrorMessage(null)

    startTransition(async () => {
      const res = await onUnlock(passcode)
      if (res?.error) {
        setErrorMessage(res.error)
      } else {
        setPasscode('')
        router.refresh()
      }
    })
  }

  const handleLock = () => {
    startTransition(async () => {
      await onLock()
      router.refresh()
    })
  }

  const handleSelectUser = (email: string) => {
    setErrorMessage(null)
    setActiveEmail(email)
    startTransition(async () => {
      const res = await onLoginAs(email)
      if (res?.error) {
        setErrorMessage(res.error)
        setActiveEmail(null)
      }
    })
  }

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase().trim()
    const matchesSearch =
      !q ||
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.roleLabel.toLowerCase().includes(q) ||
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
        'amin_mounet_group',
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

  if (!unlocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1rem)]">
        <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto text-teal-800">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-lg font-black text-slate-900">Restricted Access</h1>
            <p className="text-xs text-slate-500">
              Enter your admin passcode to unlock account switching.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleUnlockSubmit} className="space-y-3">
            <input
              type="password"
              inputMode="text"
              autoFocus
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter passcode"
              className="w-full h-12 px-4 text-center text-base font-bold tracking-widest rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
            <button
              type="submit"
              disabled={isPending || !passcode.trim()}
              className="w-full min-h-[46px] rounded-2xl bg-teal-800 hover:bg-teal-700 active:scale-[0.98] text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Unlock className="h-4 w-4" />
              )}
              <span>Unlock Switcher</span>
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-[max(env(safe-area-inset-top),0.75rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)] px-3 sm:px-6">
      <div className="max-w-xl mx-auto space-y-3">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-black text-slate-900 truncate">
                Admin Account Switcher
              </h1>
              <p className="text-[11px] text-slate-500">
                {users.length} accounts • Tap to sign in
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLock}
            disabled={isPending}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Lock</span>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2.5 shadow-2xs">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, role, or troop..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-9 pr-3 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'group', label: 'Group Board' },
              { id: 'troops', label: 'Troop Leaders' },
              { id: 'admin', label: 'Admins' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedRoleFilter(tab.id)}
                className={`min-h-[34px] px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
                  selectedRoleFilter === tab.id
                    ? 'bg-teal-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* User List */}
        <div className="space-y-2">
          {filteredUsers.map((u) => {
            const isLoadingThis = isPending && activeEmail === u.email
            return (
              <button
                key={u.id}
                type="button"
                disabled={isPending}
                onClick={() => handleSelectUser(u.email)}
                className="w-full text-left bg-white hover:bg-teal-50/40 active:scale-[0.99] border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-all shadow-2xs disabled:opacity-60 cursor-pointer"
              >
                <div className="min-w-0 space-y-1">
                  <div className="font-bold text-sm text-slate-900 truncate">
                    {u.fullName}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200/70">
                      {u.roleLabel}
                    </span>
                    {u.troopName && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 inline-flex items-center gap-1">
                        <Tent className="h-3 w-3" />
                        {u.troopName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-teal-800 shrink-0">
                  {isLoadingThis ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
