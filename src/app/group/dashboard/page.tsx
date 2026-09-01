import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import GroupDashboardLayout, { UpcomingEvent } from './GroupDashboardLayout'

export default async function GroupDashboardPage() {
  const supabase = await createClient()

  // 1. Authenticate and retrieve user data
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = user?.app_metadata?.role
  const groupId = user?.app_metadata?.group_id

  const allowedRoles = [
    'chef_groupe',
    'assistant_chef_groupe',
    'amin_serr_group',
    'amin_sandou2_group',
    'amin_tejhizet_group',
    'mas2oul_toswir',
    'mas2oul_mounet',
    'ka2ed_idare',
    'ka2ed_fer2a',
    'mouse3ed_ka2ed_fer2a',
  ]

  if (role === 'scout_member') {
    redirect('/group/dashboard/events')
  }

  if (!user || !role || !groupId || !allowedRoles.includes(role)) {
    redirect('/login?message=Unauthorized. Group Leader access only.')
  }

  // 2. Fetch Group & Commissariat Details
  const { data: groupData } = await supabase
    .from('groups')
    .select('name, commissariat_id, commissariats(name)')
    .eq('id', groupId)
    .single()

  const groupName = groupData?.name || 'Scouts des Cèdres'
  const commissariatName = (groupData as any)?.commissariats?.name || 'Saint Jean Marc'

  // 3. Fetch summary statistics (Generic & useful for all leaders)
  const nowIso = new Date().toISOString()

  // A. Total Active Members (Scouts)
  const { count: scoutCount } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .eq('is_active', true)
    .eq('is_deleted', false)

  // B. Total Troops in Group
  const { count: troopCount } = await supabase
    .from('troops')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .eq('is_deleted', false)

  // C. Total Active Leaders
  const { count: leaderCount } = await supabase
    .from('user_roles')
    .select('profile_id', { count: 'exact', head: true })
    .eq('group_id', groupId)

  // D. Total Upcoming Events
  const { count: upcomingEventsCount } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .gte('start_time', nowIso)

  // E. Equipment count
  const { count: equipmentCount } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .eq('is_deleted', false)

  // F. Pantry items count
  const { count: pantryCount } = await supabase
    .from('group_pantry_items')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .eq('is_deleted', false)

  // 4. Fetch the next upcoming events (Next 3)
  const { data: upcomingEventsData } = await supabase
    .from('events')
    .select('id, title, event_type, start_time, end_time, location_name, troops(name)')
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .gte('start_time', nowIso)
    .order('start_time', { ascending: true })
    .limit(3)

  // 5. Fetch logged in user full_name and assigned troop
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: userRoleData } = await supabase
    .from('user_roles')
    .select('troop_id, troops(name)')
    .eq('profile_id', user.id)
    .eq('group_id', groupId)
    .not('troop_id', 'is', null)
    .maybeSingle()

  const userName = userProfile?.full_name || user.email || 'Leader'
  const assignedTroopName = (userRoleData as any)?.troops?.name || null

  const stats = {
    scoutCount: scoutCount || 0,
    troopCount: troopCount || 0,
    leaderCount: leaderCount || 0,
    upcomingEventsCount: upcomingEventsCount || 0,
    equipmentCount: equipmentCount || 0,
    pantryCount: pantryCount || 0,
  }

  const upcomingEvents: UpcomingEvent[] = (upcomingEventsData || []).map((ev: any) => ({
    id: ev.id,
    title: ev.title,
    event_type: ev.event_type || 'Activity',
    start_time: ev.start_time,
    end_time: ev.end_time,
    location_name: ev.location_name,
    troops: Array.isArray(ev.troops) ? ev.troops[0] || null : ev.troops || null,
  }))

  return (
    <GroupDashboardLayout
      groupName={groupName}
      commissariatName={commissariatName}
      role={role}
      groupId={groupId}
      stats={stats}
      userName={userName}
      assignedTroopName={assignedTroopName}
      upcomingEvents={upcomingEvents}
    />
  )
}
