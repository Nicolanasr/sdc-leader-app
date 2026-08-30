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
    const { class_id, category, title, description, sort_order } = body

    if (!class_id || !category?.trim() || !title?.trim()) {
      return NextResponse.json(
        { error: 'Class ID, Category, and Title are required.' },
        { status: 400 }
      )
    }

    const adminDb = createAdminClient()
    const { data, error } = await adminDb
      .from('progression_requirements')
      .insert({
        class_id,
        category: category.trim(),
        title: title.trim(),
        description: description?.trim() || null,
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
    const { id, category, title, description, sort_order } = body

    if (!id || !category?.trim() || !title?.trim()) {
      return NextResponse.json(
        { error: 'Requirement ID, Category, and Title are required.' },
        { status: 400 }
      )
    }

    const adminDb = createAdminClient()
    const { data, error } = await adminDb
      .from('progression_requirements')
      .update({
        category: category.trim(),
        title: title.trim(),
        description: description?.trim() || null,
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
      return NextResponse.json({ error: 'Requirement ID is required.' }, { status: 400 })
    }

    const adminDb = createAdminClient()
    const { error } = await adminDb
      .from('progression_requirements')
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
