'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

export default function SplashScreen() {
    const [showSplash, setShowSplash] = useState(true)
    const [fadeOut, setFadeOut] = useState(false)

    useEffect(() => {
        // Only show on initial launch or cold start
        const timer = setTimeout(() => {
            setFadeOut(true)
            const removeTimer = setTimeout(() => {
                setShowSplash(false)
            }, 450) // Transition duration
            return () => clearTimeout(removeTimer)
        }, 600) // Display time on app cold-start

        return () => clearTimeout(timer)
    }, [])

    if (!showSplash) return null

    return (
        <div
            aria-hidden="true"
            className={`fixed inset-0 z-[99999] flex flex-col items-center justify-between p-8 bg-gradient-to-b from-[#06231e] via-[#0d3b33] to-[#041a16] text-white select-none transition-all duration-400 ease-out ${fadeOut ? 'opacity-0 pointer-events-none scale-105' : 'opacity-100'
                }`}
        >
            {/* Top spacer for optical balance */}
            <div className="h-6" />

            {/* Center Branding & Logo */}
            <div className="flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-500">
                {/* Glow behind logo */}
                <div className="relative">
                    <div className="absolute -inset-4 bg-teal-500/20 rounded-full blur-xl animate-pulse" />
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white/10 p-2.5 backdrop-blur-md border border-white/20 shadow-2xl flex items-center justify-center">
                        <Image
                            src="/apple-touch-icon.png"
                            alt="Scouts des Cèdres Logo"
                            width={96}
                            height={96}
                            priority
                            className="w-full h-full object-contain drop-shadow-md"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                        Scouts des Cèdres
                    </h1>
                    <p className="text-xs font-semibold text-teal-200/90 tracking-wide">
                        Leader Portal
                    </p>
                </div>
            </div>

            {/* Bottom Loading Progress Bar */}
            <div className="flex flex-col items-center space-y-2.5 pb-6">
                <div className="w-36 h-1 bg-white/15 rounded-full overflow-hidden relative">
                    <div className="h-full bg-gradient-to-r from-teal-400 to-amber-300 rounded-full w-2/3 animate-[shimmer_1.2s_infinite_ease-in-out]" />
                </div>
                <span className="text-[10px] font-bold text-teal-200/80 tracking-widest uppercase">
                    Chargement…
                </span>
            </div>
        </div>
    )
}
