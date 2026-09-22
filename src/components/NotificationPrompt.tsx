'use client'

import { useState, useEffect, useCallback } from 'react'
import { BellRing, X, CheckCircle2, Loader2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { urlBase64ToUint8Array } from '@/utils/push/vapidHelper'

const SNOOZE_KEY = 'sdc_push_prompt_dismissed_at'
const SNOOZE_DURATION_DAYS = 7

export default function NotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // 1. Silent synchronization: if an active subscription exists and user logs in, bind it
  const syncSubscriptionWithUser = useCallback(async (userId?: string) => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return
    }

    try {
      if (Notification.permission !== 'granted') return

      const reg = await navigator.serviceWorker.ready
      const existingSub = await reg.pushManager.getSubscription()

      if (existingSub) {
        // Post to subscribe endpoint with current session cookies so server binds user_id
        await fetch('/api/notifications/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: existingSub.toJSON(),
            userAgent: navigator.userAgent,
            userId: userId || null,
          }),
        })
      }
    } catch (err) {
      console.warn('[NotificationPrompt] Background sync error:', err)
    }
  }, [])

  // 2. Check permission state & listen for login events
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    const supabase = createClient()

    // A. Check if prompt should be shown
    const isPermissionDefault = Notification.permission === 'default'
    const dismissedAt = localStorage.getItem(SNOOZE_KEY)
    let isSnoozed = false

    if (dismissedAt) {
      const elapsedDays = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24)
      if (elapsedDays < SNOOZE_DURATION_DAYS) {
        isSnoozed = true
      }
    }

    if (isPermissionDefault && !isSnoozed) {
      // Show prompt after a short delay once page loads
      const timer = setTimeout(() => setShowPrompt(true), 2000)
      return () => clearTimeout(timer)
    }

    // B. Check if already granted, and sync with current user if logged in
    if (Notification.permission === 'granted') {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          syncSubscriptionWithUser(user.id)
        }
      })
    }

    // C. Listen for auth changes (e.g. user just logged in!)
    const {
      data: { subscription: authListener },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        syncSubscriptionWithUser(session.user.id)
      }
    })

    return () => {
      authListener.unsubscribe()
    }
  }, [syncSubscriptionWithUser])

  // 3. User clicks "Enable Alerts" - Fast, non-blocking flow
  const handleEnableNotifications = async () => {
    try {
      setLoading(true)

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setShowPrompt(false)
        localStorage.setItem(SNOOZE_KEY, Date.now().toString())
        return
      }

      // Fast-path: use inlined public VAPID key if present, fallback to endpoint
      let publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!publicKey) {
        const keyRes = await fetch('/api/notifications/push/vapid-public-key')
        const keyData = await keyRes.json()
        publicKey = keyData.publicKey
      }

      if (!publicKey) {
        throw new Error('Public VAPID key not available')
      }

      // Resolve service worker with timeout protection to prevent hanging
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<ServiceWorkerRegistration>((_, reject) =>
          setTimeout(() => reject(new Error('Service worker ready timeout')), 3500)
        ),
      ])

      const appServerKey = urlBase64ToUint8Array(publicKey)
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey.buffer as ArrayBuffer,
      })

      // Immediate visual confirmation
      setSuccess(true)

      // Background registration save (server automatically extracts authenticated user from session cookie)
      fetch('/api/notifications/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          userAgent: navigator.userAgent,
        }),
      }).catch((err) => console.warn('Background subscription save error:', err))

      // Swiftly close prompt without keeping user waiting
      setTimeout(() => setShowPrompt(false), 700)
    } catch (err) {
      console.error('[NotificationPrompt] Failed to enable notifications:', err)
      setShowPrompt(false)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem(SNOOZE_KEY, Date.now().toString())
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-[max(env(safe-area-inset-bottom),1rem)] left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="bg-white text-slate-900 rounded-2xl p-4 border border-slate-200/90 shadow-xl relative overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0 shadow-2xs">
              <BellRing className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">
                Scouts des Cèdres
              </span>
              <h4 className="text-xs sm:text-sm font-black text-slate-900">
                Enable Push Alerts
              </h4>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed mt-2.5">
          Get instant alerts for troop gatherings, camp logistics, and urgent announcements — even when your app is closed.
        </p>

        <div className="flex items-center gap-2 pt-3">
          <button
            onClick={handleEnableNotifications}
            disabled={loading || success}
            className="flex-1 py-2.5 px-3 rounded-xl bg-teal-800 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-80"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Enabling...</span>
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Alerts Enabled!</span>
              </>
            ) : (
              <span>Enable Alerts</span>
            )}
          </button>

          <button
            onClick={handleDismiss}
            className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
