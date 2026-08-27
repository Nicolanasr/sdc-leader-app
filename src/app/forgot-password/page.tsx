'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/change-password`,
      })

      setLoading(false)
      if (error) {
        setStatusMessage({ text: error.message, type: 'error' })
      } else {
        setEmail('')
        setStatusMessage({
          text: 'A password reset link has been sent to your email address! Please check your inbox.',
          type: 'success',
        })
      }
    } catch (err: any) {
      setLoading(false)
      setStatusMessage({ text: err.message || 'An unexpected error occurred.', type: 'error' })
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 text-slate-900">
      <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-teal-800">Password Recovery</h1>
          <p className="mt-2 text-sm text-slate-500">
            Enter your email address and we will send you a secure link to reset your password.
          </p>
        </div>

        {statusMessage && (
          <div
            className={`mt-4 p-3 rounded-md border text-sm text-center ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                : 'bg-rose-50 border-rose-100 text-rose-800'
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        <form onSubmit={handleResetRequest} className="mt-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="e.g. leader@cedres.org"
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:bg-slate-350 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending link...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm font-semibold text-teal-700 hover:text-teal-600 transition-colors">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
