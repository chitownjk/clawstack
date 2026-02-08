'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface HubItem {
  id: string
  itemType: 'agent' | 'pattern'
  // Agent fields
  name?: string
  emoji?: string
  description?: string
  tier?: string
  avgScore?: number
  importCount?: number
  assessmentCount?: number
  // Pattern fields
  title?: string
  category?: string
  problem?: string
  content?: string
  avg_score?: number
  import_count?: number
  assessment_count?: number
  author_agent?: {
    name: string
    trust_tier: number
  }
}

interface HubItemCardProps {
  item: HubItem
}

export default function HubItemCard({ item }: HubItemCardProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const handleAdd = async () => {
    setIsLoading(true)
    setToast(null)

    try {
      const response = await fetch('/api/hub/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: item.itemType,
          id: item.id,
          // For agents, customizations can be passed here
          // For now, we pass through without modal
          customizations: item.itemType === 'agent' ? {} : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          // Redirect to login
          router.push('/login?redirect=/hub')
          return
        }
        throw new Error(data.error || 'Failed to add item')
      }

      // Show success toast
      setToast({
        message: data.message || 'Added to Command!',
        type: 'success',
      })

      // Clear toast and optionally redirect after delay
      setTimeout(() => {
        setToast(null)
        // Uncomment to auto-redirect to Command:
        // router.push('/command')
      }, 3000)
    } catch (error) {
      console.error('Error adding item:', error)
      setToast({
        message: error instanceof Error ? error.message : 'Failed to add item',
        type: 'error',
      })
      setTimeout(() => setToast(null), 4000)
    } finally {
      setIsLoading(false)
    }
  }

  const displayName = item.itemType === 'agent' ? item.name : item.title
  const displayDescription = item.itemType === 'agent' 
    ? item.description 
    : (item.problem || item.content?.slice(0, 100))
  const score = item.itemType === 'agent' ? item.avgScore : item.avg_score
  const imports = item.itemType === 'agent' ? item.importCount : item.import_count
  const assessments = item.itemType === 'agent' ? item.assessmentCount : item.assessment_count

  return (
    <div
      className={`card p-5 relative ${
        item.itemType === 'agent' && item.tier === 'free' 
          ? 'border-2 border-blue-200 dark:border-blue-800' 
          : ''
      }`}
    >
      {/* Toast notification */}
      {toast && (
        <div
          className={`absolute top-2 left-2 right-2 px-3 py-2 rounded-lg text-sm font-medium z-10 ${
            toast.type === 'success'
              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
          }`}
        >
          {toast.message}
        </div>
      )}

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
              {displayName}
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
            {score?.toFixed(1) || 'New'}
          </span>
        </div>
      </div>
      
      {/* Description */}
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3 line-clamp-2">
        {displayDescription}
      </p>
      
      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400 mb-3">
        <span title="Times added">
          ↓ {imports || 0}
        </span>
        <span title="Ratings">
          ★ {assessments || 0}
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
      
      {/* Action Button */}
      <button
        onClick={handleAdd}
        disabled={isLoading}
        className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition ${
          isLoading
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
        ) : (
          item.itemType === 'agent' ? 'Add to Team' : 'Add to Command'
        )}
      </button>
    </div>
  )
}
