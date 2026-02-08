import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { decrypt } from '@/lib/crypto'

// GET /api/command/activities - Get activities for current user (decrypted)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

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

    // Get activities for this account
    const { data: activities, error } = await adminClient
      .from('mc_activities')
      .select(`
        *,
        agent:mc_agents(name, emoji),
        task:mc_tasks(title)
      `)
      .eq('account_id', account.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
    }

    // Decrypt sensitive fields
    const decryptedActivities = (activities || []).map(activity => ({
      ...activity,
      message: activity.message ? decrypt(activity.message) : activity.message,
      task: activity.task ? {
        ...activity.task,
        title: activity.task.title ? decrypt(activity.task.title) : activity.task.title,
      } : activity.task,
    }))

    return NextResponse.json(decryptedActivities)
  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
