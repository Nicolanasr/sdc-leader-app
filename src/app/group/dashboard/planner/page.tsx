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
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, roles, current_role, group_id, troop_id')
    .eq('id', user.id)
    .single()

  const currentRole = profile?.current_role || profile?.role || 'member'
  const groupId = profile?.group_id
  const userTroopId = profile?.troop_id

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

  // 4. Fetch All Registered Leaders (for assigning activity leads)
  let leadersQuery = supabase
    .from('profiles')
    .select('id, full_name, role, roles, current_role, troop_id')
    .order('full_name')

  if (groupId) {
    leadersQuery = leadersQuery.eq('group_id', groupId)
  }

  const { data: leadersData } = await leadersQuery
  const leaders = (leadersData || []).map((l: any) => ({
    id: l.id,
    fullName: l.full_name || 'Leader',
    role: l.current_role || l.role || 'leader',
    troopId: l.troop_id,
  }))

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
      currentRole={currentRole}
      userName={profile?.full_name || 'Leader'}
      userId={user.id}
      userTroopId={userTroopId || null}
      troops={troops}
      leaders={leaders}
      initialPlans={initialPlans}
    />
  )
}
