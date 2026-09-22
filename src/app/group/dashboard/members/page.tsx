import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import MembersManagement from './MembersManagement'

export default async function MembersPage() {
  const supabase = await createClient()

  // 1. Authenticate user and verify group boundaries
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const groupId = user.app_metadata?.group_id
  let userRole = user.app_metadata?.role_scope || user.app_metadata?.role || 'guest'
  let userTroopId = user.app_metadata?.troop_id || null

  const adminDb = (await import('@/utils/supabase/admin')).createAdminClient()

  // If user has multiple roles, query user_roles to check for troop leader or group permissions
  const { data: userRolesData } = await adminDb
    .from('user_roles')
    .select('role_id, troop_id, roles:role_id (name, permission_scope)')
    .eq('profile_id', user.id)

  const activeScopes = (userRolesData || []).map((ur: any) => ur.roles?.permission_scope || ur.roles?.name).filter(Boolean)
  if (!userTroopId) {
    const troopRole = (userRolesData || []).find((ur: any) => ur.troop_id)
    if (troopRole) userTroopId = troopRole.troop_id
  }

  const userRoles: string[] = Array.from(
    new Set([
      userRole,
      ...(user.app_metadata?.roles || []),
      ...(user.app_metadata?.role_scopes || []),
      ...activeScopes,
    ].filter(Boolean))
  )

  let memberPatrolRole: string | null = null
  if (userRole === 'scout_member') {
    const memberId = user.app_metadata?.member_id
    if (memberId) {
      const { data: memberData } = await supabase
        .from('members')
        .select('id, troop_id, patrol_role')
        .eq('id', memberId)
        .maybeSingle()
      memberPatrolRole = memberData?.patrol_role || null
      if (memberData?.troop_id) userTroopId = memberData.troop_id
    } else {
      const { data: prof } = await supabase
        .from('profiles')
        .select('member_id, members(id, troop_id, patrol_role)')
        .eq('id', user.id)
        .maybeSingle()
      const m = prof?.members as any
      memberPatrolRole = m?.patrol_role || null
      if (m?.troop_id) userTroopId = m.troop_id
    }
  }

  const isUnitSecretary = userRole === 'scout_member' && memberPatrolRole === 'amin_serr'

  const allowedRoles = [
    'chef_groupe', 'assistant_chef_groupe', 'amin_serr_group',
    'ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a', 'chef_troupe', 'configurator',
  ]

  const hasAccess = allowedRoles.includes(userRole) || activeScopes.some((s: string) => allowedRoles.includes(s)) || isUnitSecretary

  if (!groupId || !hasAccess) {
    redirect('/group/dashboard?message=Unauthorized. Youth Roster access only.')
  }

  const isGroupExecutive =
    userRoles.some((r) => ['chef_groupe', 'assistant_chef_groupe', 'amin_serr_group', 'configurator'].includes(r)) ||
    activeScopes.some((s: string) => ['chef_groupe', 'assistant_chef_groupe', 'amin_serr_group', 'configurator'].includes(s))

  const isTroopLeader =
    !isGroupExecutive &&
    (userRoles.some((r) => ['ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a', 'chef_troupe'].includes(r)) ||
      activeScopes.some((s: string) => ['ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a', 'chef_troupe'].includes(s)) ||
      isUnitSecretary)

  // 2. Fetch Group Name
  const { data: groupData } = await supabase
    .from('groups')
    .select('name')
    .eq('id', groupId)
    .single()

  const groupName = groupData?.name || 'Scout Group'

  // 3. Fetch active troops under this group (scoped for troop leaders)
  let troopsQuery = supabase
    .from('troops')
    .select(`
      id,
      name,
      section_types:section_type_id (name)
    `)
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  if (isTroopLeader && userTroopId) {
    troopsQuery = troopsQuery.eq('id', userTroopId)
  }

  const { data: troopsData } = await troopsQuery

  // Parse troops mapping to shape
  const troopsList = (troopsData || []).map((t: any) => ({
    id: t.id,
    name: t.name,
    sectionName: t.section_types?.name || 'Global (General)',
  }))

  // 4. Fetch all patrols under the group's troops
  const troopIdsList = (troopsData || []).map((t) => t.id)
  let patrolsData: any[] = []
  if (troopIdsList.length > 0) {
    const { data: patrols } = await supabase
      .from('patrols')
      .select('id, name, troop_id')
      .in('troop_id', troopIdsList)
      .eq('is_deleted', false)
      .order('name', { ascending: true })
    patrolsData = patrols || []
  }

  // 5. Fetch members (scoped for troop leaders)
  let membersQuery = supabase
    .from('members')
    .select(`
      *,
      troops:troop_id (id, name),
      patrols:patrol_id (id, name)
    `)
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('first_name', { ascending: true })

  if (isTroopLeader && userTroopId) {
    membersQuery = membersQuery.eq('troop_id', userTroopId)
  }

  const { data: membersData } = await membersQuery

  // 6. Fetch promotion history logs for all members
  const memberIdsList = (membersData || []).map((m) => m.id)
  let historyData: any[] = []
  if (memberIdsList.length > 0) {
    const { data: history } = await supabase
      .from('member_history')
      .select('*')
      .in('member_id', memberIdsList)
      .order('created_at', { ascending: false })
    historyData = history || []
  }

  // Group history logs by member_id and extract sibling_ids
  const historyMap: Record<string, any[]> = {}
  const siblingMap: Record<string, string[]> = {}

  for (const log of historyData) {
    if (!historyMap[log.member_id]) {
      historyMap[log.member_id] = []
    }
    historyMap[log.member_id].push(log)

    if (log.event_type === 'sibling_link' && log.new_value) {
      if (!siblingMap[log.member_id]) siblingMap[log.member_id] = []
      if (!siblingMap[log.member_id].includes(log.new_value)) {
        siblingMap[log.member_id].push(log.new_value)
      }
    }
  }

  // Enrich membersData with sibling_ids from siblingMap
  const enrichedMembers = (membersData || []).map((m: any) => ({
    ...m,
    sibling_ids: m.sibling_ids && Array.isArray(m.sibling_ids) && m.sibling_ids.length > 0
      ? m.sibling_ids
      : (siblingMap[m.id] || []),
  }))

  // 7. If user is a Troop Leader or Unit Secretary, scope members strictly to their troop
  let filteredMembers = enrichedMembers
  if ((['ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a', 'chef_troupe'].includes(userRole) || isUnitSecretary) && userTroopId) {
    filteredMembers = enrichedMembers.filter((m: any) => m.troop_id === userTroopId)
  }

  // 8. Fetch user profile full name
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const userName = userProfile?.full_name || user.email || 'Leader'

  return (
    <MembersManagement
      initialMembers={filteredMembers}
      troops={troopsList}
      patrols={patrolsData}
      historyMap={historyMap}
      groupName={groupName}
      groupId={groupId}
      currentRole={userRole}
      roles={userRoles}
      patrolRole={memberPatrolRole}
      userTroopId={userTroopId}
      userName={userName}
    />
  )
}
