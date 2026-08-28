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
  const userTroopId = user?.app_metadata?.troop_id

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
  ]

  if (!user || !role || !groupId || !allowedRoles.includes(role)) {
    redirect('/login?message=Unauthorized. Leader access only.')
  }

  // 2. Fetch Group Name
  const { data: groupData } = await supabase
    .from('groups')
    .select('name')
    .eq('id', groupId)
    .single()

  const groupName = groupData?.name || 'Scout Group'

  // 3. Fetch Event by ID with staff, participants, expenses, documents
  const { data: eventData } = await supabase
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
    .single()

  if (!eventData) {
    notFound()
  }

  // 4. Fetch Troops in Group (for section filtering)
  const { data: troopsData } = await supabase
    .from('troops')
    .select('id, name')
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  // 5. Fetch Leaders (for staff assignment)
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

  // 6. Fetch all active Scout Members in Group (for editing event roster)
  const { data: membersData } = await supabase
    .from('members')
    .select('id, first_name, last_name, troop_id, current_rank')
    .eq('group_id', groupId)
    .eq('is_active', true)
    .eq('is_deleted', false)
    .order('first_name', { ascending: true })

  // 7. Fetch Equipment Checkouts for this Event
  const { data: eventCheckouts } = await supabase
    .from('inventory_checkouts')
    .select('*')
    .eq('event_id', eventId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  // 8. Fetch Group Inventory (for requesting equipment for this event)
  const { data: groupInventory } = await supabase
    .from('quartermaster_inventory')
    .select('*')
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('category', { ascending: true })

  // 9. Fetch Camp Meal Plans for this Event
  let initialMealPlans: any[] = []
  try {
    const { data: mealPlansData } = await supabase
      .from('event_meal_plans')
      .select('*, event_meal_ingredients(*)')
      .eq('event_id', eventId)
      .eq('is_deleted', false)
      .order('day_number', { ascending: true })
      .order('created_at', { ascending: true })

    if (mealPlansData) {
      initialMealPlans = mealPlansData
    }
  } catch (err) {
    initialMealPlans = []
  }

  // 10. Fetch Central Group Pantry Items (for ingredient matching)
  let initialGroupPantry: any[] = []
  try {
    const { data: pantryData } = await supabase
      .from('group_pantry_items')
      .select('*')
      .eq('group_id', groupId)
      .eq('is_deleted', false)
      .order('name', { ascending: true })

    if (pantryData) {
      initialGroupPantry = pantryData
    }
  } catch (err) {
    initialGroupPantry = []
  }

  // 11. Fetch Event Shopping List Items
  let initialShoppingList: any[] = []
  try {
    const { data: shoppingData } = await supabase
      .from('event_shopping_list_items')
      .select('*')
      .eq('event_id', eventId)
      .order('is_purchased', { ascending: true })
      .order('created_at', { ascending: true })

    if (shoppingData) {
      initialShoppingList = shoppingData
    }
  } catch (err) {
    initialShoppingList = []
  }

  // 12. Fetch Event Pantry Requests
  let initialPantryRequests: any[] = []
  try {
    const { data: pantryReqData } = await supabase
      .from('event_pantry_requests')
      .select('*, group_pantry_items(name, unit)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (pantryReqData) {
      initialPantryRequests = pantryReqData
    }
  } catch (err) {
    initialPantryRequests = []
  }

  // 13. Fetch current logged in user profile full name
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const userName = userProfile?.full_name || user.email || 'Leader'

  return (
    <EventWorkspace
      event={eventData}
      troops={troopsData || []}
      leaders={leaders || []}
      allMembers={membersData || []}
      initialCheckouts={eventCheckouts || []}
      groupInventory={groupInventory || []}
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
