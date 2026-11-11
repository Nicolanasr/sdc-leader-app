import { GoogleGenAI, Type, type Tool, type Chat, type SendMessageParameters } from '@google/genai'
import { executeToolCall, ToolContext } from './tools'

export interface ChatMessage {
  role: 'user' | 'model'
  content: string
}

export interface AgentExecutionResult {
  reply: string
  toolsCalled: Array<{
    name: string
    label: string
    args: Record<string, unknown>
  }>
  tokenUsage: {
    promptTokens: number
    candidateTokens: number
    totalTokens: number
  }
  modelUsed?: string
}

const TOOL_LABELS: Record<string, string> = {
  search_members: '👥 Scout Roster & Contacts',
  get_scout_advancement: '🎖️ Rank & Badge Progression',
  get_events: '📅 Gatherings & Camps Calendar',
  get_event_workspace_details: '⛺ Camp Command & Logistics',
  check_inventory_or_pantry: '📦 Quartermaster & Pantry Stock',
  get_treasury_summary: '💰 Treasury & Dues Ledger',
  get_leadership_structure: '⚜️ Leadership Hierarchy & Council',
}

// ── Google GenAI Tool Declarations using official SDK Types ──
const SCOUT_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'search_members',
        description:
          'Search scout youth members (roster), headcounts, blood types, emergency contacts, patrol roles, and unit assignments.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description: 'Optional first or last name of the scout to search for (e.g. "Anthony", "Marc")',
            },
            troop_name: {
              type: Type.STRING,
              description: 'Optional name of the unit/troop to filter by (e.g. "Kechefe", "Louveteaux", "Zaharat", "Guides", "Jouwele")',
            },
            rank: {
              type: Type.STRING,
              description: 'Optional rank to filter by (e.g. "3arif", "3arif_awwal", "mse3ed_3arif", "sadous")',
            },
            is_active: {
              type: Type.BOOLEAN,
              description: 'Filter active scouts only (defaults to true)',
            },
            limit: {
              type: Type.NUMBER,
              description: 'Max number of records to return (defaults to 20)',
            },
          },
        },
      },
      {
        name: 'get_scout_advancement',
        description:
          'Get scout badge progress, rank advancement dates, promise ceremony status, and badge requirements completed.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            member_name: {
              type: Type.STRING,
              description: 'Full name or partial name of the scout (e.g. "Anthony Khoury")',
            },
          },
          required: ['member_name'],
        },
      },
      {
        name: 'get_events',
        description:
          'Retrieve upcoming or past scout activities, weekend camps, weekly gatherings, outings, dates, and locations.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            time_window: {
              type: Type.STRING,
              description: 'Whether to fetch "upcoming" events, "past" events, or "all" (defaults to "upcoming")',
            },
            event_type: {
              type: Type.STRING,
              description: 'Optional event type (e.g. "camp", "weekly_meeting", "hike", "special_event")',
            },
            limit: {
              type: Type.NUMBER,
              description: 'Number of events to retrieve (defaults to 5)',
            },
          },
        },
      },
      {
        name: 'get_event_workspace_details',
        description:
          'Fetch detailed operational information for a specific camp or event, including staff hierarchy, registered attendees, fees paid, consent status, or budget expenses.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            event_name: {
              type: Type.STRING,
              description: 'Title or partial title of the event (e.g. "Camp d\'Été", "Sortie")',
            },
            aspect: {
              type: Type.STRING,
              description: 'Which part to inspect: "hierarchy" (leaders on duty), "roster" (scouts, consents, fees), "treasury" (budget & expenses), or "all"',
            },
          },
          required: ['event_name'],
        },
      },
      {
        name: 'check_inventory_or_pantry',
        description:
          'Check equipment stock (tents, pioneering ropes, tools) or central pantry food supplies (rice, grains, oil, pasta, cans) and condition breakdowns.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            resource_type: {
              type: Type.STRING,
              description: 'Must be "equipment" or "pantry"',
            },
            search: {
              type: Type.STRING,
              description: 'Item name or keyword to search for (e.g. "tent", "rope", "sugar", "tuna")',
            },
            low_stock_only: {
              type: Type.BOOLEAN,
              description: 'If true, returns only items at or below minimum threshold or damaged gear',
            },
          },
          required: ['resource_type'],
        },
      },
      {
        name: 'get_treasury_summary',
        description:
          'Get financial balances in USD and LBP, recent income/expense vouchers, and dues collection status. (Restricted to Group Chiefs and Treasurers).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            troop_name: {
              type: Type.STRING,
              description: 'Optional troop name to filter dues or disbursements by',
            },
          },
        },
      },
      {
        name: 'get_leadership_structure',
        description:
          'Get the group leadership hierarchy, Group Council (Majlis El Faouj: Chef de Groupe, Assistant, Amin Serr, Amin Sandou2, Amin Tejhizat), Troop Chiefs (Kouyyad El Ferak), unit assignments, and official responsibilities.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            troop_name: {
              type: Type.STRING,
              description: 'Optional troop/unit name to filter leaders by (e.g. "Zaharat", "Ahiram", "Jaramiz", "Ra3")',
            },
          },
        },
      },
    ],
  },
]

