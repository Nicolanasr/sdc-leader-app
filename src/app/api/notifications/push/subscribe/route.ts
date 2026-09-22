import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { subscription, userAgent, userId: explicitUserId } = body

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

    const resolvedUserId = user?.id || explicitUserId || null
    const adminDb = createAdminClient()

    // Determine user_id to set
    let finalUserId: string | null = resolvedUserId

    // If no user is logged in or provided, check if this endpoint was already bound to a user.
    // If it was already bound, retain the existing user_id so an unauthenticated page refresh doesn't decouple it.
    if (!finalUserId) {
      const { data: existing } = await adminDb
        .from('push_subscriptions')
        .select('user_id')
        .eq('endpoint', subscription.endpoint)
        .maybeSingle()

      if (existing?.user_id) {
        finalUserId = existing.user_id
      }
    }

    const { error } = await adminDb
      .from('push_subscriptions')
      .upsert(
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user_id: finalUserId,
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

    return NextResponse.json({
      success: true,
      persisted: true,
      boundUserId: finalUserId,
    })
  } catch (err: any) {
    console.error('Error handling push subscription:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

