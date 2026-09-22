import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const AUTHORIZED_ROLES = [
  'chef_groupe',
  'assistant_chef_groupe',
  'amin_serr_group',
  'ka2ed_fer2a',
  'configurator',
]

function getAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is not set.')
  }
  return createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

// ── GET: Check member login status ──
export async function GET(request: NextRequest) {
  try {
    const clientSupabase = await createServerSupabase()
    const {
      data: { user: caller },
    } = await clientSupabase.auth.getUser()

    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')

    if (!memberId) {
      return NextResponse.json({ error: 'Missing memberId query parameter.' }, { status: 400 })
    }

    const adminSupabase = getAdminClient()

    // Find profile linked to this member_id
    const { data: profile, error } = await adminSupabase
      .from('profiles')
      .select('id, email, full_name, needs_password_change')
      .eq('member_id', memberId)
      .eq('is_deleted', false)
      .maybeSingle()

    if (error) {
      console.warn('[OnboardMemberLogin] Profile lookup warning:', error.message)
    }

    if (profile) {
      return NextResponse.json({
        isProvisioned: true,
        profileId: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        needsPasswordChange: profile.needs_password_change,
      })
    }

    return NextResponse.json({
      isProvisioned: false,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── POST: Provision or reset member login ──
export async function POST(request: Request) {
  try {
    // 1. Authenticate caller
    const clientSupabase = await createServerSupabase()
    const {
      data: { user: caller },
    } = await clientSupabase.auth.getUser()

    const callerScopes = caller?.app_metadata?.role_scopes || [caller?.app_metadata?.role_scope]
    const callerGroupId = caller?.app_metadata?.group_id

    const hasAuthorizedScope = callerScopes.some((s: string) => AUTHORIZED_ROLES.includes(s))

    if (!caller || !hasAuthorizedScope || !callerGroupId) {
      return NextResponse.json(
        { error: 'Unauthorized to provision member login accounts.' },
        { status: 401 }
      )
    }

    // 2. Parse payload
    const { memberId, email, password, isReset } = await request.json()

    if (!memberId || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required parameters: memberId, email, and password.' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      )
    }

    const adminSupabase = getAdminClient()

    // 3. Fetch Member record
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

    // 4. Check if profile / auth user already exists for this member
    const { data: existingProfile } = await adminSupabase
      .from('profiles')
      .select('id, email')
      .eq('member_id', memberId)
      .maybeSingle()

    let targetUserId = existingProfile?.id

    if (targetUserId) {
      // Existing member account: update credentials
      const { error: updateError } = await adminSupabase.auth.admin.updateUserById(targetUserId, {
        email,
        password,
        app_metadata: {
          role_scope: 'scout_member',
          role: 'scout_member',
          group_id: callerGroupId,
          troop_id: member.troop_id,
          member_id: member.id,
        },
      })

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      await adminSupabase.from('profiles').update({
        email,
        full_name: fullName,
        needs_password_change: true,
      }).eq('id', targetUserId)
    } else {
      // 5. Create new auth user
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
          // If the auth user exists with this email, attempt to link it
          const { data: userList } = await adminSupabase.auth.admin.listUsers()
          const matchedUser = userList?.users?.find(
            (u) => u.email?.toLowerCase() === email.toLowerCase()
          )

          if (matchedUser && (!isReset)) {
            return NextResponse.json(
              {
                error: `An account with email "${email}" already exists. If this is the same scout, use the Reset Password option.`,
              },
              { status: 400 }
            )
          }

          if (matchedUser && isReset) {
            targetUserId = matchedUser.id
            await adminSupabase.auth.admin.updateUserById(targetUserId, {
              password,
              app_metadata: {
                role_scope: 'scout_member',
                role: 'scout_member',
                group_id: callerGroupId,
                troop_id: member.troop_id,
                member_id: member.id,
              },
            })
          } else {
            return NextResponse.json(
              { error: 'A user account with this email address already exists.' },
              { status: 400 }
            )
          }
        } else {
          return NextResponse.json(
            { error: createError?.message || 'Failed to create member user account.' },
            { status: 500 }
          )
        }
      } else {
        targetUserId = userData.user.id
      }

      // 6. Create or update profile record with linked member_id
      const { error: profileError } = await adminSupabase.from('profiles').upsert({
        id: targetUserId,
        member_id: member.id,
        email,
        full_name: fullName,
        rank: member.current_rank || 'Scout',
        needs_password_change: true,
      })

      if (profileError) {
        console.error('Failed to create profile for member:', profileError)
      }
    }

    // 7. Ensure role entry in user_roles
    const { data: scoutRole } = await adminSupabase
      .from('roles')
      .select('id')
      .eq('name', 'scout_member')
      .maybeSingle()

    if (scoutRole?.id && targetUserId) {
      await adminSupabase.from('user_roles').upsert({
        profile_id: targetUserId,
        role_id: scoutRole.id,
        group_id: callerGroupId,
        troop_id: member.troop_id,
      })
    }

    return NextResponse.json({
      success: true,
      profileId: targetUserId,
      fullName,
      email,
      password,
    })
  } catch (err: unknown) {
    console.error('Onboard member login error:', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
