import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import LeadersManagement from './LeadersManagement'

export default async function LeadersDirectoryPage() {
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = user?.app_metadata?.role || 'scout_member'
  const userRoles: string[] = Array.from(
    new Set([
      role,
      ...(user?.app_metadata?.roles || []),
      ...(user?.app_metadata?.role_scopes || []),
    ].filter(Boolean))
  )
  const groupId = user?.app_metadata?.group_id

  const allowedRoles = [
    'chef_groupe',
    'assistant_chef_groupe',
    'amin_serr_group',
    'configurator',
  ]

  const hasAccess = userRoles.some((r) => allowedRoles.includes(r))

  if (!user || !groupId || !hasAccess) {
    redirect('/group/dashboard?message=Unauthorized. Group Leader and Secretary access only.')
  }

  // 2. Fetch Group Name
  const { data: groupData } = await supabase
    .from('groups')
    .select('name')
    .eq('id', groupId)
    .single()

  const groupName = groupData?.name || 'Scout Group'

  // 3. Fetch all leaders (profiles) in this group with their aggregated roles & responsibilities
  const { data: profilesData } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      rank,
      member_id,
      members:member_id (
        id,
        first_name,
        last_name,
        current_rank,
        promise_date,
        blood_type,
        troop_id,
        troops:troop_id (name)
      ),
      user_roles!inner (
        id,
        group_id,
        roles:role_id (id, name, permission_scope),
        troops:troop_id (id, name)
      ),
      profile_responsibilities (
        responsibilities:responsibility_id (id, name)
      )
    `)
    .eq('user_roles.group_id', groupId)

  // Parse list of leaders
  const leadersList = (profilesData || []).map((prof: any) => ({
    id: prof.id,
    profileId: prof.id,
    fullName: prof.full_name || 'Unknown',
    email: prof.email || 'N/A',
    rank: prof.rank || 'N/A',
    memberId: prof.member_id || null,
    linkedMember: prof.members || null,
    responsibilityIds: (prof.profile_responsibilities || []).map((pr: any) => pr.responsibilities?.id).filter(Boolean),
    responsibilities: (prof.profile_responsibilities || []).map((pr: any) => pr.responsibilities?.name).filter(Boolean),
    roles: (prof.user_roles || []).map((ur: any) => ({
      roleId: ur.roles?.id,
      roleName: ur.roles?.name || 'N/A',
      troopId: ur.troops?.id || null,
      troopName: ur.troops?.name || null,
      permissionScope: ur.roles?.permission_scope || 'N/A',
    })),
  }))

  // 4. Fetch all active troops in this group (to populate selectors)
  const { data: troopsData } = await supabase
    .from('troops')
    .select('id, name')
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  // 5. Fetch configurable Ranks
  const { data: ranks } = await supabase
    .from('ranks')
    .select('id, name')
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  // 6. Fetch configurable Responsibilities
  const { data: responsibilities } = await supabase
    .from('responsibilities')
    .select('id, name')
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  // 7. Fetch system permission Roles (excluding configurator)
  const { data: roles } = await supabase
    .from('roles')
    .select('id, name, permission_scope')
    .neq('permission_scope', 'configurator')
    .order('name', { ascending: true })

  // 8. Fetch all active members in group for linking
  const { data: allMembersData } = await supabase
    .from('members')
    .select('id, first_name, last_name, troop_id, current_rank, troops:troop_id(name)')
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('first_name', { ascending: true })

  const availableMembers = (allMembersData || []).map((m: any) => ({
    id: m.id,
    first_name: m.first_name,
    last_name: m.last_name,
    troop_id: m.troop_id,
    current_rank: m.current_rank,
    troops: Array.isArray(m.troops) ? m.troops[0] : m.troops,
  }))

  // 9. Fetch logged in user full_name
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const userName = userProfile?.full_name || user.email || 'Leader'

  return (
    <LeadersManagement
      initialLeaders={leadersList}
      troops={troopsData || []}
      currentRole={role}
      userRoles={userRoles}
      groupId={groupId}
      groupName={groupName}
      ranks={ranks || []}
      responsibilities={responsibilities || []}
      roles={roles || []}
      userName={userName}
      availableMembers={availableMembers}
    />
  )
}