const SYSTEM_INSTRUCTION = `
You are Cedars Scout AI ⚜️ (مرشد الأرز الكشفي), the dedicated AI Operations Assistant for Scouts des Cèdres (Groupe Saint Jean Marc - جمعية كشافة الأرز).
Your purpose is to assist scout leaders (Chefs & Cheftaines) with operations, field planning, scout records, pantry inventory, and logistics.

CRITICAL RULES:
1. MANDATORY LANGUAGE: You MUST ALWAYS respond in ENGLISH at all times. Regardless of whether the leader asks in French, Arabic, or English, your entire response, explanations, counts, and summaries MUST be written in clear, professional English. (Proper scout unit names, scout titles, or Lebanese pantry foods like "Mounet", "Burghul", or "Kechefe" can be cited, but all prose and analysis must be English).
2. TRUTHFULNESS & EXACT DATABASE COUNTS:
   - NEVER invent, estimate, or approximate numbers.
   - For Central Pantry (Mounet): Always quote the exact metrics from 'kpiSummary' (allStockUnits, lowStockCount, expiringWithin45DaysCount, expiredCount).
   - When asked about expired food or lots, state the exact expired products count from 'kpiSummary.expiredCount' (e.g. 10 products) and list the products with their specific brand names, quantities, and expiration dates from 'expiredProducts'.
   - When asked about equipment or scouts, always quote the exact counts returned by the database tools.
3. If a tool returns no matches, state: "I could not find any matching record in the database."
4. Maintain an encouraging, respectful, and sharp scout spirit ("Bonjour Chef", "Always Prepared", "Toujours Prêt ⚜️").
`.trim()

const MODEL_CANDIDATES = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.5-flash',
]

export async function runScoutAIAgent(
  prompt: string,
  history: ChatMessage[] = [],
  context: ToolContext
): Promise<AgentExecutionResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.')
  }

  const ai = new GoogleGenAI({ apiKey })
  const toolsCalled: AgentExecutionResult['toolsCalled'] = []

  // Try candidate models in case of temporary 503 high demand
  let lastError: unknown = null

  for (const modelName of MODEL_CANDIDATES) {
    try {
      // Build previous history turns (limit to last 6 messages to keep context focused)
      const previousTurns = (history || []).slice(-6).map((m) => ({
        role: m.role,
        parts: [{ text: m.content }],
      }))

      const session = ai.chats.create({
        model: modelName,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: SCOUT_TOOLS,
        },
        history: previousTurns,
      })

      let promptTokens = 0
      let candidateTokens = 0
      let totalTokens = 0

      const recordUsage = (res: { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } } | null | undefined) => {
        if (res?.usageMetadata) {
          promptTokens += res.usageMetadata.promptTokenCount || 0
          candidateTokens += res.usageMetadata.candidatesTokenCount || 0
          totalTokens += res.usageMetadata.totalTokenCount || 0
        }
      }

      // Send initial user message with retry for transient 503
      let response = await sendWithRetry(session, { message: prompt })
      recordUsage(response)

      // Handle function calling loop (max 5 iterations to prevent runaway calls)
      let iterations = 0
      while (response.functionCalls && response.functionCalls.length > 0 && iterations < 5) {
        iterations++
        const call = response.functionCalls[0]
        if (!call || !call.name) break

        const toolName = call.name
        const toolArgs = (call.args as Record<string, unknown>) || {}

        // Record tool call badge
        toolsCalled.push({
          name: toolName,
          label: TOOL_LABELS[toolName] || toolName,
          args: toolArgs,
        })

        // Execute tool securely with scoped context
        const toolResult = await executeToolCall(toolName, toolArgs, context)

        // Feed function response back to Gemini session
        response = await sendWithRetry(session, {
          message: [
            {
              functionResponse: {
                name: toolName,
                id: call.id,
                response: toolResult,
              },
            },
          ],
        })
        recordUsage(response)
      }

      let finalReply = response.text
      if (!finalReply) {
        try {
          const synthesisRes = await sendWithRetry(session, {
            message:
              'Please provide a clear, comprehensive, and helpful answer for the leader based on the data retrieved above.',
          })
          recordUsage(synthesisRes)
          finalReply = synthesisRes.text || 'I have retrieved the records. Please let me know if you need more details!'
        } catch {
          finalReply = 'I have processed your request. Please let me know if you need more details!'
        }
      }

      // Fallback estimation if usageMetadata was not provided
      if (totalTokens === 0) {
        const estimated = Math.max(Math.ceil((prompt.length + (finalReply?.length || 0)) / 3.5), 120)
        promptTokens = Math.ceil(prompt.length / 3.5)
        candidateTokens = Math.max(estimated - promptTokens, 40)
        totalTokens = estimated
      }

      return {
        reply: finalReply,
        toolsCalled,
        tokenUsage: {
          promptTokens,
          candidateTokens,
          totalTokens,
        },
        modelUsed: modelName,
      }
    } catch (err: unknown) {
      console.warn(`[ScoutAIAgent] Model ${modelName} encountered error:`, err)
      lastError = err
      // Continue to next fallback model if 503
      continue
    }
  }

  throw lastError || new Error('All Gemini AI models are currently unavailable.')
}

async function sendWithRetry(
  session: Chat,
  messagePayload: SendMessageParameters,
  maxRetries = 2
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await session.sendMessage(messagePayload)
    } catch (err: unknown) {
      const is503 =
        typeof err === 'object' &&
        err !== null &&
        (('status' in err && (err as { status?: number }).status === 503) ||
          ('message' in err && String((err as { message?: unknown }).message).includes('503')))

      if (is503 && attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
        continue
      }
      throw err
    }
  }
  throw new Error('Retries exhausted')
}
