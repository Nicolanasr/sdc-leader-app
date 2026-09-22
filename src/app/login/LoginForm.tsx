'use client'

import { useState } from 'react'
import Link from 'next/link'
import { KeyRound, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react'

interface Props {
  initialMessage?: string
  initialStatus?: 'error' | 'success'
  onSignInPassword: (formData: FormData) => Promise<void>
  onSendMagicLink: (formData: FormData) => Promise<{ error?: string; success?: boolean } | void>
}

export default function LoginForm({
  initialMessage,
  initialStatus = 'error',
  onSignInPassword,
  onSendMagicLink,
}: Props) {
  const [authMode, setAuthMode] = useState<'password' | 'magiclink'>('password')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ text: string; type: 'error' | 'success' } | null>(
    initialMessage ? { text: initialMessage, type: initialStatus } : null
  )

  const handleMagicLinkSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setFeedback(null)

    const formData = new FormData(e.currentTarget)
    try {
      const res = await onSendMagicLink(formData)
      setLoading(false)
      if (res && res.error) {
        setFeedback({ text: res.error, type: 'error' })
      } else {
        setFeedback({
          text: 'Magic link sent! Check your email inbox to sign in instantly.',
          type: 'success',
        })
      }
    } catch (err: unknown) {
      setLoading(false)
      const message = err instanceof Error ? err.message : 'Failed to send magic link.'
      setFeedback({ text: message, type: 'error' })
    }
  }

  return (
    <div className="space-y-4">
      {/* Auth Mode Toggle Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs font-bold">
        <button
          type="button"
          onClick={() => {
            setAuthMode('password')
            setFeedback(null)
          }}
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            authMode === 'password'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Lock className="h-3.5 w-3.5" />
          <span>Password</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setAuthMode('magiclink')
            setFeedback(null)
          }}
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            authMode === 'magiclink'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Mail className="h-3.5 w-3.5" />
          <span>Magic Link</span>
        </button>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <KeyRound className="h-4 w-4 shrink-0 text-rose-600" />
          )}
          <span className="leading-relaxed">{feedback.text}</span>
        </div>
      )}

      {/* Mode 1: Password Form */}
      {authMode === 'password' && (
        <form action={onSignInPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="leader@sdcsaintjeanmarc.org"
              className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 shadow-2xs focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-teal-800 hover:text-teal-950 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                placeholder="••••••••"
                className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 shadow-2xs focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-800 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition-all active:scale-[0.98]"
          >
            <span>Sign In with Password</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      )}

      {/* Mode 2: Magic Link Form */}
      {authMode === 'magiclink' && (
        <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="leader@sdcsaintjeanmarc.org"
              className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 shadow-2xs focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              We will send you a passwordless 1-click login link directly to your inbox.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-800 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sending Magic Link...</span>
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                <span>Send 1-Click Magic Link</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  )
}
