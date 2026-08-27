import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    // 1. Authenticate caller and check for configurator role
    const clientSupabase = await createServerSupabase()
    const {
      data: { user: caller },
    } = await clientSupabase.auth.getUser()

    if (!caller || caller.app_metadata?.role !== 'configurator') {
      return NextResponse.json({ error: 'Unauthorized. Configurator access only.' }, { status: 401 })
    }

    // 2. Parse request payload
    const { email, fullName, rank, groupId } = await request.json()

    if (!email || !fullName || !rank || !groupId) {
      return NextResponse.json({ error: 'Missing required onboarding parameters.' }, { status: 400 })
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

    // 4. Create user directly with temporary password to bypass email rate limits
    const tempPassword = 'ChangeMe' + Math.floor(1000 + Math.random() * 9000)
    
    const { data: inviteData, error: inviteError } = await adminSupabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      }
    })

    if (inviteError || !inviteData.user) {
      if (inviteError?.message?.includes('already registered') || inviteError?.status === 422) {
        return NextResponse.json(
          { error: 'A user with this email address is already registered in the system.' },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: inviteError?.message || 'Failed to create user account.' }, { status: 500 })
    }

    const newUserId = inviteData.user.id

    // 5. Create profile for the new leader
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .insert({
        id: newUserId,
        email,
        full_name: fullName,
        rank: rank,
        mahemm: 'Group Leader',
      })

    if (profileError) {
      await adminSupabase.auth.admin.deleteUser(newUserId)
      return NextResponse.json({ error: 'Failed to create profile: ' + profileError.message }, { status: 500 })
    }

    // 6. Fetch "chef_groupe" role ID
    const { data: roleData, error: roleError } = await adminSupabase
      .from('roles')
      .select('id')
      .eq('name', 'chef_groupe')
      .single()

    if (roleError || !roleData) {
      return NextResponse.json({ error: 'System role "chef_groupe" not found. Please run seeding first.' }, { status: 500 })
    }

    // 7. Map user to role and scope under the selected Group
    const { error: roleMapError } = await adminSupabase
      .from('user_roles')
      .insert({
        profile_id: newUserId,
        role_id: roleData.id,
        group_id: groupId,
      })

    if (roleMapError) {
      return NextResponse.json({ error: 'Failed to assign role permissions: ' + roleMapError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, userId: newUserId, tempPassword })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error occurred' }, { status: 500 })
  }
}
