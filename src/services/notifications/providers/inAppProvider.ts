import { createAdminClient } from '@/utils/supabase/admin'
import { NotificationProvider, RecipientProfile, NotificationPayload, ChannelResult } from '../types'

export const inAppProvider: NotificationProvider = {
  name: 'In-App Notification Provider',
  channel: 'in_app',

  async send(recipient: RecipientProfile, payload: NotificationPayload): Promise<ChannelResult> {
    try {
      const supabase = createAdminClient()
      const { error } = await supabase.from('leader_notifications').insert({
        profile_id: recipient.id,
        title: payload.title,
        message: payload.message,
        action_url: payload.actionUrl || null,
        category: payload.category || 'system',
        channels_dispatched: payload.channels || ['in_app'],
        is_read: false,
      })

      if (error) {
        // If table doesn't exist yet in remote instance, log gracefully
        console.warn('[InAppNotificationProvider] Supabase insert warning:', error.message)
        return { channel: 'in_app', success: false, error: error.message }
      }

      return { channel: 'in_app', success: true }
    } catch (err: any) {
      console.error('[InAppNotificationProvider] Error sending in-app notification:', err)
      return { channel: 'in_app', success: false, error: err.message || 'Internal in-app dispatch error' }
    }
  },
}
