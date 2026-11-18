'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { WifiOff } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import DashboardSidebar from './DashboardSidebar'
import DashboardHeader from './DashboardHeader'
import MobileBottomNav from './MobileBottomNav'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'
import ScoutAIAssistant from '@/components/ScoutAIAssistant'

interface Props {
    groupName: string
    currentRole: string
    roles?: string[]
    userName?: string
    patrolRole?: string | null
    children: React.ReactNode
}

export default function DashboardShell({ groupName, currentRole, roles, userName, patrolRole, children }: Props) {
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const [isOffline, setIsOffline] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const update = () => setIsOffline(!navigator.onLine)
        update()
        window.addEventListener('online', update)
        window.addEventListener('offline', update)
        return () => {
            window.removeEventListener('online', update)
            window.removeEventListener('offline', update)
        }
    }, [])

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
                    roles={roles}
                    patrolRole={patrolRole}
                    onClose={() => setIsMobileOpen(false)}
                    onLogout={handleLogout}
                />
            </aside>

            {/* Main viewport */}
            <main className="flex-1 overflow-y-auto flex flex-col min-w-0 pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0">
                <DashboardHeader
                    userName={userName}
                    currentRole={currentRole}
                    roles={roles}
                    onOpenMobileMenu={() => setIsMobileOpen(true)}
                />
                <div className="px-2 sm:px-6 py-2 sm:py-4 flex-1 flex flex-col space-y-2.5 sm:space-y-4 max-w-7xl w-full mx-auto">
                    {isOffline && (
                        <div className="bg-amber-50 border border-amber-300 text-amber-950 px-3 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xs">
                            <WifiOff className="h-4 w-4 text-amber-700 shrink-0" />
                            <span>You are offline — changes won&apos;t save until reconnected.</span>
                        </div>
                    )}
                    <PWAInstallPrompt />
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation Tab Bar */}
            <MobileBottomNav
                currentRole={currentRole}
                roles={roles}
                patrolRole={patrolRole}
                onOpenMenu={() => setIsMobileOpen(true)}
            />

            {/* Scout AI Operations Assistant */}
            <ScoutAIAssistant />
        </div>
    )
}
