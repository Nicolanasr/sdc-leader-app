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

            {/* ── TOP HEADER CARD ── */}
            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0 shadow-2xs">
                        <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight truncate">
                            Dashboard Overview
                        </h1>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                            {groupName} • {commissariatName}
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Grid - 2 columns on mobile */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <div className="bg-white p-3 sm:p-4 border border-slate-200/90 rounded-2xl shadow-2xs">
                    <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Youth Scouts</div>
                    <div className="mt-0.5 text-lg sm:text-2xl font-black text-slate-900">{stats.scoutCount}</div>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">Active registered</p>
                </div>

                <div className="bg-white p-3 sm:p-4 border border-slate-200/90 rounded-2xl shadow-2xs">
                    <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Units / Troops</div>
                    <div className="mt-0.5 text-lg sm:text-2xl font-black text-slate-900">{stats.troopCount}</div>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">Active units</p>
                </div>

                <div className="bg-white p-3 sm:p-4 border border-slate-200/90 rounded-2xl shadow-2xs">
                    <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Leaders</div>
                    <div className="mt-0.5 text-lg sm:text-2xl font-black text-slate-900">{stats.leaderCount}</div>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">Council & troop</p>
                </div>

                <div className="bg-white p-3 sm:p-4 border border-slate-200/90 rounded-2xl shadow-2xs">
                    <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Reviews</div>
                    <div className="mt-0.5 text-lg sm:text-2xl font-black text-rose-600">{stats.pendingTransactions}</div>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">Expenses</p>
                </div>
            </div>

            {/* Quick Actions Checklist */}
            <div className="space-y-2.5">
                <div className="bg-white p-3 sm:p-4 border border-slate-200/90 rounded-2xl shadow-2xs">
                    <h3 className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wide">Quick Operations</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Link
                            href="/group/dashboard/planner"
                            className="flex items-center p-2.5 bg-slate-50 border border-slate-200/80 hover:border-teal-600 rounded-xl transition-all group"
                        >
                            <div>
                                <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-teal-800">📋 Session Planner (Canevas)</h4>
                                <p className="text-[10px] text-slate-500 mt-0.5">Prepare weekly meeting schedules, activities & gear</p>
                            </div>
                        </Link>

                        <Link
                            href="/group/dashboard/leaders"
                            className="flex items-center p-2.5 bg-slate-50 border border-slate-200/80 hover:border-teal-600 rounded-xl transition-all group"
                        >
                            <div>
                                <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-teal-800">Invite new leaders</h4>
                                <p className="text-[10px] text-slate-500 mt-0.5">Onboard Secretaries, Treasurers, or Unit Leaders</p>
                            </div>
                        </Link>

                        <Link
                            href="/group/dashboard/troops"
                            className="flex items-center p-2.5 bg-slate-50 border border-slate-200/80 hover:border-teal-600 rounded-xl transition-all group"
                        >
                            <div>
                                <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-teal-800">Manage units & troops</h4>
                                <p className="text-[10px] text-slate-500 mt-0.5">Configure youth sections, Kechefe units, or global troops</p>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </DashboardShell>
    )
}
