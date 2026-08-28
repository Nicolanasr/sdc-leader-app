import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import EventWorkspace from './EventWorkspace'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EventDetailsPage({ params }: PageProps) {
  const { id: eventId } = await params
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = user?.app_metadata?.role
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

  if (!user || !role || !groupId || !allowedRoles.includes(role)) {
    redirect('/login?message=Unauthorized. Event access only.')
  }

  // 2. Fetch all event details, group data, staff, participants, pantry, inventory in parallel
  const [
    groupRes,
    eventRes,
    troopsRes,
    profilesRes,
    membersRes,
    checkoutsRes,
    inventoryRes,
    mealPlansRes,
    pantryRes,
    shoppingRes,
    pantryReqRes,
    userProfileRes,
  ] = await Promise.all([
    supabase.from('groups').select('name').eq('id', groupId).single(),
    supabase
      .from('events')
      .select(`
        *,
        event_staff (*, profiles(full_name)),
        event_participants (*, members(id, first_name, last_name, troop_id, current_rank)),
        event_expenses (*),
        event_documents (*)
      `)
      .eq('id', eventId)
      .eq('group_id', groupId)
      .eq('is_deleted', false)
      .single(),
    supabase.from('troops').select('id, name').eq('group_id', groupId).eq('is_deleted', false).order('name', { ascending: true }),
    supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        rank,
        user_roles!inner(group_id)
      `)
      .eq('user_roles.group_id', groupId),
    supabase
      .from('members')
      .select('id, first_name, last_name, troop_id, current_rank')
      .eq('group_id', groupId)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('first_name', { ascending: true }),
    supabase
      .from('inventory_checkouts')
      .select('*')
      .eq('event_id', eventId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false }),
    supabase
      .from('quartermaster_inventory')
      .select('*')
      .eq('group_id', groupId)
      .eq('is_deleted', false)
      .order('category', { ascending: true }),
    supabase
      .from('event_meal_plans')
      .select('*, event_meal_ingredients(*)')
      .eq('event_id', eventId)
      .eq('is_deleted', false)
      .order('day_number', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('group_pantry_items')
      .select('*')
      .eq('group_id', groupId)
      .eq('is_deleted', false)
      .order('name', { ascending: true }),
    supabase
      .from('event_shopping_list_items')
      .select('*')
      .eq('event_id', eventId)
      .order('is_purchased', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('event_pantry_requests')
      .select('*, group_pantry_items(name, unit)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
  ])

  const eventData = eventRes.data
  if (!eventData) {
    notFound()
  }

  const groupName = groupRes.data?.name || 'Scout Group'
  const troopsData = troopsRes.data || []
  const leaders = (profilesRes.data || []).map((p: any) => ({
    id: p.id,
    fullName: p.full_name || 'Leader',
    email: p.email || '',
    rank: p.rank || '',
  }))
  const membersData = membersRes.data || []
  const eventCheckouts = checkoutsRes.data || []
  const groupInventory = inventoryRes.data || []
  const initialMealPlans = mealPlansRes.data || []
  const initialGroupPantry = pantryRes.data || []
  const initialShoppingList = shoppingRes.data || []
  const initialPantryRequests = pantryReqRes.data || []
  const userName = userProfileRes.data?.full_name || user.email || 'Leader'

  return (
    <EventWorkspace
      event={eventData}
      troops={troopsData}
      leaders={leaders}
      allMembers={membersData}
      initialCheckouts={eventCheckouts}
      groupInventory={groupInventory}
      initialMealPlans={initialMealPlans}
      initialGroupPantry={initialGroupPantry}
      initialShoppingList={initialShoppingList}
      initialPantryRequests={initialPantryRequests}
      currentRole={role}
      groupId={groupId}
      groupName={groupName}
      userProfileId={user.id}
      userName={userName}
    />
  )
}
