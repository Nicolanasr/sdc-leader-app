import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import PantryManagement from './PantryManagement'

export default async function PantryPage() {
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

  // Check if user is an event leader / food staff
  const { data: eventStaffAssignments } = await supabase
    .from('event_staff')
    .select('id, event_id, event_role')
    .eq('profile_id', user.id)

  const isEventStaff = (eventStaffAssignments || []).length > 0

  const strictlyAllowedRoles = [
    'chef_groupe',
    'assistant_chef_groupe',
    'amin_mounet_group',
    'mas2oul_mounet',
    'amin_tejhizet_group',
    'ka2ed_fer2a',
    'mouse3ed_ka2ed_fer2a',
    'configurator',
  ]

  const hasAccess = strictlyAllowedRoles.includes(role) || isEventStaff

  if (!hasAccess) {
    redirect('/group/dashboard?message=Access to Provisions & Pantry is restricted.')
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

  return (
    <PantryManagement
      groupId={groupId}
      groupName={groupName}
      currentRole={role}
      userName={userName}
      initialPantry={pantryData || []}
    />
  )
}
