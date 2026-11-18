import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import LoginForm from './LoginForm'
import { signIn, sendMagicLink } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; status?: 'error' | 'success' }>
}) {
  const { message, status } = await searchParams
  const supabase = await createClient()

  // Auto-redirect if already logged in
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    const role = user.app_metadata?.role || user.app_metadata?.role_scope
    if (role === 'configurator') {
      redirect('/configurator')
    } else {
      redirect('/group/dashboard')
    }
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

        <div className="text-center space-y-2 pt-1">
          <a
            href="/roles"
            className="inline-flex items-center justify-center min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
          >
            📖 Leader Roles & Onboarding Guide
          </a>
          <div className="text-[11px] text-slate-400">
            Groupe Saint Jean Marc • Authorized Leader Access Only
          </div>
        </div>
      </div>
    </div>
  )
}
