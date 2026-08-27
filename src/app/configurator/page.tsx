import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ConfiguratorDashboard from './ConfiguratorDashboard'

export default async function ConfiguratorPage() {
  const supabase = await createClient()

  // 1. Authenticate user and verify role in JWT app_metadata
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.role !== 'configurator') {
    redirect('/login?message=Unauthorized. Configurator access only.')
  }

  // 2. Fetch Commissariats
  const { data: commissariats } = await supabase
    .from('commissariats')
    .select('id, name')
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  // 3. Fetch Groups
  const { data: groups } = await supabase
    .from('groups')
    .select('id, name, commissariat_id')
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  // 4. Fetch Dynamic Sections
  const { data: sections } = await supabase
    .from('section_types')
    .select('id, name, min_age, max_age')
    .order('name', { ascending: true })

  // 5. Fetch Ranks
  const { data: ranks } = await supabase
    .from('ranks')
    .select('id, name')
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  // 6. Fetch Responsibilities
  const { data: responsibilities } = await supabase
    .from('responsibilities')
    .select('id, name')
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  // 7. Fetch Permission Roles
  const { data: roles } = await supabase
    .from('roles')
    .select('id, name, permission_scope')
    .order('name', { ascending: true })

  // 8. Fetch all leader Profiles with their mapped groups and roles
  const { data: profiles } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      rank,
      user_roles (
        groups:group_id (name),
        roles:role_id (name)
      )
    `)
    .order('full_name', { ascending: true })

  return (
    <ConfiguratorDashboard
      initialCommissariats={commissariats || []}
      initialGroups={groups || []}
      initialSections={sections || []}
      initialRanks={ranks || []}
      initialResponsibilities={responsibilities || []}
      initialRoles={roles || []}
      initialProfiles={profiles || []}
    />
  )
}
