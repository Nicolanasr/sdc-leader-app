import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import TroopsManagement from './TroopsManagement'

export default async function TroopsPage() {
  const supabase = await createClient()

  // 1. Authenticate user and extract metadata claims
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const groupId = user.app_metadata?.group_id
  const role = user.app_metadata?.role_scope || user.app_metadata?.role || 'guest'

  if (!groupId) {
    redirect('/login?message=Unauthorized. No group association found.')
  }

  // 2. Fetch Group details
  const { data: groupData } = await supabase
    .from('groups')
    .select('name')
    .eq('id', groupId)
    .single()

  const groupName = groupData?.name || 'Scout Group'

  // 3. Fetch all active troops belonging to this group
  const { data: troopsData } = await supabase
    .from('troops')
    .select(`
      id,
      name,
      section_type_id,
      section_types:section_type_id (name)
    `)
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  // Parse troops mapping to shape
  const troopsList = (troopsData || []).map((t: any) => ({
    id: t.id,
    name: t.name,
    sectionName: t.section_types?.name || 'Global (General)',
  }))

  // 4. Fetch dynamic sections for the dropdown selector
  const { data: sectionsData } = await supabase
    .from('section_types')
    .select('id, name')
    .order('name', { ascending: true })

  // 5. Fetch logged in user full_name
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const userName = userProfile?.full_name || user.email || 'Leader'

  return (
    <TroopsManagement
      initialTroops={troopsList}
      sections={sectionsData || []}
      groupName={groupName}
      groupId={groupId}
      currentRole={role}
      userName={userName}
    />
  )
}
