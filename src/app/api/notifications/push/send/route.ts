import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@sdcsaintjeanmarc.org'

  if (!publicKey || !privateKey) {
    throw new Error('VAPID public and private keys must be defined in environment.')
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
}

export async function POST(req: NextRequest) {
  try {
    configureWebPush()

    const supabase = await createClient()
    const {
      data: { user: callerUser },
    } = await supabase.auth.getUser()

    // Enforce authentication for sending notifications
    if (!callerUser) {
      return NextResponse.json(
        { error: 'Unauthorized. You must be signed in to send push notifications.' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const {
      target = 'all', // 'all' | 'users'
      userIds = [],
      userId,
      subscription,
      title = 'Scouts des Cèdres • Saint Jean Marc',
      message = 'Notification from Scouts des Cèdres',
      url = '/group/dashboard',
      delaySeconds = 0,
    } = body

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Notification title and message are required.' },
        { status: 400 }
      )
    }

    // Delay dispatch if requested
    if (delaySeconds && delaySeconds > 0) {
      const waitMs = Math.min(delaySeconds * 1000, 30000)
      await new Promise((resolve) => setTimeout(resolve, waitMs))
    }

    const payload = JSON.stringify({
      title,
      body: message,
      icon: '/android-chrome-192x192.png',
      badge: '/android-chrome-192x192.png',
      url,
      tag: `sdc-alert-${Date.now()}`,
    })

    const adminDb = createAdminClient()
    type PushTarget = { endpoint: string; p256dh: string; auth: string; user_id?: string | null }
    let targets: PushTarget[] = []

    if (subscription && subscription.endpoint && subscription.keys) {
      // Direct subscription test mode
      targets = [
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      ]
    } else if (target === 'all') {
      // Broadcast to all active devices (including guest subscriptions)
      const { data, error } = await adminDb
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth, user_id')

      if (error) {
        console.warn('Error querying push_subscriptions:', error.message)
      }
      targets = data || []
    } else {
      // Targeted to specific users
      const effectiveUserIds: string[] = Array.isArray(userIds) && userIds.length > 0
        ? userIds
        : userId
        ? [userId]
        : []

      if (effectiveUserIds.length === 0) {
        return NextResponse.json(
          { error: 'Please select at least one recipient user.' },
          { status: 400 }
        )
      }

      const { data, error } = await adminDb
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth, user_id')
        .in('user_id', effectiveUserIds)

      if (error) {
        console.warn('Error querying push_subscriptions for users:', error.message)
      }
      targets = data || []
    }

    if (targets.length === 0) {
      return NextResponse.json({
        success: false,
        total: 0,
        delivered: 0,
        message: 'No active device subscriptions found for the selected audience.',
      })
    }

    // Send notifications concurrently
    const dispatchPromises = targets.map(async (t) => {
      const pushSub = {
        endpoint: t.endpoint,
        keys: {
          p256dh: t.p256dh,
          auth: t.auth,
        },
      }

      try {
        await webpush.sendNotification(pushSub, payload)
        return { endpoint: t.endpoint, success: true }
      } catch (err: any) {
        // If expired or gone (410, 404), remove from database
        if (err.statusCode === 410 || err.statusCode === 404) {
          adminDb.from('push_subscriptions').delete().eq('endpoint', t.endpoint).then()
        }
        return {
          endpoint: t.endpoint,
          success: false,
          error: err.message || 'Push delivery failed',
          statusCode: err.statusCode,
        }
      }
    })

    const results = await Promise.all(dispatchPromises)
    const deliveredCount = results.filter((r) => r.success).length

    // Audit logging to push_notifications_log (gracefully catch if table not yet migrated)
    try {
      const targetUserIds = target === 'all' ? null : (userIds.length > 0 ? userIds : userId ? [userId] : null)
      await adminDb.from('push_notifications_log').insert({
        title,
        body: message,
        url,
        target_type: target,
        target_user_ids: targetUserIds,
        total_attempted: targets.length,
        total_delivered: deliveredCount,
        sent_by: callerUser.id,
      })
    } catch (logErr: any) {
      console.warn('Could not write to push_notifications_log:', logErr.message)
    }

    return NextResponse.json({
      success: deliveredCount > 0,
      delivered: deliveredCount,
      total: targets.length,
      details: results,
    })
  } catch (err: any) {
    console.error('Web push dispatch error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to dispatch push notifications' },
      { status: 500 }
    )
  }
}

