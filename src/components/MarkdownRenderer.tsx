import React from 'react'

interface MarkdownRendererProps {
  content: string
  className?: string
}

/**
 * Parses and renders inline markdown elements:
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Inline code: `code`
 * - Links: [text](url)
 */
function renderInline(text: string): React.ReactNode {
  // Regex pattern for inline code, links, bold, and italic
  const parts: React.ReactNode[] = []
  let remaining = text

  let keyIndex = 0

  while (remaining.length > 0) {
    // 1. Check for inline code `code`
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`/)
    // 2. Check for bold **text** or __text__
    const boldMatch = remaining.match(/^(.*?)(?:\*\*|__)(.+?)(?:\*\*|__)/)
    // 3. Check for links [label](url)
    const linkMatch = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)/)
    // 4. Check for italic *text* or _text_ (single asterisk not followed by space)
    const italicMatch = remaining.match(/^(.*?)(?:\*|_)([^*_]+)(?:\*|_)/)

    // Find the earliest match
    const candidates: Array<{
      type: 'code' | 'bold' | 'link' | 'italic'
      match: RegExpMatchArray
      index: number
    }> = []

    if (codeMatch && typeof codeMatch.index === 'number') {
      candidates.push({ type: 'code', match: codeMatch, index: codeMatch[1].length })
    }
    if (boldMatch && typeof boldMatch.index === 'number') {
      candidates.push({ type: 'bold', match: boldMatch, index: boldMatch[1].length })
    }
    if (linkMatch && typeof linkMatch.index === 'number') {
      candidates.push({ type: 'link', match: linkMatch, index: linkMatch[1].length })
    }
    if (italicMatch && typeof italicMatch.index === 'number') {
      candidates.push({ type: 'italic', match: italicMatch, index: italicMatch[1].length })
    }

    if (candidates.length === 0) {
      // No more markdown patterns, push the rest
      parts.push(remaining)
      break
    }

    // Sort by earliest position in string
    candidates.sort((a, b) => a.index - b.index)
    const winner = candidates[0]
    const before = winner.match[1]

    if (before) {
      parts.push(before)
    }

    if (winner.type === 'code') {
      parts.push(
        <code
          key={`code-${keyIndex++}`}
          className="px-1.5 py-0.5 rounded-md bg-slate-100 text-teal-900 text-[10.5px] font-mono border border-slate-200"
        >
          {winner.match[2]}
        </code>
      )
      remaining = remaining.slice(before.length + winner.match[0].length - before.length)
    } else if (winner.type === 'bold') {
      parts.push(
        <strong key={`bold-${keyIndex++}`} className="font-extrabold text-slate-900">
          {renderInline(winner.match[2])}
        </strong>
      )
      remaining = remaining.slice(before.length + winner.match[0].length - before.length)
    } else if (winner.type === 'italic') {
      parts.push(
        <em key={`italic-${keyIndex++}`} className="italic text-slate-700">
          {winner.match[2]}
        </em>
      )
      remaining = remaining.slice(before.length + winner.match[0].length - before.length)
    } else if (winner.type === 'link') {
      parts.push(
        <a
          key={`link-${keyIndex++}`}
          href={winner.match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-700 hover:text-teal-900 underline font-semibold transition-colors"
        >
          {winner.match[2]}
        </a>
      )
      remaining = remaining.slice(before.length + winner.match[0].length - before.length)
    }
  }

  return parts
}

type Block =
  | { type: 'heading'; level: 1 | 2 | 3 | 4; content: string }
  | { type: 'ul'; items: Array<{ content: string; depth: number }> }
  | { type: 'ol'; items: Array<{ content: string; number: string }> }
  | { type: 'blockquote'; content: string }
  | { type: 'paragraph'; content: string }
  | { type: 'hr' }

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content) return null

  // 1. Normalize line endings and split into lines
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []

  let currentList: { type: 'ul'; items: Array<{ content: string; depth: number }> } | null = null
  let currentNumberedList: { type: 'ol'; items: Array<{ content: string; number: string }> } | null = null

  const flushLists = () => {
    if (currentList) {
      blocks.push(currentList)
      currentList = null
    }
    if (currentNumberedList) {
      blocks.push(currentNumberedList)
      currentNumberedList = null
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Empty lines act as separators
    if (!trimmed) {
      flushLists()
      continue
    }

    // Horizontal Rule (--- or ***)
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      flushLists()
      blocks.push({ type: 'hr' })
      continue
    }

    // Headings: #, ##, ###, ####
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      flushLists()
      const level = headingMatch[1].length as 1 | 2 | 3 | 4
      // Clean accidental surrounding ** in heading titles (e.g. ### **Title**)
      const headingContent = headingMatch[2].replace(/^\*\*(.+)\*\*$/, '$1').trim()
      blocks.push({
        type: 'heading',
        level,
        content: headingContent,
      })
      continue
    }

    // Blockquote: > text
    const quoteMatch = trimmed.match(/^>\s*(.+)$/)
    if (quoteMatch) {
      flushLists()
      blocks.push({ type: 'blockquote', content: quoteMatch[1] })
      continue
    }

    // Unordered List Items: * text, - text, • text (with potential indentation)
    const ulMatch = line.match(/^(\s*)(?:[-*•]|\+)\s+(.+)$/)
    if (ulMatch) {
      if (currentNumberedList) flushLists()
      const indent = ulMatch[1].length
      const depth = indent >= 4 ? 2 : indent >= 2 ? 1 : 0
      if (!currentList) {
        currentList = { type: 'ul', items: [] }
      }
      currentList.items.push({ content: ulMatch[2], depth })
      continue
    }

    // Ordered List Items: 1. text, 2. text
    const olMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/)
    if (olMatch) {
      if (currentList) flushLists()
      if (!currentNumberedList) {
        currentNumberedList = { type: 'ol', items: [] }
      }
      currentNumberedList.items.push({ number: olMatch[2], content: olMatch[3] })
      continue
    }

    // Regular line / paragraph
    flushLists()
    blocks.push({ type: 'paragraph', content: trimmed })
  }

  flushLists()

  return (
    <div className={`space-y-2.5 text-xs text-slate-800 leading-relaxed ${className}`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'heading': {
            if (block.level === 1 || block.level === 2) {
              return (
                <h3
                  key={idx}
                  className="text-sm font-black text-slate-900 tracking-tight pt-2 pb-0.5 border-b border-slate-200 flex items-center gap-1.5"
                >
                  <span className="text-teal-700">⚜️</span>
                  <span>{renderInline(block.content)}</span>
                </h3>
              )
            }
            if (block.level === 3) {
              return (
                <h4
                  key={idx}
                  className="text-xs font-black text-teal-950 uppercase tracking-wide pt-1.5 pb-0.5 flex items-center gap-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600 inline-block shrink-0" />
                  <span>{renderInline(block.content)}</span>
                </h4>
              )
            }
            return (
              <h5 key={idx} className="text-xs font-bold text-slate-800 pt-1">
                {renderInline(block.content)}
              </h5>
            )
          }

          case 'ul': {
            return (
              <ul key={idx} className="space-y-1.5 my-1 pl-1">
                {block.items.map((item, itemIdx) => (
                  <li
                    key={itemIdx}
                    className={`flex items-start gap-2 ${
                      item.depth > 0 ? 'ml-4 text-[11.5px] text-slate-700' : ''
                    }`}
                  >
                    <span className="text-teal-600 font-bold shrink-0 mt-0.5 select-none leading-none">
                      {item.depth > 0 ? '◦' : '•'}
                    </span>
                    <span className="flex-1 leading-snug">{renderInline(item.content)}</span>
                  </li>
                ))}
              </ul>
            )
          }

          case 'ol': {
            return (
              <ol key={idx} className="space-y-1.5 my-1 pl-1">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-100/70 text-teal-900 border border-teal-200/60 shrink-0 mt-0.5 select-none">
                      {item.number}
                    </span>
                    <span className="flex-1 leading-snug">{renderInline(item.content)}</span>
                  </li>
                ))}
              </ol>
            )
          }

          case 'blockquote': {
            return (
              <blockquote
                key={idx}
                className="pl-3 py-1 my-1.5 border-l-2 border-amber-400 bg-amber-50/50 rounded-r-lg text-slate-700 text-[11.5px] italic"
              >
                {renderInline(block.content)}
              </blockquote>
            )
          }

          case 'hr': {
            return <hr key={idx} className="my-2 border-slate-200" />
          }

          case 'paragraph': {
            return (
              <p key={idx} className="leading-relaxed">
                {renderInline(block.content)}
              </p>
            )
          }

          default:
            return null
        }
      })}
    </div>
  )
}
