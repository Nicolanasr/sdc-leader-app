import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import EventsManagement from './EventsManagement'

export default async function EventsPage() {
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = user?.app_metadata?.role
  const groupId = user?.app_metadata?.group_id
  const userTroopId = user?.app_metadata?.troop_id

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

  if (!user || !role || !groupId || !allowedRoles.includes(role)) {
    redirect('/login?message=Unauthorized. Leader access only.')
  }

  // 2. Fetch Group Name
  const { data: groupData } = await supabase
    .from('groups')
    .select('name')
    .eq('id', groupId)
    .single()

  const groupName = groupData?.name || 'Scout Group'

  // 3. Fetch Troops in Group
  const { data: troopsData } = await supabase
    .from('troops')
    .select('id, name')
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  // 4. Fetch Leaders/Profiles in Group (for event staff dropdowns)
  const { data: profilesData } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      rank,
      user_roles!inner(group_id)
    `)
    .eq('user_roles.group_id', groupId)

  const leaders = (profilesData || []).map((p: any) => ({
    id: p.id,
    fullName: p.full_name || 'Leader',
    email: p.email || '',
    rank: p.rank || '',
  }))

  // 5. Fetch Scout Members in Group (for participant roster & attendance)
  const { data: membersData } = await supabase
    .from('members')
    .select('id, first_name, last_name, troop_id, current_rank')
    .eq('group_id', groupId)
    .eq('is_active', true)
    .eq('is_deleted', false)

  // 6. Fetch Events for Group (including staff, participants, expenses, documents)
  const { data: eventsData } = await supabase
    .from('events')
    .select(`
      *,
      event_staff (*, profiles(full_name)),
      event_participants (*, members(first_name, last_name, troop_id, current_rank)),
      event_expenses (*),
      event_documents (*)
    `)
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('start_time', { ascending: false })

  // 7. Fetch logged in user full_name
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const userName = userProfile?.full_name || user.email || 'Leader'

  return (
    <EventsManagement
      initialEvents={eventsData || []}
      troops={troopsData || []}
      leaders={leaders || []}
      members={membersData || []}
      currentRole={role}
      groupId={groupId}
      groupName={groupName}
      userTroopId={userTroopId || null}
      userProfileId={user.id}
      userName={userName}
    />
  )
}
