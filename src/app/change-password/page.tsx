import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const errorMsg = (await searchParams).error
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. If user already changed their password, redirect to dashboard
  const needsPasswordChange = user.app_metadata?.needs_password_change
  const role = user.app_metadata?.role

  if (needsPasswordChange === false) {
    // Already changed, redirect to dashboard
    if (role === 'configurator') {
      redirect('/configurator')
    } else if (
      [
        'chef_groupe',
        'assistant_chef_groupe',
        'amin_serr_group',
        'amin_sandou2_group',
        'amin_tejhizet_group',
        'mas2oul_toswir',
        'mas2oul_mounet',
        'ka2ed_idare',
      ].includes(role)
    ) {
      redirect('/group/dashboard')
    } else if (['ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a'].includes(role)) {
      redirect('/group/dashboard')
    } else {
      redirect('/')
    }
  }

  // Server Action to update password
  async function updatePassword(formData: FormData) {
    'use server'

    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!password || !confirmPassword) {
      return redirect('/change-password?error=Please fill in all password fields')
    }

    if (password !== confirmPassword) {
      return redirect('/change-password?error=Passwords do not match')
    }

    if (password.length < 6) {
      return redirect('/change-password?error=Password must be at least 6 characters long')
    }

    const supabaseClient = await createClient()

    // Retrieve active user within Server Action context
    const { data: { user: currentUser } } = await supabaseClient.auth.getUser()
    if (!currentUser) {
      return redirect('/login')
    }

    // 1. Update the user's password in Supabase Auth
    const { error: authError } = await supabaseClient.auth.updateUser({
      password: password,
    })

    if (authError) {
      console.error('Password update error:', authError)
      return redirect(`/change-password?error=${encodeURIComponent(authError.message)}`)
    }

    // 2. Update profiles table to clear needs_password_change
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return redirect('/change-password?error=Server misconfiguration: Service role key missing.')
    }

    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Bypass RLS to update profiles
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .update({ needs_password_change: false })
      .eq('id', currentUser.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
      return redirect(`/change-password?error=${encodeURIComponent(profileError.message)}`)
    }

    // Redirect to correct dashboard
    if (role === 'configurator') {
      redirect('/configurator')
    } else if (
      [
        'chef_groupe',
        'assistant_chef_groupe',
        'amin_serr_group',
        'amin_sandou2_group',
        'amin_tejhizet_group',
        'mas2oul_toswir',
        'mas2oul_mounet',
        'ka2ed_idare',
      ].includes(role)
    ) {
      redirect('/group/dashboard')
    } else if (['ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a'].includes(role)) {
      redirect('/group/dashboard')
    } else {
      redirect('/')
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 text-slate-900">
      <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-teal-800">Mandatory Password Update</h1>
          <p className="mt-2 text-sm text-slate-500">
            For security reasons, you must change your temporary password before accessing the system.
          </p>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-md bg-rose-50 border border-rose-100 text-rose-700 text-sm text-center">
            {errorMsg}
          </div>
        )}

        <form action={updatePassword} className="mt-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700">New Password</label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Confirm New Password</label>
            <input
              type="password"
              name="confirmPassword"
              required
              minLength={6}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
            />
          </div>

          <button
            type="submit"
            className="flex w-full justify-center rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            Update Password & Access Dashboard
          </button>
        </form>
      </div>
    </div>
  )
}
