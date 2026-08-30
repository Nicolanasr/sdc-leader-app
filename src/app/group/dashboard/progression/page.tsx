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

  // 4. Fetch Troops belonging to this group with their section_type_id
  const { data: troopsData } = await adminDb
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

  const troopsList = (troopsData || []).map((t: any) => ({
    id: t.id,
    name: t.name,
    sectionTypeId: t.section_type_id,
    sectionName: t.section_types?.name || '',
  }))

  // 5. Fetch all Active Members for this group with patrol names
  const { data: membersData } = await adminDb
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

  const membersList = (membersData || []).map((m: any) => ({
    id: m.id,
    firstName: m.first_name,
    lastName: m.last_name,
    troopId: m.troop_id,
    patrolId: m.patrol_id,
    patrolName: m.patrols?.name || 'Unassigned Patrol',
    currentRank: m.current_rank || 'Scout',
  }))

  // 6. Fetch all Progression Classes & Requirements across section types
  const { data: classesData } = await adminDb
    .from('progression_classes')
    .select(`
      id,
      section_type_id,
      name,
      badge_icon,
      sort_order,
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

  const isTroopLeader = role === 'chef_troupe' && !!userTroopId

  return (
    <ProgressionManagement
      groupId={groupId}
      groupName={groupName}
      currentRole={role}
      userName={userName}
      userId={user.id}
      userTroopId={userTroopId}
      isTroopLeader={isTroopLeader}
      troops={troopsList}
      members={membersList}
      classes={classesList}
      initialRecords={progressionRecords}
    />
  )
}
