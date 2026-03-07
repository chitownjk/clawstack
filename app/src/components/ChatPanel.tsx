'use client'

import { useState, useRef, useEffect } from 'react'
import { Task, Agent } from '@/lib/mission-control'
import SimpleMarkdown from '@/components/SimpleMarkdown'

const MAX_INPUT_LENGTH = 2000    // Match server-side limit
const MIN_SEND_INTERVAL = 1500   // 1.5s cooldown between sends
const MAX_MESSAGES_DISPLAY = 50  // Don't render more than this

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatPanelProps {
  isOpen: boolean
  onClose: () => void
  task?: Task | null
  agents?: Agent[]
}

export default function ChatPanel({ isOpen, onClose, task, agents }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rateLimited, setRateLimited] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const lastSendRef = useRef<number>(0)

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Reset messages when task changes
  useEffect(() => {
    setMessages([])
    setError(null)
  }, [task?.id])

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || streaming || rateLimited) return

    // Client-side cooldown
    const now = Date.now()
    if (now - lastSendRef.current < MIN_SEND_INTERVAL) {
      setError('Slow down -- wait a moment before sending again.')
      return
    }
    lastSendRef.current = now

    // Enforce input length
    const safeContent = trimmed.slice(0, MAX_INPUT_LENGTH)

    const userMessage: ChatMessage = {
      id: `user-${now}`,
      role: 'user',
      content: safeContent,
      timestamp: new Date(),
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setError(null)
    setStreaming(true)

    // Create placeholder for assistant response
    const assistantId = `assistant-${now}`
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }])

    try {
      const abortController = new AbortController()
      abortRef.current = abortController

      const assignedAgents = task && agents
        ? agents.filter(a => task.assigned_agent_ids?.includes(a.id)).map(a => a.name).join(', ')
        : undefined

      // Only send last 20 messages to keep payload reasonable
      const recentMessages = updatedMessages.slice(-20).map(m => ({
        role: m.role,
        content: m.content,
      }))

      const response = await fetch('/api/command/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: recentMessages,
          taskId: task?.id,
          taskContext: task ? {
            title: task.title,
            status: task.status,
            description: task.description,
            assignedAgents,
            tags: task.tags,
          } : undefined,
        }),
        signal: abortController.signal,
      })

      if (!response.ok) {
        const data = await response.json()
        if (data.code === 'UPGRADE_REQUIRED') {
          setError('AI chat requires the Solo plan or higher. Upgrade to start chatting with your tasks.')
        } else if (data.code === 'RATE_LIMITED') {
          setRateLimited(true)
          setError('You\'ve hit the rate limit. Take a breather and try again in a minute.')
          setTimeout(() => setRateLimited(false), 60_000)
        } else {
          setError(data.error || 'Failed to get response')
        }
        // Remove the empty assistant message
        setMessages(prev => prev.filter(m => m.id !== assistantId))
        setStreaming(false)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))

            if (data.type === 'delta') {
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: m.content + data.text }
                  : m
              ))
            }

            if (data.type === 'error') {
              setError(data.message)
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Something went wrong')
        setMessages(prev => prev.filter(m => m.id !== assistantId))
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleStop() {
    abortRef.current?.abort()
    setStreaming(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[420px] bg-white dark:bg-[#171717] border-l border-gray-200 dark:border-[#262626] shadow-xl flex flex-col z-[9999]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-[#262626] bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Chat</h3>
            {task && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[280px]">
                Re: {task.title}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500 py-12">
            <span className="text-3xl block mb-3">💬</span>
            <p className="text-sm">
              {task
                ? `Ask anything about "${task.title}"`
                : 'Ask me anything. I can help you plan, draft, or think through tasks.'
              }
            </p>
            <div className="mt-4 space-y-2">
              {task ? (
                <>
                  <SuggestionChip onClick={(text) => { setInput(text); }} text="What should I do next on this task?" />
                  <SuggestionChip onClick={(text) => { setInput(text); }} text="Draft a summary of this task" />
                  <SuggestionChip onClick={(text) => { setInput(text); }} text="Break this into smaller steps" />
                </>
              ) : (
                <>
                  <SuggestionChip onClick={(text) => { setInput(text); }} text="What should I focus on today?" />
                  <SuggestionChip onClick={(text) => { setInput(text); }} text="Help me plan my week" />
                </>
              )}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-[#262626] text-gray-900 dark:text-gray-100'
              }`}
            >
              {msg.role === 'assistant' ? (
                msg.content ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
                    <SimpleMarkdown content={msg.content} />
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-gray-400">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-200 dark:border-[#262626] bg-white dark:bg-[#171717] flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value.slice(0, MAX_INPUT_LENGTH))}
              onKeyDown={handleKeyDown}
              placeholder={task ? `Chat about "${task.title}"...` : 'Ask me anything...'}
              rows={1}
              maxLength={MAX_INPUT_LENGTH}
              className="w-full resize-none rounded-lg border border-gray-300 dark:border-[#404040] bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32"
              style={{ minHeight: '38px' }}
              disabled={streaming || rateLimited}
            />
            {input.length > MAX_INPUT_LENGTH * 0.8 && (
              <span className={`absolute bottom-1 right-2 text-[10px] ${
                input.length >= MAX_INPUT_LENGTH ? 'text-red-500' : 'text-gray-400'
              }`}>
                {input.length}/{MAX_INPUT_LENGTH}
              </span>
            )}
          </div>
          {streaming ? (
            <button
              type="button"
              onClick={handleStop}
              className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition text-sm font-medium flex-shrink-0"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || rateLimited}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition text-sm font-medium flex-shrink-0"
            >
              Send
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

function SuggestionChip({ text, onClick }: { text: string; onClick: (text: string) => void }) {
  return (
    <button
      onClick={() => onClick(text)}
      className="block w-full text-left px-3 py-2 bg-gray-50 dark:bg-[#262626] hover:bg-gray-100 dark:hover:bg-[#333333] rounded-lg text-xs text-gray-600 dark:text-gray-400 transition"
    >
      {text}
    </button>
  )
}
