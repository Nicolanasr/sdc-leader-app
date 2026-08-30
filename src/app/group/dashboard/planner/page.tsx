import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import PlannerManagement from './PlannerManagement'

export default async function PlannerPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 1. Fetch Profile & Role
  const groupId = user?.app_metadata?.group_id || user?.user_metadata?.group_id || null
  const role = user?.app_metadata?.role_scope || user?.app_metadata?.role || user?.user_metadata?.role || 'leader'
  const userTroopId = user?.app_metadata?.troop_id || user?.user_metadata?.troop_id || null

  const { data: userProfile } = await supabase
    .from('profiles')
    .select('id, full_name, email, rank')
    .eq('id', user.id)
    .single()

  const userName =
    userProfile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    'Leader'

  // 2. Fetch Group details
  let groupName = 'Scout des Cèdres'
  if (groupId) {
    const { data: groupData } = await supabase
      .from('groups')
      .select('name')
      .eq('id', groupId)
      .single()
    if (groupData?.name) groupName = groupData.name
  }

  // 3. Fetch Troops
  let troopsQuery = supabase
    .from('troops')
    .select('id, name, section_types(name)')
    .eq('is_deleted', false)
    .order('name')

  if (groupId) {
    troopsQuery = troopsQuery.eq('group_id', groupId)
  }

  const { data: troopsData } = await troopsQuery
  const troops = (troopsData || []).map((t: any) => ({
    id: t.id,
    name: t.name,
    sectionName: t.section_types?.name || 'Scout Unit',
  }))

  // 4. Fetch All Registered Leaders in Group (for assigning activity leads)
  let profilesData: any[] = []
  if (groupId) {
    const { data: pData } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        rank,
        user_roles!inner(group_id, troop_id, roles:role_id(name))
      `)
      .eq('user_roles.group_id', groupId)
      .order('full_name')
    profilesData = pData || []
  }

  if (profilesData.length === 0) {
    // Fallback: select all profiles
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, rank')
      .order('full_name')
    profilesData = allProfiles || []
  }

  const leaders = (profilesData || []).map((p: any) => ({
    id: p.id,
    fullName: p.full_name || p.email || 'Leader',
    role: p.user_roles?.[0]?.roles?.name || p.rank || 'Leader',
    troopId: p.user_roles?.[0]?.troop_id || null,
  }))

  // Ensure current user is present in leaders list
  if (user && !leaders.some((l: any) => l.id === user.id)) {
    leaders.unshift({
      id: user.id,
      fullName: userName,
      role: role || 'Leader',
      troopId: userTroopId || null,
    })
  }

  // 5. Fetch Initial Meeting Plans
  let initialPlans: any[] = []

  // Try meeting_plans table first
  const { data: plansData, error: plansError } = await supabase
    .from('meeting_plans')
    .select('*, troops(id, name), profiles:created_by(id, full_name)')
    .order('meeting_date', { ascending: false })

  if (!plansError && plansData && plansData.length > 0) {
    initialPlans = plansData
  } else {
    // Fallback to events table with weekly_meeting
    let evQuery = supabase
      .from('events')
      .select('*, troops(id, name)')
      .eq('event_type', 'weekly_meeting')
      .eq('is_deleted', false)
      .order('start_time', { ascending: false })

    if (groupId) {
      evQuery = evQuery.eq('group_id', groupId)
    }

    const { data: eventsData } = await evQuery
    initialPlans = (eventsData || []).map((ev: any) => {
      let schedule_blocks = []
      let materials_checklist = []
      let theme = ''
      let objectives = ''

      try {
        if (ev.description && ev.description.startsWith('{')) {
          const parsed = JSON.parse(ev.description)
          schedule_blocks = parsed.schedule_blocks || []
          materials_checklist = parsed.materials_checklist || []
          theme = parsed.theme || ''
          objectives = parsed.objectives || ''
        } else {
          theme = ev.description || ''
        }
      } catch {
        theme = ev.description || ''
      }

      const dateStr = ev.start_time ? ev.start_time.split('T')[0] : new Date().toISOString().split('T')[0]
      const startTimeStr = ev.start_time ? ev.start_time.split('T')[1]?.substring(0, 5) || '14:00' : '14:00'
      const endTimeStr = ev.end_time ? ev.end_time.split('T')[1]?.substring(0, 5) || '16:30' : '16:30'

      return {
        id: ev.id,
        group_id: ev.group_id,
        troop_id: ev.troop_id,
        event_id: ev.id,
        title: ev.title,
        theme,
        objectives,
        meeting_date: dateStr,
        start_time: startTimeStr,
        end_time: endTimeStr,
        location: ev.location,
        schedule_blocks,
        materials_checklist,
        is_published: true,
        created_at: ev.start_time,
        troops: ev.troops,
      }
    })
  }

  return (
    <PlannerManagement
      groupName={groupName}
      groupId={groupId || ''}
      currentRole={role}
      userName={userName}
      userId={user.id}
      userTroopId={userTroopId || null}
      troops={troops}
      leaders={leaders}
      initialPlans={initialPlans}
    />
  )
}
