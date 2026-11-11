import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
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

    // 2. Parse request body
    const body = await request.json()
    const prompt = (body.message as string)?.trim()
    const history: ChatMessage[] = Array.isArray(body.history) ? body.history : []

    if (!prompt) {
      return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 })
    }

    // 3. Extract user context & group
    let groupId = (body.groupId as string) || user.app_metadata?.group_id || user.user_metadata?.group_id
    const userRole = user.app_metadata?.role || 'chef_groupe'
    const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Leader'

    // Fallback for configurators or accounts without group_id in app_metadata
    if (!groupId) {
      const { data: mainGroup } = await supabase
        .from('groups')
        .select('id')
        .eq('name', 'Saint Jean Marc')
        .maybeSingle()

      groupId = mainGroup?.id || '55482895-82c5-4c4c-be53-9d3afd05eec9'
    }

    // 4. Run AI Agent with Tool Execution
    const result = await runScoutAIAgent(prompt, history, {
      groupId,
      userRole,
      userId: user.id,
      userName,
    })

    // 5. Persist Token Usage to Database via audit_logs
    const tokenUsage = result.tokenUsage || {
      promptTokens: 0,
      candidateTokens: 0,
      totalTokens: 0,
    }

    const limit = Number(process.env.NEXT_PUBLIC_AI_TOKEN_LIMIT) || 200000
    let updatedTotalUsed = tokenUsage.totalTokens

    try {
      const adminDb = createAdminClient()
      if (tokenUsage.totalTokens > 0) {
        await adminDb.from('audit_logs').insert({
          record_id: crypto.randomUUID(),
          table_name: 'ai_token_usage',
          action: 'INSERT',
          new_data: {
            group_id: groupId || null,
            user_id: user.id,
            prompt_tokens: tokenUsage.promptTokens,
            candidate_tokens: tokenUsage.candidateTokens,
            total_tokens: tokenUsage.totalTokens,
            model_name: result.modelUsed || 'gemini-3.5-flash-lite',
          },
          changed_by: user.id,
          changed_at: new Date().toISOString(),
        })
      }

      // Query updated total
      const { data: records } = await adminDb
        .from('audit_logs')
        .select('new_data')
        .eq('table_name', 'ai_token_usage')

      if (records && records.length > 0) {
        updatedTotalUsed = records.reduce(
          (acc: number, row: { new_data?: { total_tokens?: number } }) =>
            acc + (Number(row.new_data?.total_tokens) || 0),
          0
        )
      }
    } catch (dbErr) {
      console.warn('[AIChatRoute] Could not record token usage in audit_logs:', dbErr)
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
