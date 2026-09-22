import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import NotificationsManagement from './NotificationsManagement'

export const metadata = {
  title: 'Push Notifications Hub • Scouts des Cèdres',
  description: 'Manage and dispatch instant web push notifications to all devices or specific leaders and members.',
}

export default async function NotificationsPage() {
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

  // Leaders & admins can dispatch push notifications
  const isMember = roles.length === 1 && roles[0] === 'scout_member'
  if (isMember) {
    redirect('/group/dashboard?message=Access to Push Notifications Hub is reserved for Leaders and Administrators.')
  }

  // 2. Fetch Group details
  const { data: groupData } = await supabase
    .from('groups')
    .select('name')
    .eq('id', groupId)
    .single()

  const groupName = groupData?.name || 'Scouts des Cèdres'

  // 3. Fetch User profile
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const userName = userProfile?.full_name || user.email || 'Leader'

  const adminDb = createAdminClient()

  // 4. Fetch Troops in Group
  const { data: troopsData } = await adminDb
    .from('troops')
    .select('id, name')
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  const troops = troopsData || []

  // 5. Fetch all Profiles in Group with roles & troops
  const { data: profilesData } = await adminDb
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      rank,
      user_roles (
        group_id,
        roles:role_id (name),
        troops:troop_id (id, name)
      )
    `)
    .eq('is_deleted', false)

  // Filter profiles that belong to this group via user_roles
  const recipientsMap = new Map<string, any>()
  for (const prof of profilesData || []) {
    const rolesInGroup = (prof.user_roles || []).filter(
      (ur: any) => ur.group_id === groupId
    )
    if (rolesInGroup.length > 0 || prof.id === user.id) {
      if (!recipientsMap.has(prof.id)) {
        recipientsMap.set(prof.id, {
          id: prof.id,
          fullName: prof.full_name || 'Leader / Member',
          email: prof.email || '',
          rank: prof.rank || null,
          roles: [],
          troopNames: [],
          troopIds: [],
        })
      }

      const item = recipientsMap.get(prof.id)
      for (const ur of rolesInGroup) {
        const roleName = (ur as any).roles?.name
        if (roleName && !item.roles.includes(roleName)) {
          item.roles.push(roleName)
        }
        const troopObj = (ur as any).troops
        if (troopObj) {
          if (!item.troopIds.includes(troopObj.id)) {
            item.troopIds.push(troopObj.id)
            item.troopNames.push(troopObj.name)
          }
        }
      }
    }
  }

  const recipientsList = Array.from(recipientsMap.values()).sort((a, b) =>
    a.fullName.localeCompare(b.fullName)
  )

  // 6. Fetch active push subscriptions to identify online devices
  let activeUserIds: string[] = []
  let totalSubscriptions = 0
  let registeredUserSubscriptions = 0
  let guestSubscriptions = 0

  try {
    const { data: subsData } = await adminDb
      .from('push_subscriptions')
      .select('id, user_id')

    if (subsData) {
      totalSubscriptions = subsData.length
      registeredUserSubscriptions = subsData.filter((s) => s.user_id !== null).length
      guestSubscriptions = totalSubscriptions - registeredUserSubscriptions
      activeUserIds = Array.from(
        new Set(subsData.map((s) => s.user_id).filter(Boolean))
      ) as string[]
    }
  } catch (err) {
    console.warn('push_subscriptions fetch error:', err)
  }

  // 7. Fetch Recent Push Logs
  let recentLogs: any[] = []
  try {
    const { data: logsData } = await adminDb
      .from('push_notifications_log')
      .select('id, title, body, url, target_type, target_user_ids, total_attempted, total_delivered, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    recentLogs = logsData || []
  } catch (err) {
    console.warn('push_notifications_log fetch error:', err)
  }

  return (
    <NotificationsManagement
      groupName={groupName}
      currentUserName={userName}
      troops={troops}
      recipients={recipientsList}
      stats={{
        totalSubscriptions,
        registeredUserSubscriptions,
        guestSubscriptions,
        activeUserIds,
      }}
      recentLogs={recentLogs}
    />
  )
}
