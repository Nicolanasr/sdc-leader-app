import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabaseUser = await createClient()
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const groupId = searchParams.get('groupId')
    const troopId = searchParams.get('troopId')

    if (!groupId) {
      return NextResponse.json({ error: 'groupId is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 1. Try querying meeting_plans table
    let query = admin
      .from('meeting_plans')
      .select('*, troops(id, name), profiles:created_by(id, full_name)')
      .eq('group_id', groupId)
      .order('meeting_date', { ascending: false })

    if (troopId && troopId !== 'all') {
      query = query.eq('troop_id', troopId)
    }

    const { data, error } = await query

    if (!error && data) {
      return NextResponse.json({ plans: data })
    }

    // 2. Fallback if table does not exist: query events table
    let eventsQuery = admin
      .from('events')
      .select('*, troops(id, name)')
      .eq('group_id', groupId)
      .eq('event_type', 'weekly_meeting')
      .eq('is_deleted', false)
      .order('start_time', { ascending: false })

    if (troopId && troopId !== 'all') {
      eventsQuery = eventsQuery.eq('troop_id', troopId)
    }

    const { data: eventsData, error: eventsError } = await eventsQuery
    if (eventsError) {
      return NextResponse.json({ error: eventsError.message }, { status: 500 })
    }

    // Map events into plan shape if description contains JSON
    const mappedPlans = (eventsData || []).map((ev: any) => {
      let schedule_blocks = []
      let materials_checklist = []
      let theme = ''
      let objectives = ''

      try {
        if (ev.description && ev.description.startsWith('{')) {
          const parsed = JSON.parse(ev.description)
          schedule_blocks = parsed.schedule_blocks || []
          materials_checklist = parsed.materials_checklist || []
          theme = parsed.theme || ''
          objectives = parsed.objectives || ''
        } else {
          theme = ev.description || ''
        }
      } catch {
        theme = ev.description || ''
      }

      const dateStr = ev.start_time ? ev.start_time.split('T')[0] : new Date().toISOString().split('T')[0]
      const startTimeStr = ev.start_time ? ev.start_time.split('T')[1]?.substring(0, 5) || '14:00' : '14:00'
      const endTimeStr = ev.end_time ? ev.end_time.split('T')[1]?.substring(0, 5) || '16:30' : '16:30'

      return {
        id: ev.id,
        group_id: ev.group_id,
        troop_id: ev.troop_id,
        event_id: ev.id,
        title: ev.title,
        theme,
        objectives,
        meeting_date: dateStr,
        start_time: startTimeStr,
        end_time: endTimeStr,
        location: ev.location,
        schedule_blocks,
        materials_checklist,
        is_published: true,
        created_at: ev.start_time,
        troops: ev.troops,
      }
    })

    return NextResponse.json({ plans: mappedPlans })
  } catch (err: any) {
    console.error('[Meeting Planner GET Error]:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabaseUser = await createClient()
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      groupId,
      troopId,
      eventId,
      title,
      theme,
      objectives,
      meetingDate,
      startTime,
      endTime,
      location,
      scheduleBlocks,
      materialsChecklist,
      isPublished = true,
      syncToEvents = true,
    } = body

    if (!groupId || !troopId || !title || !meetingDate) {
      return NextResponse.json(
        { error: 'Missing required fields (groupId, troopId, title, meetingDate)' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    let createdPlan: any = null
    let linkedEventId = eventId || null

    // 1. Sync / Create Event in events table if requested
    if (syncToEvents && !linkedEventId) {
      const startIso = `${meetingDate}T${startTime || '14:00'}:00`
      const endIso = `${meetingDate}T${endTime || '16:30'}:00`
      
      const payloadDesc = JSON.stringify({
        theme: theme || '',
        objectives: objectives || '',
        schedule_blocks: scheduleBlocks || [],
        materials_checklist: materialsChecklist || [],
      })

      const { data: newEv, error: evErr } = await admin
        .from('events')
        .insert({
          group_id: groupId,
          troop_id: troopId,
          title: title.trim(),
          description: payloadDesc,
          event_type: 'weekly_meeting',
          start_time: startIso,
          end_time: endIso,
          location: location || 'Local du Groupe',
          scope: 'troop',
          status: 'planned',
          participant_fee: 0,
        })
        .select()
        .single()

      if (!evErr && newEv) {
        linkedEventId = newEv.id
      }
    }

    // 2. Try inserting into meeting_plans table
    const planPayload = {
      group_id: groupId,
      troop_id: troopId,
      event_id: linkedEventId,
      title: title.trim(),
      theme: theme || null,
      objectives: objectives || null,
      meeting_date: meetingDate,
      start_time: startTime || '14:00',
      end_time: endTime || '16:30',
      location: location || 'Local du Groupe',
      schedule_blocks: scheduleBlocks || [],
      materials_checklist: materialsChecklist || [],
      is_published: isPublished,
      created_by: user.id,
    }

    const { data: planData, error: planError } = await admin
      .from('meeting_plans')
      .insert(planPayload)
      .select('*, troops(id, name), profiles:created_by(id, full_name)')
      .single()

    if (!planError && planData) {
      createdPlan = planData
    } else {
      // Fallback: If meeting_plans table does not exist, return synthesized plan with linkedEventId
      createdPlan = {
        id: linkedEventId || `temp-${Date.now()}`,
        ...planPayload,
      }
    }

    return NextResponse.json({ success: true, plan: createdPlan })
  } catch (err: any) {
    console.error('[Meeting Planner POST Error]:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabaseUser = await createClient()
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      id,
      eventId,
      title,
      theme,
      objectives,
      meetingDate,
      startTime,
      endTime,
      location,
      scheduleBlocks,
      materialsChecklist,
      isPublished,
    } = body

    if (!id) {
      return NextResponse.json({ error: 'Meeting Plan ID is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 1. Try updating meeting_plans table
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    }
    if (title !== undefined) updatePayload.title = title.trim()
    if (theme !== undefined) updatePayload.theme = theme
    if (objectives !== undefined) updatePayload.objectives = objectives
    if (meetingDate !== undefined) updatePayload.meeting_date = meetingDate
    if (startTime !== undefined) updatePayload.start_time = startTime
    if (endTime !== undefined) updatePayload.end_time = endTime
    if (location !== undefined) updatePayload.location = location
    if (scheduleBlocks !== undefined) updatePayload.schedule_blocks = scheduleBlocks
    if (materialsChecklist !== undefined) updatePayload.materials_checklist = materialsChecklist
    if (isPublished !== undefined) updatePayload.is_published = isPublished

    const { data: updatedPlan, error: planError } = await admin
      .from('meeting_plans')
      .update(updatePayload)
      .eq('id', id)
      .select('*, troops(id, name), profiles:created_by(id, full_name)')
      .single()

    // 2. Also sync to events table if linked
    const targetEventId = eventId || (updatedPlan ? updatedPlan.event_id : id)
    if (targetEventId) {
      const eventUpdate: any = {}
      if (title !== undefined) eventUpdate.title = title.trim()
      if (location !== undefined) eventUpdate.location = location
      if (meetingDate && startTime) eventUpdate.start_time = `${meetingDate}T${startTime}:00`
      if (meetingDate && endTime) eventUpdate.end_time = `${meetingDate}T${endTime}:00`
      
      const payloadDesc = JSON.stringify({
        theme: theme || '',
        objectives: objectives || '',
        schedule_blocks: scheduleBlocks || [],
        materials_checklist: materialsChecklist || [],
      })
      eventUpdate.description = payloadDesc

      await admin.from('events').update(eventUpdate).eq('id', targetEventId)
    }

    return NextResponse.json({
      success: true,
      plan: updatedPlan || { id, ...updatePayload },
    })
  } catch (err: any) {
    console.error('[Meeting Planner PUT Error]:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabaseUser = await createClient()
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 1. Try deleting from meeting_plans
    await admin.from('meeting_plans').delete().eq('id', id)

    // 2. Also try marking event deleted if ID matched an event
    await admin.from('events').update({ is_deleted: true }).eq('id', id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Meeting Planner DELETE Error]:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
