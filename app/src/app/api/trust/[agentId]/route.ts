import { createRealSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Validate UUID format
function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

// Validate agent name format (alphanumeric, underscores, hyphens, spaces)
function isValidAgentName(str: string): boolean {
  return /^[a-zA-Z0-9_\- ]{1,64}$/.test(str)
}

export async function GET(
  request: Request,
  { params }: { params: { agentId: string } }
) {
  const supabase = await createRealSupabaseClient();
  const { agentId } = params;

  // Validate input to prevent query injection
  if (!isValidUUID(agentId) && !isValidAgentName(agentId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid agent identifier' },
      { status: 400 }
    );
  }

  try {
    // Get bot data - use separate queries for safety
    let query = supabase
      .from('bots')
      .select(`
        id,
        name,
        description,
        trust_tier,
        contributions_count,
        assessments_count,
        created_at,
        last_active_at,
        token_balance,
        account_id
      `)
    
    // Query by ID if UUID, otherwise by name
    if (isValidUUID(agentId)) {
      query = query.eq('id', agentId)
    } else {
      query = query.eq('name', agentId)
    }
    
    const { data: agent, error: agentError } = await query.single();

    if (agentError || !agent) {
      return NextResponse.json(
        { success: false, error: 'Bot not found' },
        { status: 404 }
      );
    }

    // Token balance is now on the bot itself
    const tokenData = {
      balance: agent.token_balance || 0,
      lifetime_earned: 0,  // Not tracked at bot level
      lifetime_spent: 0
    };

    // Calculate assessment accuracy
    const { data: assessments } = await supabase
      .from('assessments')
      .select(`
        weighted_score,
        pattern_id,
        patterns!inner(avg_score)
      `)
      .eq('assessor_bot_id', agent.id);

    let accuracy = null;
    let assessmentDetails = null;
    if (assessments && assessments.length > 0) {
      const diffs = assessments
        .filter((a: any) => a.patterns?.avg_score != null)
        .map((a: any) => Math.abs(a.weighted_score - a.patterns.avg_score));

      if (diffs.length > 0) {
        const avgDiff = diffs.reduce((a: number, b: number) => a + b, 0) / diffs.length;
        accuracy = Math.max(0, Math.min(100, (10 - avgDiff) * 10));
        
        assessmentDetails = {
          totalAssessments: assessments.length,
          averageDeviation: avgDiff.toFixed(2),
          accuracyScore: accuracy.toFixed(1),
        };
      }
    }

    // Count vouches
    const { count: vouchesGiven } = await supabase
      .from('vouches')
      .select('*', { count: 'exact', head: true })
      .eq('voucher_account_id', agent.account_id)
      .eq('status', 'active');

    // Calculate overall trust score (0-100)
    // Weighted by: tier (40%), patterns (20%), accuracy (20%), tokens (10%), activity (10%)
    const tierScore = agent.trust_tier === 1 ? 100 : agent.trust_tier === 2 ? 70 : 40;
    const patternsScore = Math.min(100, (agent.contributions_count || 0) * 10);
    const accuracyScore = accuracy || 50;
    const tokensScore = Math.min(100, ((tokenData?.balance || 0) / 100) * 100);
    
    // Activity score: recent activity = higher score
    const daysSinceActive = agent.last_active_at 
      ? Math.floor((Date.now() - new Date(agent.last_active_at).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    const activityScore = Math.max(0, 100 - (daysSinceActive * 2));

    const overallTrustScore = (
      tierScore * 0.4 +
      patternsScore * 0.2 +
      accuracyScore * 0.2 +
      tokensScore * 0.1 +
      activityScore * 0.1
    );

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
      },
      trustScore: Math.round(overallTrustScore),
      breakdown: {
        tier: {
          value: agent.trust_tier,
          label: agent.trust_tier === 1 ? 'Founding' : agent.trust_tier === 2 ? 'Trusted' : 'General',
          score: Math.round(tierScore),
          weight: '40%',
        },
        contributions: {
          value: agent.contributions_count || 0,
          score: Math.round(patternsScore),
          weight: '20%',
        },
        assessmentAccuracy: {
          value: accuracy ? `${accuracy.toFixed(1)}%` : 'N/A',
          score: Math.round(accuracyScore),
          weight: '20%',
          details: assessmentDetails,
        },
        tokens: {
          balance: tokenData?.balance || 0,
          earned: tokenData?.lifetime_earned || 0,
          spent: tokenData?.lifetime_spent || 0,
          score: Math.round(tokensScore),
          weight: '10%',
        },
        activity: {
          lastActive: agent.last_active_at,
          daysSinceActive,
          score: Math.round(activityScore),
          weight: '10%',
        },
        vouches: {
          given: vouchesGiven || 0,
        },
      },
      activeSince: agent.created_at,
      queriedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Trust score error:', error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
