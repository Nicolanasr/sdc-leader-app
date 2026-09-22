'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Bell,
  BellRing,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowLeft,
  Smartphone,
  ShieldCheck,
  Send,
  Loader2,
  Terminal,
  ExternalLink,
  Info,
  RefreshCw,
} from 'lucide-react'
import { urlBase64ToUint8Array } from '@/utils/push/vapidHelper'

interface LogEntry {
  id: string
  time: string
  type: 'info' | 'success' | 'warn' | 'error'
  text: string
  data?: unknown
}

export default function TestPushPage() {
  const [isSupported, setIsSupported] = useState<boolean | null>(null)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isStandalone, setIsStandalone] = useState<boolean>(false)
  const [isIOS, setIsIOS] = useState<boolean>(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [countdown, setCountdown] = useState<number | null>(null)

  // Customizable payload
  const [title, setTitle] = useState('⚜️ Scouts des Cèdres Alert')
  const [message, setMessage] = useState('New troop announcement: Camp preparation meeting this Saturday at 16:00.')
  const [targetUrl, setTargetUrl] = useState('/group/dashboard')

  // Live log state
  const [logs, setLogs] = useState<LogEntry[]>([])

  const addLog = (type: LogEntry['type'], text: string, data?: unknown) => {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      time: new Date().toLocaleTimeString(),
      type,
      text,
      data,
    }
    setLogs((prev) => [entry, ...prev.slice(0, 49)])
  }

  // 1. Initial feature detection
  useEffect(() => {
    if (typeof window === 'undefined') return

    const hasSW = 'serviceWorker' in navigator
    const hasPush = 'PushManager' in window
    const supported = hasSW && hasPush
    setIsSupported(supported)

    if ('Notification' in window) {
      setPermission(Notification.permission)
    }

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    setIsStandalone(Boolean(standalone))

    const userAgent = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(ios)

    addLog('info', `Environment detected: SW=${hasSW}, PushManager=${hasPush}, Standalone=${standalone}, iOS=${ios}`)

    // Check existing subscription
    if (hasSW) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) {
            setSubscription(sub)
            addLog('success', 'Existing active push subscription detected on this device.')
          } else {
            addLog('info', 'No push subscription registered on this device yet.')
          }
        })
      })
    }
  }, [])

  // 2. Request permission and subscribe
  const handleSubscribe = async () => {
    try {
      setLoading(true)
      addLog('info', 'Requesting notification permission from browser...')

      const perm = await Notification.requestPermission()
      setPermission(perm)

      if (perm !== 'granted') {
        addLog('warn', `Notification permission was ${perm}. Cannot subscribe without granted permission.`)
        setLoading(false)
        return
      }

      addLog('success', 'Notification permission granted.')

      // Fetch VAPID public key
      addLog('info', 'Fetching VAPID public key from /api/notifications/push/vapid-public-key...')
      const keyRes = await fetch('/api/notifications/push/vapid-public-key')
      const keyData = await keyRes.json()

      if (!keyRes.ok || !keyData.publicKey) {
        throw new Error(keyData.error || 'Failed to fetch public VAPID key')
      }

      addLog('info', `Fetched public key (${keyData.publicKey.slice(0, 16)}...). Subscribing with PushManager...`)

      const reg = await navigator.serviceWorker.ready
      const appServerKey = urlBase64ToUint8Array(keyData.publicKey)

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey.buffer as ArrayBuffer,
      })

      setSubscription(sub)
      addLog('success', 'Device successfully subscribed with browser push service (APNs / FCM).', sub.toJSON())

      // Send to backend
      addLog('info', 'Registering subscription with backend...')
      const subRes = await fetch('/api/notifications/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          userAgent: navigator.userAgent,
        }),
      })
      const subData = await subRes.json()

      if (subData.persisted) {
        addLog('success', 'Subscription saved to database!')
      } else if (subData.warning) {
        addLog('warn', subData.warning)
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      addLog('error', `Subscription failed: ${errorMsg}`, err)
    } finally {
      setLoading(false)
    }
  }

  // 3. Send test notification (instant or delayed)
  const handleSendTestPush = async (delaySeconds: number = 0) => {
    if (!subscription) {
      addLog('warn', 'Please enable and subscribe to push notifications first before sending a test.')
      return
    }

    try {
      setLoading(true)

      if (delaySeconds > 0) {
        addLog(
          'info',
          `⏳ Scheduled delayed push in ${delaySeconds} seconds. LOCK YOUR DEVICE OR CLOSE THIS TAB NOW to test background reception!`
        )
        setCountdown(delaySeconds)

        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev === null || prev <= 1) {
              clearInterval(timer)
              return null
            }
            return prev - 1
          })
        }, 1000)
      } else {
        addLog('info', 'Dispatching immediate test push via backend...')
      }

      const res = await fetch('/api/notifications/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          title,
          message,
          url: targetUrl,
          delaySeconds,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Server failed to dispatch push')
      }

      addLog('success', `Push dispatch successful! Delivery report:`, data)
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      addLog('error', `Push test failed: ${errorMsg}`, err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-teal-950 to-slate-950 text-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-teal-800/60 pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/group/dashboard"
              className="h-10 w-10 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-95"
              title="Return to Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/20 border border-teal-400/30 text-[10px] font-bold text-teal-300 uppercase tracking-widest mb-1">
                <span>⚜️</span>
                <span>PWA Laboratory</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Web Push Background Notifications
              </h1>
              <p className="text-xs text-teal-200/80">
                Test lock-screen delivery, background service worker receipt, and click navigation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh State</span>
            </button>
          </div>
        </div>

        {/* iOS Notice Alert */}
        {isIOS && !isStandalone && (
          <div className="bg-amber-500/15 border border-amber-500/30 rounded-2xl p-4 sm:p-5 text-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
              <Info className="h-4 w-4 shrink-0" />
              <span>iOS / iPhone Platform Notice</span>
            </div>
            <p className="leading-relaxed text-amber-200/90">
              Apple requires that PWAs on iOS (16.4+) be installed to the Home Screen to receive push notifications when
              closed. Tap the <strong>Share</strong> button in Safari and select <strong>&quot;Add to Home Screen&quot;</strong>, then
              launch the app from your home screen.
            </p>
          </div>
        )}

        {/* Diagnostics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Service Worker & Push */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Web Push API
            </span>
            <div className="flex items-center gap-1.5 text-xs font-black">
              {isSupported ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-300">Supported</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                  <span className="text-rose-300">Not Supported</span>
                </>
              )}
            </div>
            <span className="text-[10px] text-slate-500 block">SW & PushManager</span>
          </div>

          {/* Permission */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Permission
            </span>
            <div className="flex items-center gap-1.5 text-xs font-black">
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] capitalize ${
                  permission === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : permission === 'denied'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {permission}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block">Browser notification toggle</span>
          </div>

          {/* Subscription State */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Subscription
            </span>
            <div className="flex items-center gap-1.5 text-xs font-black">
              {subscription ? (
                <>
                  <ShieldCheck className="h-4 w-4 text-teal-400" />
                  <span className="text-teal-300">Active</span>
                </>
              ) : (
                <>
                  <span className="text-slate-400 font-semibold">Not Registered</span>
                </>
              )}
            </div>
            <span className="text-[10px] text-slate-500 block">Browser Push Channel</span>
          </div>

          {/* Display Mode */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Display Mode
            </span>
            <div className="flex items-center gap-1.5 text-xs font-black">
              <Smartphone className="h-4 w-4 text-purple-400" />
              <span className="text-purple-300">{isStandalone ? 'Installed PWA' : 'Browser Tab'}</span>
            </div>
            <span className="text-[10px] text-slate-500 block">Operating Environment</span>
          </div>
        </div>

        {/* Step-by-Step Interactive Test Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Step 1: Subscription */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Device Push Registration</h3>
                <p className="text-[11px] text-slate-400">
                  Request OS permission and bind this device to your push server
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              When clicked, your browser will prompt you to allow notifications. We then generate an encrypted push token
              via the Push Service.
            </p>

            <button
              onClick={handleSubscribe}
              disabled={loading || permission === 'denied'}
              className="w-full py-3 px-4 rounded-2xl bg-teal-700 hover:bg-teal-600 disabled:opacity-50 active:scale-98 text-xs font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : subscription ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-teal-300" />
                  <span>Re-subscribe / Update Token</span>
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4" />
                  <span>Enable Push Notifications</span>
                </>
              )}
            </button>
          </div>

          {/* Step 2: Testing Dispatch */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Dispatch Test Push</h3>
                <p className="text-[11px] text-slate-400">Verify immediate or delayed background reception</p>
              </div>
            </div>

            {/* Customization Form */}
            <div className="space-y-2.5 pt-1">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Body Message
                </label>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Click Target URL
                </label>
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Test Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => handleSendTestPush(0)}
                disabled={!subscription || loading}
                className="py-3 px-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Instant Push</span>
              </button>

              <button
                onClick={() => handleSendTestPush(5)}
                disabled={!subscription || loading}
                className="py-3 px-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-xs font-black text-slate-950 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {countdown !== null ? `Wait ${countdown}s (Lock screen!)` : 'Delay 5s & Close App'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Diagnostics Log Terminal */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-teal-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                Live Diagnostics & Output Terminal
              </h3>
            </div>
            <button
              onClick={() => setLogs([])}
              className="text-[11px] text-slate-400 hover:text-white transition-colors"
            >
              Clear Log
            </button>
          </div>

          <div className="bg-black/60 rounded-2xl p-4 font-mono text-xs max-h-60 overflow-y-auto space-y-2 border border-slate-900 scrollbar-thin">
            {logs.length === 0 ? (
              <div className="text-slate-600 italic">No events logged yet. Click &quot;Enable Push Notifications&quot; above to start.</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-500 shrink-0 text-[11px]">{log.time}</span>
                  <span
                    className={`font-bold shrink-0 ${
                      log.type === 'success'
                        ? 'text-emerald-400'
                        : log.type === 'error'
                        ? 'text-rose-400'
                        : log.type === 'warn'
                        ? 'text-amber-400'
                        : 'text-teal-400'
                    }`}
                  >
                    [{log.type.toUpperCase()}]
                  </span>
                  <div className="flex-1 break-all">
                    <span className="text-slate-200">{log.text}</span>
                    {log.data ? (
                      <pre className="mt-1 text-[10px] text-slate-400 bg-slate-900/60 p-2 rounded-lg overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
