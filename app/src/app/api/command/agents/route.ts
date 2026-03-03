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

    // Try new table first, fall back to old if it doesn't exist
    let agents: any[] = []
    
    // Try account_agent_templates (new unified system) - only active agents
    const { data: agentTemplates, error: templateError } = await adminClient
      .from('account_agent_templates')
      .select('*')
      .eq('account_id', account.id)
      .eq('is_active', true)
      .order('name')

    if (!templateError && agentTemplates) {
      // New system working
      agents = agentTemplates.map((template: any) => ({
        id: template.id,
        name: template.name,
        session_key: template.agent_id,
        role: template.personality || '',
        level: 'specialist' as const,
        emoji: template.emoji || '🤖',
        status: 'idle' as const,
        created_at: template.created_at,
        updated_at: template.updated_at,
        account_id: template.account_id,
      }))
    } else {
      // Fall back to mc_agents (old system)
      console.log('[Agents] Falling back to mc_agents:', templateError?.message)
      const { data: mcAgents, error: mcError } = await adminClient
        .from('mc_agents')
        .select('*')
        .eq('account_id', account.id)
        .order('name')

      if (mcError) {
        console.error('Error fetching mc_agents:', mcError)
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
