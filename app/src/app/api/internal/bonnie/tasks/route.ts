import { NextResponse } from 'next/server'
import { decrypt, encrypt } from '@/lib/crypto'
import { requireBonnieInternalAuth } from '@/lib/bonnie-auth'
import { createTaskSchema, updateTaskSchema, validateBody } from '@/lib/validation'

function toDecryptedTask(task: any) {
  return {
    ...task,
    title: task.title ? decrypt(task.title) : task.title,
    description: task.description ? decrypt(task.description) : task.description,
  }
}

export async function GET(request: Request) {
  const auth = await requireBonnieInternalAuth(request)
  if (!auth.ok) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = Math.min(Number(searchParams.get('limit') || '100'), 200)

    let query = auth.adminClient
      .from('mc_tasks')
      .select('*')
      .eq('account_id', auth.account.id)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: tasks, error } = await query

    if (error) {
      console.error('[Bonnie/Internal Tasks] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    return NextResponse.json((tasks || []).map(toDecryptedTask))
  } catch (error) {
    console.error('[Bonnie/Internal Tasks] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireBonnieInternalAuth(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const validation = validateBody(createTaskSchema, body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { title, description, assigned_agent_ids, tags, priority } = validation.data

    const { data: task, error } = await auth.adminClient
      .from('mc_tasks')
      .insert({
        title: encrypt(title),
        description: description ? encrypt(description) : null,
        assigned_agent_ids,
        tags,
        priority,
        status: assigned_agent_ids.length > 0 ? 'assigned' : 'inbox',
        account_id: auth.account.id,
      })
      .select()
      .single()

    if (error || !task) {
      console.error('[Bonnie/Internal Tasks] Create error:', error)
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    await auth.adminClient.from('mc_comments').insert({
      task_id: task.id,
      content: encrypt('Created by Bonnie via internal API.'),
      account_id: auth.account.id,
    })

    return NextResponse.json(toDecryptedTask(task), { status: 201 })
  } catch (error) {
    console.error('[Bonnie/Internal Tasks] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const auth = await requireBonnieInternalAuth(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const taskId = body?.id

    if (!taskId) {
      return NextResponse.json({ error: 'Task id required' }, { status: 400 })
    }

    const validation = validateBody(updateTaskSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { data: existingTask, error: existingError } = await auth.adminClient
      .from('mc_tasks')
      .select('id, account_id')
      .eq('id', taskId)
      .single()

    if (existingError || !existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (existingTask.account_id !== auth.account.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    const updates = validation.data

    if (updates.status !== undefined) {
      updateData.status = updates.status
      updateData.completed_at = updates.status === 'done' ? new Date().toISOString() : null
    }

    if (updates.priority !== undefined) updateData.priority = updates.priority
    if (updates.title !== undefined) updateData.title = updates.title ? encrypt(updates.title) : updates.title
    if (updates.description !== undefined) updateData.description = updates.description ? encrypt(updates.description) : updates.description
    if (updates.due_date !== undefined) updateData.due_date = updates.due_date
    if (updates.assigned_agent_ids !== undefined) updateData.assigned_agent_ids = updates.assigned_agent_ids
    if (updates.tags !== undefined) updateData.tags = updates.tags

    const { data: updatedTask, error: updateError } = await auth.adminClient
      .from('mc_tasks')
      .update(updateData)
      .eq('id', taskId)
      .select('*')
      .single()

    if (updateError || !updatedTask) {
      console.error('[Bonnie/Internal Tasks] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }

    await auth.adminClient.from('mc_comments').insert({
      task_id: taskId,
      content: encrypt('Updated by Bonnie via internal API.'),
      account_id: auth.account.id,
    })

    return NextResponse.json(toDecryptedTask(updatedTask))
  } catch (error) {
    console.error('[Bonnie/Internal Tasks] PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
