'use client'

import { useState, useRef, useEffect } from 'react'
import {
  X,
  Send,
  Loader2,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Users,
  Award,
  Package,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'

interface AIUsage {
  used: number
  limit: number
  percent: number
  remaining: number
}

function formatTokens(val: number): string {
  if (!val || val === 0) return '0'
  if (val >= 1000000) return `${(val / 1000000).toFixed(1).replace(/\.0$/, '')}M`
  if (val >= 10000) return `${(val / 1000).toFixed(0)}k`
  if (val >= 1000) return `${(val / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return val.toLocaleString()
}

interface Message {
  id: string
  role: 'user' | 'model'
  content: string
  toolsCalled?: Array<{
    name: string
    label: string
  }>
  timestamp: string
}

const STARTER_QUESTIONS = [
  {
    icon: Calendar,
    title: 'Next Gathering',
    prompt: 'When is our next upcoming gathering or camp?',
  },
  {
    icon: Users,
    title: 'Scout Headcount',
    prompt: 'How many active scouts do we have in each unit?',
  },
  {
    icon: Award,
    title: 'Rank Advancement',
    prompt: 'Which scouts are ready for their promise ceremony or advancement?',
  },
  {
    icon: Package,
    title: 'Pantry & Tents',
    prompt: 'Are we running low on any central pantry food items or tents?',
  },
]

export default function ScoutAIAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [inputPrompt, setInputPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [usage, setUsage] = useState<AIUsage>({
    used: 0,
    limit: 200000,
    percent: 0,
    remaining: 200000,
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const msgCounterRef = useRef(1)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen])

  useEffect(() => {
    if (!isOpen) return
    let active = true

    fetch('/api/ai/usage')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return
        setUsage({
          used: data.used || 0,
          limit: data.limit || 200000,
          percent: data.percent ?? 0,
          remaining: data.remaining ?? 200000,
        })
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [isOpen])

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim()
    if (!text || loading) return

    const count = msgCounterRef.current++
    const userMessage: Message = {
      id: `user-${count}`,
      role: 'user',
      content: text,
      timestamp: 'Just now',
    }

    setMessages((prev) => [...prev, userMessage])
    setInputPrompt('')
    setLoading(true)

    try {
      // Build history for API
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reach AI assistant.')
      }

      if (data.usage) {
        setUsage({
          used: data.usage.used || 0,
          limit: data.usage.limit || 200000,
          percent: data.usage.percent ?? 0,
          remaining: data.usage.remaining ?? 200000,
        })
      }

      const botCount = msgCounterRef.current++
      const botMessage: Message = {
        id: `bot-${botCount}`,
        role: 'model',
        content: data.reply || 'I have checked your records.',
        toolsCalled: data.toolsCalled || [],
        timestamp: 'Just now',
      }

      setMessages((prev) => [...prev, botMessage])
    } catch (err: unknown) {
      const errorText =
        err instanceof Error ? err.message : 'An error occurred while answering your question.'
      const errCount = msgCounterRef.current++
      const errorMessage: Message = {
        id: `bot-err-${errCount}`,
        role: 'model',
        content: `⚠️ ${errorText}\n\nPlease try again in a moment.`,
        timestamp: 'Just now',
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleClearHistory = () => {
    setMessages([])
  }

  return (
    <>
      {/* ── FLOATING ACTION BUTTON ── */}
      <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="relative group flex items-center gap-2 bg-gradient-to-r from-teal-800 via-teal-700 to-slate-900 text-white p-3.5 sm:px-4 sm:py-3.5 rounded-full shadow-xl border border-teal-500/40 hover:scale-105 active:scale-95 transition-all focus:outline-none"
          title="Scout AI Operations Assistant"
        >
          <div className="relative">
            <span className="text-base">⚜️</span>
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
            </span>
          </div>

          <span className="hidden sm:inline-block text-xs font-black tracking-wide">
            Hermès AI
          </span>
        </button>
      </div>

      {/* ── CHAT DRAWER / POPUP ── */}
      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-20 sm:right-6 sm:w-[420px] sm:h-[600px] z-50 flex flex-col bg-white sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in sm:zoom-in-95">
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 via-teal-950 to-teal-900 text-white flex flex-col shrink-0 shadow-xs gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-sm shadow-2xs">
                  ⚜️
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs sm:text-sm font-black tracking-tight">Hermès AI</h3>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-400 text-slate-950">
                      Live Verified
                    </span>
                  </div>
                  <p className="text-[10px] text-teal-200/80">
                    Direct database accuracy • Zero hallucinations
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    title="Clear conversation"
                    className="w-7 h-7 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* AI Usage Progress Bar */}
            <div
              className="pt-2 border-t border-teal-800/60 flex flex-col gap-1.5"
              title={`${usage.used.toLocaleString()} / ${usage.limit.toLocaleString()} tokens used (${usage.percent}%)`}
            >
              <div className="flex items-center justify-between text-[10px] tracking-wide">
                <span className="text-teal-200/90 font-medium flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-amber-400 shrink-0" />
                  <span>AI Usage</span>
                </span>
                <span className="font-semibold text-slate-200">
                  used <span className="text-amber-300 font-bold">{formatTokens(usage.used)}</span> / {formatTokens(usage.limit)}
                  <span className="text-[9px] text-teal-300/70 ml-1">({usage.percent}%)</span>
                </span>
              </div>

              <div className="w-full h-1.5 bg-slate-950/60 rounded-full overflow-hidden border border-teal-500/20 p-px">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    usage.percent >= 90
                      ? 'bg-gradient-to-r from-rose-500 to-red-400'
                      : usage.percent >= 75
                      ? 'bg-gradient-to-r from-amber-500 to-amber-300'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-300'
                  }`}
                  style={{ width: `${Math.min(usage.percent, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3 bg-slate-50/50">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col justify-between space-y-4 py-2">
                <div className="text-center space-y-1.5 pt-2">
                  <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto text-teal-800 text-lg shadow-2xs mb-2">
                    ⚜️
                  </div>
                  <h4 className="text-xs font-black text-slate-900">
                    Bonjour Chef! How can I assist you today?
                  </h4>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Ask me about upcoming camps, scout records, blood types, rank promotions, or gear.
                    I verify all answers directly against your database.
                  </p>
                </div>

                {/* Quick Starters */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                    Suggested Questions:
                  </span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {STARTER_QUESTIONS.map((q, idx) => {
                      const Icon = q.icon
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(q.prompt)}
                          className="w-full text-left p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-teal-50/40 hover:border-teal-300 transition-all flex items-center gap-2 text-xs text-slate-800 shadow-2xs group"
                        >
                          <Icon className="h-3.5 w-3.5 text-teal-700 shrink-0 group-hover:scale-110 transition-transform" />
                          <span className="truncate">{q.prompt}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[10px] text-amber-900 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-amber-700" />
                  <span>
                    Factual Guarantee: If a scout or item is not registered in the database, I will tell you rather than guess.
                  </span>
                </div>
              </div>
            ) : (
              messages.map((m) => {
                const isUser = m.role === 'user'

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                  >
                    <div className="flex items-end gap-1.5 max-w-[88%]">
                      {!isUser && (
                        <div className="w-6 h-6 rounded-full bg-teal-800 text-white flex items-center justify-center text-[10px] shrink-0 mb-1">
                          ⚜️
                        </div>
                      )}

                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed ${
                          isUser
                            ? 'bg-teal-800 text-white rounded-br-xs shadow-2xs whitespace-pre-wrap'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs shadow-2xs'
                        }`}
                      >
                        {isUser ? (
                          m.content
                        ) : (
                          <MarkdownRenderer content={m.content} />
                        )}

                        {/* Tool Verification Badges */}
                        {!isUser && m.toolsCalled && m.toolsCalled.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                            {m.toolsCalled.map((t, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-900 border border-teal-200"
                              >
                                <CheckCircle2 className="h-2.5 w-2.5 text-teal-600" />
                                <span>{t.label}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <span className="text-[9px] text-slate-400 px-1">{m.timestamp}</span>
                  </div>
                )
              })
            )}

            {/* Loading typing bubble */}
            {loading && (
              <div className="flex items-center gap-2 text-slate-500 text-xs p-2.5 bg-white border border-slate-200 rounded-2xl w-fit shadow-2xs animate-pulse">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-700" />
                <span className="font-semibold text-[11px]">Querying database & analyzing...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-100 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Ask Hermès in English, French, or Arabic..."
                disabled={loading}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 shadow-2xs focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 disabled:bg-slate-50"
              />

              <button
                type="submit"
                disabled={loading || !inputPrompt.trim()}
                className="shrink-0 w-9 h-9 rounded-xl bg-teal-800 hover:bg-teal-700 text-white flex items-center justify-center transition-all shadow-2xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
