import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import LeadersManagement from './LeadersManagement'

export default async function LeadersDirectoryPage() {
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = user?.app_metadata?.role
  const groupId = user?.app_metadata?.group_id

  const allowedRoles = [
    'chef_groupe',
    'assistant_chef_groupe',
    'amin_serr_group',
    'configurator',
  ]

  if (!user || !role || !groupId || !allowedRoles.includes(role)) {
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

  // 8. Fetch logged in user full_name
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
      groupId={groupId}
      groupName={groupName}
      ranks={ranks || []}
      responsibilities={responsibilities || []}
      roles={roles || []}
      userName={userName}
    />
  )
}
