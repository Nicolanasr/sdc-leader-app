import { createAdminClient } from '@/utils/supabase/admin'

export interface ToolContext {
  groupId: string
  userRole: string
  userId: string
  userName: string
}

// ── 1. GEMINI TOOL DECLARATIONS ────────────────────────────────────────────────
export const GEMINI_TOOLS_DECLARATION = [
  {
    functionDeclarations: [
      {
        name: 'search_members',
        description:
          'Search scout youth members (roster), headcounts, blood types, emergency contacts, patrol roles, and unit assignments.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: {
              type: 'STRING',
              description: 'Optional first or last name of the scout to search for (e.g. "Anthony", "Marc")',
            },
            troop_name: {
              type: 'STRING',
              description: 'Optional name of the unit/troop to filter by (e.g. "Kechefe", "Louveteaux", "Zaharat", "Guides", "Jouwele")',
            },
            rank: {
              type: 'STRING',
              description: 'Optional rank to filter by (e.g. "3arif", "3arif_awwal", "mse3ed_3arif", "sadous")',
            },
            is_active: {
              type: 'BOOLEAN',
              description: 'Filter active scouts only (defaults to true)',
            },
            limit: {
              type: 'NUMBER',
              description: 'Max number of records to return (defaults to 20)',
            },
          },
        },
      },
      {
        name: 'get_scout_advancement',
        description:
          'Get scout badge progress, rank advancement dates, promise ceremony status, and badge requirements completed.',
        parameters: {
          type: 'OBJECT',
          properties: {
            member_name: {
              type: 'STRING',
              description: 'Full name or partial name of the scout (e.g. "Anthony Khoury")',
            },
          },
          required: ['member_name'],
        },
      },
      {
        name: 'get_events',
        description:
          'Retrieve upcoming or past scout activities, weekend camps, weekly gatherings, outings, dates, and locations.',
        parameters: {
          type: 'OBJECT',
          properties: {
            time_window: {
              type: 'STRING',
              enum: ['upcoming', 'past', 'all'],
              description: 'Whether to fetch future upcoming events, past events, or all (defaults to "upcoming")',
            },
            event_type: {
              type: 'STRING',
              description: 'Optional event type (e.g. "camp", "weekly_meeting", "hike", "special_event")',
            },
            limit: {
              type: 'NUMBER',
              description: 'Optional number of events to retrieve (leave empty to retrieve all matching events)',
            },
          },
        },
      },
      {
        name: 'get_event_workspace_details',
        description:
          'Fetch detailed operational information for a specific camp or event, including staff hierarchy, registered attendees, fees paid, consent status, or budget expenses.',
        parameters: {
          type: 'OBJECT',
          properties: {
            event_name: {
              type: 'STRING',
              description: 'Title or partial title of the event (e.g. "Camp d\'Été", "Sortie")',
            },
            aspect: {
              type: 'STRING',
              enum: ['hierarchy', 'roster', 'treasury', 'all'],
              description: 'Which part of the event to inspect: "hierarchy" (leaders on duty), "roster" (scouts, consents, fees), "treasury" (budget & expenses), or "all"',
            },
          },
          required: ['event_name'],
        },
      },
      {
        name: 'check_inventory_or_pantry',
        description:
          'Check equipment stock (tents, pioneering ropes, tools) or central pantry food supplies (rice, grains, oil, pasta, cans) and condition breakdowns.',
        parameters: {
          type: 'OBJECT',
          properties: {
            resource_type: {
              type: 'STRING',
              enum: ['equipment', 'pantry'],
              description: 'Whether to check equipment inventory or food pantry stock',
            },
            search: {
              type: 'STRING',
              description: 'Item name or keyword to search for (e.g. "tent", "rope", "sugar", "tuna")',
            },
            low_stock_only: {
              type: 'BOOLEAN',
              description: 'If true, returns only items at or below minimum threshold or damaged gear',
            },
          },
          required: ['resource_type'],
        },
      },
      {
        name: 'get_treasury_summary',
        description:
          'Get financial balances in USD and LBP, recent income/expense vouchers, and dues collection status. (Restricted to Group Chiefs and Treasurers).',
        parameters: {
          type: 'OBJECT',
          properties: {
            troop_name: {
              type: 'STRING',
              description: 'Optional troop name to filter dues or disbursements by',
            },
          },
        },
      },
      {
        name: 'get_leadership_structure',
        description:
          'Get the group leadership hierarchy, Group Council (Majlis El Faouj: Chef de Groupe, Assistant, Amin Serr, Amin Sandou2, Amin Tejhizat), Troop Chiefs (Kouyyad El Ferak), unit assignments, and official responsibilities.',
        parameters: {
          type: 'OBJECT',
          properties: {
            troop_name: {
              type: 'STRING',
              description: 'Optional troop/unit name to filter leaders by (e.g. "Zaharat", "Ahiram", "Jaramiz", "Ra3")',
            },
          },
        },
      },
    ],
  },
]

