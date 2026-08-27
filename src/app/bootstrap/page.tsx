import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function BootstrapPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const errorMsg = (await searchParams).error
  const supabase = await createClient()

  // Check if any profiles exist
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  const isBootstrapAvailable = count === 0 && !error

  if (!isBootstrapAvailable) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 text-slate-900">
        <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
          <h1 className="text-2xl font-bold tracking-tight text-rose-600">Setup Locked</h1>
          <p className="mt-4 text-slate-600">
            The system has already been initialized. The bootstrap route is disabled to prevent unauthorized account creation.
          </p>
          <a
            href="/login"
            className="mt-6 inline-flex w-full justify-center rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            Go to Login
          </a>
        </div>
      </div>
    )
  }

  async function signupAdmin(formData: FormData) {
    'use server'

    const email = formData.get('email') as string
    const fullName = formData.get('fullName') as string
    const password = formData.get('password') as string

    if (!email || !fullName || !password) {
      return
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return redirect('/bootstrap?error=SUPABASE_SERVICE_ROLE_KEY is not set in environment variables (.env.local)')
    }

    const supabaseClient = await createClient()

    // 1. Sign up the user in Supabase Auth (using user-facing client)
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (authError || !authData.user) {
      console.error('Auth error:', authError)
      return redirect(`/bootstrap?error=${encodeURIComponent(authError?.message || 'Authentication signup failed')}`)
    }

    const userId = authData.user.id

    // 2. Initialize Admin client to bypass RLS for initial profile & roles insertions
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

    // 3. Insert the profile manually using admin client
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .insert({
        id: userId,
        email,
        full_name: fullName,
        mahemm: 'System Administrator',
        rank: 'Configurator',
        needs_password_change: false,
      })

    if (profileError) {
      console.error('Profile error:', profileError)
      return redirect(`/bootstrap?error=${encodeURIComponent(profileError.message)}`)
    }

    // 4. Fetch or ensure the "configurator" role exists
    const { data: roleData } = await adminSupabase
      .from('roles')
      .select('id')
      .eq('name', 'configurator')
      .single()

    let configuratorRoleId = roleData?.id

    if (!configuratorRoleId) {
      const { data: newRole } = await adminSupabase
        .from('roles')
        .insert({ name: 'configurator' })
        .select('id')
        .single()
      configuratorRoleId = newRole?.id
    }

    // 5. Assign the role in user_roles using admin client
    if (configuratorRoleId) {
      const { error: roleMappingError } = await adminSupabase
        .from('user_roles')
        .insert({
          profile_id: userId,
          role_id: configuratorRoleId,
        })
      
      if (roleMappingError) {
        console.error('Role mapping error:', roleMappingError)
        return redirect(`/bootstrap?error=${encodeURIComponent(roleMappingError.message)}`)
      }
    }

    redirect('/configurator')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 text-slate-900">
      <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-teal-800">Scouts des Cèdres Manager</h1>
          <p className="mt-2 text-sm text-slate-500">System Bootstrapping Portal</p>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-md bg-rose-50 border border-rose-100 text-rose-700 text-sm text-center">
            {errorMsg}
          </div>
        )}

        <form action={signupAdmin} className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700">Full Name</label>
            <input
              type="text"
              name="fullName"
              required
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Email Address</label>
            <input
              type="email"
              name="email"
              required
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
            />
          </div>

          <button
            type="submit"
            className="flex w-full justify-center rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            Bootstrap Admin Account
          </button>
        </form>
      </div>
    </div>
  )
}
