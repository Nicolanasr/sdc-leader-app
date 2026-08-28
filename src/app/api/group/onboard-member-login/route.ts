import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    // 1. Authenticate caller
    const clientSupabase = await createServerSupabase()
    const {
      data: { user: caller },
    } = await clientSupabase.auth.getUser()

    const callerScopes = caller?.app_metadata?.role_scopes || [caller?.app_metadata?.role_scope]
    const callerGroupId = caller?.app_metadata?.group_id

    const authorizedRoles = [
      'chef_groupe',
      'assistant_chef_groupe',
      'amin_serr_group',
      'ka2ed_fer2a',
      'configurator',
    ]

    const hasAuthorizedScope = callerScopes.some((s: string) => authorizedRoles.includes(s))

    if (!caller || !hasAuthorizedScope || !callerGroupId) {
      return NextResponse.json({ error: 'Unauthorized to provision member login accounts.' }, { status: 401 })
    }

    // 2. Parse payload
    const { memberId, email, password } = await request.json()

    if (!memberId || !email || !password) {
      return NextResponse.json({ error: 'Missing required parameters: memberId, email, and password.' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 })
    }

    // 3. Initialize Admin Supabase Client
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

    // 4. Fetch Member record
    const { data: member, error: memberError } = await adminSupabase
      .from('members')
      .select('id, first_name, last_name, troop_id, current_rank, group_id')
      .eq('id', memberId)
      .eq('group_id', callerGroupId)
      .single()

    if (memberError || !member) {
      return NextResponse.json({ error: 'Scout member not found in your group.' }, { status: 404 })
    }

    const fullName = `${member.first_name} ${member.last_name}`.trim()

    // 5. Create or retrieve auth user
    const { data: userData, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
      app_metadata: {
        role_scope: 'scout_member',
        role: 'scout_member',
        group_id: callerGroupId,
        troop_id: member.troop_id,
        member_id: member.id,
      },
    })

    if (createError || !userData.user) {
      if (createError?.message?.includes('already registered') || createError?.status === 422) {
        return NextResponse.json(
          { error: 'A user account with this email address already exists.' },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: createError?.message || 'Failed to create member user account.' }, { status: 500 })
    }

    const newUserId = userData.user.id

    // 6. Create or update profile record
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .upsert({
        id: newUserId,
        email,
        full_name: fullName,
        rank: member.current_rank || 'Scout',
        needs_password_change: true,
      })

    if (profileError) {
      console.error('Failed to create profile for member:', profileError)
    }

    // 7. Ensure role entry in user_roles
    // Check if role 'scout_member' exists in roles table, or create join entry
    const { data: scoutRole } = await adminSupabase
      .from('roles')
      .select('id')
      .eq('name', 'scout_member')
      .maybeSingle()

    if (scoutRole?.id) {
      await adminSupabase.from('user_roles').upsert({
        profile_id: newUserId,
        role_id: scoutRole.id,
        group_id: callerGroupId,
        troop_id: member.troop_id,
      })
    }

    return NextResponse.json({
      success: true,
      profileId: newUserId,
      fullName,
      email,
      password,
    })
  } catch (err: any) {
    console.error('Onboard member login error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
