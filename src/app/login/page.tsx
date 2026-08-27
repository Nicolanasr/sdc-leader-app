import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const message = (await searchParams).message

  async function signIn(formData: FormData) {
    'use server'

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
      return redirect('/login?message=Email and password are required')
    }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Login error:', error)
      return redirect(`/login?message=${encodeURIComponent(error.message)}`)
    }

    // Determine role from app_metadata and redirect
    const role = data.user?.app_metadata?.role

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
          <h1 className="text-2xl font-bold tracking-tight text-teal-800">Scouts des Cèdres Manager</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to your leader account</p>
        </div>

        {message && (
          <div className="mt-4 p-3 rounded-md bg-rose-50 border border-rose-100 text-rose-700 text-sm text-center">
            {message}
          </div>
        )}

        <form action={signIn} className="mt-6 space-y-6">
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
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <Link href="/forgot-password" className="text-xs font-semibold text-teal-700 hover:text-teal-650 transition-colors">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              name="password"
              required
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm"
            />
          </div>

          <button
            type="submit"
            className="flex w-full justify-center rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            Sign In
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Scout Group management portal. Authorized access only.
        </div>
      </div>
    </div>
  )
}
