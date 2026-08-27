import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AttendanceManagement from './AttendanceManagement'

export default async function AttendancePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const groupId = user.app_metadata?.group_id
  const userRole = user.app_metadata?.role_scope || user.app_metadata?.role || 'guest'
  const userTroopId = user.app_metadata?.troop_id || null

  const allowedRoles = [
    'chef_groupe', 'assistant_chef_groupe', 'amin_serr_group',
    'ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a',
  ]

  if (!groupId || !allowedRoles.includes(userRole)) {
    redirect('/login?message=Unauthorized.')
  }

  const { data: groupData } = await supabase.from('groups').select('name').eq('id', groupId).single()
  const groupName = groupData?.name || 'Scout Group'

  const isTroopLeader = userRole === 'ka2ed_fer2a' || userRole === 'mouse3ed_ka2ed_fer2a'

  // Troops + patrols
  const { data: troopsData } = await supabase
    .from('troops')
    .select('id, name, section_types:section_type_id (name)')
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  const troopsList = (troopsData || []).map((t: any) => ({
    id: t.id, name: t.name, sectionName: t.section_types?.name || '',
  }))
  const troopIdsList = troopsList.map((t) => t.id)

  let patrolsData: any[] = []
  if (troopIdsList.length > 0) {
    const { data: patrols } = await supabase
      .from('patrols').select('id, name, troop_id')
      .in('troop_id', troopIdsList).eq('is_deleted', false).order('name', { ascending: true })
    patrolsData = patrols || []
  }

  // Active members (troop-scoped for troop leaders)
  let membersQuery = supabase
    .from('members')
    .select('id, first_name, last_name, troop_id, patrol_id, current_rank')
    .eq('group_id', groupId).eq('is_deleted', false).eq('is_active', true)
    .order('first_name', { ascending: true })
  if (isTroopLeader && userTroopId) {
    membersQuery = membersQuery.eq('troop_id', userTroopId)
  }
  const { data: membersData } = await membersQuery

  // Leaders list
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, full_name, email, user_roles!inner(group_id, roles:role_id(name))')
    .eq('user_roles.group_id', groupId).eq('is_deleted', false)
  const leadersList = (profilesData || []).map((p: any) => ({
    id: p.id,
    fullName: p.full_name || p.email || 'Unknown',
    roleName: p.user_roles?.[0]?.roles?.name || 'Leader',
  }))

  // Events (sessions)
  const { data: eventsData } = await supabase
    .from('events')
    .select('id, title, event_type, start_time, scope, troop_id, group_id')
    .eq('group_id', groupId).eq('is_deleted', false)
    .in('event_type', ['weekly_meeting', 'leadership_meeting'])
    .order('start_time', { ascending: false }).limit(100)

  const eventIdsList = (eventsData || []).map((e: any) => e.id)
  let sessionsData: any[] = []
  if (eventIdsList.length > 0) {
    const { data: sessions } = await supabase
      .from('attendance').select('id, event_id, troop_id, date')
      .in('event_id', eventIdsList).eq('is_deleted', false)
      .order('date', { ascending: false })
    sessionsData = sessions || []
  }

  const sessionIdsList = sessionsData.map((s) => s.id)
  let recordsData: any[] = []
  if (sessionIdsList.length > 0) {
    const { data: records } = await supabase
      .from('attendance_records')
      .select('id, attendance_id, member_id, status, excuse_reason')
      .in('attendance_id', sessionIdsList)
    recordsData = records || []
  }

  // Also fetch leadership event staff attendance records
  if (eventIdsList.length > 0) {
    const { data: staffData } = await supabase
      .from('event_staff')
      .select('id, event_id, profile_id, attendance_status, excuse_reason')
      .in('event_id', eventIdsList)

    if (staffData && staffData.length > 0) {
      for (const st of staffData) {
        const matchingSession = sessionsData.find((s) => s.event_id === st.event_id)
        if (matchingSession) {
          recordsData.push({
            id: `staff_${st.id}`,
            attendance_id: matchingSession.id,
            member_id: st.profile_id,
            status: st.attendance_status || 'present',
            excuse_reason: st.excuse_reason || null,
          })
        }
      }
    }
  }

  // Fetch logged in user full name
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const userName = userProfile?.full_name || user.email || 'Leader'

  return (
    <AttendanceManagement
      groupId={groupId}
      groupName={groupName}
      currentRole={userRole}
      userTroopId={userTroopId}
      troops={troopsList}
      patrols={patrolsData}
      members={membersData || []}
      leaders={leadersList}
      initialEvents={eventsData || []}
      initialSessions={sessionsData}
      initialRecords={recordsData}
      userName={userName}
    />
  )
}
