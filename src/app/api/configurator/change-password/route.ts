import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    // 1. Authenticate caller and verify they are a Configurator
    const clientSupabase = await createServerSupabase()
    const {
      data: { user: caller },
    } = await clientSupabase.auth.getUser()

    const callerScopes = caller?.app_metadata?.role_scopes || [caller?.app_metadata?.role_scope]
    const isConfigurator = callerScopes.includes('configurator')

    if (!caller || !isConfigurator) {
      return NextResponse.json({ error: 'Unauthorized. Configurator access only.' }, { status: 401 })
    }

    // 2. Parse request payload
    const { userId, newPassword } = await request.json()

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 })
    }

    // 3. Initialize Admin Supabase Client using Service Role Key
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is not set.' },
        { status: 500 }
      )
    }

    const adminSupabase = createAdminSupabase(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // 4. Update the target user's password in Supabase Auth
    const { error: authError } = await adminSupabase.auth.admin.updateUserById(
      userId,
      {
        password: newPassword,
      }
    )

    if (authError) {
      console.error('Admin password update error:', authError)
      return NextResponse.json({ error: 'Failed to update authentication credentials: ' + authError.message }, { status: 500 })
    }

    // 5. Reset the needs_password_change flag in the profiles table to force change on next login
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .update({ needs_password_change: true })
      .eq('id', userId)

    if (profileError) {
      console.error('Admin profile flag update error:', profileError)
      return NextResponse.json({ error: 'Failed to reset profile password flag: ' + profileError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error occurred' }, { status: 500 })
  }
}
