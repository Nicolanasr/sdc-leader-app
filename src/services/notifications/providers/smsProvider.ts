import { NotificationProvider, RecipientProfile, NotificationPayload, ChannelResult } from '../types'

export const smsProvider: NotificationProvider = {
  name: 'SMS Notification Provider',
  channel: 'sms',

  async send(recipient: RecipientProfile, payload: NotificationPayload): Promise<ChannelResult> {
    try {
      const rawNumber = recipient.phoneNumber || recipient.whatsappNumber
      if (!rawNumber) {
        return { channel: 'sms', success: false, error: 'Recipient has no mobile phone number registered' }
      }

      let sanitizedNumber = rawNumber.replace(/[^\d+]/g, '')
      if (sanitizedNumber.startsWith('0')) {
        sanitizedNumber = '+961' + sanitizedNumber.slice(1)
      } else if (!sanitizedNumber.startsWith('+')) {
        sanitizedNumber = '+961' + sanitizedNumber
      }

      const smsBody = `[SDC Scouts] ${payload.title}: ${payload.message}`.slice(0, 160)

      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
        const authHeader = Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString('base64')

        const params = new URLSearchParams()
        params.append('To', sanitizedNumber)
        params.append('From', process.env.TWILIO_PHONE_NUMBER)
        params.append('Body', smsBody)

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${authHeader}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
          }
        )

        if (!response.ok) {
          const errData = await response.json()
          console.warn('[SMSNotificationProvider] Twilio API error:', errData)
          return { channel: 'sms', success: false, error: errData?.message || 'Twilio SMS failed' }
        }
      } else {
        console.log(`[SMSNotificationProvider - Simulated] To: ${sanitizedNumber} | Text: ${smsBody}`)
      }

      return { channel: 'sms', success: true }
    } catch (err: any) {
      console.error('[SMSNotificationProvider] Failed to dispatch SMS:', err)
      return { channel: 'sms', success: false, error: err.message || 'SMS dispatch failed' }
    }
  },
}
