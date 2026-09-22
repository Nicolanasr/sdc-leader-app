import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/utils/supabase/admin'
import PublicScoutCard, { PublicScoutData } from './PublicScoutCard'

interface PageProps {
  params: Promise<{ id: string }>
}

function formatRoleTitle(roleKey: string): string {
  if (!roleKey) return ''
  const clean = roleKey.trim().toLowerCase()
  const map: Record<string, string> = {
    'assistant_chef_groupe': 'Assistant Chef de Groupe',
    'chef_groupe': 'Chef de Groupe',
    'amin_serr_group': 'Secrétaire Général',
    'amin_sandou2_group': 'Trésorier Général',
    'amin_tejhizet_group': 'Responsable Matériel',
    'mas2oul_toswir': 'Responsable Média',
    'mas2oul_mounet': 'Responsable Intendance',
    'ka2ed_idare': 'Chef Administratif',
    'ka2ed_fer2a': 'Chef d’Unité',
    'mouse3ed_ka2ed_fer2a': 'Assistant Chef d’Unité',
    'chef_troupe': 'Chef de Troupe',
    'configurator': 'Directeur Technique',
    'scout_member': 'Membre Éclaireur',
  }
  return map[clean] || roleKey.replace(/_/g, ' ')
}

async function getScoutData(id: string): Promise<PublicScoutData | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  if (!isUuid) return null

  const adminDb = createAdminClient()

  // 1. First attempt: Look up by members.id
  let member: any = null
  let profile: any = null

  const { data: memberRecord } = await adminDb
    .from('members')
    .select(`
      id,
      first_name,
      last_name,
      first_name_ar,
      last_name_ar,
      photo_url,
      promise_date,
      join_date,
      current_rank,
      patrol_role,
      group_id,
      troop_id,
      patrol_id,
      troops:troop_id (
        id,
        name,
        section_types:section_type_id (name)
      ),
      patrols:patrol_id (
        id,
        name
      ),
      groups:group_id (
        id,
        name,
        commissariats:commissariat_id (name)
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (memberRecord) {
    member = memberRecord

    // Also check if this member is linked to a leader/user profile
    const { data: linkedProfile } = await adminDb
      .from('profiles')
      .select('id, full_name, rank')
      .eq('member_id', member.id)
      .maybeSingle()

    if (linkedProfile) {
      profile = linkedProfile
    }
  } else {
    // 2. Second attempt: Look up by profiles.id
    const { data: profileRecord } = await adminDb
      .from('profiles')
      .select('id, full_name, rank, member_id')
      .eq('id', id)
      .maybeSingle()

    if (profileRecord) {
      profile = profileRecord
      if (profileRecord.member_id) {
        const { data: memberFromProfile } = await adminDb
          .from('members')
          .select(`
            id,
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            photo_url,
            promise_date,
            join_date,
            current_rank,
            patrol_role,
            group_id,
            troop_id,
            patrol_id,
            troops:troop_id (
              id,
              name,
              section_types:section_type_id (name)
            ),
            patrols:patrol_id (
              id,
              name
            ),
            groups:group_id (
              id,
              name,
              commissariats:commissariat_id (name)
            )
          `)
          .eq('id', profileRecord.member_id)
          .maybeSingle()

        if (memberFromProfile) {
          member = memberFromProfile
        }
      }
    }
  }

  // If neither member nor profile found, return null
  if (!member && !profile) {
    return null
  }

  // 3. Fetch leadership roles if a profile is resolved
  let leaderRoles: string[] = []
  let isLeader = false
  if (profile?.id) {
    const { data: rolesData } = await adminDb
      .from('user_roles')
      .select(`
        role_id,
        troop_id,
        roles:role_id (name, permission_scope),
        troops:troop_id (name)
      `)
      .eq('profile_id', profile.id)

    if (rolesData && rolesData.length > 0) {
      isLeader = true
      leaderRoles = rolesData.map((r: any) => {
        const rawRole = r.roles?.name || r.roles?.permission_scope || 'Leader'
        const roleTitle = formatRoleTitle(rawRole)
        const troopTitle = r.troops?.name ? ` • ${r.troops.name}` : ''
        return `${roleTitle}${troopTitle}`
      })
    }
  }

  // 4. Fetch completed progression records if member exists
  let completedBadgesCount = 0
  let recentBadges: Array<{ title: string; category?: string; badgeIcon?: string }> = []

  if (member?.id) {
    const { data: progressionRecords } = await adminDb
      .from('member_progression_records')
      .select(`
        id,
        completed_at,
        progression_requirements (
          title,
          category,
          progression_classes (
            badge_icon,
            name
          )
        )
      `)
      .eq('member_id', member.id)
      .order('completed_at', { ascending: false })
      .limit(10)

    if (progressionRecords) {
      completedBadgesCount = progressionRecords.length
      recentBadges = progressionRecords.map((rec: any) => {
        const req = rec.progression_requirements
        const cls = req?.progression_classes
        return {
          title: req?.title || 'Achievement Milestone',
          category: req?.category || cls?.name || 'Milestone',
          badgeIcon: cls?.badge_icon || '🏅',
        }
      })
    }
  }

  // 5. Construct public scout data
  const fullName = member
    ? `${member.first_name || ''} ${member.last_name || ''}`.trim()
    : profile?.full_name || 'Scout Member'

  const fullNameAr = member?.first_name_ar
    ? `${member.first_name_ar} ${member.last_name_ar || ''}`.trim()
    : null

  let rawRank = member?.current_rank || profile?.rank
  if (!rawRank || rawRank.toLowerCase() === 'none' || rawRank.toLowerCase() === 'null') {
    rawRank = isLeader ? (leaderRoles[0] || 'Chef Scout') : 'Scout Member'
  }

  const rank = rawRank
  const groupName = member?.groups?.name || 'Scouts des Cèdres • Saint Jean Marc'
  const commissariatName = member?.groups?.commissariats?.name || 'Commissariat Général'
  const troopName = member?.troops?.name || null
  const sectionName = member?.troops?.section_types?.name || null
  const patrolName = member?.patrols?.name || null
  const patrolRole = member?.patrol_role ? formatRoleTitle(member.patrol_role) : null

  return {
    id,
    fullName,
    fullNameAr,
    rank,
    promiseDate: member?.promise_date || null,
    joinDate: member?.join_date || null,
    photoUrl: member?.photo_url || null,
    groupName,
    commissariatName,
    troopName,
    sectionName,
    patrolName,
    patrolRole,
    isLeader,
    leaderRoles,
    completedBadgesCount,
    recentBadges,
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const scout = await getScoutData(id)

  if (!scout) {
    return {
      title: 'Scout Profile Not Found • Scouts des Cèdres',
      description: 'The requested scout profile could not be found.',
    }
  }

  const title = `${scout.fullName} • Scout Passport & Record`
  const description = `Scout profile for ${scout.fullName} (${scout.rank}) at ${scout.groupName}. View official achievements and scout passport.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images: scout.photoUrl
        ? [{ url: scout.photoUrl, width: 400, height: 400, alt: scout.fullName }]
        : [],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: scout.photoUrl ? [scout.photoUrl] : [],
    },
  }
}

export default async function PublicScoutProfilePage({ params }: PageProps) {
  const { id } = await params
  const scout = await getScoutData(id)

  if (!scout) {
    notFound()
  }

  return <PublicScoutCard scout={scout} />
}
