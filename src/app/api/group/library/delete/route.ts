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

    const allowedRoles = ['chef_groupe', 'assistant_chef_groupe', 'amin_serr_group', 'configurator']
    if (!allowedRoles.includes(currentRole)) {
      return NextResponse.json({ error: 'Forbidden. Delete access restricted to Group Leaders and Secretary.' }, { status: 403 })
    }

    const { itemId } = await req.json()
    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required.' }, { status: 400 })
    }

    const adminDb = createAdminClient()
    const { error } = await adminDb
      .from('group_archive_items')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .eq('group_id', groupId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to delete archive item.' }, { status: 500 })
  }
}