// ── 2. TOOL EXECUTION HANDLERS ─────────────────────────────────────────────────

export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  context: ToolContext
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const supabase = createAdminClient()
  const { groupId, userRole } = context

  try {
    switch (toolName) {
      // ── Tool 1: search_members ──────────────────────────────────────────────
      case 'search_members': {
        const query = (args.query as string | undefined)?.trim()
        const troopName = (args.troop_name as string | undefined)?.trim()
        const rank = (args.rank as string | undefined)?.trim()
        const isActive = args.is_active !== false
        const limitArg = args.limit ? Number(args.limit) : null

        let dbQuery = supabase
          .from('members')
          .select(`
            id,
            first_name,
            last_name,
            current_rank,
            patrol_role,
            is_active,
            blood_type,
            emergency_contact_name,
            emergency_contact_phone,
            emergency_contact_relation,
            promise_date,
            troops ( id, name ),
            patrols ( id, name )
          `, { count: 'exact' })
          .eq('group_id', groupId)
          .eq('is_deleted', false)

        if (isActive) {
          dbQuery = dbQuery.eq('is_active', true)
        }

        if (query) {
          dbQuery = dbQuery.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        }

        if (rank) {
          dbQuery = dbQuery.eq('current_rank', rank)
        }

        interface MemberQueryResult {
          id: string
          first_name: string
          last_name: string
          current_rank: string | null
          patrol_role: string | null
          is_active: boolean
          blood_type: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          promise_date: string | null
          troops?: { id: string; name: string } | null
          patrols?: { id: string; name: string } | null
        }

        const { data: members, count: exactMembersCount, error } = limitArg
          ? await dbQuery.limit(limitArg)
          : await dbQuery

        if (error) throw error

        // Filter by troop name in memory if specified
        let results = (members || []) as unknown as MemberQueryResult[]
        if (troopName) {
          results = results.filter((m) =>
            m.troops?.name?.toLowerCase().includes(troopName.toLowerCase())
          )
        }

        // Compute summary metrics
        const totalMatching = exactMembersCount ?? results.length
        return {
          success: true,
          data: {
            totalMatching,
            displayedCount: results.length,
            members: results.map((m) => ({
              id: m.id,
              name: `${m.first_name} ${m.last_name}`,
              troop: m.troops?.name || 'Unassigned',
              patrol: m.patrols?.name || 'None',
              rank: m.current_rank || 'Scout',
              patrolRole: m.patrol_role || 'Member',
              bloodType: m.blood_type || 'Unknown',
              emergencyContact: m.emergency_contact_name
                ? `${m.emergency_contact_name} (${m.emergency_contact_relation}): ${m.emergency_contact_phone}`
                : 'None',
              promiseDate: m.promise_date || null,
            })),
          },
        }
      }

      // ── Tool 2: get_scout_advancement ─────────────────────────────────────────
      case 'get_scout_advancement': {
        const memberName = (args.member_name as string)?.trim()
        if (!memberName) {
          return { success: false, error: 'Please provide a scout member name.' }
        }

        // 1. Locate member
        const { data: members } = await supabase
          .from('members')
          .select('id, first_name, last_name, current_rank, promise_date, troops(name)')
          .eq('group_id', groupId)
          .eq('is_deleted', false)
          .or(`first_name.ilike.%${memberName}%,last_name.ilike.%${memberName}%`)
          .limit(10)

        if (!members || members.length === 0) {
          return {
            success: true,
            data: {
              found: false,
              message: `No scout member matching "${memberName}" found in the database.`,
            },
          }
        }

        const targetMember = members[0]

        // 2. Fetch progression records
        const { data: records } = await supabase
          .from('member_progression_records')
          .select(`
            id,
            completed_at,
            notes,
            validated_by,
            progression_requirements (
              id,
              title,
              category,
              progression_classes (
                id,
                name,
                badge_icon
              )
            ),
            profiles:validated_by ( full_name )
          `)
          .eq('member_id', targetMember.id)
          .order('completed_at', { ascending: false })

        interface ProgressionRecordRow {
          id: string
          completed_at: string
          notes: string | null
          progression_requirements?: {
            id: string
            title: string
            category: string
            progression_classes?: {
              id: string
              name: string
              badge_icon: string
            } | null
          } | null
          profiles?: { full_name: string | null } | null
        }

        const typedRecords = (records || []) as unknown as ProgressionRecordRow[]
        const targetTroop = (targetMember as { troops?: { name?: string } | null })?.troops?.name

        return {
          success: true,
          data: {
            found: true,
            scout: {
              id: targetMember.id,
              name: `${targetMember.first_name} ${targetMember.last_name}`,
              troop: targetTroop || 'Unassigned',
              currentRank: targetMember.current_rank || 'Scout',
              promiseDate: targetMember.promise_date || 'Not yet invested',
            },
            totalRequirementsCompleted: records?.length || 0,
            completedMilestones: typedRecords.map((r) => ({
              classOrRank: r.progression_requirements?.progression_classes?.name,
              badgeIcon: r.progression_requirements?.progression_classes?.badge_icon,
              requirementTitle: r.progression_requirements?.title,
              category: r.progression_requirements?.category,
              completedDate: r.completed_at,
              validatedBy: r.profiles?.full_name || 'Leader',
              notes: r.notes || null,
            })),
          },
        }
      }

      // ── Tool 3: get_events ────────────────────────────────────────────────────
      case 'get_events': {
        const timeWindow = (args.time_window as string) || 'upcoming'
        const eventType = args.event_type as string | undefined
        const limitArg = args.limit ? Number(args.limit) : null
        const nowIso = new Date().toISOString()

        let dbQuery = supabase
          .from('events')
          .select(`
            id,
            title,
            description,
            event_type,
            start_time,
            end_time,
            location,
            scope,
            participant_fee,
            status,
            troops ( name )
          `, { count: 'exact' })
          .eq('group_id', groupId)
          .eq('is_deleted', false)

        if (timeWindow === 'upcoming') {
          dbQuery = dbQuery.gte('start_time', nowIso).order('start_time', { ascending: true })
        } else if (timeWindow === 'past') {
          dbQuery = dbQuery.lt('start_time', nowIso).order('start_time', { ascending: false })
        } else {
          dbQuery = dbQuery.order('start_time', { ascending: false })
        }

        if (eventType) {
          dbQuery = dbQuery.ilike('event_type', `%${eventType}%`)
        }

        interface EventRow {
          id: string
          title: string
          description: string | null
          event_type: string
          start_time: string
          end_time: string
          location: string | null
          participant_fee: number | null
          status: string | null
          troops?: { name: string } | null
        }

        const { data: events, count: totalMatching, error } = limitArg
          ? await dbQuery.limit(limitArg)
          : await dbQuery
        if (error) throw error

        const typedEvents = (events || []) as unknown as EventRow[]

        return {
          success: true,
          data: {
            totalMatchingEvents: totalMatching ?? typedEvents.length,
            displayedCount: typedEvents.length,
            events: typedEvents.map((ev) => ({
              id: ev.id,
              title: ev.title,
              type: ev.event_type,
              start: ev.start_time,
              end: ev.end_time,
              location: ev.location || 'Saint Jean Marc Ground',
              unit: ev.troops?.name || 'Whole Group',
              fee: ev.participant_fee ? `${ev.participant_fee} USD` : 'Free / Not set',
              status: ev.status,
            })),
          },
        }
      }

      // ── Tool 4: get_event_workspace_details ──────────────────────────────────
      case 'get_event_workspace_details': {
        const eventName = (args.event_name as string)?.trim()
        const aspect = (args.aspect as string) || 'all'

        if (!eventName) {
          return { success: false, error: 'Please specify an event name.' }
        }

        // Find event
        const { data: matchedEvents } = await supabase
          .from('events')
          .select('id, title, event_type, start_time, participant_fee')
          .eq('group_id', groupId)
          .eq('is_deleted', false)
          .ilike('title', `%${eventName}%`)
          .order('start_time', { ascending: false })
          .limit(1)

        if (!matchedEvents || matchedEvents.length === 0) {
          return {
            success: true,
            data: {
              found: false,
              message: `No event matching "${eventName}" found in the database.`,
            },
          }
        }

        const event = matchedEvents[0]
        const eventId = event.id
        const details: Record<string, unknown> = {
          event: {
            title: event.title,
            type: event.event_type,
            date: event.start_time,
            fee: event.participant_fee,
          },
        }

        // Staff hierarchy
        if (aspect === 'hierarchy' || aspect === 'all') {
          const { data: staff } = await supabase
            .from('event_staff')
            .select('event_role, profiles ( full_name )')
            .eq('event_id', eventId)

          interface StaffRow {
            event_role: string
            profiles?: { full_name: string | null } | null
          }

          details.staff = ((staff || []) as unknown as StaffRow[]).map((s) => ({
            role: s.event_role,
            leaderName: s.profiles?.full_name || 'Leader',
          }))
        }

        // Roster & Attendance
        if (aspect === 'roster' || aspect === 'all') {
          const { data: participants } = await supabase
            .from('event_participants')
            .select('attendance_status, parent_consent, fee_paid, payment_status, members ( first_name, last_name )')
            .eq('event_id', eventId)

          const total = participants?.length || 0
          const present = participants?.filter((p) => p.attendance_status === 'present').length || 0
          const consentApproved = participants?.filter((p) => p.parent_consent === 'yes').length || 0
          const fullyPaid = participants?.filter((p) => p.payment_status === 'paid').length || 0

          details.roster = {
            totalRegistered: total,
            presentCount: present,
            parentConsentApproved: consentApproved,
            fullyPaidCount: fullyPaid,
          }
        }

        // Expenses
        if (aspect === 'treasury' || aspect === 'all') {
          const { data: expenses } = await supabase
            .from('event_expenses')
            .select('category, description, amount')
            .eq('event_id', eventId)

          const totalExpense = (expenses || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
          details.expenses = {
            totalAmountUSD: totalExpense,
            items: expenses || [],
          }
        }

        return {
          success: true,
          data: details,
        }
      }

      // ── Tool 5: check_inventory_or_pantry ────────────────────────────────────
      case 'check_inventory_or_pantry': {
        const resourceType = args.resource_type as string
        const search = (args.search as string | undefined)?.trim()
        const lowStockOnly = Boolean(args.low_stock_only)

        if (resourceType === 'equipment') {
          const { count: totalEquipCount } = await supabase
            .from('quartermaster_inventory')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', groupId)
            .eq('is_deleted', false)

          let dbQuery = supabase
            .from('quartermaster_inventory')
            .select('id, name, category, quantity_total, quantity_available, qty_good, qty_fair, qty_needs_repair, qty_damaged, location_stored')
            .eq('group_id', groupId)
            .eq('is_deleted', false)
            .order('name', { ascending: true })

          if (search) {
            dbQuery = dbQuery.or(`name.ilike.%${search}%,category.ilike.%${search}%`)
          }

          const { data: items, error } = await dbQuery
          if (error) throw error

          let results = items || []
          if (lowStockOnly) {
            results = results.filter((i) => i.quantity_available <= 1 || i.qty_damaged > 0)
          }

          const totalUnitsInStock = (items || []).reduce((acc, i) => acc + (Number(i.quantity_total) || 0), 0)

          return {
            success: true,
            data: {
              category: 'Equipment Inventory',
              totalDistinctItems: totalEquipCount ?? results.length,
              totalUnitsInStock,
              displayedCount: results.length,
              items: results.map((i) => ({
                name: i.name,
                category: i.category,
                totalStock: i.quantity_total,
                usableAvailable: (i.qty_good || 0) + (i.qty_fair || 0),
                good: i.qty_good,
                fair: i.qty_fair,
                needsRepair: i.qty_needs_repair,
                damaged: i.qty_damaged,
                storedLocation: i.location_stored || 'Depot',
              })),
            },
          }
        } else {
          // Central Pantry
          const { count: totalProductCount } = await supabase
            .from('group_pantry_items')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', groupId)
            .eq('is_deleted', false)

          let dbQuery = supabase
            .from('group_pantry_items')
            .select('id, name, category, quantity_total, quantity_available, unit, location_stored, min_threshold, expiry_date, expiry_batches')
            .eq('group_id', groupId)
            .eq('is_deleted', false)
            .order('name', { ascending: true })

          if (search) {
            dbQuery = dbQuery.or(`name.ilike.%${search}%,category.ilike.%${search}%`)
          }

          const { data: pantryItems, error } = await dbQuery
          if (error) throw error

          const now = new Date()
          const nowMs = now.getTime()

          interface RawBatch {
            id?: string
            brand?: string
            quantity?: number
            expiry_date?: string
            package_size?: string
            lot_number?: string
          }

          interface ProcessedPantryItem {
            id: string
            name: string
            category: string
            unit: string
            quantity_available: number
            min_threshold: number
            location_stored: string
            expiry_date: string | null
            batches: Array<{
              brand: string
              quantity: number
              expiryDate: string
              packageSize: string
              isExpired: boolean
              isExpiringSoon: boolean
              daysToExpiry: number | null
            }>
            hasExpired: boolean
            hasExpiringSoon: boolean
            isLowStock: boolean
          }

          const processed: ProcessedPantryItem[] = (pantryItems || []).map((p) => {
            const rawBatches = (p.expiry_batches || []) as RawBatch[]
            const batches = rawBatches.map((b) => {
              const expMs = b.expiry_date ? new Date(b.expiry_date).getTime() : null
              const isExpired = expMs !== null && expMs < nowMs
              const days = expMs !== null ? Math.round((expMs - nowMs) / (1000 * 3600 * 24)) : null
              const isExpiringSoon = days !== null && days >= 0 && days <= 45
              return {
                brand: b.brand || 'Standard',
                quantity: Number(b.quantity) || 0,
                expiryDate: b.expiry_date || 'None',
                packageSize: b.package_size || '',
                isExpired,
                isExpiringSoon,
                daysToExpiry: days,
              }
            })

            const hasExpiredBatch = batches.some((b) => b.isExpired)
            const itemExpMs = p.expiry_date ? new Date(p.expiry_date).getTime() : null
            const hasExpiredItemDate = itemExpMs !== null && itemExpMs < nowMs
            const hasExpired = hasExpiredBatch || hasExpiredItemDate

            const hasExpSoonBatch = batches.some((b) => b.isExpiringSoon)
            const itemDays = itemExpMs !== null ? Math.round((itemExpMs - nowMs) / (1000 * 3600 * 24)) : null
            const hasExpSoonItemDate = itemDays !== null && itemDays >= 0 && itemDays <= 45
            const hasExpiringSoon = hasExpSoonBatch || hasExpSoonItemDate

            const isLowStock = (Number(p.quantity_available) || 0) <= (p.min_threshold || 1)

            return {
              id: p.id,
              name: p.name,
              category: p.category,
              unit: p.unit || 'units',
              quantity_available: Number(p.quantity_available) || 0,
              min_threshold: p.min_threshold || 1,
              location_stored: p.location_stored || 'Pantry Shelf',
              expiry_date: p.expiry_date || null,
              batches,
              hasExpired,
              hasExpiringSoon,
              isLowStock,
            }
          })

          let results = processed
          if (lowStockOnly) {
            results = results.filter((p) => p.isLowStock)
          }

          const totalUnitsInStock = processed.reduce((acc, p) => acc + p.quantity_available, 0)
          const expiredProducts = processed.filter((p) => p.hasExpired)
          const expiringSoonProducts = processed.filter((p) => p.hasExpiringSoon)
          const lowStockProducts = processed.filter((p) => p.isLowStock)

          return {
            success: true,
            data: {
              category: 'Central Pantry (Mounet)',
              totalDistinctProducts: totalProductCount ?? processed.length,
              totalUnitsInStock,
              kpiSummary: {
                allStockUnits: totalUnitsInStock,
                totalDistinctProducts: processed.length,
                lowStockCount: lowStockProducts.length,
                expiringWithin45DaysCount: expiringSoonProducts.length,
                expiredCount: expiredProducts.length,
              },
              expiredProducts: expiredProducts.map((p) => ({
                name: p.name,
                category: p.category,
                totalAvailable: `${p.quantity_available} ${p.unit}`,
                storedLocation: p.location_stored,
                earliestExpiryDate: p.expiry_date,
                expiredBatches: p.batches
                  .filter((b) => b.isExpired)
                  .map((b) => `${b.quantity}x ${b.brand} (${b.packageSize || p.unit}) - Expired: ${b.expiryDate}`),
              })),
              expiringSoonProducts: expiringSoonProducts.map((p) => ({
                name: p.name,
                category: p.category,
                totalAvailable: `${p.quantity_available} ${p.unit}`,
                storedLocation: p.location_stored,
                batchesExpiringSoon: p.batches
                  .filter((b) => b.isExpiringSoon)
                  .map((b) => `${b.quantity}x ${b.brand} (${b.packageSize || p.unit}) - Expires in ${b.daysToExpiry} days (${b.expiryDate})`),
              })),
              lowStockProducts: lowStockProducts.map((p) => ({
                name: p.name,
                available: `${p.quantity_available} ${p.unit}`,
                minThreshold: `${p.min_threshold} ${p.unit}`,
              })),
              items: results.map((p) => ({
                name: p.name,
                category: p.category,
                available: `${p.quantity_available} ${p.unit}`,
                minThreshold: `${p.min_threshold} ${p.unit}`,
                isLowStock: p.isLowStock,
                hasExpiredBatches: p.hasExpired,
                hasExpiringSoonBatches: p.hasExpiringSoon,
                storedLocation: p.location_stored,
                earliestExpiryDate: p.expiry_date || 'None',
                brandsInStock: Array.from(new Set(p.batches.map((b) => b.brand).filter(Boolean))),
                lotsCount: p.batches.length,
              })),
            },
          }
        }
      }

      // ── Tool 6: get_treasury_summary ─────────────────────────────────────────
      case 'get_treasury_summary': {
        const authorizedRoles = ['chef_groupe', 'assistant_chef_groupe', 'amin_sandou2_group', 'configurator']
        if (!authorizedRoles.includes(userRole)) {
          return {
            success: true,
            data: {
              accessDenied: true,
              message:
                'Access Denied: Financial balances and treasury ledgers are restricted to Group Leaders and the General Treasurer (Amin Sandou2).',
            },
          }
        }

        // Fetch recent group treasury transactions
        const { data: transactions, count: totalTransactions } = await supabase
          .from('treasury_transactions')
          .select('amount, currency, type, category, description, status, created_at', { count: 'exact' })
          .eq('group_id', groupId)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(50)

        // Compute approximate balances
        let balanceUSD = 0
        let balanceLBP = 0

        const { data: allApproved } = await supabase
          .from('treasury_transactions')
          .select('amount, currency, type')
          .eq('group_id', groupId)
          .eq('status', 'approved')
          .eq('is_deleted', false)

        ;(allApproved || []).forEach((t) => {
          const amt = Number(t.amount) || 0
          if (t.currency === 'USD') {
            balanceUSD += t.type === 'income' ? amt : -amt
          } else {
            balanceLBP += t.type === 'income' ? amt : -amt
          }
        })

        return {
          success: true,
          data: {
            treasuryBalances: {
              USD: `$${balanceUSD.toLocaleString()}`,
              LBP: `${balanceLBP.toLocaleString()} LBP`,
            },
            totalTransactionsCount: totalTransactions ?? (transactions || []).length,
            recentTransactions: (transactions || []).map((t) => ({
              date: t.created_at,
              type: t.type,
              amount: `${t.amount} ${t.currency}`,
              category: t.category,
              description: t.description,
              status: t.status,
            })),
          },
        }
      }

      // ── Tool 7: get_leadership_structure ────────────────────────────────────
      case 'get_leadership_structure': {
        const troopName = (args.troop_name as string | undefined)?.trim()

        const { data: profilesData, error } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            email,
            rank,
            user_roles!inner (
              id,
              group_id,
              roles:role_id (id, name, permission_scope),
              troops:troop_id (id, name)
            ),
            profile_responsibilities (
              responsibilities:responsibility_id (id, name)
            )
          `)
          .eq('user_roles.group_id', groupId)

        if (error) throw error

        interface RawProfile {
          id: string
          full_name: string | null
          email: string | null
          rank: string | null
          user_roles?: Array<{
            roles?: { id: string; name: string; permission_scope: string } | null
            troops?: { id: string; name: string } | null
          }> | null
          profile_responsibilities?: Array<{
            responsibilities?: { id: string; name: string } | null
          }> | null
        }

        const rawList = (profilesData || []) as unknown as RawProfile[]

        const groupCouncil: Array<{ name: string; rank: string; role: string; email?: string }> = []
        const troopLeaders: Array<{ name: string; rank: string; role: string; troop: string; email?: string }> = []

        rawList.forEach((prof) => {
          const leaderName = prof.full_name || prof.email?.split('@')[0] || 'Leader'
          const leaderRank = prof.rank || 'Chef'
          const roles = prof.user_roles || []
          const responsibilities = (prof.profile_responsibilities || [])
            .map((pr) => pr.responsibilities?.name)
            .filter(Boolean) as string[]

          roles.forEach((ur) => {
            const roleName = ur.roles?.name || 'Leader'
            const troop = ur.troops?.name

            if (!troop || ur.roles?.permission_scope === 'group') {
              groupCouncil.push({
                name: leaderName,
                rank: leaderRank,
                role: `${roleName}${responsibilities.length ? ` (${responsibilities.join(', ')})` : ''}`,
                email: prof.email || undefined,
              })
            } else {
              troopLeaders.push({
                name: leaderName,
                rank: leaderRank,
                role: roleName,
                troop: troop,
                email: prof.email || undefined,
              })
            }
          })
        })

        let filteredTroopLeaders = troopLeaders
        if (troopName) {
          filteredTroopLeaders = filteredTroopLeaders.filter((tl) =>
            tl.troop.toLowerCase().includes(troopName.toLowerCase())
          )
        }

        return {
          success: true,
          data: {
            groupCouncil,
            troopLeaders: filteredTroopLeaders,
            totalLeaders: rawList.length,
          },
        }
      }

      default:
        return { success: false, error: `Unrecognized tool function: ${toolName}` }
    }
  } catch (err: unknown) {
    console.error(`[AIToolError] Error executing ${toolName}:`, err)
    const msg = err instanceof Error ? err.message : 'Database query error'
    return { success: false, error: msg }
  }
}
