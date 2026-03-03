'use client'

import { useState } from 'react'
import Link from 'next/link'
import AddAgentModal, { HubAgent } from '@/components/AddAgentModal'

interface AddToCommandButtonProps {
  patternId: string
  patternTitle: string
  onSuccess: (message: string) => void
}

function AddToCommandButton({ patternId, patternTitle, onSuccess }: AddToCommandButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isAdded, setIsAdded] = useState(false)

  async function handleAdd() {
    setIsLoading(true)
    try {
      const response = await fetch('/api/hub/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'pattern',
          id: patternId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add pattern')
      }

      const result = await response.json()
      setIsAdded(true)
      onSuccess(result.message || `"${patternTitle}" added to your Command inbox`)
    } catch (error) {
      console.error('Error adding pattern:', error)
      onSuccess(error instanceof Error ? error.message : 'Failed to add pattern')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleAdd}
      disabled={isLoading || isAdded}
      className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition ${
        isAdded
          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
          : isLoading
          ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 cursor-not-allowed'
          : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
      }`}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Adding...
        </span>
      ) : isAdded ? (
        'Added!'
      ) : (
        'Add to Command'
      )}
    </button>
  )
}

interface HubItem {
  id: string
  name?: string
  title?: string
  emoji?: string
  description?: string
  problem?: string
  content?: string
  tier?: string
  category?: string
  itemType: 'agent' | 'pattern'
  avgScore?: number
  avg_score?: number
  importCount?: number
  import_count?: number
  assessmentCount?: number
  assessment_count?: number
  author_agent?: { name: string; trust_tier: number }
}

interface HubContentProps {
  filteredItems: HubItem[]
  typeFilters: { id: string; name: string; count: number }[]
  categoryFilters: { id: string; name: string }[]
  selectedType: string
  selectedCategory: string
  isTeamPlan: boolean
}

export default function HubContent({
  filteredItems,
  typeFilters,
  categoryFilters,
  selectedType,
  selectedCategory,
  isTeamPlan,
}: HubContentProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<HubAgent | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  function handleAddToTeam(agent: HubAgent) {
    setSelectedAgent(agent)
    setModalOpen(true)
  }

  function handleCloseModal() {
    setModalOpen(false)
    setTimeout(() => setSelectedAgent(null), 200)
  }

  async function handleAdd(data: { name: string; personality: string; modelTier: string }) {
    if (!selectedAgent) return

    const response = await fetch('/api/hub/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: selectedAgent.id,
        name: data.name,
        personality: data.personality,
        modelTier: data.modelTier,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to add agent')
    }

    const result = await response.json()
    setSuccessMessage(result.message || `${data.name} added to your team!`)
    
    // Clear success message after 3 seconds
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  return (
    <>
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 px-4 py-3 rounded-lg shadow-lg z-[10001] animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Type Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {typeFilters.map((type) => (
          <Link
            key={type.id}
            href={type.id === 'all' ? '/hub' : `/hub?type=${type.id}`}
            className={`px-4 py-2 rounded-full text-sm transition ${
              selectedType === type.id
                ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            {type.name}
            <span className="ml-1 text-xs opacity-60">({type.count})</span>
          </Link>
        ))}
        
        {/* Contribute button */}
        <Link
          href="/patterns/new"
          className="px-4 py-2 rounded-full text-sm bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900 transition ml-auto"
        >
          + Contribute
        </Link>
      </div>

      {/* Category Filters (for patterns) */}
      {(selectedType === 'patterns' || selectedType === 'all') && (
        <div className="flex flex-wrap gap-2 mb-6">
          {categoryFilters.map((cat) => (
            <Link
              key={cat.id}
              href={cat.id === 'all' 
                ? (selectedType === 'all' ? '/hub' : `/hub?type=${selectedType}`)
                : `/hub?type=${selectedType}&category=${cat.id}`
              }
              className={`px-3 py-1 rounded-full text-xs transition ${
                selectedCategory === cat.id
                  ? 'bg-neutral-700 dark:bg-neutral-300 text-white dark:text-neutral-900'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      )}

      {/* Items Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`card p-5 ${
              item.itemType === 'agent' && item.tier === 'free' 
                ? 'border-2 border-blue-200 dark:border-blue-800' 
                : ''
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {item.itemType === 'agent' ? (
                  <span className="text-2xl">{item.emoji}</span>
                ) : (
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                    item.category === 'security' ? 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400' :
                    item.category === 'skills' ? 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400' :
                    item.category === 'coordination' ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400' :
                    item.category === 'memory' ? 'bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400' :
                    'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}>
                    {item.category === 'security' ? '🔒' :
                     item.category === 'skills' ? '📦' :
                     item.category === 'coordination' ? '🔄' :
                     item.category === 'memory' ? '🧠' : '📋'}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
                    {item.itemType === 'agent' ? item.name : item.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`${
                      item.itemType === 'agent'
                        ? (item.tier === 'free' ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-500')
                        : 'text-neutral-500 dark:text-neutral-400'
                    }`}>
                      {item.itemType === 'agent' 
                        ? (item.tier === 'free' ? 'Free' : 'Team')
                        : item.category
                      }
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Trust Score */}
              <div className="flex items-center gap-1" title="Trust score from bot and human ratings">
                <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {item.itemType === 'agent' 
                    ? item.avgScore?.toFixed(1) 
                    : (item.avg_score?.toFixed(1) || 'New')
                  }
                </span>
              </div>
            </div>
            
            {/* Description */}
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3 line-clamp-2">
              {item.itemType === 'agent' ? item.description : (item.problem || item.content?.slice(0, 100))}
            </p>
            
            {/* Stats */}
            <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400 mb-3">
              <span title="Times added">
                ↓ {item.itemType === 'agent' ? item.importCount : item.import_count || 0}
              </span>
              <span title="Ratings">
                ★ {item.itemType === 'agent' ? item.assessmentCount : item.assessment_count || 0}
              </span>
              {item.itemType === 'pattern' && item.author_agent && (
                <span title="Author" className="flex items-center gap-1">
                  by {item.author_agent.name}
                  {item.author_agent.trust_tier === 1 && (
                    <span className="text-amber-500">✓</span>
                  )}
                </span>
              )}
            </div>
            
            {/* Action */}
            {item.itemType === 'agent' ? (
              <button
                onClick={() => item.name && item.description && item.emoji && handleAddToTeam({
                  id: item.id,
                  name: item.name,
                  emoji: item.emoji,
                  description: item.description,
                  tier: item.tier || 'free',
                })}
                className="w-full py-2 px-4 rounded-lg text-sm font-medium transition bg-blue-600 hover:bg-blue-700 text-white"
              >
                Add to Team
              </button>
            ) : (
              <AddToCommandButton 
                patternId={item.id} 
                patternTitle={item.title || 'Pattern'}
                onSuccess={(message) => {
                  setSuccessMessage(message)
                  setTimeout(() => setSuccessMessage(null), 3000)
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-neutral-500 dark:text-neutral-400 mb-4">
            No items found. Be the first to contribute!
          </p>
          <Link href="/patterns/new" className="btn btn-primary">
            + Contribute
          </Link>
        </div>
      )}

      {/* AddAgentModal */}
      {selectedAgent && (
        <AddAgentModal
          agent={selectedAgent}
          isOpen={modalOpen}
          onClose={handleCloseModal}
          onAdd={handleAdd}
          isTeamPlan={isTeamPlan}
        />
      )}
    </>
  )
}
