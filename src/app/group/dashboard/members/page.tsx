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

  const allowedRoles = [
    'chef_groupe', 'assistant_chef_groupe', 'amin_serr_group',
    'amin_sandou2_group', 'amin_tejhizet_group',
    'ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a', 'chef_troupe', 'configurator',
  ]

  const hasAccess = allowedRoles.includes(userRole) || activeScopes.some((s: string) => allowedRoles.includes(s))

  if (!groupId || !hasAccess) {
    redirect('/group/dashboard?message=Unauthorized. Youth Roster access only.')
  }

  const isTroopLeader = userRole === 'ka2ed_fer2a' || userRole === 'mouse3ed_ka2ed_fer2a' || userRole === 'chef_troupe' || (activeScopes.includes('ka2ed_fer2a') && !activeScopes.includes('chef_groupe'))

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

  // 7. If user is a Troop Leader (ka2ed_fer2a / mouse3ed_ka2ed_fer2a), scope members strictly to their troop
  let filteredMembers = enrichedMembers
  if (['ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a'].includes(userRole) && userTroopId) {
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
      userTroopId={userTroopId}
      userName={userName}
    />
  )
}
