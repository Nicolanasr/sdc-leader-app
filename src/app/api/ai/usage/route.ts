import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const DEFAULT_TOKEN_LIMIT = 200000

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Authenticate caller
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to view AI token usage.' },
        { status: 401 }
      )
    }

    const limit = Number(process.env.NEXT_PUBLIC_AI_TOKEN_LIMIT) || DEFAULT_TOKEN_LIMIT

    // 2. Query total tokens consumed from audit_logs
    try {
      const adminDb = createAdminClient()
      const { data: records, error } = await adminDb
        .from('audit_logs')
        .select('new_data')
        .eq('table_name', 'ai_token_usage')

      if (error) {
        console.warn('[AIUsageRoute] Could not query audit_logs:', error.message)
        return NextResponse.json({
          used: 0,
          limit,
          remaining: limit,
          percent: 0,
        })
      }

      const totalUsed = (records || []).reduce(
        (acc: number, row: { new_data?: { total_tokens?: number } }) =>
          acc + (Number(row.new_data?.total_tokens) || 0),
        0
      )

      const remaining = Math.max(0, limit - totalUsed)
      const percent = Math.min(100, Math.round((totalUsed / limit) * 100))

      return NextResponse.json({
        used: totalUsed,
        limit,
        remaining,
        percent,
      })
    } catch (dbErr) {
      console.warn('[AIUsageRoute] Error calculating usage:', dbErr)
      return NextResponse.json({
        used: 0,
        limit,
        remaining: limit,
        percent: 0,
      })
    }
  } catch (err: unknown) {
    console.error('[AIUsageRoute] Exception:', err)
    const limit = Number(process.env.NEXT_PUBLIC_AI_TOKEN_LIMIT) || DEFAULT_TOKEN_LIMIT
    return NextResponse.json({
      used: 0,
      limit,
      remaining: limit,
      percent: 0,
    })
  }
}
