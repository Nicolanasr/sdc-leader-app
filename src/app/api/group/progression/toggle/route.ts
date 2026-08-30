import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentRole = user.app_metadata?.role
    const groupId = user.app_metadata?.group_id
    const userTroopId = user.app_metadata?.troop_id

    const body = await req.json()
    const { member_id, requirement_id, is_completed } = body

    if (!member_id || !requirement_id) {
      return NextResponse.json({ error: 'Member ID and Requirement ID are required.' }, { status: 400 })
    }

    const adminDb = createAdminClient()

    // Verify member belongs to group (and troop if troop leader)
    const { data: memberData, error: memErr } = await adminDb
      .from('members')
      .select('id, group_id, troop_id, first_name, last_name')
      .eq('id', member_id)
      .single()

    if (memErr || !memberData || (currentRole !== 'configurator' && memberData.group_id !== groupId)) {
      return NextResponse.json({ error: 'Member not found or access denied.' }, { status: 404 })
    }

    if (currentRole === 'chef_troupe' && userTroopId && memberData.troop_id !== userTroopId) {
      return NextResponse.json({ error: 'Access restricted to your troop members.' }, { status: 403 })
    }

    if (is_completed) {
      // Insert or upsert completion record
      const { data: record, error: recordErr } = await adminDb
        .from('member_progression_records')
        .upsert(
          {
            member_id,
            requirement_id,
            completed_at: new Date().toISOString(),
            validated_by: user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'member_id,requirement_id' }
        )
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
        .single()

      if (recordErr) {
        return NextResponse.json({ error: recordErr.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, completed: true, record })
    } else {
      // Remove completion record
      const { error: delErr } = await adminDb
        .from('member_progression_records')
        .delete()
        .eq('member_id', member_id)
        .eq('requirement_id', requirement_id)

      if (delErr) {
        return NextResponse.json({ error: delErr.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, completed: false })
    }
  } catch (err: any) {
    console.error('[Progression Toggle API Error]:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
