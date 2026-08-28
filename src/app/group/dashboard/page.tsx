import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import GroupDashboardLayout from './GroupDashboardLayout'

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

  const groupName = groupData?.name || 'My Group'
  const commissariatName = (groupData as any)?.commissariats?.name || 'Regional Scope'

  // 3. Fetch summary statistics
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

  // C. Total Active Leaders (mapped via user_roles under this group)
  const { count: leaderCount } = await supabase
    .from('user_roles')
    .select('profile_id', { count: 'exact', head: true })
    .eq('group_id', groupId)

  // D. Pending Expenses
  const { count: pendingTransactions } = await supabase
    .from('treasury_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .eq('status', 'pending')
    .eq('is_deleted', false)

  // 4. Fetch dynamic section types for troop creation selection
  const { data: sections } = await supabase
    .from('section_types')
    .select('id, name')
    .order('name', { ascending: true })

  const stats = {
    scoutCount: scoutCount || 0,
    troopCount: troopCount || 0,
    leaderCount: leaderCount || 0,
    pendingTransactions: pendingTransactions || 0,
  }

  // 5. Fetch logged in user full_name
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const userName = userProfile?.full_name || user.email || 'Leader'

  return (
    <GroupDashboardLayout
      groupName={groupName}
      commissariatName={commissariatName}
      role={role}
      groupId={groupId}
      stats={stats}
      sections={sections || []}
      userName={userName}
    />
  )
}
