import { createClient } from '@/utils/supabase/server'
import { getEmailAliases, resolveDeliverableEmail } from '@/utils/emailDelivery'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import LoginForm from './LoginForm'
import { FEATURES } from '@/config/features'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; status?: 'error' | 'success' }>
}) {
  const { message, status } = await searchParams
  const supabase = await createClient()

  // Auto-redirect if already logged in
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const role = user.app_metadata?.role || user.app_metadata?.role_scope
    if (role === 'configurator') {
      redirect('/configurator')
    } else {
      redirect('/group/dashboard')
    }
  }

  // ── SERVER ACTION 1: Sign in with password ──
  async function signIn(formData: FormData) {
    'use server'

    const rawEmail = formData.get('email') as string
    const password = formData.get('password') as string

    if (!rawEmail || !password) {
      return redirect('/login?message=Email and password are required')
    }

    const serverSupabase = await createClient()
    const candidateEmails = getEmailAliases(rawEmail)

    let authResult = await serverSupabase.auth.signInWithPassword({
      email: candidateEmails[0],
      password,
    })

    // Try alternate domain alias if first attempt failed (@sdcsjm.org <-> @sdcsaintjeanmarc.org)
    if (authResult.error && candidateEmails.length > 1) {
      const secondAttempt = await serverSupabase.auth.signInWithPassword({
        email: candidateEmails[1],
        password,
      })
      if (!secondAttempt.error) {
        authResult = secondAttempt
      }
    }

    const { data, error } = authResult

    if (error) {
      console.error('Login error:', error)
      return redirect(`/login?message=${encodeURIComponent(error.message)}`)
    }

    const role = data.user?.app_metadata?.role || data.user?.app_metadata?.role_scope

    if (!FEATURES.scoutMemberLogin && role === 'scout_member') {
      await supabase.auth.signOut()
      return redirect('/login?message=Member portal is currently disabled. Leader access only.')
    }

    if (role === 'configurator') {
      redirect('/configurator')
    } else {
      redirect('/group/dashboard')
    }
  }

  // ── SERVER ACTION 2: Send Magic Link email ──
  async function sendMagicLink(formData: FormData) {
    'use server'

    const rawEmail = formData.get('email') as string
    if (!rawEmail) {
      return { error: 'Email address is required.' }
    }

    const deliverable = resolveDeliverableEmail(rawEmail)
    const serverSupabase = await createClient()

    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const siteUrl = `${protocol}://${host}`

    const { error } = await serverSupabase.auth.signInWithOtp({
      email: deliverable,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=/group/dashboard`,
      },
    })

    if (error) {
      console.error('Magic link dispatch error:', error)
      if (error.message.toLowerCase().includes('rate limit')) {
        return {
          error: 'Email rate limit reached for this hour. Please use password login.',
        }
      }
      return { error: error.message }
    }

    return { success: true }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)] bg-slate-50 text-slate-900">
      <div className="w-full max-w-md p-6 sm:p-8 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-6">
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-900 text-xs font-black uppercase tracking-wider mb-1">
            <span>⚜️ Scouts des Cèdres</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Leader Portal
          </h1>
          <p className="text-xs text-slate-500">
            Sign in to access your scout operations and unit command
          </p>
        </div>

        {/* Tabbed Login Form (Password & Magic Link) */}
        <LoginForm
          initialMessage={message}
          initialStatus={status || 'error'}
          onSignInPassword={signIn}
          onSendMagicLink={sendMagicLink}
        />

        <div className="text-center text-[11px] text-slate-400">
          Groupe Saint Jean Marc • Authorized Leader Access Only
        </div>
      </div>
    </div>
  )
}
