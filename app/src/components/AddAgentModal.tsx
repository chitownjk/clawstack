'use client'

import { useState } from 'react'

export interface HubAgent {
  id: string
  name: string
  emoji: string
  description: string
  tier: string
}

interface AddAgentModalProps {
  agent: HubAgent
  isOpen: boolean
  onClose: () => void
  onAdd: (data: { name: string; personality: string; modelTier: string }) => Promise<void>
  isTeamPlan?: boolean
}

export default function AddAgentModal({ 
  agent, 
  isOpen, 
  onClose, 
  onAdd,
  isTeamPlan = false 
}: AddAgentModalProps) {
  const [name, setName] = useState(agent.name)
  const [personality, setPersonality] = useState('')
  const [modelTier, setModelTier] = useState('standard')
  const [submitting, setSubmitting] = useState(false)

  // Reset form when agent changes
  useState(() => {
    setName(agent.name)
    setPersonality('')
    setModelTier('standard')
  })

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || submitting) return

    setSubmitting(true)
    try {
      await onAdd({
        name: name.trim(),
        personality: personality.trim(),
        modelTier,
      })
      onClose()
    } catch (error) {
      console.error('Failed to add agent:', error)
      alert('Failed to add agent to team')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" 
      style={{ zIndex: 10000 }}
      onClick={onClose}
      onPointerDown={e => e.target === e.currentTarget && e.stopPropagation()}
    >
      <div 
        className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-lg w-full"
        onClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{agent.emoji}</span>
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                    Add {agent.name} to Team
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    {agent.description}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={onClose}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 text-2xl leading-none"
              >
                ×
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {/* Agent Name */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Agent Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Name your agent"
                required
                autoFocus
              />
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                You can rename the agent to fit your team
              </p>
            </div>

            {/* Personality */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Personality
                <span className="font-normal text-neutral-500 dark:text-neutral-400 ml-1">(optional)</span>
              </label>
              <textarea
                value={personality}
                onChange={e => setPersonality(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Any special instructions for this agent?"
                rows={3}
              />
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Custom instructions to shape how this agent behaves
              </p>
            </div>

            {/* Model Tier - Only show for Team plan */}
            {isTeamPlan && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Model Tier
                </label>
                <select
                  value={modelTier}
                  onChange={e => setModelTier(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="fast">Fast — Quick responses, lower cost</option>
                  <option value="standard">Standard — Balanced performance</option>
                  <option value="reasoning">Reasoning — Complex tasks, deeper thinking</option>
                </select>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Higher tiers use more credits but handle complex tasks better
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex justify-end gap-3 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Adding...
                </>
              ) : (
                'Add to Team'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
