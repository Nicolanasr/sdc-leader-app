import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import InventoryManagement from './InventoryManagement'

export default async function InventoryPage() {
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = user?.app_metadata?.role
  const groupId = user?.app_metadata?.group_id
  const userTroopId = user?.app_metadata?.troop_id || null

  if (!user || !role || !groupId) {
    redirect('/login?message=Unauthorized. Leader access only.')
  }

  // Check if user is an event leader / event staff
  const { data: eventStaffAssignments } = await supabase
    .from('event_staff')
    .select('id, event_id, event_role')
    .eq('profile_id', user.id)

  const isEventStaff = (eventStaffAssignments || []).length > 0

  const strictlyAllowedRoles = [
    'chef_groupe',
    'assistant_chef_groupe',
    'amin_tejhizet_group',
    'ka2ed_fer2a',
    'mouse3ed_ka2ed_fer2a',
    'configurator',
  ]

  const hasAccess = strictlyAllowedRoles.includes(role) || isEventStaff

  if (!hasAccess) {
    redirect('/group/dashboard?message=Access to Inventory is restricted to Quartermasters, Group Leaders, and Troop/Event Leaders.')
  }

  // 2. Fetch Group details
  const { data: groupData } = await supabase
    .from('groups')
    .select('name, commissariat_id, commissariats(name)')
    .eq('id', groupId)
    .single()

  const groupName = groupData?.name || 'My Group'

  // 3. Fetch User profile
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const userName = userProfile?.full_name || user.email || 'Leader'

  // 4. Fetch Troops in Group
  const { data: rawTroops } = await supabase
    .from('troops')
    .select('id, name, section_types(name)')
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  const troops = (rawTroops || []).map((t: any) => ({
    id: t.id,
    name: t.name,
    sectionName: t.section_types?.name || 'Scout Unit',
  }))

  // 5. Fetch Leaders in Group
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('profile_id, roles(name), troops(name), profiles(id, full_name, email, rank)')
    .eq('group_id', groupId)

  const leadersMap: Record<string, any> = {}
  userRoles?.forEach((ur: any) => {
    if (ur.profiles) {
      leadersMap[ur.profiles.id] = {
        id: ur.profiles.id,
        fullName: ur.profiles.full_name,
        email: ur.profiles.email,
        rank: ur.profiles.rank || 'Leader',
      }
    }
  })
  const leaders = Object.values(leadersMap)

  // 6. Fetch Events (for checkout association)
  const { data: eventsData } = await supabase
    .from('events')
    .select('id, title, event_type, start_time, end_time, scope, troop_id')
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('start_time', { ascending: false })

  const events = (eventsData || []).map((e: any) => ({
    id: e.id,
    title: e.title,
    event_type: e.event_type,
    start_time: e.start_time,
    end_time: e.end_time,
    scope: e.scope,
    troop_id: e.troop_id,
  }))

  // 7. Fetch Inventory Items
  const { data: inventoryData } = await supabase
    .from('quartermaster_inventory')
    .select('*')
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  // 8. Fetch Checkouts (safe select without relational embed)
  const { data: checkoutsData } = await supabase
    .from('inventory_checkouts')
    .select('*')
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  // 9. Fetch Decommission / Write-Offs
  const { data: writeoffsData } = await supabase
    .from('inventory_writeoffs')
    .select('*')
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('requested_at', { ascending: false })

  return (
    <InventoryManagement
      groupId={groupId}
      groupName={groupName}
      currentRole={role}
      userTroopId={userTroopId}
      userId={user.id}
      userName={userName}
      isEventStaff={isEventStaff}
      userEventRoles={eventStaffAssignments || []}
      troops={troops}
      leaders={leaders}
      events={events}
      initialInventory={inventoryData || []}
      initialCheckouts={checkoutsData || []}
      initialWriteoffs={writeoffsData || []}
    />
  )
}
