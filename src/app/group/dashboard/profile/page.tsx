import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import DashboardShell from '../DashboardShell'
import UserProfileView, {
  ProfileRecord,
  MemberRecord,
  LeaderRoleItem,
} from './UserProfileView'

export default async function UserProfilePage() {
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?message=Please log in to view your profile.')
  }

  const role = user.app_metadata?.role || 'scout_member'
  const groupId = user.app_metadata?.group_id

  // 2. Fetch Group details
  let groupName = 'Scout Group'
  if (groupId) {
    const { data: groupData } = await supabase
      .from('groups')
      .select('name')
      .eq('id', groupId)
      .maybeSingle()
    if (groupData?.name) groupName = groupData.name
  }

  // 3. Fetch User Profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone_number, whatsapp_number, rank, member_id')
    .eq('id', user.id)
    .single()

  const profile: ProfileRecord = {
    id: user.id,
    full_name: profileData?.full_name || user.user_metadata?.full_name || user.email || 'Scout User',
    email: profileData?.email || user.email || '',
    phone_number: profileData?.phone_number || null,
    whatsapp_number: profileData?.whatsapp_number || null,
    rank: profileData?.rank || null,
    member_id: profileData?.member_id || user.app_metadata?.member_id || null,
  }

  let member: MemberRecord | null = null
  let suggestedMembers: any[] = []

  // 4. Fetch Member record if linked
  if (profile.member_id) {
    const { data: memberData } = await supabase
      .from('members')
      .select(`
        id,
        first_name,
        last_name,
        birth_date,
        blood_type,
        medical_info,
        emergency_contact_name,
        emergency_contact_relation,
        emergency_contact_phone,
        photo_url,
        promise_date,
        current_rank,
        patrol_role,
        member_phone,
        school,
        hobbies,
        address,
        is_active,
        troops:troop_id (
          id,
          name
        ),
        patrols:patrol_id (
          id,
          name
        )
      `)
      .eq('id', profile.member_id)
      .maybeSingle()

    if (memberData) {
      member = memberData as unknown as MemberRecord
    }
  } else if (profile.full_name) {
    // 5. Look for matching scout member by name
    const nameParts = profile.full_name.trim().split(/\s+/)
    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ')

    const { data: matches } = await supabase
      .from('members')
      .select('id, first_name, last_name, troop_id, current_rank, troops:troop_id(name)')
      .eq('is_deleted', false)
      .ilike('first_name', `%${firstName}%`)
      .limit(5)

    if (matches) {
      suggestedMembers = matches.filter((m) => {
        if (!lastName) return true
        return m.last_name.toLowerCase().includes(lastName.toLowerCase())
      })
    }
  }

  // 6. Fetch Leader Roles if leader
  const leaderRoles: LeaderRoleItem[] = []
  if (role !== 'scout_member') {
    const { data: userRolesData } = await supabase
      .from('user_roles')
      .select(`
        roles:role_id (name, permission_scope),
        troops:troop_id (name)
      `)
      .eq('profile_id', user.id)

    interface UserRoleRow {
      roles?: { name?: string; permission_scope?: string } | null
      troops?: { name?: string } | null
    }

    for (const ur of (userRolesData || []) as unknown as UserRoleRow[]) {
      if (ur.roles?.name) {
        leaderRoles.push({
          roleName: ur.roles.name,
          troopName: ur.troops?.name || null,
          permissionScope: ur.roles.permission_scope || null,
        })
      }
    }
  }

  return (
    <DashboardShell
      groupName={groupName}
      currentRole={role}
      patrolRole={member?.patrol_role || null}
      userName={profile.full_name}
    >
      <UserProfileView
        profile={profile}
        member={member}
        leaderRoles={leaderRoles}
        suggestedMembers={suggestedMembers}
        currentRole={role}
      />
    </DashboardShell>
  )
}
