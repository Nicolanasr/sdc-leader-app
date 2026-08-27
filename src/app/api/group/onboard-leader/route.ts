import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    // 1. Authenticate caller and check roles (chef_groupe or amin_serr_group scope only)
    const clientSupabase = await createServerSupabase()
    const {
      data: { user: caller },
    } = await clientSupabase.auth.getUser()

    const callerScopes = caller?.app_metadata?.role_scopes || [caller?.app_metadata?.role_scope]
    const callerGroupId = caller?.app_metadata?.group_id

    const hasAuthorizedScope = callerScopes.includes('chef_groupe') || callerScopes.includes('amin_serr_group')

    if (!caller || !hasAuthorizedScope || !callerGroupId) {
      return NextResponse.json({ error: 'Unauthorized. Group management access only.' }, { status: 401 })
    }

    // 2. Parse request payload (roleNames and responsibilityIds are arrays)
    const { email, fullName, rank, responsibilityIds, roleNames, troopId } = await request.json()

    if (!email || !fullName || !rank || !responsibilityIds || !roleNames || !Array.isArray(responsibilityIds) || !Array.isArray(roleNames)) {
      return NextResponse.json({ error: 'Missing or malformed onboarding parameters.' }, { status: 400 })
    }

    if (responsibilityIds.length === 0 || roleNames.length === 0) {
      return NextResponse.json({ error: 'At least one role and one responsibility must be selected.' }, { status: 400 })
    }

    // Prevent configuring system administrators from group dashboard
    if (roleNames.includes('configurator')) {
      return NextResponse.json({ error: 'Cannot provision a Configurator role from Group dashboard.' }, { status: 400 })
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

    // 4. Verify troop scope tenancy if any of the target roles are troop-scoped
    // Fetch scopes of all selected roles
    const { data: dbRoles, error: rolesQueryError } = await adminSupabase
      .from('roles')
      .select('id, name, permission_scope')
      .in('name', roleNames)

    if (rolesQueryError || !dbRoles || dbRoles.length === 0) {
      return NextResponse.json({ error: 'Failed to retrieve system roles configuration.' }, { status: 500 })
    }

    const hasTroopScopedRole = dbRoles.some((r) => ['ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a'].includes(r.permission_scope))
    if (hasTroopScopedRole) {
      if (!troopId) {
        return NextResponse.json({ error: 'Troop selection is required for troop-level roles.' }, { status: 400 })
      }

      // Check if target troop exists and belongs to the caller's group
      const { data: troopData, error: troopError } = await clientSupabase
        .from('troops')
        .select('group_id')
        .eq('id', troopId)
        .single()

      if (troopError || !troopData || troopData.group_id !== callerGroupId) {
        return NextResponse.json({ error: 'Unauthorized troop assignment scope.' }, { status: 400 })
      }
    }

    // 5. Query responsibility names to build the legacy fallback mahemm text cache
    const { data: dbResps, error: respsQueryError } = await adminSupabase
      .from('responsibilities')
      .select('id, name')
      .in('id', responsibilityIds)

    if (respsQueryError || !dbResps || dbResps.length === 0) {
      return NextResponse.json({ error: 'Failed to retrieve responsibilities configuration.' }, { status: 500 })
    }

    const fallbackMahemmText = dbResps.map((r) => r.name).join(', ')

    // 6. Create user account directly with temporary password to bypass email rate limits
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

    // 7. Create Profile record for the new leader
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .insert({
        id: newUserId,
        email,
        full_name: fullName,
        rank: rank,
        mahemm: fallbackMahemmText, // fallback text cache
      })

    if (profileError) {
      await adminSupabase.auth.admin.deleteUser(newUserId)
      return NextResponse.json({ error: 'Failed to create leader profile: ' + profileError.message }, { status: 500 })
    }

    // 8. Map responsibilities in the join table
    const responsibilityMappings = responsibilityIds.map((rId: string) => ({
      profile_id: newUserId,
      responsibility_id: rId,
    }))

    const { error: respMapError } = await adminSupabase
      .from('profile_responsibilities')
      .insert(responsibilityMappings)

    if (respMapError) {
      return NextResponse.json({ error: 'Failed to map responsibilities: ' + respMapError.message }, { status: 500 })
    }

    // 9. Map permissions in user_roles scoped to the Group (and optional Troop)
    const roleMappings = dbRoles.map((role) => ({
      profile_id: newUserId,
      role_id: role.id,
      group_id: callerGroupId,
      troop_id: ['ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a'].includes(role.permission_scope) ? troopId : null,
    }))

    const { error: roleMapError } = await adminSupabase
      .from('user_roles')
      .insert(roleMappings)

    if (roleMapError) {
      return NextResponse.json({ error: 'Failed to assign leader role permissions: ' + roleMapError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, userId: newUserId, tempPassword })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error occurred' }, { status: 500 })
  }
}
