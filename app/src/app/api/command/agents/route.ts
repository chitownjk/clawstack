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

    // Unified: All users fetch from account_agent_templates
    const { data: agentTemplates, error } = await adminClient
      .from('account_agent_templates')
      .select('*')
      .eq('account_id', account.id)
      .order('name')

    if (error) {
      console.error('Error fetching agent templates:', error)
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
    }

    // Transform to Agent format for Command UI
    const agents = (agentTemplates || []).map((template: any) => ({
      id: template.id,
      name: template.name,
      session_key: template.agent_id, // Reference to available_agents
      role: template.personality || '',
      level: 'specialist' as const,
      emoji: template.emoji || '🤖',
      status: 'idle' as const,
      created_at: template.created_at,
      updated_at: template.updated_at,
      account_id: template.account_id,
    }))

    return NextResponse.json(agents)
  } catch (error) {
    console.error('Error fetching agents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
