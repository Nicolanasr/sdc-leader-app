import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { FEATURES } from '@/config/features'
import {
  ADMIN_SWITCH_COOKIE,
  createSwitchToken,
  verifyPasscode,
  verifySwitchToken,
} from '@/lib/adminSwitchAuth'
import AdminSwitchClient, { SwitchUser } from './AdminSwitchClient'

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  chef_groupe: 'Chef de Groupe (قائد الفوج)',
  assistant_chef_groupe: 'Assistant Chef de Groupe (مساعد قائد الفوج)',
  amin_serr_group: 'Secrétaire Général (أمين السر)',
  amin_sandou2_group: 'Trésorier Général (أمين الصندوق)',
  amin_tejhizet_group: 'Quartier-Maître (أمين التجهيزات)',
  mas2oul_mounet: 'Responsable Mounet (مسؤول المؤونة)',
  amin_mounet_group: 'Responsable Mounet (مسؤول المؤونة)',
  mas2oul_toswir: 'Responsable Média (مسؤول الإعلام)',
  ka2ed_idare: 'Chef Administratif (القائد الإداري)',
  ka2ed_fer2a: 'Chef d’Unité (قائد الوحدة)',
  mouse3ed_ka2ed_fer2a: 'Assistant Chef d’Unité (مساعد قائد الوحدة)',
  scout_member: 'Scout Member (عضو كشفي)',
  configurator: 'System Administrator (مدير النظام)',
}

export default async function AdminSwitchPage() {
  if (!process.env.ADMIN_SWITCH_PASSCODE?.trim()) {
    notFound()
  }

  const cookieStore = await cookies()
  const unlocked = verifySwitchToken(cookieStore.get(ADMIN_SWITCH_COOKIE)?.value)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  let users: SwitchUser[] = []

  // Only fetch user directory after the passcode cookie is verified
  if (unlocked && serviceRoleKey) {
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: profiles } = await adminSupabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        rank,
        user_roles (
          roles:role_id (name),
          troops:troop_id (name)
        )
      `)
      .eq('is_deleted', false)
      .order('full_name')

    interface ProfileRow {
      id: string
      full_name: string | null
      email: string
      rank: string | null
      user_roles?: Array<{
        roles?: { name?: string | null } | null
        troops?: { name?: string | null } | null
      }> | null
    }

    users = ((profiles || []) as unknown as ProfileRow[]).map((p) => {
      const ur = p.user_roles?.[0]
      const rawRole = ur?.roles?.name || p.rank || 'scout_leader'
      return {
        id: p.id,
        fullName: p.full_name || 'Leader',
        email: p.email,
        role: rawRole,
        roleLabel: ROLE_DISPLAY_NAMES[rawRole] || rawRole.replace(/_/g, ' '),
        troopName: ur?.troops?.name || null,
        rank: p.rank || null,
      }
    })

    if (!FEATURES.scoutMemberLogin) {
      users = users.filter((u) => u.role !== 'scout_member')
    }
  }

  async function unlockSwitch(passcode: string) {
    'use server'
    if (!verifyPasscode(passcode)) {
      return { error: 'Invalid passcode.' }
    }
    const token = createSwitchToken()
    if (!token) {
      return { error: 'Server misconfiguration.' }
    }

    const store = await cookies()
    store.set(ADMIN_SWITCH_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/admin-switch',
      maxAge: 60 * 30,
    })
    return { ok: true }
  }

  async function lockSwitch() {
    'use server'
    const store = await cookies()
    store.delete({ name: ADMIN_SWITCH_COOKIE, path: '/admin-switch' })
  }

  async function loginAsUser(targetEmail: string) {
    'use server'
    const store = await cookies()
    if (!verifySwitchToken(store.get(ADMIN_SWITCH_COOKIE)?.value)) {
      return { error: 'Session locked or expired. Please re-enter passcode.' }
    }

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) {
      return { error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is missing.' }
    }

    try {
      const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        key,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )

      const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
        type: 'magiclink',
        email: targetEmail,
      })

      if (linkError || !linkData?.properties?.hashed_token) {
        return { error: linkError?.message || 'Could not generate session.' }
      }

      const serverSupabase = await createClient()
      const { data: verifyData, error: verifyError } = await serverSupabase.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: 'magiclink',
      })

      if (verifyError) {
        return { error: verifyError.message }
      }

      const role = verifyData.user?.app_metadata?.role
      redirect(role === 'configurator' ? '/configurator' : '/group/dashboard')
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'NEXT_REDIRECT') {
        throw err
      }
      return { error: err instanceof Error ? err.message : 'Unexpected error.' }
    }
  }

  return (
    <AdminSwitchClient
      unlocked={unlocked}
      users={users}
      onUnlock={unlockSwitch}
      onLock={lockSwitch}
      onLoginAs={loginAsUser}
    />
  )
}
