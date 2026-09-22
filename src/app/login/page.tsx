import { createClient } from '@/utils/supabase/server'
import { getEmailAliases, resolveDeliverableEmail } from '@/utils/emailDelivery'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import LoginForm from './LoginForm'
import TestLoginModal, { TestUser } from './TestLoginModal'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  chef_groupe: 'Chef de Groupe (قائد الفوج)',
  assistant_chef_groupe: 'Assistant Chef de Groupe (مساعد قائد الفوج)',
  amin_serr_group: 'Secrétaire Général (أمين السر)',
  amin_sandou2_group: 'Trésorier Général (أمين الصندوق)',
  amin_tejhizet_group: 'Quartier-Maître (أمين التجهيزات)',
  mas2oul_mounet: 'Responsable Mounet (مسؤول المؤونة)',
  amin_mounet_group: 'Responsable Mounet (مسؤول المؤونة)',
  mas2oul_toswir: 'Responsable Média (مسؤول الإعلام)',
  ka2ed_idare: 'Chef Administratif (القائد الإداري)',
  ka2ed_fer2a: 'Chef d’Unité (قائد الوحدة)',
  mouse3ed_ka2ed_fer2a: 'Assistant Chef d’Unité (مساعد قائد الوحدة)',
  scout_member: 'Scout Member (عضو كشفي)',
  configurator: 'System Administrator (مدير النظام)',
}

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

  // Fetch list of users for Test Mode
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  let testUsers: TestUser[] = []

  if (serviceRoleKey) {
    try {
      const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )

      const { data: profiles } = await adminSupabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          rank,
          user_roles (
            roles:role_id (name),
            troops:troop_id (name)
          )
        `)
        .eq('is_deleted', false)
        .order('full_name')

      interface ProfileRow {
        id: string
        full_name: string | null
        email: string
        rank: string | null
        user_roles?: Array<{
          roles?: { name?: string | null } | null
          troops?: { name?: string | null } | null
        }> | null
      }

      testUsers = ((profiles || []) as unknown as ProfileRow[]).map((p) => {
        const ur = p.user_roles?.[0]
        const rawRole = ur?.roles?.name || p.rank || 'scout_leader'
        return {
          id: p.id,
          fullName: p.full_name || 'Leader',
          email: p.email,
          role: rawRole,
          roleLabel: ROLE_DISPLAY_NAMES[rawRole] || rawRole.replace(/_/g, ' '),
          troopName: ur?.troops?.name || null,
          rank: p.rank || null,
        }
      })
    } catch (fetchErr) {
      console.warn('[LoginPage] Error fetching test users list:', fetchErr)
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
          error:
            'Email rate limit reached for this hour. Please use password login or the Test Mode button below.',
        }
      }
      return { error: error.message }
    }

    return { success: true }
  }

  // ── SERVER ACTION 3: 1-Click Test Login As user (Dev & Staging) ──
  async function loginAsUser(targetEmail: string) {
    'use server'

    if (!serviceRoleKey) {
      return { error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is missing.' }
    }

    try {
      const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )

      // 1. Generate magic link token without sending an email
      const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
        type: 'magiclink',
        email: targetEmail,
      })

      if (linkError || !linkData?.properties?.hashed_token) {
        console.error('Failed to generate test magic link token:', linkError)
        return { error: linkError?.message || 'Could not generate test session for this user.' }
      }

      // 2. Verify OTP token and establish real session cookies
      const serverSupabase = await createClient()
      const { data: verifyData, error: verifyError } = await serverSupabase.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: 'magiclink',
      })

      if (verifyError) {
        console.error('Failed to verify OTP token for test login:', verifyError)
        return { error: verifyError.message }
      }

      // 3. Redirect to dashboard
      const role = verifyData.user?.app_metadata?.role
      if (role === 'configurator') {
        redirect('/configurator')
      } else {
        redirect('/group/dashboard')
      }
    } catch (err: unknown) {
      // If Next.js redirect thrown, re-throw it so Next.js handles redirection
      if (err instanceof Error && err.message === 'NEXT_REDIRECT') {
        throw err
      }
      console.error('loginAsUser exception:', err)
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
      return { error: msg }
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 bg-slate-50 text-slate-900">
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

        {/* ── TEST MODE / DEV USER SWITCHER ── */}
        {testUsers.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <TestLoginModal users={testUsers} onLoginAs={loginAsUser} />
          </div>
        )}

        <div className="text-center text-[11px] text-slate-400">
          Groupe Saint Jean Marc • Authorized Leader Access Only
        </div>
      </div>
    </div>
  )
}
