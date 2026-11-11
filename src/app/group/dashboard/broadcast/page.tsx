import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import BroadcastManagement from './BroadcastManagement'

export const metadata = {
  title: 'Communications & Broadcast Hub • Scouts des Cèdres',
  description: 'Unified communications center for official Lebanese scout WhatsApp circulars and instant Web Push alerts.',
}

export default async function BroadcastPage() {
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = user?.app_metadata?.role || 'scout_member'
  const roles: string[] = Array.from(
    new Set([
      role,
      ...(user?.app_metadata?.roles || []),
      ...(user?.app_metadata?.role_scopes || []),
    ].filter(Boolean))
  )
  const groupId = user?.app_metadata?.group_id

  if (!user || !groupId) {
    redirect('/login?message=Unauthorized. Leader access only.')
  }

  // Gated strictly to Group Leaders and Group Secretary
  const strictlyAllowedRoles = [
    'chef_groupe',
    'assistant_chef_groupe',
    'amin_serr_group',
    'configurator',
  ]
  const hasAccess = roles.some((r) => strictlyAllowedRoles.includes(r))
  if (!hasAccess) {
    redirect('/group/dashboard?message=Access to Communications Hub is restricted to Group Leaders and Secretary.')
  }

  // Push notifications visible only to chef_groupe & assistant_chef_groupe (and configurator)
  const canAccessPush = roles.some((r) =>
    ['chef_groupe', 'assistant_chef_groupe', 'configurator'].includes(r)
  )

  const adminDb = createAdminClient()

  // 2. Fetch all required data in parallel for maximum speed
  const [
    groupRes,
    userProfileRes,
    troopsRes,
    profilesRes,
    activeMembersRes,
    historyLogsRes,
    subsRes,
    pushLogsRes,
  ] = await Promise.all([
    supabase.from('groups').select('name').eq('id', groupId).single(),
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    adminDb
      .from('troops')
      .select('id, name, section_type_id, section_types:section_type_id (name)')
      .eq('group_id', groupId)
      .eq('is_deleted', false)
      .order('name', { ascending: true }),
    adminDb
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
      .eq('is_deleted', false),
    supabase
      .from('members')
      .select('id, emergency_contact_name, emergency_contact_phone')
      .eq('group_id', groupId)
      .eq('is_active', true)
      .eq('is_deleted', false),
    supabase
      .from('leader_notifications')
      .select('id, title, message, channels_dispatched, created_at')
      .ilike('title', '[Broadcast]%')
      .order('created_at', { ascending: false })
      .limit(20),
    canAccessPush ? adminDb.from('push_subscriptions').select('id, user_id') : Promise.resolve({ data: [] }),
    canAccessPush
      ? adminDb
          .from('push_notifications_log')
          .select('id, title, body, url, target_type, target_user_ids, total_attempted, total_delivered, created_at')
          .order('created_at', { ascending: false })
          .limit(15)
      : Promise.resolve({ data: [] }),
  ])

  const groupName = groupRes.data?.name || 'My Group'
  const userName = userProfileRes.data?.full_name || user.email || 'Leader'
  const troopsData = troopsRes.data || []
  const profilesData = profilesRes.data || []

  // Consolidate leaders by unique profile ID
  const leadersMap = new Map<string, any>()
  for (const prof of profilesData) {
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

  // Parents count
  const activeMembers = activeMembersRes.data || []
  const uniqueParentPhones = new Set(
    activeMembers
      .map((m) => m.emergency_contact_phone)
      .filter((p): p is string => Boolean(p && p.trim()))
  )

  const historyLogs = historyLogsRes.data || []

  // Push subscriptions stats
  const subsData = subsRes.data || []
  const totalSubscriptions = subsData.length
  const registeredUserSubscriptions = subsData.filter((s: any) => s.user_id !== null).length
  const guestSubscriptions = totalSubscriptions - registeredUserSubscriptions
  const activeUserIds = Array.from(
    new Set(subsData.map((s: any) => s.user_id).filter(Boolean))
  ) as string[]

  const recentPushLogs = pushLogsRes.data || []

  return (
    <BroadcastManagement
      groupId={groupId}
      groupName={groupName}
      currentRole={role}
      roles={roles}
      userName={userName}
      userId={user.id}
      canAccessPush={canAccessPush}
      troops={troopsData}
      leaders={leadersList}
      parentsCount={uniqueParentPhones.size}
      totalActiveMembers={activeMembers.length}
      initialHistory={historyLogs}
      pushStats={{
        totalSubscriptions,
        registeredUserSubscriptions,
        guestSubscriptions,
        activeUserIds,
      }}
      initialPushLogs={recentPushLogs}
    />
  )
}
