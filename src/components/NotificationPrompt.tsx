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
      // Delay showing the prompt slightly so the page loads cleanly first
      const timer = setTimeout(() => setShowPrompt(true), 2500)
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

  // 3. User clicks "Enable Alerts"
  const handleEnableNotifications = async () => {
    try {
      setLoading(true)

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setShowPrompt(false)
        localStorage.setItem(SNOOZE_KEY, Date.now().toString())
        return
      }

      // Fetch public VAPID key
      const keyRes = await fetch('/api/notifications/push/vapid-public-key')
      const keyData = await keyRes.json()

      if (!keyRes.ok || !keyData.publicKey) {
        throw new Error(keyData.error || 'Failed to fetch public VAPID key')
      }

      const reg = await navigator.serviceWorker.ready
      const appServerKey = urlBase64ToUint8Array(keyData.publicKey)

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey.buffer as ArrayBuffer,
      })

      // Send to subscribe endpoint (will automatically link user_id if logged in)
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      await fetch('/api/notifications/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          userAgent: navigator.userAgent,
          userId: user?.id || null,
        }),
      })

      setSuccess(true)
      setTimeout(() => setShowPrompt(false), 2200)
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
    <div className="fixed bottom-[max(env(safe-area-inset-bottom),1rem)] left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-teal-900 text-white rounded-3xl p-5 border border-teal-500/40 shadow-2xl backdrop-blur-md relative overflow-hidden">
        {/* Background emblem */}
        <div className="absolute right-2 -bottom-4 text-7xl text-white/5 pointer-events-none select-none font-serif">
          ⚜️
        </div>

        <div className="relative z-10 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0">
                <BellRing className="h-4 w-4 animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-teal-300 uppercase tracking-widest block">
                  Scouts des Cèdres
                </span>
                <h4 className="text-sm font-black text-white">Enable Push Alerts</h4>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Get instant alerts for troop gatherings, camp logistics, and urgent announcements — even when your app is closed.
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleEnableNotifications}
              disabled={loading || success}
              className="flex-1 py-2.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 active:scale-95 text-slate-950 text-xs font-black transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-80"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Enabling...</span>
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-800" />
                  <span>Enabled!</span>
                </>
              ) : (
                <span>Enable Alerts</span>
              )}
            </button>

            <button
              onClick={handleDismiss}
              className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
