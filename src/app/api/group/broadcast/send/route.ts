import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendNotification, sendBatchNotification, NotificationPayload } from '@/services/notifications'
import { telegramProvider } from '@/services/notifications/providers/telegramProvider'

function normalizePhoneNumber(rawNumber: string): string {
  let digits = rawNumber.replace(/\D/g, '')
  if (digits.startsWith('00961')) digits = digits.slice(2)
  if (digits.startsWith('961')) return digits
  if (digits.startsWith('0')) digits = digits.slice(1)
  if (digits.length <= 8) return '961' + digits
  return digits
}

async function sendEvolutionWhatsApp(target: string, text: string): Promise<{ success: boolean; error?: string }> {
  const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL
  const apiKey = process.env.WHATSAPP_API_TOKEN

  if (!webhookUrl) {
    console.log(`[WhatsApp Broadcast - Simulated] To: ${target}\n${text}`)
    return { success: true }
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (apiKey) {
      headers['apikey'] = apiKey
      headers['Authorization'] = `Bearer ${apiKey}`
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        number: target,
        text,
      }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      return { success: false, error: errData?.response?.message || 'Evolution API request failed' }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to connect to WhatsApp Gateway' }
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 })
    }

    const currentRole = user.app_metadata?.role
    const groupId = user.app_metadata?.group_id

    const allowedRoles = ['chef_groupe', 'assistant_chef_groupe', 'configurator']
    if (!allowedRoles.includes(currentRole)) {
      return NextResponse.json(
        { error: 'Forbidden. Broadcast access is restricted to Group Leaders.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const {
      targetAudience, // 'individual_leaders' | 'leaders_group' | 'parents_group' | 'all_parents'
      recipientProfileIds,
      groupJid,
      payload,
      channels = ['whatsapp', 'telegram', 'in_app'],
    }: {
      targetAudience: 'individual_leaders' | 'leaders_group' | 'parents_group' | 'all_parents'
      recipientProfileIds?: string[]
      groupJid?: string
      payload: NotificationPayload
      channels?: ('whatsapp' | 'telegram' | 'in_app')[]
    } = body

    if (!payload || !payload.title || !payload.message) {
      return NextResponse.json({ error: 'Title and message are required.' }, { status: 400 })
    }

    const portalBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.sdcsaintjeanmarc.org'
    const fullActionUrl = payload.actionUrl
      ? payload.actionUrl.startsWith('http')
        ? payload.actionUrl
        : `${portalBaseUrl}${payload.actionUrl}`
      : portalBaseUrl

    const formattedBroadcastText = `⚜️ *Scouts des Cèdres Saint Jean Marc*
📢 *${payload.title}*

${payload.message}

${payload.actionUrl ? `🔗 *Open Link / Action:* ${fullActionUrl}` : ''}

_Scouts des Cèdres Leader Portal_`.trim()

    let totalSent = 0
    let totalFailed = 0
    const errors: string[] = []

    const adminDb = createAdminClient()

    // ── AUDIENCE 1: INDIVIDUAL LEADERS (1-by-1 or Multi-Select) ──
    if (targetAudience === 'individual_leaders') {
      if (!recipientProfileIds || recipientProfileIds.length === 0) {
        return NextResponse.json({ error: 'Please select at least one leader.' }, { status: 400 })
      }

      const summaries = await sendBatchNotification(recipientProfileIds, {
        ...payload,
        channels: channels.includes('whatsapp') ? ['whatsapp', 'telegram', 'in_app'] : ['telegram', 'in_app'],
      })

      totalSent = summaries.length
      totalFailed = recipientProfileIds.length - summaries.length
    }

    // ── AUDIENCE 2: OFFICIAL LEADERS WHATSAPP GROUP ──
    else if (targetAudience === 'leaders_group') {
      const targetJid = groupJid || process.env.WHATSAPP_LEADERS_GROUP_JID || process.env.TELEGRAM_CHAT_ID

      if (channels.includes('whatsapp') && targetJid) {
        const res = await sendEvolutionWhatsApp(targetJid, formattedBroadcastText)
        if (res.success) totalSent++
        else {
          totalFailed++
          errors.push(res.error || 'Failed to send to Leaders WhatsApp Group')
        }
      }

      if (channels.includes('telegram')) {
        await telegramProvider.send(
          { id: 'leaders_group_broadcast', fullName: 'Leaders Group', email: '' },
          payload
        )
      }
    }

    // ── AUDIENCE 3: OFFICIAL PARENTS WHATSAPP GROUP ──
    else if (targetAudience === 'parents_group') {
      const targetJid = groupJid || process.env.WHATSAPP_PARENTS_GROUP_JID

      if (!targetJid) {
        return NextResponse.json(
          { error: 'No Parents WhatsApp Group JID provided or configured in environment.' },
          { status: 400 }
        )
      }

      const res = await sendEvolutionWhatsApp(targetJid, formattedBroadcastText)
      if (res.success) totalSent++
      else {
        totalFailed++
        errors.push(res.error || 'Failed to send to Parents WhatsApp Group')
      }
    }

    // ── AUDIENCE 4: DIRECT BATCH TO ALL ACTIVE PARENTS ──
    else if (targetAudience === 'all_parents') {
      const { data: activeMembers, error: membersError } = await adminDb
        .from('members')
        .select('id, first_name, last_name, emergency_contact_name, emergency_contact_phone')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .eq('is_deleted', false)

      if (membersError || !activeMembers || activeMembers.length === 0) {
        return NextResponse.json({ error: 'No active scout members found with parent emergency contacts.' }, { status: 400 })
      }

      // De-duplicate parent phone numbers
      const phoneToScoutsMap = new Map<string, string[]>()
      for (const m of activeMembers) {
        if (!m.emergency_contact_phone) continue
        const normPhone = normalizePhoneNumber(m.emergency_contact_phone)
        const scoutName = `${m.first_name} ${m.last_name}`
        const existing = phoneToScoutsMap.get(normPhone) || []
        existing.push(scoutName)
        phoneToScoutsMap.set(normPhone, existing)
      }

      for (const [phone, scouts] of Array.from(phoneToScoutsMap.entries())) {
        const parentPersonalizedText = `⚜️ *Scouts des Cèdres Saint Jean Marc*
📢 *${payload.title}*

Chers Parents de *${scouts.join(', ')}*,

${payload.message}

${payload.actionUrl ? `🔗 *Details / Form:* ${fullActionUrl}` : ''}

_Scouts des Cèdres Commandement du Groupe_`.trim()

        const res = await sendEvolutionWhatsApp(phone, parentPersonalizedText)
        if (res.success) {
          totalSent++
        } else {
          totalFailed++
          errors.push(`Failed for ${phone}: ${res.error}`)
        }
      }
    }

    // Log the broadcast in leader_notifications for archive
    try {
      await adminDb.from('leader_notifications').insert({
        profile_id: user.id,
        title: `[Broadcast] ${payload.title}`,
        message: `Audience: ${targetAudience} | Sent: ${totalSent} | Failed: ${totalFailed}\n\n${payload.message}`,
        action_url: payload.actionUrl || null,
        category: 'system',
        channels_dispatched: channels,
        is_read: true,
      })
    } catch (logErr) {
      console.warn('[Broadcast API] Failed to insert broadcast log:', logErr)
    }

    return NextResponse.json({
      success: true,
      targetAudience,
      totalSent,
      totalFailed,
      errors: errors.slice(0, 5),
    })
  } catch (err: any) {
    console.error('[Broadcast API] Error:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error while sending broadcast' },
      { status: 500 }
    )
  }
}
