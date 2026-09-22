'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [verifyingSession, setVerifyingSession] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function checkCurrentSession() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (mounted) {
          if (user) {
            setIsAuthenticated(true)
            setUserRole(user.app_metadata?.role || null)
          }
          setVerifyingSession(false)
        }
      } catch {
        if (mounted) {
          setVerifyingSession(false)
        }
      }
    }

    checkCurrentSession()

    // Listen to Supabase auth events (handles PASSWORD_RECOVERY event from token or hash)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session?.user)) {
        setIsAuthenticated(true)
        if (session?.user) {
          setUserRole(session.user.app_metadata?.role || null)
        }
        setVerifyingSession(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both fields.')
      return
    }

    setLoading(true)

    try {
      // 1. Update password in Supabase Auth
      const { data, error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        setErrorMessage(error.message)
        setLoading(false)
        return
      }

      // 2. Clear needs_password_change flag on profile if applicable
      if (data.user?.id) {
        try {
          await supabase
            .from('profiles')
            .update({ needs_password_change: false })
            .eq('id', data.user.id)
        } catch {
          // Non-blocking if RLS restricts direct profile update
        }
      }

      setIsSuccess(true)
      setLoading(false)

      // Redirect user after short delay
      const destination = userRole === 'configurator' ? '/configurator' : '/group/dashboard'
      setTimeout(() => {
        router.push(destination)
      }, 2000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred while resetting password.'
      setErrorMessage(message)
      setLoading(false)
    }
  }

  // Loading state while checking recovery session
  if (verifyingSession) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 text-slate-900">
        <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-3xl shadow-sm text-center space-y-4">
          <Loader2 className="h-8 w-8 text-teal-700 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Verifying security token...</p>
        </div>
      </div>
    )
  }

  // If no session found and cannot be authenticated
  if (!isAuthenticated && !isSuccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 text-slate-900">
        <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-3xl shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-700">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-black text-slate-900">Recovery Link Expired</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            The password recovery link you clicked is invalid, has expired, or was already used. Please request a new link to proceed.
          </p>
          <div className="pt-2">
            <Link
              href="/forgot-password"
              className="inline-flex items-center justify-center w-full rounded-xl bg-teal-800 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition-all active:scale-[0.98]"
            >
              Request New Reset Link
            </Link>
          </div>
          <div>
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Return to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Success Confirmation Screen
  if (isSuccess) {
    const destination = userRole === 'configurator' ? '/configurator' : '/group/dashboard'
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 text-slate-900">
        <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-3xl shadow-sm text-center space-y-4 animate-in fade-in zoom-in-95">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-700">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-black text-slate-900">Password Reset Successfully!</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your new password has been saved securely. Redirecting you to your scout command center...
          </p>
          <div className="pt-2">
            <Link
              href={destination}
              className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-teal-800 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition-all active:scale-[0.98]"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Main Form Screen
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 text-slate-900">
      <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-6">
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto text-teal-800 mb-2">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-black text-slate-900">Set New Password</h1>
          <p className="text-xs text-slate-500">
            Choose a strong password with at least 6 characters for your scout leader account.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
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

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 shadow-2xs focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-800 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving Password...</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                <span>Save New Password</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <Link
            href="/login"
            className="text-xs font-semibold text-teal-800 hover:text-teal-900 transition-colors"
          >
            Return to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
