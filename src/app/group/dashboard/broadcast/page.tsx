import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import BroadcastManagement from './BroadcastManagement'

export default async function BroadcastPage() {
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = user?.app_metadata?.role
  const groupId = user?.app_metadata?.group_id

  if (!user || !role || !groupId) {
    redirect('/login?message=Unauthorized. Leader access only.')
  }

  const strictlyAllowedRoles = ['chef_groupe', 'assistant_chef_groupe', 'configurator']
  if (!strictlyAllowedRoles.includes(role)) {
    redirect('/group/dashboard?message=Access to Broadcast & WhatsApp Communications is restricted to Group Leaders.')
  }

  // 2. Fetch Group details
  const { data: groupData } = await supabase
    .from('groups')
    .select('name')
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
  const { data: troopsData } = await supabase
    .from('troops')
    .select('id, name, unit_type')
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  // 5. Fetch all Leaders in Group with Roles and Troops using Admin Client
  const adminDb = createAdminClient()
  const { data: profilesData, error: profErr } = await adminDb
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      phone_number,
      whatsapp_number,
      rank,
      user_roles!inner (
        id,
        group_id,
        roles:role_id (id, name),
        troops:troop_id (id, name)
      )
    `)
    .eq('user_roles.group_id', groupId)
    .eq('is_deleted', false)

  if (profErr) {
    console.error('[BroadcastPage] Error fetching leader profiles:', profErr)
  }

  // Consolidate leaders by unique profile ID
  const leadersMap = new Map<string, any>()
  for (const prof of profilesData || []) {
    if (!leadersMap.has(prof.id)) {
      leadersMap.set(prof.id, {
        id: prof.id,
        fullName: prof.full_name || 'Leader',
        email: prof.email || '',
        phoneNumber: prof.phone_number || null,
        whatsappNumber: prof.whatsapp_number || null,
        rank: prof.rank || null,
        roles: [],
        troops: [],
      })
    }

    const leaderObj = leadersMap.get(prof.id)
    for (const ur of (prof.user_roles || [])) {
      const rName = (ur as any).roles?.name
      if (rName && !leaderObj.roles.includes(rName)) {
        leaderObj.roles.push(rName)
      }
      const tName = (ur as any).troops?.name
      if (tName && !leaderObj.troops.includes(tName)) {
        leaderObj.troops.push(tName)
      }
    }
  }

  const leadersList = Array.from(leadersMap.values()).sort((a, b) => a.fullName.localeCompare(b.fullName))

  // 6. Fetch Active Members Count for Parents Broadcast
  const { data: activeMembers } = await supabase
    .from('members')
    .select('id, emergency_contact_name, emergency_contact_phone')
    .eq('group_id', groupId)
    .eq('is_active', true)
    .eq('is_deleted', false)

  const uniqueParentPhones = new Set(
    (activeMembers || [])
      .map((m) => m.emergency_contact_phone)
      .filter((p): p is string => Boolean(p && p.trim()))
  )

  // 7. Fetch Recent Broadcast History Logs
  const { data: historyLogs } = await supabase
    .from('leader_notifications')
    .select('id, title, message, channels_dispatched, created_at')
    .ilike('title', '[Broadcast]%')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <BroadcastManagement
      groupId={groupId}
      groupName={groupName}
      currentRole={role}
      userName={userName}
      userId={user.id}
      troops={troopsData || []}
      leaders={leadersList}
      parentsCount={uniqueParentPhones.size}
      totalActiveMembers={activeMembers?.length || 0}
      initialHistory={historyLogs || []}
    />
  )
}
