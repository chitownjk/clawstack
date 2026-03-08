import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { encrypt } from '@/lib/crypto'

// POST /api/email/action-to-task
// Converts an extracted action_item into a task on the user's board.
// Body: { extracted_item_id, title?, due_date?, priority? }
export async function POST(request: Request) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: account } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const body = await request.json()
    const { extracted_item_id, title, due_date, priority } = body

    if (!extracted_item_id) {
      return NextResponse.json({ error: 'extracted_item_id required' }, { status: 400 })
    }

    // Fetch the extracted item
    const { data: item, error: itemError } = await adminClient
      .from('extracted_items')
      .select('*')
      .eq('id', extracted_item_id)
      .eq('account_id', account.id)
      .single()

    if (itemError || !item) {
      return NextResponse.json({ error: 'Extracted item not found' }, { status: 404 })
    }

    // Build task title from extraction data or user override
    const taskTitle = title || item.title || `Action: ${item.data?.description || 'From email'}`
    const taskDescription = buildTaskDescription(item)

    // Create the task
    const { data: task, error: taskError } = await adminClient
      .from('mc_tasks')
      .insert({
        account_id: account.id,
        title: encrypt(taskTitle),
        description: encrypt(taskDescription),
        status: 'todo',
        priority: priority || (item.data?.urgency === 'high' ? 'high' : 'medium'),
        due_date: due_date || item.data?.deadline || item.expires_at || null,
        source: 'email_extraction',
        metadata: {
          extracted_item_id: item.id,
          source_email_id: item.source_id,
          extraction_type: item.type,
        },
      })
      .select()
      .single()

    if (taskError) {
      console.error('[ActionToTask] Task creation failed:', taskError)
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    // Mark the extracted item as processed
    await adminClient
      .from('extracted_items')
      .update({ processed: true })
      .eq('id', extracted_item_id)

    // Log activity
    await adminClient.from('mc_activities').insert({
      account_id: account.id,
      type: 'task_created',
      message: encrypt(`Task created from email action item: ${taskTitle}`),
      metadata: { task_id: task.id, source: 'email_extraction' },
    })

    return NextResponse.json({
      success: true,
      task_id: task.id,
      title: taskTitle,
    })
  } catch (error) {
    console.error('[ActionToTask] Error:', error)
    return NextResponse.json({ error: 'Failed to convert action item' }, { status: 500 })
  }
}

function buildTaskDescription(item: any): string {
  const parts: string[] = []

  if (item.data?.description) {
    parts.push(item.data.description)
  }

  if (item.data?.from_person) {
    parts.push(`From: ${item.data.from_person}`)
  }

  if (item.data?.deadline) {
    parts.push(`Deadline: ${item.data.deadline}`)
  }

  parts.push(`\n---\nAuto-created from email extraction on ${new Date().toLocaleDateString()}`)

  return parts.join('\n')
}
