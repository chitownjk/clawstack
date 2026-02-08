import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { decrypt } from '@/lib/crypto'

// GET /api/command/tasks - Get tasks for current user (decrypted)
export async function GET() {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get account ID
    const adminClient = createAdminClient()
    const { data: account } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Get tasks for this account
    const { data: tasks, error } = await adminClient
      .from('mc_tasks')
      .select('*')
      .eq('account_id', account.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    // Decrypt sensitive fields
    const decryptedTasks = (tasks || []).map(task => ({
      ...task,
      title: task.title ? decrypt(task.title) : task.title,
      description: task.description ? decrypt(task.description) : task.description,
    }))

    return NextResponse.json(decryptedTasks)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
