'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import DashboardSidebar from './DashboardSidebar'
import DashboardHeader from './DashboardHeader'
import MobileBottomNav from './MobileBottomNav'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'

interface Props {
    groupName: string
    currentRole: string
    userName?: string
    children: React.ReactNode
}

export default function DashboardShell({ groupName, currentRole, userName, children }: Props) {
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden relative">
            {/* Mobile backdrop overlay */}
            {isMobileOpen && (
                <div
                    onClick={() => setIsMobileOpen(false)}
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs md:hidden transition-opacity"
                />
            )}

            {/* Sidebar container */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-teal-900 text-white flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:w-64 md:translate-x-0 ${
                    isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
                }`}
            >
                <DashboardSidebar
                    groupName={groupName}
                    currentRole={currentRole}
                    onClose={() => setIsMobileOpen(false)}
                    onLogout={handleLogout}
                />
            </aside>

            {/* Main viewport */}
            <main className="flex-1 overflow-y-auto flex flex-col min-w-0 pb-16 md:pb-0">
                <DashboardHeader
                    userName={userName}
                    currentRole={currentRole}
                    onOpenMobileMenu={() => setIsMobileOpen(true)}
                />
                <div className="px-3 sm:px-6 py-3 sm:py-4 flex-1 flex flex-col space-y-3 sm:space-y-4 max-w-7xl w-full mx-auto">
                    <PWAInstallPrompt />
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation Tab Bar */}
            <MobileBottomNav
                currentRole={currentRole}
                onOpenMenu={() => setIsMobileOpen(true)}
            />
        </div>
    )
}
