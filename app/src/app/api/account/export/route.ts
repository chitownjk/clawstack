import { NextRequest, NextResponse } from 'next/server'
import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createRealSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const adminClient = createAdminClient()

    // Get account
    const { data: account } = await adminClient
      .from('accounts')
      .select('id, email, name, tier, created_at')
      .eq('auth_uid', user.id)
      .single()

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Get all user data
    const [agents, tasks, comments, activities] = await Promise.all([
      adminClient
        .from('mc_agents')
        .select('*')
        .eq('account_id', account.id),
      adminClient
        .from('mc_tasks')
        .select('*')
        .eq('account_id', account.id),
      adminClient
        .from('mc_comments')
        .select('*')
        .eq('account_id', account.id),
      adminClient
        .from('mc_activities')
        .select('*')
        .eq('account_id', account.id)
    ])

    // Build export object
    const exportData = {
      exported_at: new Date().toISOString(),
      account: {
        email: account.email,
        name: account.name,
        tier: account.tier,
        created_at: account.created_at
      },
      agents: agents.data || [],
      tasks: tasks.data || [],
      comments: comments.data || [],
      activities: activities.data || [],
      stats: {
        total_agents: agents.data?.length || 0,
        total_tasks: tasks.data?.length || 0,
        total_comments: comments.data?.length || 0,
        total_activities: activities.data?.length || 0
      }
    }

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="tiker-export-${new Date().toISOString().split('T')[0]}.json"`
      }
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}
