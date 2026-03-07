'use client'

import { Task, Agent, TaskStatus } from '@/lib/mission-control'
import TaskCard from './TaskCard'
import { useDroppable } from '@dnd-kit/core'

interface KanbanColumnProps {
  status: TaskStatus
  title: string
  tasks: Task[]
  agents: Agent[]
  onTaskClick: (task: Task) => void
  onMarkDone?: (taskId: string) => void
  onDelete?: (taskId: string) => void
}

const columnColors: Record<TaskStatus, string> = {
  inbox: 'border-gray-300 dark:border-neutral-600',
  assigned: 'border-orange-400',
  in_progress: 'border-blue-500',
  review: 'border-purple-500',
  error: 'border-red-600',
  done: 'border-green-500',
  blocked: 'border-red-500'
}

export default function KanbanColumn({ status, title, tasks, agents, onTaskClick, onMarkDone, onDelete }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const needsAttention = status === 'review' && tasks.length > 0

  return (
    <div className="flex-1 min-w-[260px] w-[260px] sm:min-w-[280px] sm:w-[280px]">
      <div className={`border-t-4 ${columnColors[status]} ${needsAttention ? 'ring-2 ring-orange-400 shadow-lg' : ''} bg-white dark:bg-neutral-900 rounded-lg p-4`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`font-semibold uppercase text-sm tracking-wide ${needsAttention ? 'text-orange-600' : 'text-gray-900 dark:text-neutral-100'}`}>
            {title}
            {needsAttention && ' ⚠️'}
          </h2>
          <span className={`text-sm font-medium ${needsAttention ? 'bg-orange-500 text-white px-2 py-1 rounded-full' : 'text-gray-500 dark:text-neutral-400'}`}>
            {tasks.length}
          </span>
        </div>

        <div
          ref={setNodeRef}
          className={`min-h-[400px] space-y-3 rounded-lg transition-colors ${isOver ? 'bg-blue-50 dark:bg-blue-950/20 ring-2 ring-blue-400' : ''}`}
        >
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              agents={agents}
              onClick={() => onTaskClick(task)}
              onMarkDone={onMarkDone}
              onDelete={onDelete}
            />
          ))}

          {tasks.length === 0 && (
            <div className="text-center text-gray-400 dark:text-neutral-500 text-sm py-16">
              {isOver ? 'Drop here' : 'No tasks'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
