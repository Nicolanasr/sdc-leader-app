'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Menu } from 'lucide-react'
import DashboardShell from './DashboardShell'
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
        <DashboardShell groupName={groupName} currentRole={role} userName={userName}>
            {statusMessage && (
                <div
                    className={`p-3.5 rounded-xl border text-sm text-center ${statusMessage.type === 'success'
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                        : 'bg-rose-50 border-rose-100 text-rose-800'
                        }`}
                >
                    {statusMessage.text}
                </div>
            )}

            <header className="mb-4">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Dashboard Overview</h2>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white p-4 sm:p-6 border border-slate-200 rounded-xl shadow-xs">
                    <div className="text-xs font-medium text-slate-400 uppercase">Youth Scouts</div>
                    <div className="mt-1 text-2xl sm:text-3xl font-bold text-slate-800">{stats.scoutCount}</div>
                    <p className="text-xs text-slate-400 mt-0.5">Active scouts registered</p>
                </div>

                <div className="bg-white p-4 sm:p-6 border border-slate-200 rounded-xl shadow-xs">
                    <div className="text-xs font-medium text-slate-400 uppercase">Units / Troops</div>
                    <div className="mt-1 text-2xl sm:text-3xl font-bold text-slate-800">{stats.troopCount}</div>
                    <p className="text-xs text-slate-400 mt-0.5">Dynamic active units</p>
                </div>

                <div className="bg-white p-4 sm:p-6 border border-slate-200 rounded-xl shadow-xs">
                    <div className="text-xs font-medium text-slate-400 uppercase">Active Leaders</div>
                    <div className="mt-1 text-2xl sm:text-3xl font-bold text-slate-800">{stats.leaderCount}</div>
                    <p className="text-xs text-slate-400 mt-0.5">Council & troop leaders</p>
                </div>

                <div className="bg-white p-4 sm:p-6 border border-slate-200 rounded-xl shadow-xs">
                    <div className="text-xs font-medium text-slate-400 uppercase">Pending Approvals</div>
                    <div className="mt-1 text-2xl sm:text-3xl font-bold text-rose-600">{stats.pendingTransactions}</div>
                    <p className="text-xs text-slate-400 mt-0.5">Expenses awaiting reviews</p>
                </div>
            </div>

            {/* Group Leaders Operations & Forms */}
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions Checklist */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="bg-white p-4 sm:p-6 border border-slate-200 rounded-xl shadow-xs">
                        <h3 className="text-base font-semibold text-teal-800 mb-3">Quick Operations</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Link
                                href="/group/dashboard/leaders"
                                className="flex items-center p-3.5 bg-slate-50 border border-slate-200 hover:border-teal-500 rounded-xl transition-all group"
                            >
                                <div>
                                    <h4 className="font-semibold text-sm text-slate-800 group-hover:text-teal-700">Invite new leaders</h4>
                                    <p className="text-xs text-slate-400 mt-0.5">Onboard Secretaries, Treasurers, or Unit Leaders</p>
                                </div>
                            </Link>

                            <Link
                                href="/group/dashboard/troops"
                                className="flex items-center p-3.5 bg-slate-50 border border-slate-200 hover:border-teal-500 rounded-xl transition-all group"
                            >
                                <div>
                                    <h4 className="font-semibold text-sm text-slate-800 group-hover:text-teal-700">Manage units & troops</h4>
                                    <p className="text-xs text-slate-400 mt-0.5">Configure youth sections, Kechefe units, or global troops</p>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardShell>
    )
}
