export type NotificationChannel = 'in_app' | 'email' | 'whatsapp' | 'sms' | 'telegram'

export type NotificationCategory =
  | 'events'
  | 'inventory'
  | 'pantry'
  | 'treasury'
  | 'attendance'
  | 'members'
  | 'leaders'
  | 'system'

export interface RecipientProfile {
  id: string
  fullName: string
  email: string
  phoneNumber?: string | null
  whatsappNumber?: string | null
  rank?: string | null
}

export interface NotificationPayload {
  title: string
  message: string
  actionUrl?: string
  category?: NotificationCategory
  channels?: NotificationChannel[]
  metadata?: Record<string, any>
}

export interface ChannelResult {
  channel: NotificationChannel
  success: boolean
  error?: string
  details?: any
}

export interface NotificationDeliverySummary {
  recipientId: string
  recipientName: string
  channels: ChannelResult[]
}

export interface NotificationProvider {
  name: string
  channel: NotificationChannel
  send(recipient: RecipientProfile, payload: NotificationPayload): Promise<ChannelResult>
}
