'use client'

import { useState, useEffect } from 'react'

export default function SplashScreen() {
    const [showSplash, setShowSplash] = useState(true)
    const [fadeOut, setFadeOut] = useState(false)

    useEffect(() => {
        // If already shown during this active session, dismiss immediately
        try {
            if (sessionStorage.getItem('sdc_pwa_splash_seen') === '1') {
                setShowSplash(false)
                return
            }
        } catch {
            // In case sessionStorage is restricted
        }

        // Show the branded splash for 1.6s to allow the smooth progress bar animation to complete
        const timer = setTimeout(() => {
            setFadeOut(true)
            const removeTimer = setTimeout(() => {
                setShowSplash(false)
                try {
                    sessionStorage.setItem('sdc_pwa_splash_seen', '1')
                } catch { }
            }, 500) // Fadeout transition duration
            return () => clearTimeout(removeTimer)
        }, 1600) // Display time on app cold-start

        return () => clearTimeout(timer)
    }, [])

    if (!showSplash) return null

    return (
        <div
            aria-hidden="true"
            style={{
                background: 'linear-gradient(to bottom, #06231e, #0d3b33, #041a16)',
                backgroundColor: '#06231e'
            }}
            className={`fixed inset-0 z-[99999] flex flex-col items-center justify-between p-8 text-white select-none transition-all duration-500 ease-out ${fadeOut ? 'opacity-0 pointer-events-none scale-105' : 'opacity-100'
                }`}
        >
            {/* Top spacer for optical balance */}
            <div className="h-6" />

            {/* Center Branding & Logo */}
            <div className="flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-500">
                {/* Glow behind logo */}
                <div className="relative">
                    <div className="absolute -inset-4 bg-teal-400/25 rounded-full blur-xl animate-pulse" />
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white/10 p-2.5 backdrop-blur-md border border-white/20 shadow-2xl flex items-center justify-center">
                        {/* Native img for instant 0ms render without waiting for JS bundle execution */}
                        <img
                            src="/apple-touch-icon.png"
                            alt="Scouts des Cèdres Logo"
                            width={96}
                            height={96}
                            loading="eager"
                            fetchPriority="high"
                            className="w-full h-full object-contain drop-shadow-md"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-sm">
                        Scouts des Cèdres
                    </h1>
                    <p className="text-xs font-semibold text-teal-200/90 tracking-wide">
                        Leader Portal
                    </p>
                </div>
            </div>

            {/* Bottom Loading Progress Bar */}
            <div className="flex flex-col items-center space-y-2.5 pb-6">
                <div className="w-40 h-1.5 bg-white/15 rounded-full overflow-hidden relative">
                    <div
                        className="h-full bg-gradient-to-r from-teal-400 via-emerald-300 to-amber-300 rounded-full animate-[splashProgress_1.6s_cubic-bezier(0.4,0,0.2,1)_forwards]"
                    />
                </div>
                <span className="text-[10px] font-bold text-teal-200/80 tracking-widest uppercase animate-pulse">
                    Chargement…
                </span>
            </div>
        </div>
    )
}
