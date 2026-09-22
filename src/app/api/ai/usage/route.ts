import { createClient } from '@/utils/supabase/server'
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

    // 2. Identify group
    let groupId = user.app_metadata?.group_id
    if (!groupId) {
      const { data: firstGroup } = await supabase
        .from('groups')
        .select('id')
        .eq('is_deleted', false)
        .limit(1)
        .maybeSingle()

      groupId = firstGroup?.id || null
    }

    const limit = Number(process.env.NEXT_PUBLIC_AI_TOKEN_LIMIT) || DEFAULT_TOKEN_LIMIT

    // 3. Query total tokens consumed
    let query = supabase.from('ai_token_usage').select('total_tokens')
    if (groupId) {
      query = query.eq('group_id', groupId)
    } else {
      query = query.eq('user_id', user.id)
    }

    const { data: records, error } = await query

    if (error) {
      // Table might not exist yet before migration is applied, fail-soft
      console.warn('[AIUsageRoute] Could not query ai_token_usage:', error.message)
      return NextResponse.json({
        used: 0,
        limit,
        remaining: limit,
        percent: 0,
      })
    }

    const totalUsed = (records || []).reduce(
      (acc: number, row: { total_tokens?: number | null }) => acc + (row.total_tokens || 0),
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
