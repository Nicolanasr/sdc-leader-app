import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const sectionTypeId = searchParams.get('sectionTypeId')

    const adminDb = createAdminClient()
    let query = adminDb
      .from('progression_classes')
      .select(`
        id,
        section_type_id,
        name,
        badge_icon,
        sort_order,
        created_at,
        progression_requirements (
          id,
          class_id,
          category,
          title,
          description,
          sort_order
        )
      `)
      .eq('is_deleted', false)
      .order('sort_order', { ascending: true })

    if (sectionTypeId) {
      query = query.eq('section_type_id', sectionTypeId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ classes: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

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
    const { section_type_id, name, badge_icon, sort_order } = body

    if (!section_type_id || !name?.trim()) {
      return NextResponse.json({ error: 'Section Type and Class Name are required.' }, { status: 400 })
    }

    const adminDb = createAdminClient()
    const { data, error } = await adminDb
      .from('progression_classes')
      .insert({
        section_type_id,
        name: name.trim(),
        badge_icon: badge_icon || '⚜️',
        sort_order: sort_order || 0,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, item: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.app_metadata?.role !== 'configurator') {
      return NextResponse.json({ error: 'Unauthorized. Configurator only.' }, { status: 403 })
    }

    const body = await req.json()
    const { id, name, badge_icon, sort_order } = body

    if (!id || !name?.trim()) {
      return NextResponse.json({ error: 'Class ID and Name are required.' }, { status: 400 })
    }

    const adminDb = createAdminClient()
    const { data, error } = await adminDb
      .from('progression_classes')
      .update({
        name: name.trim(),
        badge_icon: badge_icon || '⚜️',
        sort_order: sort_order ?? 0,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, item: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.app_metadata?.role !== 'configurator') {
      return NextResponse.json({ error: 'Unauthorized. Configurator only.' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Class ID is required.' }, { status: 400 })
    }

    const adminDb = createAdminClient()
    const { error } = await adminDb
      .from('progression_classes')
      .update({ is_deleted: true })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
