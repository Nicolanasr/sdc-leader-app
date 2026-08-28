import { NotificationProvider, RecipientProfile, NotificationPayload, ChannelResult } from '../types'

export const telegramProvider: NotificationProvider = {
  name: 'Telegram Notification Provider',
  channel: 'telegram',

  async send(recipient: RecipientProfile, payload: NotificationPayload): Promise<ChannelResult> {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN
      // Target chat: either leader's individual chat ID or central group alerts chat ID
      const chatId = (payload.metadata?.telegram_chat_id as string) || process.env.TELEGRAM_CHAT_ID

      if (!botToken || !chatId) {
        // Log formatted output for testing if not yet configured
        console.log(`[Telegram Notification Simulation] (Token/ChatId missing in .env):
To: ${recipient.fullName} (${recipient.email})
Title: ${payload.title}
Message: ${payload.message}`)
        return {
          channel: 'telegram',
          success: true,
          details: { simulated: true, note: 'Configure TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.local' },
        }
      }

      const portalBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.sdcsaintjeanmarc.org'
      const fullActionUrl = payload.actionUrl
        ? payload.actionUrl.startsWith('http')
          ? payload.actionUrl
          : `${portalBaseUrl}${payload.actionUrl}`
        : portalBaseUrl

      const htmlMessage = `⚜️ <b>Scouts des Cèdres — Leader Portal</b>
🔔 <b>${escapeHtml(payload.title)}</b>

Bonjour Chef <b>${escapeHtml(recipient.fullName)}</b>,

${escapeHtml(payload.message)}

${payload.actionUrl ? `👉 <a href="${fullActionUrl}">Open Portal Action</a>` : ''}`.trim()

      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: htmlMessage,
          parse_mode: 'HTML',
          disable_web_page_preview: false,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return {
          channel: 'telegram',
          success: false,
          error: errorData.description || 'Telegram API request failed',
        }
      }

      const resData = await response.json()
      return {
        channel: 'telegram',
        success: true,
        details: { messageId: resData.result?.message_id },
      }
    } catch (err: any) {
      return {
        channel: 'telegram',
        success: false,
        error: err?.message || 'Failed to dispatch Telegram message',
      }
    }
  },
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
