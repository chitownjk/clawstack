'use client'

import React from 'react'

interface SimpleMarkdownProps {
  content: string
  className?: string
}

/**
 * Simple markdown renderer for task descriptions.
 * Handles: **bold**, *italic*, `code`, [links](url), - lists, headers
 */
export default function SimpleMarkdown({ content, className = '' }: SimpleMarkdownProps) {
  const renderMarkdown = (text: string): React.ReactNode[] => {
    const lines = text.split('\n')
    const elements: React.ReactNode[] = []
    let listItems: string[] = []
    let inCodeBlock = false
    let codeBlockContent: string[] = []

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside my-2 space-y-1">
            {listItems.map((item, i) => (
              <li key={i}>{renderInline(item)}</li>
            ))}
          </ul>
        )
        listItems = []
      }
    }

    const flushCodeBlock = () => {
      if (codeBlockContent.length > 0) {
        elements.push(
          <pre key={`code-${elements.length}`} className="bg-gray-100 p-3 rounded-lg my-2 overflow-x-auto text-sm font-mono">
            <code>{codeBlockContent.join('\n')}</code>
          </pre>
        )
        codeBlockContent = []
      }
    }

    lines.forEach((line, index) => {
      // Code block
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock()
          inCodeBlock = false
        } else {
          flushList()
          inCodeBlock = true
        }
        return
      }

      if (inCodeBlock) {
        codeBlockContent.push(line)
        return
      }

      // Empty line
      if (line.trim() === '') {
        flushList()
        elements.push(<div key={`br-${index}`} className="h-2" />)
        return
      }

      // Headers
      if (line.startsWith('### ')) {
        flushList()
        elements.push(
          <h4 key={`h4-${index}`} className="font-semibold text-gray-800 mt-3 mb-1">
            {renderInline(line.slice(4))}
          </h4>
        )
        return
      }
      if (line.startsWith('## ')) {
        flushList()
        elements.push(
          <h3 key={`h3-${index}`} className="font-semibold text-gray-900 text-lg mt-3 mb-1">
            {renderInline(line.slice(3))}
          </h3>
        )
        return
      }
      if (line.startsWith('# ')) {
        flushList()
        elements.push(
          <h2 key={`h2-${index}`} className="font-bold text-gray-900 text-xl mt-3 mb-2">
            {renderInline(line.slice(2))}
          </h2>
        )
        return
      }

      // List items
      if (line.match(/^[-*]\s/)) {
        listItems.push(line.slice(2))
        return
      }

      // Numbered list
      if (line.match(/^\d+\.\s/)) {
        const match = line.match(/^\d+\.\s(.*)/)
        if (match) {
          listItems.push(match[1])
        }
        return
      }

      // Regular paragraph
      flushList()
      elements.push(
        <p key={`p-${index}`} className="my-1">
          {renderInline(line)}
        </p>
      )
    })

    flushList()
    flushCodeBlock()
    return elements
  }

  const renderInline = (text: string): React.ReactNode => {
    // Process inline elements: **bold**, *italic*, `code`, [link](url)
    const parts: React.ReactNode[] = []
    let remaining = text
    let keyIndex = 0

    while (remaining.length > 0) {
      // Links: [text](url)
      const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/)
      // Bold: **text**
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/)
      // Italic: *text* (not preceded by *)
      const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/)
      // Code: `text`
      const codeMatch = remaining.match(/`([^`]+)`/)

      // Find the first match
      const matches = [
        { type: 'link', match: linkMatch },
        { type: 'bold', match: boldMatch },
        { type: 'italic', match: italicMatch },
        { type: 'code', match: codeMatch },
      ].filter(m => m.match !== null)
       .sort((a, b) => (a.match!.index ?? 0) - (b.match!.index ?? 0))

      if (matches.length === 0) {
        // No more matches, add remaining text
        if (remaining) parts.push(remaining)
        break
      }

      const first = matches[0]
      const matchObj = first.match!
      const matchIndex = matchObj.index ?? 0

      // Add text before the match
      if (matchIndex > 0) {
        parts.push(remaining.slice(0, matchIndex))
      }

      // Add the formatted element
      switch (first.type) {
        case 'link':
          parts.push(
            <a
              key={`inline-${keyIndex++}`}
              href={matchObj[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {matchObj[1]}
            </a>
          )
          break
        case 'bold':
          parts.push(
            <strong key={`inline-${keyIndex++}`} className="font-semibold">
              {matchObj[1]}
            </strong>
          )
          break
        case 'italic':
          parts.push(
            <em key={`inline-${keyIndex++}`}>
              {matchObj[1]}
            </em>
          )
          break
        case 'code':
          parts.push(
            <code key={`inline-${keyIndex++}`} className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">
              {matchObj[1]}
            </code>
          )
          break
      }

      remaining = remaining.slice(matchIndex + matchObj[0].length)
    }

    return parts.length === 1 ? parts[0] : <>{parts}</>
  }

  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      {renderMarkdown(content)}
    </div>
  )
}
