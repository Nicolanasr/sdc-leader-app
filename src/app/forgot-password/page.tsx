'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { resolveDeliverableEmail } from '@/utils/emailDelivery'
import Link from 'next/link'
import { KeyRound, Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setStatusMessage(null)

    try {
      // Send only to the canonical deliverable email address to prevent duplicate quota usage
      const targetEmail = resolveDeliverableEmail(email)

      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })

      setLoading(false)

      if (error) {
        if (error.message.toLowerCase().includes('rate limit')) {
          setStatusMessage({
            text: 'Supabase email rate limit reached. Please wait a few minutes before requesting another link, or ask your Chef de Groupe to reset your password directly.',
            type: 'error',
          })
        } else {
          setStatusMessage({ text: error.message, type: 'error' })
        }
      } else {
        setEmail('')
        setStatusMessage({
          text: 'A secure password reset link has been dispatched to your email address! Please check your inbox and spam folder.',
          type: 'success',
        })
      }
    } catch (err: unknown) {
      setLoading(false)
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setStatusMessage({ text: message, type: 'error' })
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 text-slate-900">
      <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-6">
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto text-teal-800 mb-2">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-black text-slate-900">Password Recovery</h1>
          <p className="text-xs text-slate-500">
            Enter your scout leader email address and we will send you a secure link to reset your password.
          </p>
        </div>

        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{statusMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleResetRequest} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="leader@sdcsaintjeanmarc.org"
                className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 shadow-2xs focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Supports both @sdcsaintjeanmarc.org and @sdcsjm.org aliases.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-800 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sending Recovery Link...</span>
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                <span>Send Reset Link</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 hover:text-teal-950 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
