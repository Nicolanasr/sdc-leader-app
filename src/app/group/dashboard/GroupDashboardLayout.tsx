'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Menu } from 'lucide-react'
import DashboardSidebar from './DashboardSidebar'
import Link from 'next/link'

interface SectionType {
    id: string
    name: string
}

interface Stats {
    scoutCount: number
    troopCount: number
    leaderCount: number
    pendingTransactions: number
}

interface Props {
    groupName: string
    commissariatName: string
    role: string
    groupId: string
    stats: Stats
    sections: SectionType[]
    userName?: string
}

export default function GroupDashboardLayout({
    groupName,
    commissariatName,
    role,
    groupId,
    stats,
    sections,
    userName,
}: Props) {
    const router = useRouter()
    const supabase = createClient()

    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

    // Handle Logout
    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
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

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-40 w-64 bg-teal-900 text-white flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                    }`}
            >
                <DashboardSidebar
                    groupName={groupName}
                    currentRole={role}
                    onClose={() => setIsMobileOpen(false)}
                    onLogout={handleLogout}
                />
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
                        <span className="text-sm font-bold text-teal-750">{userName || role.replace(/_/g, ' ')}</span>
                    </div>
                </header>

                <div className="p-6 md:p-8 flex-1">
                    {statusMessage && (
                        <div
                            className={`mb-6 p-4 rounded-xl border text-sm text-center ${statusMessage.type === 'success'
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                                : 'bg-rose-50 border-rose-100 text-rose-800'
                                }`}
                        >
                            {statusMessage.text}
                        </div>
                    )}

                    <header className="mb-8">
                        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Dashboard Overview</h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Welcome back to your local group management space.
                        </p>
                    </header>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
                            <div className="text-sm font-medium text-slate-400 uppercase">Youth Scouts</div>
                            <div className="mt-2 text-3xl font-bold text-slate-800">{stats.scoutCount}</div>
                            <p className="text-xs text-slate-400 mt-1">Active scouts registered</p>
                        </div>

                        <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
                            <div className="text-sm font-medium text-slate-400 uppercase">Units / Troops</div>
                            <div className="mt-2 text-3xl font-bold text-slate-800">{stats.troopCount}</div>
                            <p className="text-xs text-slate-400 mt-1">Dynamic active units</p>
                        </div>

                        <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
                            <div className="text-sm font-medium text-slate-400 uppercase">Active Leaders</div>
                            <div className="mt-2 text-3xl font-bold text-slate-800">{stats.leaderCount}</div>
                            <p className="text-xs text-slate-400 mt-1">Council & troop leaders</p>
                        </div>

                        <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
                            <div className="text-sm font-medium text-slate-400 uppercase">Pending Approvals</div>
                            <div className="mt-2 text-3xl font-bold text-rose-600">{stats.pendingTransactions}</div>
                            <p className="text-xs text-slate-400 mt-1">Expenses awaiting reviews</p>
                        </div>
                    </div>

                    {/* Group Leaders Operations & Forms */}
                    <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Quick Actions Checklist */}
                        <div className="lg:col-span-3 space-y-6">
                            <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
                                <h3 className="text-lg font-semibold text-teal-800 mb-4">Quick Operations</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Link
                                        href="/group/dashboard/leaders"
                                        className="flex items-center p-4 bg-slate-50 border border-slate-200 hover:border-teal-500 rounded-xl transition-all group"
                                    >
                                        <div>
                                            <h4 className="font-semibold text-sm text-slate-800 group-hover:text-teal-700">Invite new leaders</h4>
                                            <p className="text-xs text-slate-400 mt-0.5">Onboard Secretaries, Treasurers, or Unit Leaders</p>
                                        </div>
                                    </Link>

                                    <Link
                                        href="/group/dashboard/troops"
                                        className="flex items-center p-4 bg-slate-50 border border-slate-200 hover:border-teal-500 rounded-xl transition-all group"
                                    >
                                        <div>
                                            <h4 className="font-semibold text-sm text-slate-800 group-hover:text-teal-700">Manage units & troops</h4>
                                            <p className="text-xs text-slate-400 mt-0.5">Configure youth sections, Kechefe units, or global troops</p>
                                        </div>
                                    </Link>

                                    <div className="md:col-span-2 p-4 bg-slate-100/50 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs flex items-center">
                                        Financial ledgers, event schedules, and gear inventory pages will be unlocked in the next iteration.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
