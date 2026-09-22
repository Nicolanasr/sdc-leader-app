import { createClient } from '@/utils/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { runScoutAIAgent, ChatMessage } from '@/services/ai/gemini'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Authenticate caller
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to access the Scout AI Assistant.' },
        { status: 401 }
      )
    }

    // 2. Extract user context
    let groupId = user.app_metadata?.group_id
    const userRole = user.app_metadata?.role || 'scout_leader'
    const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Leader'

    // Fallback for configurators or accounts without group_id in app_metadata
    if (!groupId) {
      const { data: firstGroup } = await supabase
        .from('groups')
        .select('id')
        .eq('is_deleted', false)
        .limit(1)
        .maybeSingle()

      groupId = firstGroup?.id || ''
    }

    // 3. Parse request body
    const body = await request.json()
    const prompt = (body.message as string)?.trim()
    const history: ChatMessage[] = Array.isArray(body.history) ? body.history : []

    if (!prompt) {
      return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 })
    }

    // 4. Run AI Agent with Tool Execution
    const result = await runScoutAIAgent(prompt, history, {
      groupId,
      userRole,
      userId: user.id,
      userName,
    })

    // 5. Persist Token Usage to Database
    const tokenUsage = result.tokenUsage || {
      promptTokens: 0,
      candidateTokens: 0,
      totalTokens: 0,
    }

    const limit = Number(process.env.NEXT_PUBLIC_AI_TOKEN_LIMIT) || 200000
    let updatedTotalUsed = tokenUsage.totalTokens

    try {
      await supabase.from('ai_token_usage').insert({
        group_id: groupId || null,
        user_id: user.id,
        prompt_tokens: tokenUsage.promptTokens,
        candidate_tokens: tokenUsage.candidateTokens,
        total_tokens: tokenUsage.totalTokens,
        model_name: result.modelUsed || 'gemini-2.5-flash',
      })

      // Query updated total
      let usageQuery = supabase.from('ai_token_usage').select('total_tokens')
      if (groupId) {
        usageQuery = usageQuery.eq('group_id', groupId)
      } else {
        usageQuery = usageQuery.eq('user_id', user.id)
      }
      const { data: records } = await usageQuery
      if (records && records.length > 0) {
        updatedTotalUsed = records.reduce(
          (acc: number, row: { total_tokens?: number | null }) => acc + (row.total_tokens || 0),
          0
        )
      }
    } catch (dbErr) {
      console.warn('[AIChatRoute] Could not record token usage in DB:', dbErr)
    }

    return NextResponse.json({
      success: true,
      reply: result.reply,
      toolsCalled: result.toolsCalled,
      usage: {
        used: updatedTotalUsed,
        limit,
        remaining: Math.max(0, limit - updatedTotalUsed),
        percent: Math.min(100, Math.round((updatedTotalUsed / limit) * 100)),
        lastTokens: tokenUsage.totalTokens,
      },
    })
  } catch (err: unknown) {
    console.error('[AIChatRoute] Exception:', err)
    const errorMsg =
      err instanceof Error ? err.message : 'An error occurred while processing your request.'
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
