import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    // 1. Authenticate caller and check roles (chef_groupe, assistant_chef_groupe, amin_serr_group, ka2ed_fer2a, configurator)
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
      return NextResponse.json({ error: 'Unauthorized. Leader password management access only.' }, { status: 401 })
    }

    // 2. Parse request payload
    const { userId, newPassword, requirePasswordChange = true } = await request.json()

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'Missing required parameters: userId and newPassword.' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 })
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

    // 4. Verify target user belongs to the caller's group
    const { data: userRoleRow, error: roleCheckError } = await adminSupabase
      .from('user_roles')
      .select('group_id')
      .eq('profile_id', userId)
      .eq('group_id', callerGroupId)
      .maybeSingle()

    if (roleCheckError || !userRoleRow) {
      // Fallback check on profiles table if leader was created without user_roles yet
      const { data: profileCheck } = await adminSupabase
        .from('profiles')
        .select('id, group_id')
        .eq('id', userId)
        .maybeSingle()

      if (!profileCheck || (profileCheck.group_id && profileCheck.group_id !== callerGroupId)) {
        return NextResponse.json({ error: 'Leader not found in your scout group.' }, { status: 404 })
      }
    }

    // 5. Update the target user's password in Supabase Auth
    const { error: authError } = await adminSupabase.auth.admin.updateUserById(
      userId,
      {
        password: newPassword,
      }
    )

    if (authError) {
      console.error('Leader password update error:', authError)
      return NextResponse.json({ error: 'Failed to update authentication credentials: ' + authError.message }, { status: 500 })
    }

    // 6. Update needs_password_change flag on profile if requested
    if (requirePasswordChange) {
      await adminSupabase
        .from('profiles')
        .update({ needs_password_change: true })
        .eq('id', userId)
    }

    // 7. Dispatch multi-channel notification to the leader
    const { sendNotification } = await import('@/services/notifications')
    sendNotification(userId, {
      title: 'Password Reset Notice',
      message: `Your portal password was updated by a group administrator.\n\nYour new temporary password is: ${newPassword}\n\nPlease login and update your password.`,
      actionUrl: '/login',
      category: 'leaders',
      channels: ['in_app', 'email', 'whatsapp'],
    }).catch((notifErr) => console.warn('[ResetLeaderPassword] Notification warning:', notifErr))

    return NextResponse.json({ success: true, message: 'Password updated successfully.' })
  } catch (err: any) {
    console.error('Reset password API exception:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
