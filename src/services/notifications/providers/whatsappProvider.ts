import { NotificationProvider, RecipientProfile, NotificationPayload, ChannelResult } from '../types'

function normalizePhoneNumber(rawNumber: string): string {
  // Strip all non-digit characters
  let digits = rawNumber.replace(/\D/g, '')

  if (digits.startsWith('00961')) {
    digits = digits.slice(2)
  }
  if (digits.startsWith('961')) {
    return digits
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1)
  }
  // If 7 or 8 digits (Lebanese local number), prefix with 961
  if (digits.length <= 8) {
    return '961' + digits
  }
  return digits
}

export const whatsappProvider: NotificationProvider = {
  name: 'WhatsApp Notification Provider',
  channel: 'whatsapp',

  async send(recipient: RecipientProfile, payload: NotificationPayload): Promise<ChannelResult> {
    try {
      const rawNumber = recipient.whatsappNumber || recipient.phoneNumber
      if (!rawNumber) {
        return { channel: 'whatsapp', success: false, error: 'Recipient has no WhatsApp or phone number registered' }
      }

      const formattedNumber = normalizePhoneNumber(rawNumber)
      if (formattedNumber.length < 8) {
        console.warn(`[WhatsAppNotificationProvider] Invalid phone number for ${recipient.fullName}: ${rawNumber}`)
        return { channel: 'whatsapp', success: false, error: `Invalid phone number: ${rawNumber}` }
      }

      const portalBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.sdcsaintjeanmarc.org'
      const fullActionUrl = payload.actionUrl
        ? payload.actionUrl.startsWith('http')
          ? payload.actionUrl
          : `${portalBaseUrl}${payload.actionUrl}`
        : portalBaseUrl

      const whatsappText = `⚜️ *Scouts des Cèdres Saint Jean Marc*
🔔 *${payload.title}*

Bonjour Chef *${recipient.fullName}*,

${payload.message}

${payload.actionUrl ? `🔗 *Open in Portal:* ${fullActionUrl}` : ''}

_Scouts des Cèdres Leader Portal_`.trim()

      console.log(`[WhatsAppNotificationProvider] Sending to ${recipient.fullName} (${formattedNumber})...`)

      // 1. Evolution API / Self-Hosted Webhook Gateway
      if (process.env.WHATSAPP_WEBHOOK_URL) {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }
        if (process.env.WHATSAPP_API_TOKEN) {
          headers['apikey'] = process.env.WHATSAPP_API_TOKEN
          headers['Authorization'] = `Bearer ${process.env.WHATSAPP_API_TOKEN}`
        }

        const response = await fetch(process.env.WHATSAPP_WEBHOOK_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            number: formattedNumber,
            text: whatsappText,
          }),
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          console.warn('[WhatsAppNotificationProvider] Webhook error response:', JSON.stringify(errData))
          return { channel: 'whatsapp', success: false, error: JSON.stringify(errData) || 'WhatsApp webhook request failed' }
        }

        console.log(`[WhatsAppNotificationProvider] Successfully delivered to ${formattedNumber}`)
        return {
          channel: 'whatsapp',
          success: true,
          details: { phone: formattedNumber },
        }
      } else if (process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
        // 2. Official Meta WhatsApp Cloud API
        const response = await fetch(
          `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: formattedNumber,
              type: 'text',
              text: { body: whatsappText },
            }),
          }
        )

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          console.warn('[WhatsAppNotificationProvider] Meta API error:', errData)
          return { channel: 'whatsapp', success: false, error: errData?.error?.message || 'WhatsApp API failed' }
        }

        return {
          channel: 'whatsapp',
          success: true,
          details: { phone: formattedNumber },
        }
      } else {
        // 3. Simulated logging when API keys are not yet configured
        console.log(`[WhatsAppNotificationProvider - Simulated] To: ${formattedNumber}\n${whatsappText}`)
        return {
          channel: 'whatsapp',
          success: true,
          details: { phone: formattedNumber, simulated: true },
        }
      }
    } catch (err: any) {
      console.error('[WhatsAppNotificationProvider] Failed to dispatch WhatsApp message:', err)
      return { channel: 'whatsapp', success: false, error: err.message || 'WhatsApp dispatch failed' }
    }
  },
}
