import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import PantryManagement from './PantryManagement'

export default async function PantryPage() {
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const groupId = user?.app_metadata?.group_id || user?.user_metadata?.group_id || null
  const role = user?.app_metadata?.role_scope || user?.app_metadata?.role || user?.user_metadata?.role || 'leader'

  if (!groupId) {
    redirect('/login?message=Unauthorized. Group access required.')
  }

  const allowedRoles = [
    'chef_groupe',
    'assistant_chef_groupe',
    'amin_serr_group',
    'amin_sandou2_group',
    'amin_mounet_group',
    'mas2oul_mounet',
    'ka2ed_fer2a',
    'mouse3ed_ka2ed_fer2a',
    'configurator',
  ]

  const hasAccess = allowedRoles.includes(role)

  if (!hasAccess) {
    redirect('/group/dashboard?message=Access to Central Group Pantry is restricted.')
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

  // 4. Fetch Central Group Pantry items
  const { data: pantryData } = await supabase
    .from('group_pantry_items')
    .select('*')
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  // 5. Fetch Event Pantry Requests
  const { data: requestsData } = await supabase
    .from('event_pantry_requests')
    .select('*, events(id, title, start_time), profiles:requested_by(full_name), group_pantry_items(name, unit)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

  return (
    <PantryManagement
      groupId={groupId}
      groupName={groupName}
      currentRole={role}
      userName={userName}
      userId={user.id}
      initialPantry={pantryData || []}
      initialRequests={requestsData || []}
    />
  )
}
