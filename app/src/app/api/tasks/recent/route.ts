import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { decrypt } from '@/lib/crypto'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get account
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('auth_uid', user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Get recent tasks
    const { data: tasks } = await supabase
      .from('mc_tasks')
      .select('id, title, status, created_at')
      .eq('account_id', account.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Decrypt titles server-side
    const decryptedTasks = (tasks || []).map(task => ({
      ...task,
      title: task.title ? decrypt(task.title) : 'Untitled'
    }))

    return NextResponse.json(decryptedTasks)
  } catch (error) {
    console.error('Recent tasks error:', error)
    return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 })
  }
}
