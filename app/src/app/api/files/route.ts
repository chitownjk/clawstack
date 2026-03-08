import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/crypto'

// GET /api/files - List files with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get account
    const { data: account } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const taskId = searchParams.get('task_id')
    const search = searchParams.get('search')
    const source = searchParams.get('source') // 'comment' | 'upload' | null
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query
    let query = adminClient
      .from('mc_files')
      .select('*')
      .eq('account_id', account.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (taskId) {
      query = query.eq('task_id', taskId)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Filter by source type
    if (source === 'comment') {
      query = query.eq('metadata->>source', 'comment')
    } else if (source === 'upload') {
      query = query.or('metadata.is.null,metadata->>source.neq.comment')
    }

    const { data: files, error } = await query

    if (error) {
      console.error('[Files/List] Error:', error)
      return NextResponse.json({
        error: 'Failed to fetch files',
        details: error.message
      }, { status: 500 })
    }

    // Enrich files with agent info and task titles
    const enrichedFiles = await enrichFiles(adminClient, files || [])

    // Get storage usage
    const { data: usage } = await adminClient.rpc('get_storage_usage', {
      account_uuid: account.id
    })

    return NextResponse.json({
      files: enrichedFiles,
      usage_bytes: usage || 0,
    })
  } catch (error) {
    console.error('[Files/List] Error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// Enrich file records with agent names/emojis and task titles
async function enrichFiles(
  adminClient: ReturnType<typeof createAdminClient>,
  files: Record<string, unknown>[]
) {
  if (files.length === 0) return files

  // Collect unique agent IDs and task IDs
  const agentIds = new Set<string>()
  const taskIds = new Set<string>()
  for (const f of files) {
    if (f.uploaded_by_agent_id) agentIds.add(f.uploaded_by_agent_id as string)
    if (f.task_id) taskIds.add(f.task_id as string)
  }

  // Fetch agents
  let agentMap: Record<string, { name: string; emoji: string }> = {}
  if (agentIds.size > 0) {
    const { data: agents } = await adminClient
      .from('mc_agents')
      .select('id, name, emoji')
      .in('id', Array.from(agentIds))

    if (agents) {
      for (const a of agents) {
        agentMap[a.id] = { name: a.name, emoji: a.emoji }
      }
    }
  }

  // Fetch task titles
  let taskTitleMap: Record<string, string> = {}
  if (taskIds.size > 0) {
    const { data: tasks } = await adminClient
      .from('mc_tasks')
      .select('id, title')
      .in('id', Array.from(taskIds))

    if (tasks) {
      for (const t of tasks) {
        try {
          taskTitleMap[t.id] = decrypt(t.title)
        } catch {
          taskTitleMap[t.id] = t.title
        }
      }
    }
  }

  // Enrich each file
  return files.map(f => ({
    ...f,
    agent: f.uploaded_by_agent_id ? agentMap[f.uploaded_by_agent_id as string] || null : null,
    task_title: f.task_id ? taskTitleMap[f.task_id as string] || null : null,
  }))
}
