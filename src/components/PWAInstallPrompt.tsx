'use client'

import { useState, useEffect } from 'react'
import { Smartphone, Download, X, Share } from 'lucide-react'

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if app is already running in standalone mode (installed)
    const isRunningStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    if (isRunningStandalone) {
      setIsStandalone(true)
      return
    }

    // Check if dismissed previously within 7 days
    const dismissedAt = localStorage.getItem('sdc_pwa_dismissed_at')
    if (dismissedAt) {
      const daysSince = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24)
      if (daysSince < 7) return
    }

    // Check iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent)

    if (isIosDevice && isSafari) {
      setIsIOS(true)
      setShowPrompt(true)
    }

    // Capture standard PWA beforeinstallprompt (Android / Chrome / Edge)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    localStorage.setItem('sdc_pwa_dismissed_at', Date.now().toString())
    setShowPrompt(false)
  }

  if (isStandalone || !showPrompt) return null

  return (
    <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white p-3 rounded-2xl border border-teal-700/50 shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 mb-2">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-teal-800 border border-teal-600/50 flex items-center justify-center text-teal-200 shrink-0">
          <Smartphone className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-black text-white truncate">
            Install SdC Leader App
          </h4>
          <p className="text-[10px] text-teal-200/90 truncate">
            {isIOS
              ? 'Tap Share ⎋ and select "Add to Home Screen"'
              : 'Add to your phone for fast offline access'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {!isIOS && deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="bg-teal-500 hover:bg-teal-400 active:scale-95 text-slate-950 font-black px-2.5 py-1 rounded-xl text-[11px] shadow-sm transition-all flex items-center gap-1"
          >
            <Download className="h-3 w-3" />
            <span>Install</span>
          </button>
        )}

        <button
          onClick={handleDismiss}
          className="p-1 rounded-lg text-teal-300 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
