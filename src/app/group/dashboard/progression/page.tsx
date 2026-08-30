import { Suspense } from 'react'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import ProgressionManagement from './ProgressionManagement'

export default async function ProgressionPage() {
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = user?.app_metadata?.role_scope || user?.app_metadata?.role || 'guest'
  const groupId = user?.app_metadata?.group_id
  const userTroopId = user?.app_metadata?.troop_id || null

  if (!user || !groupId) {
    redirect('/login?message=Unauthorized. Leader access only.')
  }

  // 2. Fetch Group details
  const { data: groupData } = await supabase
    .from('groups')
    .select('name')
    .eq('id', groupId)
    .single()

  const groupName = groupData?.name || 'Scout Group'

  // 3. Fetch User profile
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const userName = userProfile?.full_name || user.email || 'Leader'

  const adminDb = createAdminClient()

  // Determine all user roles and assigned troop
  const { data: userRolesData } = await adminDb
    .from('user_roles')
    .select('role_id, troop_id, roles:role_id (name, permission_scope)')
    .eq('profile_id', user.id)

  const activeScopes = (userRolesData || []).map((ur: any) => ur.roles?.permission_scope || ur.roles?.name).filter(Boolean)
  let effectiveTroopId = userTroopId
  if (!effectiveTroopId) {
    const troopRole = (userRolesData || []).find((ur: any) => ur.troop_id)
    if (troopRole) effectiveTroopId = troopRole.troop_id
  }

  const isGroupAdmin = ['chef_groupe', 'assistant_chef_groupe', 'amin_serr_group', 'configurator'].includes(role) || activeScopes.some((s: string) => ['chef_groupe', 'assistant_chef_groupe', 'amin_serr_group', 'configurator'].includes(s))
  const isTroopLeader = !isGroupAdmin && (['ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a', 'chef_troupe'].includes(role) || activeScopes.some((s: string) => ['ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a', 'chef_troupe'].includes(s)))

  // 4. Fetch Troops belonging to this group (strictly scoped if troop leader)
  let troopsQuery = adminDb
    .from('troops')
    .select(`
      id,
      name,
      section_type_id,
      section_types:section_type_id (id, name)
    `)
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  if (isTroopLeader && effectiveTroopId) {
    troopsQuery = troopsQuery.eq('id', effectiveTroopId)
  }

  const { data: troopsData } = await troopsQuery

  const troopsList = (troopsData || []).map((t: any) => ({
    id: t.id,
    name: t.name,
    sectionTypeId: t.section_type_id,
    sectionName: t.section_types?.name || '',
  }))

  // 5. Fetch Active Members (strictly scoped to troop if troop leader)
  let membersQuery = adminDb
    .from('members')
    .select(`
      id,
      first_name,
      last_name,
      troop_id,
      patrol_id,
      current_rank,
      is_active,
      patrols:patrol_id (id, name)
    `)
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .eq('is_active', true)
    .order('first_name', { ascending: true })

  if (isTroopLeader && effectiveTroopId) {
    membersQuery = membersQuery.eq('troop_id', effectiveTroopId)
  }

  const { data: membersData } = await membersQuery

  const membersList = (membersData || []).map((m: any) => ({
    id: m.id,
    firstName: m.first_name,
    lastName: m.last_name,
    troopId: m.troop_id,
    patrolId: m.patrol_id,
    patrolName: m.patrols?.name || 'Unassigned Patrol',
    currentRank: m.current_rank || 'Scout',
  }))

    const { data: classesData } = await adminDb
    .from('progression_classes')
    .select(`
      id,
      section_type_id,
      name,
      badge_icon,
      sort_order,
      class_type,
      progression_requirements (
        id,
        class_id,
        category,
        title,
        description,
        sort_order
      )
    `)
    .eq('is_deleted', false)
    .order('sort_order', { ascending: true })

  const classesList = (classesData || []).map((c: any) => ({
    id: c.id,
    sectionTypeId: c.section_type_id,
    name: c.name,
    badgeIcon: c.badge_icon || '⚜️',
    sortOrder: c.sort_order,
    classType: c.class_type || 'rank',
    requirements: (c.progression_requirements || [])
      .filter((r: any) => !r.is_deleted)
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((r: any) => ({
        id: r.id,
        classId: r.class_id,
        category: r.category,
        title: r.title,
        description: r.description,
        sortOrder: r.sort_order,
      })),
  }))

  // 7. Fetch all Member Progression Records for these scouts
  const memberIds = membersList.map((m) => m.id)
  let progressionRecords: any[] = []

  if (memberIds.length > 0) {
    const { data: recordsData } = await adminDb
      .from('member_progression_records')
      .select(`
        id,
        member_id,
        requirement_id,
        completed_at,
        validated_by,
        notes,
        evidence_file_url,
        evidence_drive_file_id,
        profiles:validated_by (full_name)
      `)
      .in('member_id', memberIds)

    progressionRecords = (recordsData || []).map((r: any) => ({
      id: r.id,
      memberId: r.member_id,
      requirementId: r.requirement_id,
      completedAt: r.completed_at,
      validatedBy: r.validated_by,
      validatorName: r.profiles?.full_name || 'Leader',
      notes: r.notes,
      evidenceFileUrl: r.evidence_file_url,
      evidenceDriveFileId: r.evidence_drive_file_id,
    }))
  }

  return (
    <Suspense fallback={null}>
      <ProgressionManagement
        groupId={groupId}
        groupName={groupName}
        currentRole={role}
        userName={userName}
        userId={user.id}
        userTroopId={effectiveTroopId}
        isTroopLeader={isTroopLeader}
        troops={troopsList}
        members={membersList}
        classes={classesList}
        initialRecords={progressionRecords}
      />
    </Suspense>
  )
}
