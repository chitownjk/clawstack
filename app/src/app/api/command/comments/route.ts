import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { decrypt, encrypt } from '@/lib/crypto'

// GET /api/command/comments?taskId=xxx - Get comments for a task (decrypted)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json({ error: 'taskId required' }, { status: 400 })
    }

    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get comments for this task
    const { data: comments, error } = await adminClient
      .from('mc_comments')
      .select(`
        *,
        agent:mc_agents(name, emoji)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
    }

    // Decrypt content
    const decryptedComments = (comments || []).map(comment => ({
      ...comment,
      content: comment.content ? decrypt(comment.content) : comment.content,
    }))

    return NextResponse.json(decryptedComments)
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Parse @mentions from comment content
 * Returns array of {type, id, name} for each valid mention
 */
async function parseMentions(
  content: string, 
  accountId: string, 
  adminClient: ReturnType<typeof createAdminClient>
): Promise<Array<{type: 'agent' | 'user', id: string, name: string}>> {
  // Match @mentions - handles @Name and @"Name with spaces"
  const mentionPattern = /@(?:"([^"]+)"|(\w+))/g
  const mentionNames: string[] = []
  let match
  
  while ((match = mentionPattern.exec(content)) !== null) {
    const name = match[1] || match[2] // quoted or unquoted
    if (name) mentionNames.push(name.toLowerCase())
  }
  
  if (mentionNames.length === 0) return []
  
  // Get all agents for this account
  const { data: agents } = await adminClient
    .from('mc_agents')
    .select('id, name')
    .eq('account_id', accountId)
  
  const mentions: Array<{type: 'agent' | 'user', id: string, name: string}> = []
  
  for (const mentionName of mentionNames) {
    // Find matching agent (case-insensitive)
    const agent = agents?.find(a => a.name.toLowerCase() === mentionName)
    if (agent) {
      // Avoid duplicates
      if (!mentions.some(m => m.id === agent.id)) {
        mentions.push({
          type: 'agent',
          id: agent.id,
          name: agent.name
        })
      }
    }
  }
  
  return mentions
}

// POST /api/command/comments - Create a new comment (encrypts content)
export async function POST(request: Request) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { taskId, content, agentId } = await request.json()

    if (!taskId || !content) {
      return NextResponse.json({ error: 'taskId and content required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Get account ID
    const { data: account } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Parse @mentions from content
    const mentions = await parseMentions(content, account.id, adminClient)

    // If no agentId provided, find or create a "You" agent
    let finalAgentId = agentId
    if (!finalAgentId) {
      const { data: youAgent } = await adminClient
        .from('mc_agents')
        .select('id')
        .eq('name', 'You')
        .eq('account_id', account.id)
        .single()

      if (youAgent) {
        finalAgentId = youAgent.id
      } else {
        // Create "You" agent
        const { data: newAgent } = await adminClient
          .from('mc_agents')
          .insert({
            name: 'You',
            session_key: `user:${account.id}`,
            role: 'Human operator',
            level: 'lead',
            emoji: '👤',
            status: 'active',
            account_id: account.id
          })
          .select('id')
          .single()
        
        if (newAgent) finalAgentId = newAgent.id
      }
    }

    if (!finalAgentId) {
      return NextResponse.json({ error: 'Unable to determine agent for comment' }, { status: 400 })
    }

    // Create comment with encrypted content and mentions
    const { data: comment, error } = await adminClient
      .from('mc_comments')
      .insert({
        task_id: taskId,
        agent_id: finalAgentId,
        content: encrypt(content),
        mentions: mentions,
        account_id: account.id
      })
      .select(`
        *,
        agent:mc_agents(name, emoji)
      `)
      .single()

    if (error) {
      console.error('Failed to create comment:', error)
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
    }

    // Return decrypted for immediate use
    return NextResponse.json({
      ...comment,
      content: content, // Return original, not encrypted
      mentions: mentions,
    })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
