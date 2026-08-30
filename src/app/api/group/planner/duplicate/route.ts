import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabaseUser = await createClient()
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { sourcePlanId, targetDate, targetTroopId, targetTitle } = body

    if (!sourcePlanId || !targetDate) {
      return NextResponse.json({ error: 'sourcePlanId and targetDate are required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 1. Fetch source plan from meeting_plans
    let sourcePlan: any = null
    const { data: planData } = await admin
      .from('meeting_plans')
      .select('*')
      .eq('id', sourcePlanId)
      .single()

    if (planData) {
      sourcePlan = planData
    } else {
      // Fallback: fetch from events table
      const { data: evData } = await admin
        .from('events')
        .select('*')
        .eq('id', sourcePlanId)
        .single()

      if (evData) {
        let schedule_blocks = []
        let materials_checklist = []
        let theme = ''
        let objectives = ''
        try {
          if (evData.description && evData.description.startsWith('{')) {
            const parsed = JSON.parse(evData.description)
            schedule_blocks = parsed.schedule_blocks || []
            materials_checklist = parsed.materials_checklist || []
            theme = parsed.theme || ''
            objectives = parsed.objectives || ''
          }
        } catch {}

        sourcePlan = {
          group_id: evData.group_id,
          troop_id: evData.troop_id,
          title: evData.title,
          theme,
          objectives,
          start_time: evData.start_time?.split('T')[1]?.substring(0, 5) || '14:00',
          end_time: evData.end_time?.split('T')[1]?.substring(0, 5) || '16:30',
          location: evData.location,
          schedule_blocks,
          materials_checklist,
        }
      }
    }

    if (!sourcePlan) {
      return NextResponse.json({ error: 'Source meeting plan not found' }, { status: 404 })
    }

    const troopId = targetTroopId || sourcePlan.troop_id
    const title = targetTitle || `${sourcePlan.title} (Copy)`
    const startTime = sourcePlan.start_time || '14:00'
    const endTime = sourcePlan.end_time || '16:30'

    // Create new event in events table
    const startIso = `${targetDate}T${startTime}:00`
    const endIso = `${targetDate}T${endTime}:00`
    const payloadDesc = JSON.stringify({
      theme: sourcePlan.theme || '',
      objectives: sourcePlan.objectives || '',
      schedule_blocks: sourcePlan.schedule_blocks || [],
      materials_checklist: sourcePlan.materials_checklist || [],
    })

    const { data: newEv } = await admin
      .from('events')
      .insert({
        group_id: sourcePlan.group_id,
        troop_id: troopId,
        title: title.trim(),
        description: payloadDesc,
        event_type: 'weekly_meeting',
        start_time: startIso,
        end_time: endIso,
        location: sourcePlan.location || 'Local du Groupe',
        scope: 'troop',
        status: 'planned',
        participant_fee: 0,
      })
      .select()
      .single()

    // Create new meeting plan
    const newPlanPayload = {
      group_id: sourcePlan.group_id,
      troop_id: troopId,
      event_id: newEv ? newEv.id : null,
      title: title.trim(),
      theme: sourcePlan.theme || null,
      objectives: sourcePlan.objectives || null,
      meeting_date: targetDate,
      start_time: startTime,
      end_time: endTime,
      location: sourcePlan.location || 'Local du Groupe',
      schedule_blocks: sourcePlan.schedule_blocks || [],
      materials_checklist: sourcePlan.materials_checklist || [],
      is_published: true,
      created_by: user.id,
    }

    const { data: createdPlan, error: insertError } = await admin
      .from('meeting_plans')
      .insert(newPlanPayload)
      .select('*, troops(id, name), profiles:created_by(id, full_name)')
      .single()

    return NextResponse.json({
      success: true,
      plan: createdPlan || { id: newEv?.id || `temp-${Date.now()}`, ...newPlanPayload },
    })
  } catch (err: any) {
    console.error('[Meeting Planner DUPLICATE Error]:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
