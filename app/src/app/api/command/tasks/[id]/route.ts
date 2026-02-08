import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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
    
    // Get account and check execution mode
    const { data: account } = await adminClient
      .from('accounts')
      .select('id, two_factor_enabled, execution_mode')
      .eq('auth_uid', session.user.id)
      .single()
    
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }
    
    // Check 2FA (only required for self-hosted)
    const isSelfHosted = account.execution_mode === 'openclaw'
    
    if (isSelfHosted) {
      const cookieStore = await cookies()
      const writeAccess = cookieStore.get('tiker_write_access')
      
      if (!account.two_factor_enabled) {
        return NextResponse.json({ 
          error: '2FA_SETUP_REQUIRED',
          message: 'Please enable 2FA in Settings'
        }, { status: 403 })
      }
      
      if (!writeAccess?.value) {
        return NextResponse.json({ 
          error: '2FA_REQUIRED',
          message: 'Please verify 2FA'
        }, { status: 403 })
      }
    }
    // Cloud users have automatic write access
    
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
