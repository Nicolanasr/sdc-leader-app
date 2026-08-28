import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { sendNotification, sendBatchNotification, sendRoleNotification, NotificationPayload } from '@/services/notifications'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      recipientProfileId,
      recipientProfileIds,
      targetRole,
      groupId,
      payload,
    }: {
      recipientProfileId?: string
      recipientProfileIds?: string[]
      targetRole?: string
      groupId?: string
      payload: NotificationPayload
    } = body

    if (!payload || !payload.title || !payload.message) {
      return NextResponse.json(
        { error: 'Missing notification payload (title and message are required).' },
        { status: 400 }
      )
    }

    // 1. Target by Specific Role in Group
    if (targetRole && groupId) {
      const summary = await sendRoleNotification(groupId, targetRole, payload)
      return NextResponse.json({ success: true, count: summary.length, results: summary })
    }

    // 2. Target Batch of Profile IDs
    if (recipientProfileIds && recipientProfileIds.length > 0) {
      const summary = await sendBatchNotification(recipientProfileIds, payload)
      return NextResponse.json({ success: true, count: summary.length, results: summary })
    }

    // 3. Target Single Profile ID
    if (recipientProfileId) {
      const summary = await sendNotification(recipientProfileId, payload)
      return NextResponse.json({ success: true, result: summary })
    }

    return NextResponse.json(
      { error: 'No recipient profile, profile list, or role target specified.' },
      { status: 400 }
    )
  } catch (err: any) {
    console.error('[API /api/notifications/send] Error:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error while dispatching notification' },
      { status: 500 }
    )
  }
}
