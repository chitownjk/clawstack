import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// GET /api/command/agents - Get agents for current user
export async function GET() {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get account ID and execution mode
    const adminClient = createAdminClient()
    const { data: account } = await adminClient
      .from('accounts')
      .select('id, execution_mode')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    let agents: any[] = []

    // Cloud users: Fetch from available_agents (enabled agents)
    if (account.execution_mode === 'cloud-user-keys' || account.execution_mode === 'cloud-our-keys') {
      const { data: enabledAgents, error } = await adminClient
        .from('account_agents')
        .select(`
          agent_id,
          enabled,
          available_agents (
            id,
            name,
            description,
            icon,
            required_tier,
            required_models,
            tags
          )
        `)
        .eq('account_id', account.id)
        .eq('enabled', true)

      if (error) {
        console.error('Error fetching enabled agents:', error)
        return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
      }

      // Transform to Agent format for Command UI
      agents = (enabledAgents || []).map((ea: any) => ({
        id: ea.available_agents.id,
        name: ea.available_agents.name,
        session_key: ea.available_agents.id, // Use agent ID as session key for cloud
        role: ea.available_agents.description || '',
        level: 'specialist' as const,
        emoji: ea.available_agents.icon || '🤖',
        status: 'idle' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        account_id: account.id,
      }))
    } 
    // Self-hosted users: Fetch from mc_agents (bots/skills)
    else {
      const { data: mcAgents, error } = await adminClient
        .from('mc_agents')
        .select('*')
        .eq('account_id', account.id)
        .order('name')

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
      }

      agents = mcAgents || []
    }

    return NextResponse.json(agents)
  } catch (error) {
    console.error('Error fetching agents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
