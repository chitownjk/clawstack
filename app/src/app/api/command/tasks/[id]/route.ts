import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { encrypt } from '@/lib/crypto'

const VALID_STATUSES = ['inbox', 'assigned', 'in_progress', 'review', 'done', 'blocked', 'error']
const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent']

// PATCH /api/command/tasks/[id] - Update a task
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    const body = await request.json()
    const adminClient = createAdminClient()

    // Get user session
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get account
    const { data: account } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Verify task belongs to this account
    const { data: task, error: taskError } = await adminClient
      .from('mc_tasks')
      .select('id, account_id')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.account_id !== account.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build update object from allowed fields
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (body.status) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
      }
      updateData.status = body.status
      if (body.status === 'done') {
        updateData.completed_at = new Date().toISOString()
      }
    }

    if (body.priority) {
      if (!VALID_PRIORITIES.includes(body.priority)) {
        return NextResponse.json({ error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` }, { status: 400 })
      }
      updateData.priority = body.priority
    }

    if (body.title !== undefined) {
      updateData.title = body.title ? encrypt(body.title) : body.title
    }

    if (body.description !== undefined) {
      updateData.description = body.description ? encrypt(body.description) : body.description
    }

    if (body.due_date !== undefined) {
      updateData.due_date = body.due_date
    }

    if (body.assigned_human !== undefined) {
      updateData.assigned_human = body.assigned_human
    }

    if (body.tags !== undefined) {
      updateData.tags = body.tags
    }

    if (body.position !== undefined) {
      updateData.position = body.position
    }

    const { data: updated, error: updateError } = await adminClient
      .from('mc_tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating task:', updateError)
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update task error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/command/tasks/[id] - Delete a task
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    const adminClient = createAdminClient()

    // Get user session
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get account
    const { data: account } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Verify task belongs to this account
    const { data: task, error: taskError } = await adminClient
      .from('mc_tasks')
      .select('id, account_id')
      .eq('id', taskId)
      .single()
    
    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    
    if (task.account_id !== account.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Delete associated comments first
    await adminClient
      .from('mc_comments')
      .delete()
      .eq('task_id', taskId)
    
    // Delete associated activities
    await adminClient
      .from('mc_activities')
      .delete()
      .eq('task_id', taskId)
    
    // Delete the task
    const { error: deleteError } = await adminClient
      .from('mc_tasks')
      .delete()
      .eq('id', taskId)
    
    if (deleteError) {
      console.error('Error deleting task:', deleteError)
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Delete task error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
