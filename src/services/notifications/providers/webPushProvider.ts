import webpush from 'web-push'
import {
  ChannelResult,
  NotificationPayload,
  NotificationProvider,
  RecipientProfile,
} from '../types'
import { createAdminClient } from '@/utils/supabase/admin'

export class WebPushProvider implements NotificationProvider {
  name = 'WebPushProvider'
  channel = 'web_push' as const

  private configured = false

  private init() {
    if (this.configured) return
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@sdcsaintjeanmarc.org'

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey)
      this.configured = true
    }
  }

  async send(recipient: RecipientProfile, payload: NotificationPayload): Promise<ChannelResult> {
    try {
      this.init()
      if (!this.configured) {
        return {
          channel: this.channel,
          success: false,
          error: 'VAPID keys not configured in environment',
        }
      }

      const adminDb = createAdminClient()
      const { data: subscriptions } = await adminDb
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', recipient.id)

      if (!subscriptions || subscriptions.length === 0) {
        return {
          channel: this.channel,
          success: false,
          error: 'Recipient has no registered Web Push subscriptions',
        }
      }

      const pushPayload = JSON.stringify({
        title: payload.title,
        body: payload.message,
        icon: '/android-chrome-192x192.png',
        badge: '/android-chrome-192x192.png',
        url: payload.actionUrl || '/group/dashboard',
        tag: `sdc-${payload.category || 'alert'}-${Date.now()}`,
        data: payload.metadata || {},
      })

      let successCount = 0
      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            pushPayload
          )
          successCount++
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await adminDb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          }
        }
      }

      return {
        channel: this.channel,
        success: successCount > 0,
        details: { sent: successCount, total: subscriptions.length },
      }
    } catch (err: any) {
      return {
        channel: this.channel,
        success: false,
        error: err.message || 'Web push delivery failed',
      }
    }
  }
}
