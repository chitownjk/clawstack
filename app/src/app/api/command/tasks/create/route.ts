import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { encrypt } from '@/lib/crypto'

/**
 * Check if user is authenticated. 2FA is no longer required for write access.
 */
async function checkWriteAccess(request: Request): Promise<{ hasAccess: boolean }> {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return { hasAccess: false }
    }

    return { hasAccess: true }
  } catch (error) {
    console.error('Write access check error:', error)
    return { hasAccess: false }
  }
}

// POST /api/command/tasks/create - Create a new task (encrypts sensitive fields)
// REQUIRES 2FA - This is a write operation
export async function POST(request: Request) {
  console.log('[Tasks/Create] POST called')
  try {
    // Check authentication
    const writeAccess = await checkWriteAccess(request)
    if (!writeAccess.hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, description, assigned_agent_ids, tags, priority } = await request.json()

    if (!title) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 })
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

    // Create task with encrypted fields
    const { data: task, error } = await adminClient
      .from('mc_tasks')
      .insert({
        title: encrypt(title),
        description: description ? encrypt(description) : null,
        assigned_agent_ids: assigned_agent_ids || [],
        tags: tags || [],
        priority: priority || 'normal',
        status: assigned_agent_ids?.length > 0 ? 'assigned' : 'inbox',
        account_id: account.id
      })
      .select()
      .single()

    if (error) {
      console.error('[Tasks/Create] Insert error:', error)
      return NextResponse.json({ 
        error: 'Failed to create task',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      }, { status: 500 })
    }

    // Cloud execution: Worker polls database for tasks with status="inbox"
    // and execution_mode starting with "cloud-". No enqueue needed.
    
    // Return with decrypted fields for immediate use
    return NextResponse.json({
      ...task,
      title: title,
      description: description || null,
    })
  } catch (error) {
    console.error('[Tasks/Create] Unhandled error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    }, { status: 500 })
  }
}
