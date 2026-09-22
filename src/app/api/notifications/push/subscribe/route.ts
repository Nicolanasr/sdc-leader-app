import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { subscription, userAgent } = body

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Invalid subscription payload. Must include endpoint and keys.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const adminDb = createAdminClient()
    const { error } = await adminDb
      .from('push_subscriptions')
      .upsert(
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user_id: user?.id || null,
          user_agent: userAgent || req.headers.get('user-agent') || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      )

    if (error) {
      console.warn(
        'push_subscriptions table might not be created yet in Supabase:',
        error.message
      )
      return NextResponse.json({
        success: true,
        persisted: false,
        warning:
          'Subscription received, but Supabase table "push_subscriptions" has not been migrated yet.',
      })
    }

    return NextResponse.json({ success: true, persisted: true })
  } catch (err: any) {
    console.error('Error handling push subscription:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
