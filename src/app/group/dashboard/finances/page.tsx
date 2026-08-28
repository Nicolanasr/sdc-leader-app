import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import FinancesManagement from './FinancesManagement'

export default async function FinancesPage() {
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = user?.app_metadata?.role
  const groupId = user?.app_metadata?.group_id
  const userTroopId = user?.app_metadata?.troop_id

  const allowedRoles = [
    'chef_groupe',
    'assistant_chef_groupe',
    'amin_sandou2_group',
    'ka2ed_fer2a',
    'mouse3ed_ka2ed_fer2a',
    'configurator',
  ]

  if (!user || !role || !groupId || !allowedRoles.includes(role)) {
    redirect('/group/dashboard?message=Unauthorized. Treasury & Dues access only.')
  }

  // 2. Fetch Group Name
  const { data: groupData } = await supabase
    .from('groups')
    .select('name')
    .eq('id', groupId)
    .single()

  const groupName = groupData?.name || 'Scout Group'

  // 3. Fetch Troops in Group
  const { data: troopsData } = await supabase
    .from('troops')
    .select('id, name')
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  // 4. Fetch Leaders/Profiles in Group
  const { data: profilesData } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      rank,
      user_roles!inner(group_id)
    `)
    .eq('user_roles.group_id', groupId)

  const leaders = (profilesData || []).map((p: any) => ({
    id: p.id,
    fullName: p.full_name || 'Leader',
    email: p.email || '',
    rank: p.rank || '',
  }))

  // 5. Fetch Active Scout Members in Group
  const { data: membersData } = await supabase
    .from('members')
    .select('id, first_name, last_name, troop_id, current_rank, birth_date')
    .eq('group_id', groupId)
    .eq('is_active', true)
    .eq('is_deleted', false)
    .order('last_name', { ascending: true })

  // 6. Fetch Sibling Links from member_history
  const { data: siblingHistory } = await supabase
    .from('member_history')
    .select('member_id, notes')
    .eq('event_type', 'sibling_link')

  const siblingMap: Record<string, string[]> = {}
  if (siblingHistory) {
    siblingHistory.forEach((h: any) => {
      try {
        const parsed = JSON.parse(h.notes || '{}')
        if (parsed.linked_sibling_ids && Array.isArray(parsed.linked_sibling_ids)) {
          siblingMap[h.member_id] = parsed.linked_sibling_ids
        }
      } catch {}
    })
  }

  // 7. Fetch Annual Membership Fees & Payments for Group
  const { data: feesData } = await supabase
    .from('membership_fees')
    .select(`
      *,
      members (id, first_name, last_name, troop_id, current_rank),
      membership_payments (*, profiles(full_name))
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

  // 8. Fetch Troop Fee Settings
  const { data: troopFeeSettings } = await supabase
    .from('troop_fee_settings')
    .select('*')
    .eq('group_id', groupId)

  // 9. Fetch Troop Monthly Dues & Payments
  const { data: troopMonthlyDues } = await supabase
    .from('troop_monthly_dues')
    .select(`
      *,
      members (id, first_name, last_name, troop_id),
      troop_dues_payments (*, profiles(full_name))
    `)
    .eq('group_id', groupId)

  // 10. Fetch Troop Handovers
  const { data: troopHandovers } = await supabase
    .from('troop_handovers')
    .select(`
      *,
      troops (id, name),
      handed_over:profiles!troop_handovers_handed_over_by_fkey (id, full_name),
      confirmed_by_leader:profiles!troop_handovers_confirmed_by_fkey (id, full_name)
    `)
    .eq('group_id', groupId)
    .order('handover_date', { ascending: false })

  // 11. Fetch Troop Disbursements
  const { data: troopDisbursements } = await supabase
    .from('troop_disbursements')
    .select(`
      *,
      troops (id, name),
      requested_by_leader:profiles!troop_disbursements_requested_by_fkey (id, full_name),
      approved_by_leader:profiles!troop_disbursements_approved_by_fkey (id, full_name)
    `)
    .eq('group_id', groupId)
    .order('request_date', { ascending: false })

  // 12. Fetch Treasury Transactions (Sandou2 El Majlis)
  const { data: transactionsData } = await supabase
    .from('treasury_transactions')
    .select(`
      *,
      troops (id, name)
    `)
    .eq('group_id', groupId)

  // 13. Fetch Monthly Financial Statements (Kashf Hisab)
  const { data: statementsData } = await supabase
    .from('monthly_financial_statements')
    .select(`
      *,
      submitted_by_profile:profiles!monthly_financial_statements_submitted_by_fkey (id, full_name),
      approved_by_profile:profiles!monthly_financial_statements_approved_by_fkey (id, full_name)
    `)
    .eq('group_id', groupId)

  // 14. Fetch Logged-in Leader Details
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const userName = userProfile?.full_name || user.email || 'Leader'

  return (
    <FinancesManagement
      initialFees={feesData || []}
      initialTroopSettings={troopFeeSettings || []}
      initialTroopDues={troopMonthlyDues || []}
      initialHandovers={troopHandovers || []}
      initialDisbursements={troopDisbursements || []}
      initialTransactions={transactionsData || []}
      initialStatements={statementsData || []}
      members={membersData || []}
      siblingMap={siblingMap}
      troops={troopsData || []}
      leaders={leaders || []}
      currentRole={role}
      groupId={groupId}
      groupName={groupName}
      userTroopId={userTroopId || null}
      userProfileId={user.id}
      userName={userName}
    />
  )
}
