'use client'

import { Agent } from '@/lib/mission-control'

interface AgentCardProps {
  agent: Agent
}

const statusColors = {
  idle: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700'
}

const levelBadges = {
  intern: { label: 'INT', color: 'bg-blue-100 text-blue-700' },
  specialist: { label: 'SPC', color: 'bg-purple-100 text-purple-700' },
  lead: { label: 'LEAD', color: 'bg-orange-100 text-orange-700' }
}

export default function AgentCard({ agent }: AgentCardProps) {
  const lastHeartbeat = agent.last_heartbeat 
    ? new Date(agent.last_heartbeat)
    : null
  
  const timeSinceHeartbeat = lastHeartbeat
    ? Math.floor((Date.now() - lastHeartbeat.getTime()) / 1000 / 60) // minutes
    : null

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-xl">
          {agent.emoji}
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">{agent.name}</h3>
          <span className={`text-xs px-2 py-0.5 rounded ${levelBadges[agent.level].color}`}>
            {levelBadges[agent.level].label}
          </span>
        </div>
        <p className="text-xs text-gray-600 truncate">{agent.role}</p>
      </div>
      
      <div className="flex-shrink-0">
        <div className={`text-xs px-2 py-1 rounded-full ${statusColors[agent.status]}`}>
          {agent.status.toUpperCase()}
        </div>
        {timeSinceHeartbeat !== null && (
          <div className="text-xs text-gray-500 mt-1 text-right">
            {timeSinceHeartbeat < 1 ? 'now' : `${timeSinceHeartbeat}m ago`}
          </div>
        )}
      </div>
    </div>
  )
}
