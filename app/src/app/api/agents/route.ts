import { NextRequest, NextResponse } from 'next/server';
import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server';

// GET /api/agents - List available agents with enabled status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRealSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Get account info
    const { data: account } = await adminClient
      .from('accounts')
      .select('id, plan_tier, execution_mode')
      .eq('auth_uid', user.id)
      .single();

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Self-hosted users shouldn't see this page
    if (account.execution_mode === 'openclaw') {
      return NextResponse.json(
        { error: 'Self-hosted users should use /hub instead' },
        { status: 400 }
      );
    }

    // Get all available agents
    const { data: availableAgents, error: agentsError } = await adminClient
      .from('available_agents')
      .select('*')
      .order('name');

    if (agentsError) throw agentsError;

    // Get user's enabled agents
    const { data: enabledAgents } = await adminClient
      .from('account_agents')
      .select('agent_id, enabled')
      .eq('account_id', account.id);

    const enabledMap = new Map(
      enabledAgents?.map(a => [a.agent_id, a.enabled]) || []
    );

    // Tier hierarchy for gating
    const tierHierarchy: Record<string, number> = {
      free: 0,
      solo: 1,
      developer: 2,
      team: 3,
    };

    const userTierLevel = tierHierarchy[account.plan_tier || 'free'];

    // Merge data
    const agents = availableAgents?.map(agent => {
      const requiredTierLevel = tierHierarchy[agent.required_tier || 'free'];
      const canEnable = userTierLevel >= requiredTierLevel;
      const isEnabled = enabledMap.get(agent.id) === true;

      return {
        ...agent,
        enabled: isEnabled,
        can_enable: canEnable,
        requires_upgrade: !canEnable,
        required_tier_name: agent.required_tier || 'free',
      };
    });

    return NextResponse.json({
      agents,
      account: {
        plan_tier: account.plan_tier,
        execution_mode: account.execution_mode,
      },
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}
