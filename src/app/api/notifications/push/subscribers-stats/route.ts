import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminDb = createAdminClient()
    const { data: subs, error } = await adminDb
      .from('push_subscriptions')
      .select('id, user_id, updated_at')

    if (error) {
      console.warn('Could not read push_subscriptions:', error.message)
      return NextResponse.json({
        totalSubscriptions: 0,
        registeredUserSubscriptions: 0,
        guestSubscriptions: 0,
        activeUserIds: [],
        tableAvailable: false,
      })
    }

    const total = subs ? subs.length : 0
    const registered = (subs || []).filter((s) => s.user_id !== null).length
    const guest = total - registered
    const activeUserIds = Array.from(
      new Set((subs || []).map((s) => s.user_id).filter(Boolean))
    )

    return NextResponse.json({
      totalSubscriptions: total,
      registeredUserSubscriptions: registered,
      guestSubscriptions: guest,
      activeUserIds,
      tableAvailable: true,
    })
  } catch (err: any) {
    console.error('Error fetching subscriber stats:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to fetch subscriber stats' },
      { status: 500 }
    )
  }
}
