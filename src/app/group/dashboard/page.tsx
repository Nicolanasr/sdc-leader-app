import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import GroupDashboardLayout, { UpcomingEvent } from './GroupDashboardLayout'
import DashboardShell from './DashboardShell'
import MemberDashboardView, {
  MemberData,
  EventItem,
  LeaderContact,
  AttendanceSummary,
} from './MemberDashboardView'

export default async function GroupDashboardPage() {
  const supabase = await createClient()

  // 1. Authenticate and retrieve user data
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = user?.app_metadata?.role || 'scout_member'
  const roles: string[] = user?.app_metadata?.roles || user?.app_metadata?.role_scopes || [role]
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
    'scout_member',
  ]

  const hasAnyAllowedRole = roles.some((r) => allowedRoles.includes(r))

  if (!user || !hasAnyAllowedRole || !groupId) {
    redirect('/login?message=Unauthorized. Access restricted.')
  }

  // 2. Fetch Group & Commissariat Details
  const { data: groupData } = await supabase
    .from('groups')
    .select('name, commissariat_id, commissariats(name)')
    .eq('id', groupId)
    .single()

  const groupName = groupData?.name || 'Scouts des Cèdres'
  interface GroupWithCommissariat {
    name?: string
    commissariats?: { name?: string } | null
  }
  const commissariatName = (groupData as unknown as GroupWithCommissariat)?.commissariats?.name || 'Saint Jean Marc'

  // ── SCOUT MEMBER SCOPED VIEW (Only if user has solely scout_member role) ──
  const isPureScoutMember = roles.length === 1 && roles[0] === 'scout_member'
  if (isPureScoutMember) {
    let memberId = user.app_metadata?.member_id
    if (!memberId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('member_id')
        .eq('id', user.id)
        .maybeSingle()
      memberId = profile?.member_id
    }

    const { data: memberData } = await supabase
      .from('members')
      .select(`
        *,
        troops:troop_id (
          id,
          name,
          section_types:section_type_id (name)
        ),
        patrols:patrol_id (
          id,
          name
        )
      `)
      .eq('id', memberId)
      .maybeSingle()

    const { data: participantData } = await supabase
      .from('event_participants')
      .select(`
        id,
        fee_status,
        consent_status,
        events:event_id (
          id,
          title,
          description,
          event_type,
          start_time,
          end_time,
          location
        )
      `)
      .eq('member_id', memberId)

    const { data: staffData } = await supabase
      .from('event_staff')
      .select(`
        id,
        event_role,
        events:event_id (
          id,
          title,
          description,
          event_type,
          start_time,
          end_time,
          location
        )
      `)
      .eq('profile_id', user.id)

    const eventsMap = new Map<string, EventItem>()

    interface ParticipantRow {
      fee_status?: string | null
      consent_status?: string | null
      events?: {
        id: string
        title: string
        description?: string | null
        event_type?: string | null
        start_time: string
        end_time: string
        location?: string | null
      } | null
    }

    for (const p of (participantData || []) as unknown as ParticipantRow[]) {
      if (p.events) {
        eventsMap.set(p.events.id, {
          id: p.events.id,
          title: p.events.title,
          description: p.events.description,
          eventType: p.events.event_type || 'event',
          startTime: p.events.start_time,
          endTime: p.events.end_time,
          location: p.events.location,
          feeStatus: p.fee_status,
          consentStatus: p.consent_status,
        })
      }
    }

    interface StaffRow {
      event_role?: string | null
      events?: {
        id: string
        title: string
        description?: string | null
        event_type?: string | null
        start_time: string
        end_time: string
        location?: string | null
      } | null
    }

    const formatStaffRole = (roleKey?: string | null) => {
      if (!roleKey) return 'Staff'
      if (roleKey === 'amin_serr_mouskhayyam' || roleKey === 'amin_serr') return 'Event Secretary'
      if (roleKey === 'amin_sandou2_mouskhayyam' || roleKey === 'amin_sandou2') return 'Event Treasurer'
      if (roleKey === 'amin_tejhizet' || roleKey === 'mas2oul_tejhizet') return 'Event Quartermaster'
      if (roleKey === 'mas2oul_matbakh' || roleKey === 'mas2oul_mounet' || roleKey === 'amin_mounet') return 'Provisions & Kitchen'
      if (roleKey === 'ka2ed_mouskhayyam') return 'Camp Leader'
      if (roleKey === 'mousa3ed_ka2ed_mouskhayyam') return 'Assistant Camp Leader'
      return roleKey.replace(/_/g, ' ')
    }

    for (const s of (staffData || []) as unknown as StaffRow[]) {
      if (s.events) {
        const roleLabel = formatStaffRole(s.event_role)
        const existing = eventsMap.get(s.events.id)
        if (existing) {
          existing.staffRole = roleLabel
        } else {
          eventsMap.set(s.events.id, {
            id: s.events.id,
            title: s.events.title,
            description: s.events.description,
            eventType: s.events.event_type || 'event',
            startTime: s.events.start_time,
            endTime: s.events.end_time,
            location: s.events.location,
            staffRole: roleLabel,
          })
        }
      }
    }

    const eventsList: EventItem[] = Array.from(eventsMap.values()).sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )

    const leadersList: LeaderContact[] = []
    if (memberData?.troop_id) {
      const { data: troopRoles } = await supabase
        .from('user_roles')
        .select(`
          roles:role_id (name),
          profiles:profile_id (
            id,
            full_name,
            phone_number,
            whatsapp_number,
            rank
          )
        `)
        .eq('troop_id', memberData.troop_id)

      interface TroopRoleRow {
        roles?: { name?: string | null } | null
        profiles?: {
          id: string
          full_name?: string | null
          phone_number?: string | null
          whatsapp_number?: string | null
          rank?: string | null
        } | null
      }

      const seen = new Set<string>()
      for (const tr of (troopRoles || []) as unknown as TroopRoleRow[]) {
        if (tr.profiles && !seen.has(tr.profiles.id)) {
          seen.add(tr.profiles.id)
          const raw = tr.roles?.name || 'Unit Leader'
          const roleLabel =
            raw === 'ka2ed_fer2a'
              ? 'Unit Leader'
              : raw === 'mouse3ed_ka2ed_fer2a'
              ? 'Assistant Unit Leader'
              : raw.replace(/_/g, ' ')

          leadersList.push({
            id: tr.profiles.id,
            fullName: tr.profiles.full_name || 'Leader',
            phone: tr.profiles.phone_number,
            whatsapp: tr.profiles.whatsapp_number,
            roleName: roleLabel,
            rank: tr.profiles.rank,
          })
        }
      }
    }

    const { data: attendanceData } = await supabase
      .from('attendance_records')
      .select('id, status')
      .eq('member_id', memberId)

    const totalSessions = attendanceData?.length || 0
    const presentCount = attendanceData?.filter((a) => a.status === 'present').length || 0
    const lateCount = attendanceData?.filter((a) => a.status === 'late').length || 0
    const excusedCount = attendanceData?.filter((a) => a.status === 'excused').length || 0
    const absentCount = attendanceData?.filter((a) => a.status === 'absent').length || 0

    const attendanceRate =
      totalSessions > 0 ? Math.round(((presentCount + lateCount) / totalSessions) * 100) : 100

    const attendanceSummary: AttendanceSummary = {
      total: totalSessions,
      present: presentCount,
      late: lateCount,
      excused: excusedCount,
      absent: absentCount,
      rate: attendanceRate,
    }

    const { data: userProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const userName = userProfile?.full_name || user.email || 'Scout Member'

    return (
      <DashboardShell
        groupName={groupName}
        currentRole={role}
        roles={roles}
        patrolRole={memberData?.patrol_role || null}
        userName={userName}
      >
        <MemberDashboardView
          member={(memberData || {}) as unknown as MemberData}
          events={eventsList}
          leaders={leadersList}
          attendance={attendanceSummary}
        />
      </DashboardShell>
    )
  }

  // 3. Fetch summary statistics (Generic & useful for all leaders)
  const nowIso = new Date().toISOString()

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

  // C. Total Active Leaders
  const { count: leaderCount } = await supabase
    .from('user_roles')
    .select('profile_id', { count: 'exact', head: true })
    .eq('group_id', groupId)

  // D. Total Upcoming Events
  const { count: upcomingEventsCount } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .gte('start_time', nowIso)

  // E. Equipment count
  const { count: equipmentCount } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .eq('is_deleted', false)

  // F. Pantry items count
  const { count: pantryCount } = await supabase
    .from('group_pantry_items')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .eq('is_deleted', false)

  // 4. Fetch the next upcoming events (Next 3)
  const { data: upcomingEventsData } = await supabase
    .from('events')
    .select('id, title, event_type, start_time, end_time, location_name, troops(name)')
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .gte('start_time', nowIso)
    .order('start_time', { ascending: true })
    .limit(3)

  // 5. Fetch logged in user full_name and assigned troop
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: userRoleData } = await supabase
    .from('user_roles')
    .select('troop_id, troops(name)')
    .eq('profile_id', user.id)
    .eq('group_id', groupId)
    .not('troop_id', 'is', null)
    .maybeSingle()

  const userName = userProfile?.full_name || user.email || 'Leader'
  interface UserRoleTroop {
    troops?: { name?: string } | null
  }
  const assignedTroopName = (userRoleData as unknown as UserRoleTroop)?.troops?.name || null

  const stats = {
    scoutCount: scoutCount || 0,
    troopCount: troopCount || 0,
    leaderCount: leaderCount || 0,
    upcomingEventsCount: upcomingEventsCount || 0,
    equipmentCount: equipmentCount || 0,
    pantryCount: pantryCount || 0,
  }

  interface EventRow {
    id: string
    title: string
    event_type?: string | null
    start_time: string
    end_time?: string | null
    location_name?: string | null
    troops?: Array<{ name: string }> | { name: string } | null
  }

  const upcomingEvents: UpcomingEvent[] = ((upcomingEventsData || []) as unknown as EventRow[]).map((ev) => ({
    id: ev.id,
    title: ev.title,
    event_type: ev.event_type || 'Activity',
    start_time: ev.start_time,
    end_time: ev.end_time || undefined,
    location_name: ev.location_name || undefined,
    troops: Array.isArray(ev.troops) ? ev.troops[0] || null : ev.troops || null,
  }))

  return (
    <GroupDashboardLayout
      groupName={groupName}
      commissariatName={commissariatName}
      role={role}
      roles={roles}
      groupId={groupId}
      stats={stats}
      userName={userName}
      assignedTroopName={assignedTroopName}
      upcomingEvents={upcomingEvents}
    />
  )
}
