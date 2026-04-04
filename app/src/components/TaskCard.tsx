'use client'

import { Task, Agent } from '@/lib/mission-control'
import { useDraggable } from '@dnd-kit/core'
import { useState } from 'react'

interface TaskCardProps {
  task: Task
  agents: Agent[]
  onClick: () => void
  onMarkDone?: (taskId: string) => void
  onDelete?: (taskId: string) => void
  showActions?: boolean
}

const priorityColors: Record<string, string> = {
  low: 'border-l-gray-300',
  normal: 'border-l-blue-400',
  high: 'border-l-orange-400',
  urgent: 'border-l-red-500',
  now: 'border-l-red-500',
  soon: 'border-l-yellow-400',
  later: 'border-l-gray-300 dark:border-l-neutral-600'
}

export default function TaskCard({ task, agents, onClick, onMarkDone, onDelete, showActions = true }: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({ id: task.id })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  const assignedAgents = agents.filter(a => task.assigned_agent_ids?.includes(a.id))
  const timeAgo = getTimeAgo(new Date(task.created_at))
  const isDone = task.status === 'done'
  const isReview = task.status === 'review'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`border-l-4 ${priorityColors[task.priority]} rounded-lg p-3 hover:shadow-md transition-shadow relative cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : ''} ${
        isReview
          ? 'bg-purple-50 dark:bg-purple-950/20 ring-1 ring-purple-300 dark:ring-purple-700'
          : 'bg-white dark:bg-neutral-800'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Action buttons - appear on hover */}
      {showActions && isHovered && !isDragging && (
        <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
          {!isDone && onMarkDone && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onMarkDone(task.id)
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-1.5 bg-green-100 dark:bg-green-900/40 hover:bg-green-200 dark:hover:bg-green-800/50 text-green-600 dark:text-green-400 rounded-md transition-colors"
              title="Mark as done"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(task.id)
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-1.5 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-800/50 text-red-600 dark:text-red-400 rounded-md transition-colors"
              title="Delete task"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Clickable card area */}
      <div onClick={onClick} className="cursor-pointer">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-medium text-gray-900 dark:text-neutral-100 text-sm flex-1">{task.title}</h3>
        </div>

        {isReview && (
          <div className="flex items-center gap-1 mb-1">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-[10px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              AI done - needs review
            </span>
          </div>
        )}

        {task.description && (
          <p className="text-xs text-gray-600 dark:text-neutral-400 mb-2 line-clamp-2">{task.description}</p>
        )}

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            {assignedAgents.map(agent => (
              <span key={agent.id} className="text-sm" title={agent.name}>
                {agent.emoji}
              </span>
            ))}
          </div>

          <span className="text-xs text-gray-500 dark:text-neutral-500">{timeAgo}</span>
        </div>

        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {task.tags.map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
