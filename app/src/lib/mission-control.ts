// Command API client
// Note: Encryption/decryption happens server-side in API routes
import { createClient } from '@/lib/supabase'

export type AgentStatus = 'idle' | 'active' | 'blocked'
export type TaskStatus = 'inbox' | 'assigned' | 'in_progress' | 'review' | 'done' | 'blocked' | 'error'
export type ActivityType = 'heartbeat' | 'task_created' | 'task_updated' | 'task_assigned' | 'comment' | 'status_change' | 'blocked' | 'unblocked'

export interface Agent {
  id: string
  name: string
  session_key: string
  role: string
  level: 'intern' | 'specialist' | 'lead'
  emoji: string
  avatar_url?: string
  status: AgentStatus
  current_task_id?: string
  last_heartbeat?: string
  created_at: string
  updated_at: string
  account_id?: string
}

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  assigned_agent_ids: string[]
  created_by_agent_id?: string
  tags: string[]
  priority: 'low' | 'normal' | 'high' | 'urgent' | 'now' | 'soon' | 'later'
  created_at: string
  updated_at: string
  completed_at?: string
  account_id?: string
  // New fields for consumer views (optional for backward compatibility)
  due_date?: string
  assigned_human?: string
  position?: number
  time_block?: boolean
}

export interface Comment {
  id: string
  task_id: string
  agent_id: string
  content: string
  created_at: string
  agent?: Agent
  account_id?: string
}

export interface Activity {
  id: string
  agent_id?: string
  type: ActivityType
  message: string
  task_id?: string
  metadata?: any
  created_at: string
  agent?: Agent
  task?: Task
  account_id?: string
}

// Get current user's account ID
export async function getCurrentAccountId(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user?.email) return null
  
  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('email', user.email)
    .single()
  
  return account?.id || null
}

// Fetch via API routes (handles server-side decryption)
export async function getAgents(): Promise<Agent[]> {
  const response = await fetch('/api/command/agents')
  if (!response.ok) throw new Error('Failed to fetch agents')
  return response.json()
}

export async function getTasks(): Promise<Task[]> {
  const response = await fetch('/api/command/tasks')
  if (!response.ok) throw new Error('Failed to fetch tasks')
  return response.json()
}

export async function getActivities(limit = 50): Promise<Activity[]> {
  const response = await fetch(`/api/command/activities?limit=${limit}`)
  if (!response.ok) throw new Error('Failed to fetch activities')
  return response.json()
}

export async function getTaskComments(taskId: string): Promise<Comment[]> {
  const response = await fetch(`/api/command/comments?taskId=${taskId}`)
  if (!response.ok) throw new Error('Failed to fetch comments')
  return response.json()
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('mc_tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .select()
  
  if (error) throw error
  
  return data
}

export async function updateTaskAssignees(taskId: string, agentIds: string[]) {
  const supabase = createClient()
  const { error } = await supabase
    .from('mc_tasks')
    .update({ 
      assigned_agent_ids: agentIds,
      status: agentIds.length > 0 ? 'assigned' : 'inbox',
      updated_at: new Date().toISOString() 
    })
    .eq('id', taskId)
  
  if (error) throw error
}

export async function createTask(task: {
  title: string
  description?: string
  assigned_agent_ids?: string[]
  tags?: string[]
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}): Promise<Task> {
  const response = await fetch('/api/command/tasks/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
    credentials: 'include', // Required for 2FA cookie
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create task')
  }
  return response.json()
}

export async function createComment(taskId: string, content: string, agentId?: string): Promise<Comment> {
  const response = await fetch('/api/command/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId, content, agentId }),
    credentials: 'include', // Required for 2FA cookie
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || error.error || 'Failed to create comment')
  }
  return response.json()
}

// Delete a task
export async function deleteTask(taskId: string): Promise<void> {
  const response = await fetch(`/api/command/tasks/${taskId}`, {
    method: 'DELETE',
    credentials: 'include', // Required for 2FA cookie
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete task')
  }
}

// Create a default agent for new users
export async function createDefaultAgent(name: string, emoji: string, role: string) {
  const supabase = createClient()
  
  const accountId = await getCurrentAccountId()
  if (!accountId) {
    throw new Error('Not authenticated')
  }
  
  const { data, error } = await supabase
    .from('mc_agents')
    .insert({
      name,
      session_key: `agent:${accountId}:${name.toLowerCase()}`,
      role,
      level: 'specialist',
      emoji,
      status: 'idle',
      account_id: accountId
    })
    .select()
    .single()
  
  if (error) throw error
  return data as Agent
}
