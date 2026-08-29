import { createClient } from '@/utils/supabase/server'
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
    .order('name', { ascending: true })

  // 5. Fetch all Leaders in Group with Roles and Troops
  const { data: userRolesData } = await supabase
    .from('user_roles')
    .select('id, profile_id, roles(name, display_name), troops(id, name, unit_type), profiles(id, full_name, email, phone_number, whatsapp_number, rank)')
    .eq('group_id', groupId)

  // Consolidate leaders by unique profile ID with their multiple roles
  const leadersMap = new Map<string, any>()
  for (const ur of userRolesData || []) {
    const p = ur.profiles as any
    if (!p) continue

    if (!leadersMap.has(p.id)) {
      leadersMap.set(p.id, {
        id: p.id,
        fullName: p.full_name || 'Leader',
        email: p.email,
        phoneNumber: p.phone_number,
        whatsappNumber: p.whatsapp_number,
        rank: p.rank,
        roles: [],
        troops: [],
      })
    }

    const leaderObj = leadersMap.get(p.id)
    if (ur.roles) {
      const rName = (ur.roles as any).display_name || (ur.roles as any).name
      if (!leaderObj.roles.includes(rName)) leaderObj.roles.push(rName)
    }
    if (ur.troops) {
      const tName = (ur.troops as any).name
      if (!leaderObj.troops.includes(tName)) leaderObj.troops.push(tName)
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
