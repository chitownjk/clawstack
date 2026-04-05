#!/usr/bin/env node
// mc-check.js - Check for new Tiker activity since last run
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../app/.env.local') })
const { encrypt, decrypt } = require('./crypto')

const STATE_FILE = '/home/umbrel/.openclaw/workspace/memory/heartbeat-state.json'

// Load state
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
  } catch {
    return { lastMCCheck: null, lastMCCommentsCheck: null }
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  )
  
  const state = loadState()
  const lastCheck = state.lastMCCommentsCheck || new Date(0).toISOString()
  const now = new Date().toISOString()
  
  // Get Bonnie's ID
  const { data: bonnie } = await supabase
    .from('mc_agents')
    .select('id')
    .eq('name', 'Bonnie')
    .single()
  
  if (!bonnie) {
    console.error('Bonnie not found in MC')
    process.exit(1)
  }
  
  // Get tasks assigned to Bonnie
  const { data: tasks } = await supabase
    .from('mc_tasks')
    .select('id, title, status, created_at')
    .contains('assigned_agent_ids', [bonnie.id])
  
  // Check for new inbox items (inbox status, created since last check)
  const newInbox = tasks?.filter(t => 
    t.status === 'inbox' && 
    new Date(t.created_at) > new Date(lastCheck)
  ) || []
  
  // Check for new comments on Bonnie's tasks
  const taskIds = tasks?.map(t => t.id) || []
  let newComments = []
  
  if (taskIds.length > 0) {
    const { data: comments } = await supabase
      .from('mc_comments')
      .select('*, tasks:task_id(title)')
      .in('task_id', taskIds)
      .gt('created_at', lastCheck)
      .order('created_at', { ascending: false })
    
    newComments = comments || []
  }
  
  // Check for @mentions of Bonnie in any comment (even on tasks not assigned to her)
  const { data: mentionComments } = await supabase
    .from('mc_comments')
    .select('*, tasks:task_id(title)')
    .gt('created_at', lastCheck)
    .contains('mentions', [{ id: bonnie.id }])
    .order('created_at', { ascending: false })
  
  // Merge mentions with new comments (avoid duplicates)
  const existingIds = new Set(newComments.map(c => c.id))
  const newMentions = (mentionComments || []).filter(c => !existingIds.has(c.id))
  
  // Check for abandoned tasks (in_progress with no update in 6+ hours)
  const { data: inProgressTasks } = await supabase
    .from('mc_tasks')
    .select(`
      id,
      title,
      status,
      assigned_agent_ids,
      updated_at,
      comments:mc_comments(created_at, agent_name)
    `)
    .eq('status', 'in_progress')
  
  const abandonedTasks = []
  const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000)
  
  for (const task of inProgressTasks || []) {
    // Get the most recent comment time
    const lastCommentTime = task.comments?.length > 0
      ? Math.max(...task.comments.map(c => new Date(c.created_at).getTime()))
      : new Date(task.updated_at).getTime()
    
    const hoursSinceUpdate = (Date.now() - lastCommentTime) / (60 * 60 * 1000)
    
    if (lastCommentTime < sixHoursAgo) {
      abandonedTasks.push({
        id: task.id,
        title: task.title,
        hoursSinceUpdate: Math.floor(hoursSinceUpdate),
        assigned_agent_ids: task.assigned_agent_ids
      })
      
      // Get assigned agent names
      const { data: agents } = await supabase
        .from('mc_agents')
        .select('name')
        .in('id', task.assigned_agent_ids || [])
      
      const agentNames = agents?.map(a => a.name).join(', ') || 'Unknown'
      
      // Check if we've already pinged this task (stored in state)
      const pingKey = `pinged_${task.id}`
      if (!state[pingKey]) {
        // Ping the agent via comment (encrypted)
        await supabase
          .from('mc_comments')
          .insert({
            task_id: task.id,
            agent_name: 'Bonnie',
            content: encrypt(`⏰ @${agentNames} - No update in ${Math.floor(hoursSinceUpdate)} hours. Status check needed.`)
          })
        
        // Mark as pinged
        state[pingKey] = now
      }
    }
  }
  
  // Output results (decrypt sensitive fields)
  const result = {
    newInboxItems: newInbox.map(t => ({ id: t.id, title: decrypt(t.title) })),
    newComments: newComments.map(c => ({
      task: c.tasks?.title ? decrypt(c.tasks.title) : c.task_id,
      content: decrypt(c.content).substring(0, 100),
      created_at: c.created_at
    })),
    newMentions: newMentions.map(c => ({
      task: c.tasks?.title ? decrypt(c.tasks.title) : c.task_id,
      content: decrypt(c.content).substring(0, 100),
      created_at: c.created_at,
      taskId: c.task_id
    })),
    abandonedTasks: abandonedTasks.map(t => ({ ...t, title: decrypt(t.title) })),
    totalAssignedTasks: tasks?.length || 0,
    checkedAt: now
  }
  
  console.log(JSON.stringify(result, null, 2))
  
  // Update state
  state.lastMCCommentsCheck = now
  state.lastMCCheck = now
  saveState(state)
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
