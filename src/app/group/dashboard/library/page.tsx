import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import LibraryManagement from './LibraryManagement'

export default async function LibraryPage() {
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

  // 4. Fetch actual Troops in Group
  const { data: troopsData } = await supabase
    .from('troops')
    .select('id, name, unit_type')
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  // 5. Permissions: Tiered access
  const canManage = ['chef_groupe', 'assistant_chef_groupe', 'amin_serr_group', 'configurator'].includes(role)

  // 6. Fetch all archive items for this group
  const adminDb = createAdminClient()
  const { data: archiveItems, error } = await adminDb
    .from('group_archive_items')
    .select('*, profiles:uploaded_by(full_name)')
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[LibraryPage] Error fetching archive items:', error)
  }

  return (
    <LibraryManagement
      groupId={groupId}
      groupName={groupName}
      currentRole={role}
      userName={userName}
      userId={user.id}
      canManage={canManage}
      troops={troopsData || []}
      initialItems={archiveItems || []}
    />
  )
}
