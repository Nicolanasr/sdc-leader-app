import { NotificationPayload } from '@/services/notifications/types'

/**
 * Dispatch a notification from client components without blocking UI operations.
 */
export async function triggerNotification(
  recipientProfileId: string,
  payload: NotificationPayload
): Promise<void> {
  try {
    fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientProfileId, payload }),
    }).catch((err) => console.warn('[ClientNotification] Failed to send:', err))
  } catch (err) {
    console.warn('[ClientNotification] Trigger error:', err)
  }
}

/**
 * Dispatch batch notifications to multiple leader profiles.
 */
export async function triggerBatchNotification(
  recipientProfileIds: string[],
  payload: NotificationPayload
): Promise<void> {
  try {
    fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientProfileIds, payload }),
    }).catch((err) => console.warn('[ClientNotification] Failed batch send:', err))
  } catch (err) {
    console.warn('[ClientNotification] Batch trigger error:', err)
  }
}

/**
 * Dispatch notification to all leaders holding a specific role in the group.
 * Example role names: 'amin_sandou2_group', 'amin_tejhizet_group', 'mas2oul_mounet', 'chef_groupe', 'assistant_chef_groupe'
 */
export async function triggerRoleNotification(
  groupId: string,
  targetRole: string,
  payload: NotificationPayload
): Promise<void> {
  try {
    fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, targetRole, payload }),
    }).catch((err) => console.warn('[ClientNotification] Failed role send:', err))
  } catch (err) {
    console.warn('[ClientNotification] Role trigger error:', err)
  }
}
