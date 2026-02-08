'use client'

import { Activity } from '@/lib/mission-control'

interface ActivityFeedProps {
  activities: Activity[]
}

const activityIcons: Record<string, string> = {
  heartbeat: '💓',
  task_created: '✨',
  task_updated: '✏️',
  task_assigned: '👉',
  comment: '💬',
  status_change: '🔄',
  blocked: '🚫',
  unblocked: '✅'
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="space-y-3">
      {activities.map(activity => (
        <div key={activity.id} className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
          <div className="flex-shrink-0 text-lg">
            {activityIcons[activity.type] || '•'}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              {activity.agent && (
                <span className="font-medium text-gray-900 text-sm">
                  {activity.agent.emoji} {activity.agent.name}
                </span>
              )}
              <span className="text-xs text-gray-500">
                {getTimeAgo(new Date(activity.created_at))}
              </span>
            </div>
            
            <p className="text-sm text-gray-700 mt-0.5">
              {activity.message}
            </p>

            {activity.task && (
              <div className="mt-1 text-xs text-gray-500">
                on <span className="font-medium">{activity.task.title}</span>
              </div>
            )}
          </div>
        </div>
      ))}

      {activities.length === 0 && (
        <div className="text-center text-gray-400 text-sm py-8">
          No recent activity
        </div>
      )}
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
