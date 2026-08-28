import { NotificationProvider, RecipientProfile, NotificationPayload, ChannelResult } from '../types'

export const emailProvider: NotificationProvider = {
  name: 'Email Notification Provider',
  channel: 'email',

  async send(recipient: RecipientProfile, payload: NotificationPayload): Promise<ChannelResult> {
    try {
      if (!recipient.email) {
        return { channel: 'email', success: false, error: 'Recipient has no email address' }
      }

      const portalBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.sdcsaintjeanmarc.org'
      const fullActionUrl = payload.actionUrl
        ? payload.actionUrl.startsWith('http')
          ? payload.actionUrl
          : `${portalBaseUrl}${payload.actionUrl}`
        : portalBaseUrl

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
    .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #0f766e; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
    .header p { margin: 4px 0 0 0; font-size: 12px; color: #ccfbf1; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
    .content { padding: 28px 24px; }
    .greeting { font-size: 15px; font-weight: 700; color: #334155; margin-bottom: 12px; }
    .message-title { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
    .message-body { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; white-space: pre-line; }
    .btn-wrap { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background-color: #0f766e; color: #ffffff !important; font-weight: 700; font-size: 13px; text-decoration: none; padding: 12px 28px; border-radius: 12px; }
    .footer { padding: 18px 24px; background: #f1f5f9; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>⚜️ Scouts des Cèdres</h1>
      <p>Leader Operational Portal • Saint Jean Marc</p>
    </div>
    <div class="content">
      <div class="greeting">Chers/Chères ${recipient.fullName || 'Chef'},</div>
      <div class="message-title">${payload.title}</div>
      <div class="message-body">${payload.message}</div>
      ${
        payload.actionUrl
          ? `<div class="btn-wrap"><a href="${fullActionUrl}" class="btn">View Details on Portal →</a></div>`
          : ''
      }
    </div>
    <div class="footer">
      Scouts des Cèdres Saint Jean Marc • Automatic Leader Alert<br/>
      If you have questions, please contact your Unit Leader or Chef de Groupe.
    </div>
  </div>
</body>
</html>
      `.trim()

      // Platform specific email dispatch logic (e.g. Resend, Sendgrid, Supabase SMTP, or Mock for dev)
      if (process.env.RESEND_API_KEY) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'Scouts des Cèdres <portal@sdcsaintjeanmarc.org>',
            to: [recipient.email],
            subject: `[SDC] ${payload.title}`,
            html: emailHtml,
          }),
        })

        if (!response.ok) {
          const errData = await response.json()
          console.warn('[EmailNotificationProvider] Resend API error:', errData)
          return { channel: 'email', success: false, error: errData.message || 'Resend API failed' }
        }
      } else {
        // Fallback logger in environments without external API key configured
        console.log(`[EmailNotificationProvider - Simulated] To: ${recipient.email} | Subject: ${payload.title}`)
      }

      return { channel: 'email', success: true }
    } catch (err: any) {
      console.error('[EmailNotificationProvider] Failed to dispatch email:', err)
      return { channel: 'email', success: false, error: err.message || 'Email dispatch failed' }
    }
  },
}
