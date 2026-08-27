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
  const userRole = user.app_metadata?.role_scope || user.app_metadata?.role || 'guest'
  const userTroopId = user.app_metadata?.troop_id || null

  if (!groupId) {
    redirect('/login?message=Unauthorized. No group association found.')
  }

  // 2. Fetch Group Name
  const { data: groupData } = await supabase
    .from('groups')
    .select('name')
    .eq('id', groupId)
    .single()

  const groupName = groupData?.name || 'Scout Group'

  // 3. Fetch all active troops under this group with section type maps
  const { data: troopsData } = await supabase
    .from('troops')
    .select(`
      id,
      name,
      section_types:section_type_id (name)
    `)
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('name', { ascending: true })

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

  // 5. Fetch all members in this group
  const { data: membersData } = await supabase
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
      group_id,
      troop_id,
      patrol_id,
      is_active,
      troops:troop_id (id, name),
      patrols:patrol_id (id, name)
    `)
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('first_name', { ascending: true })

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

  // Group history logs by member_id
  const historyMap: Record<string, any[]> = {}
  for (const log of historyData) {
    if (!historyMap[log.member_id]) {
      historyMap[log.member_id] = []
    }
    historyMap[log.member_id].push(log)
  }

  // 7. If user is a Troop Leader (ka2ed_fer2a / mouse3ed_ka2ed_fer2a), scope members strictly to their troop
  let filteredMembers = membersData || []
  if (['ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a'].includes(userRole) && userTroopId) {
    filteredMembers = (membersData || []).filter((m) => m.troop_id === userTroopId)
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
