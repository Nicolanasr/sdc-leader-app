import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
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

    const body = await req.json()
    const {
      subscription,
      userId,
      title = 'Scouts des Cèdres • Saint Jean Marc',
      message = 'Test background notification arrived successfully! ⚜️🌲',
      url = '/group/dashboard',
      delaySeconds = 0,
    } = body

    // Delay dispatch if requested (useful for testing background receipt with app closed)
    if (delaySeconds && delaySeconds > 0) {
      const waitMs = Math.min(delaySeconds * 1000, 30000) // max 30s
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

    const results: Array<{ endpoint: string; success: boolean; error?: string }> = []

    // 1. Direct subscription passed (instant test bench mode)
    if (subscription && subscription.endpoint) {
      try {
        await webpush.sendNotification(subscription, payload)
        results.push({ endpoint: subscription.endpoint, success: true })
      } catch (err: any) {
        console.error('Failed to send push to provided subscription:', err)
        results.push({
          endpoint: subscription.endpoint,
          success: false,
          error: err.message || 'Push service rejected notification',
        })
      }
    }

    // 2. Or send to all active subscriptions of a target user from DB
    if (userId) {
      const adminDb = createAdminClient()
      const { data: dbSubs } = await adminDb
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', userId)

      if (dbSubs && dbSubs.length > 0) {
        for (const sub of dbSubs) {
          const pushSub = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          }
          try {
            await webpush.sendNotification(pushSub, payload)
            results.push({ endpoint: sub.endpoint, success: true })
          } catch (err: any) {
            console.error('Push send failed for endpoint:', sub.endpoint, err)
            results.push({ endpoint: sub.endpoint, success: false, error: err.message })

            // If subscription is expired/unsubscribed (HTTP 410 or 404), clean it up
            if (err.statusCode === 410 || err.statusCode === 404) {
              await adminDb
                .from('push_subscriptions')
                .delete()
                .eq('endpoint', sub.endpoint)
            }
          }
        }
      }
    }

    if (results.length === 0) {
      return NextResponse.json(
        {
          error:
            'No valid target subscription or user found. Provide a "subscription" object or "userId".',
        },
        { status: 400 }
      )
    }

    const successfulCount = results.filter((r) => r.success).length

    return NextResponse.json({
      success: successfulCount > 0,
      delivered: successfulCount,
      total: results.length,
      details: results,
    })
  } catch (err: any) {
    console.error('Web push send error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to dispatch push notification' },
      { status: 500 }
    )
  }
}
