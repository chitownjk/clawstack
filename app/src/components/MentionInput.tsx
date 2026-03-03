'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Agent } from '@/lib/mission-control'

interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  agents: Agent[]
  placeholder?: string
  disabled?: boolean
  submitting?: boolean
}

export default function MentionInput({
  value,
  onChange,
  onSubmit,
  agents,
  placeholder = 'Type your comment... Use @name to mention',
  disabled = false,
  submitting = false
}: MentionInputProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [dropdownIndex, setDropdownIndex] = useState(0)
  const [mentionFilter, setMentionFilter] = useState('')
  const [mentionStart, setMentionStart] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter agents based on current @mention text
  const filteredAgents = agents.filter(a => 
    a.name.toLowerCase().includes(mentionFilter.toLowerCase())
  )

  useEffect(() => {
    // Reset dropdown index when filter changes
    setDropdownIndex(0)
  }, [mentionFilter])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value
    const cursorPos = e.target.selectionStart || 0
    
    onChange(newValue)
    
    // Check if we're in an @mention
    const textBeforeCursor = newValue.substring(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
      // Only show dropdown if there's no space after @ (still typing the name)
      if (!textAfterAt.includes(' ')) {
        setMentionStart(lastAtIndex)
        setMentionFilter(textAfterAt)
        setShowDropdown(true)
        return
      }
    }
    
    setShowDropdown(false)
    setMentionFilter('')
    setMentionStart(-1)
  }

  function selectAgent(agent: Agent) {
    if (mentionStart === -1) return
    
    // Replace the @mention with the agent name
    const beforeMention = value.substring(0, mentionStart)
    const cursorPos = inputRef.current?.selectionStart || value.length
    const afterMention = value.substring(cursorPos)
    
    // Use quotes if name has spaces
    const mentionText = agent.name.includes(' ') 
      ? `@"${agent.name}"` 
      : `@${agent.name}`
    
    const newValue = beforeMention + mentionText + ' ' + afterMention.trimStart()
    onChange(newValue)
    
    setShowDropdown(false)
    setMentionFilter('')
    setMentionStart(-1)
    
    // Focus back on input
    setTimeout(() => {
      inputRef.current?.focus()
      const newCursorPos = beforeMention.length + mentionText.length + 1
      inputRef.current?.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (showDropdown && filteredAgents.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setDropdownIndex(i => Math.min(i + 1, filteredAgents.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setDropdownIndex(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        selectAgent(filteredAgents[dropdownIndex])
      } else if (e.key === 'Escape') {
        setShowDropdown(false)
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        disabled={disabled || submitting}
      />
      
      {/* Mention autocomplete dropdown */}
      {showDropdown && filteredAgents.length > 0 && (
        <div className="absolute bottom-full left-0 mb-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50">
          <div className="px-3 py-1.5 bg-gray-50 border-b text-xs text-gray-500 font-medium">
            Mention an agent
          </div>
          {filteredAgents.slice(0, 6).map((agent, index) => (
            <button
              key={agent.id}
              onClick={() => selectAgent(agent)}
              onMouseEnter={() => setDropdownIndex(index)}
              className={`w-full px-3 py-2 flex items-center gap-2 text-left transition-colors ${
                index === dropdownIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <span className="text-lg">{agent.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm truncate">{agent.name}</div>
                <div className="text-xs text-gray-500 truncate">{agent.role}</div>
              </div>
            </button>
          ))}
          {filteredAgents.length > 6 && (
            <div className="px-3 py-1.5 text-xs text-gray-400 text-center">
              +{filteredAgents.length - 6} more
            </div>
          )}
        </div>
      )}
    </div>
  )
}
