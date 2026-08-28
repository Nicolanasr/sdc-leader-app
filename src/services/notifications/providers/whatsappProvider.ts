import { NotificationProvider, RecipientProfile, NotificationPayload, ChannelResult } from '../types'

export const whatsappProvider: NotificationProvider = {
  name: 'WhatsApp Notification Provider',
  channel: 'whatsapp',

  async send(recipient: RecipientProfile, payload: NotificationPayload): Promise<ChannelResult> {
    try {
      const rawNumber = recipient.whatsappNumber || recipient.phoneNumber
      if (!rawNumber) {
        return { channel: 'whatsapp', success: false, error: 'Recipient has no WhatsApp or phone number registered' }
      }

      // Clean and normalize Lebanese / International phone format (e.g. +961...)
      let sanitizedNumber = rawNumber.replace(/[^\d+]/g, '')
      if (sanitizedNumber.startsWith('0')) {
        sanitizedNumber = '+961' + sanitizedNumber.slice(1)
      } else if (!sanitizedNumber.startsWith('+')) {
        sanitizedNumber = '+961' + sanitizedNumber
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
            number: sanitizedNumber.replace('+', ''),
            text: whatsappText,
          }),
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          console.warn('[WhatsAppNotificationProvider] Webhook error:', errData)
          return { channel: 'whatsapp', success: false, error: errData?.response?.message || 'WhatsApp webhook request failed' }
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
              to: sanitizedNumber.replace('+', ''),
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
      } else {
        // 3. Simulated logging when API keys are not yet configured
        console.log(`[WhatsAppNotificationProvider - Simulated] To: ${sanitizedNumber}\n${whatsappText}`)
      }

      return {
        channel: 'whatsapp',
        success: true,
        details: { phone: sanitizedNumber },
      }
    } catch (err: any) {
      console.error('[WhatsAppNotificationProvider] Failed to dispatch WhatsApp message:', err)
      return { channel: 'whatsapp', success: false, error: err.message || 'WhatsApp dispatch failed' }
    }
  },
}
