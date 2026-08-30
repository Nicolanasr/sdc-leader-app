import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.app_metadata?.role !== 'configurator') {
      return NextResponse.json({ error: 'Unauthorized. Configurator only.' }, { status: 403 })
    }

    const body = await req.json()
    const { source_class_id, target_section_type_id, new_class_name } = body

    if (!source_class_id || !target_section_type_id) {
      return NextResponse.json(
        { error: 'Source Class ID and Target Section Type ID are required.' },
        { status: 400 }
      )
    }

    const adminDb = createAdminClient()

    // 1. Fetch Source Class & its Requirements
    const { data: sourceClass, error: classErr } = await adminDb
      .from('progression_classes')
      .select(`
        id,
        name,
        badge_icon,
        sort_order,
        class_type,
        progression_requirements (
          category,
          title,
          description,
          sort_order
        )
      `)
      .eq('id', source_class_id)
      .eq('is_deleted', false)
      .single()

    if (classErr || !sourceClass) {
      return NextResponse.json({ error: 'Source class not found.' }, { status: 404 })
    }

    // 2. Count existing classes in target section to set sort_order
    const { count: existingCount } = await adminDb
      .from('progression_classes')
      .select('id', { count: 'exact', head: true })
      .eq('section_type_id', target_section_type_id)
      .eq('is_deleted', false)

    // 3. Insert New Class in Target Section
    const className = new_class_name?.trim() || sourceClass.name
    const { data: newClass, error: insertClassErr } = await adminDb
      .from('progression_classes')
      .insert({
        section_type_id: target_section_type_id,
        name: className,
        badge_icon: sourceClass.badge_icon || '⚜️',
        class_type: sourceClass.class_type || 'rank',
        sort_order: (existingCount || 0),
      })
      .select()
      .single()

    if (insertClassErr || !newClass) {
      return NextResponse.json({ error: insertClassErr?.message || 'Failed to clone class.' }, { status: 500 })
    }

    // 4. Duplicate Requirements under the New Class
    const sourceReqs = sourceClass.progression_requirements || []
    if (sourceReqs.length > 0) {
      const reqInserts = sourceReqs.map((r: any) => ({
        class_id: newClass.id,
        category: r.category,
        title: r.title,
        description: r.description,
        sort_order: r.sort_order,
      }))

      const { error: insertReqsErr } = await adminDb
        .from('progression_requirements')
        .insert(reqInserts)

      if (insertReqsErr) {
        console.error('[Duplicate Requirements Error]:', insertReqsErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully cloned "${className}" with ${sourceReqs.length} requirements.`,
      newClassId: newClass.id,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
