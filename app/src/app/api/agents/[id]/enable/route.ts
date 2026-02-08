import { NextRequest, NextResponse } from 'next/server';
import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server';

// POST /api/agents/[id]/enable - Enable an agent
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id;
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

    // Get agent details
    const { data: agent } = await adminClient
      .from('available_agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Check tier requirement
    const tierHierarchy: Record<string, number> = {
      free: 0,
      solo: 1,
      developer: 2,
      team: 3,
    };

    const userTierLevel = tierHierarchy[account.plan_tier || 'free'];
    const requiredTierLevel = tierHierarchy[agent.required_tier || 'free'];

    if (userTierLevel < requiredTierLevel) {
      return NextResponse.json(
        {
          error: 'Upgrade required',
          required_tier: agent.required_tier,
          current_tier: account.plan_tier,
        },
        { status: 403 }
      );
    }

    // Enable agent (upsert)
    const { error: enableError } = await adminClient
      .from('account_agents')
      .upsert({
        account_id: account.id,
        agent_id: agentId,
        enabled: true,
        enabled_at: new Date().toISOString(),
        disabled_at: null,
      });

    if (enableError) throw enableError;

    return NextResponse.json({
      success: true,
      agent_id: agentId,
      enabled: true,
    });
  } catch (error) {
    console.error('Error enabling agent:', error);
    return NextResponse.json(
      { error: 'Failed to enable agent' },
      { status: 500 }
    );
  }
}

// DELETE /api/agents/[id]/enable - Disable an agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id;
    const supabase = await createRealSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Get account info
    const { data: account } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', user.id)
      .single();

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Disable agent
    const { error: disableError } = await adminClient
      .from('account_agents')
      .upsert({
        account_id: account.id,
        agent_id: agentId,
        enabled: false,
        disabled_at: new Date().toISOString(),
      });

    if (disableError) throw disableError;

    return NextResponse.json({
      success: true,
      agent_id: agentId,
      enabled: false,
    });
  } catch (error) {
    console.error('Error disabling agent:', error);
    return NextResponse.json(
      { error: 'Failed to disable agent' },
      { status: 500 }
    );
  }
}
