import { createAdminClient } from '@/utils/supabase/admin'
import {
  NotificationChannel,
  NotificationPayload,
  RecipientProfile,
  NotificationDeliverySummary,
  ChannelResult,
  NotificationProvider,
} from './types'
import { inAppProvider } from './providers/inAppProvider'
import { emailProvider } from './providers/emailProvider'
import { whatsappProvider } from './providers/whatsappProvider'
import { smsProvider } from './providers/smsProvider'

// Provider Registry
const providers: Record<NotificationChannel, NotificationProvider> = {
  in_app: inAppProvider,
  email: emailProvider,
  whatsapp: whatsappProvider,
  sms: smsProvider,
}

/**
 * Fetch leader profile details for notification dispatch
 */
async function fetchRecipientProfile(profileId: string): Promise<RecipientProfile | null> {
  try {
    const supabase = createAdminClient()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone_number, whatsapp_number, rank')
      .eq('id', profileId)
      .single()

    if (error || !profile) {
      console.warn(`[NotificationService] Profile not found for ID: ${profileId}`)
      return null
    }

    return {
      id: profile.id,
      fullName: profile.full_name || 'Leader',
      email: profile.email,
      phoneNumber: profile.phone_number,
      whatsappNumber: profile.whatsapp_number,
      rank: profile.rank,
    }
  } catch (err) {
    console.error(`[NotificationService] Error fetching profile ${profileId}:`, err)
    return null
  }
}

/**
 * Send a notification to a specific leader profile across multiple dynamic channels.
 */
export async function sendNotification(
  profileId: string,
  payload: NotificationPayload
): Promise<NotificationDeliverySummary | null> {
  const recipient = await fetchRecipientProfile(profileId)
  if (!recipient) {
    return null
  }

  // Default channels if not explicitly overridden
  const activeChannels: NotificationChannel[] = payload.channels && payload.channels.length > 0
    ? payload.channels
    : ['in_app', 'email', 'whatsapp']

  const channelPromises = activeChannels.map(async (channel): Promise<ChannelResult> => {
    const provider = providers[channel]
    if (!provider) {
      return { channel, success: false, error: `Provider for channel ${channel} not found` }
    }

    try {
      return await provider.send(recipient, payload)
    } catch (err: any) {
      return { channel, success: false, error: err.message || `Failed in ${channel} provider` }
    }
  })

  const results = await Promise.allSettled(channelPromises)
  const channelResults: ChannelResult[] = results.map((r, idx) => {
    if (r.status === 'fulfilled') {
      return r.value
    }
    return {
      channel: activeChannels[idx],
      success: false,
      error: r.reason?.message || 'Unknown channel failure',
    }
  })

  return {
    recipientId: recipient.id,
    recipientName: recipient.fullName,
    channels: channelResults,
  }
}

/**
 * Send batch notifications to multiple leader profiles.
 */
export async function sendBatchNotification(
  profileIds: string[],
  payload: NotificationPayload
): Promise<NotificationDeliverySummary[]> {
  const uniqueIds = Array.from(new Set(profileIds.filter(Boolean)))
  const promises = uniqueIds.map((id) => sendNotification(id, payload))
  const results = await Promise.all(promises)
  return results.filter((r): r is NotificationDeliverySummary => r !== null)
}

/**
 * Send notification to all leaders holding a specific role in a group.
 * Example role names: 'amin_sandou2_group', 'amin_tejhizet_group', 'mas2oul_mounet', 'chef_groupe', 'assistant_chef_groupe'
 */
export async function sendRoleNotification(
  groupId: string,
  roleName: string,
  payload: NotificationPayload
): Promise<NotificationDeliverySummary[]> {
  try {
    const supabase = createAdminClient()
    const { data: userRoles, error } = await supabase
      .from('user_roles')
      .select('profile_id, roles!inner(name)')
      .eq('group_id', groupId)
      .eq('roles.name', roleName)

    if (error || !userRoles || userRoles.length === 0) {
      console.warn(`[NotificationService] No leaders found for role '${roleName}' in group ${groupId}`)
      return []
    }

    const profileIds = userRoles.map((ur: any) => ur.profile_id)
    return await sendBatchNotification(profileIds, payload)
  } catch (err) {
    console.error(`[NotificationService] Failed to send role notification for ${roleName}:`, err)
    return []
  }
}

export * from './types'
