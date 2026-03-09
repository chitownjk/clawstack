import { getAuthenticatedAdmin } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { encrypt } from '@/lib/crypto'
import { createTaskSchema, validateBody } from '@/lib/validation'

// POST /api/command/tasks/create - Create a new task (encrypts sensitive fields)
export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedAdmin()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { adminClient, account } = auth
    const body = await request.json()

    const validation = validateBody(createTaskSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { title, description, assigned_agent_ids, tags, priority } = validation.data

    // Create task with encrypted fields
    const { data: task, error } = await adminClient
      .from('mc_tasks')
      .insert({
        title: encrypt(title),
        description: description ? encrypt(description) : null,
        assigned_agent_ids,
        tags,
        priority,
        status: assigned_agent_ids.length > 0 ? 'assigned' : 'inbox',
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

    // Return with decrypted fields for immediate use
    return NextResponse.json({
      ...task,
      title,
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
