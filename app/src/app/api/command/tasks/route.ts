import { getAuthenticatedAdmin } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { decrypt } from '@/lib/crypto'

// GET /api/command/tasks - Get tasks for current user (decrypted)
export async function GET() {
  try {
    const auth = await getAuthenticatedAdmin()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { adminClient, account } = auth

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
