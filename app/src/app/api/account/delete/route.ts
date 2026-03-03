import { NextRequest, NextResponse } from 'next/server'
import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'

export async function DELETE(request: NextRequest) {
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

    // Require confirmation in request body
    const body = await request.json().catch(() => ({}))
    if (body.confirm !== 'DELETE') {
      return NextResponse.json(
        { error: 'Confirmation required. Send { "confirm": "DELETE" }' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Get account
    const { data: account } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', user.id)
      .single()

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Delete in order (respecting foreign keys)
    // Activities and comments first (they reference tasks/agents)
    await adminClient
      .from('mc_activities')
      .delete()
      .eq('account_id', account.id)

    await adminClient
      .from('mc_comments')
      .delete()
      .eq('account_id', account.id)

    // Tasks (may be referenced by agents via current_task_id)
    await adminClient
      .from('mc_tasks')
      .delete()
      .eq('account_id', account.id)

    // Agents
    await adminClient
      .from('mc_agents')
      .delete()
      .eq('account_id', account.id)

    // Bots (if they exist)
    await adminClient
      .from('bots')
      .delete()
      .eq('account_id', account.id)

    // Service purchases (if they exist)
    try {
      await adminClient
        .from('service_purchases')
        .delete()
        .eq('account_id', account.id)
    } catch {
      // Table may not exist
    }

    // Finally, delete the account
    await adminClient
      .from('accounts')
      .delete()
      .eq('id', account.id)

    // Sign out the user from Supabase Auth
    await supabase.auth.signOut()

    return NextResponse.json({
      success: true,
      message: 'Account and all data deleted'
    })
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}
