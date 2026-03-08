import { NextResponse } from 'next/server';
import { createRealSupabaseClient } from '@/lib/supabase-server';
import { getComposioConnectionStatuses } from '@/lib/composio';
import { getQuickActions, getWorkflowTemplates, QUICK_ACTIONS, WORKFLOW_TEMPLATES } from '@/lib/action-registry';

export async function GET() {
  try {
    const supabase = await createRealSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const composioUserId = `tiker_${session.user.id}`;

    // Get connection statuses
    const statuses = await getComposioConnectionStatuses(composioUserId);
    const connectedServices = Object.entries(statuses)
      .filter(([_, s]) => s.connected)
      .map(([key]) => key);

    // Get available actions (only for connected services)
    const quickActions = getQuickActions(connectedServices);
    const workflows = getWorkflowTemplates(connectedServices);

    // Get suggested actions (for unconnected services)
    const suggestedQuick = QUICK_ACTIONS
      .filter(a => !connectedServices.includes(a.service))
      .map(a => ({ ...a, needsConnection: true }));
    const suggestedWorkflows = WORKFLOW_TEMPLATES
      .filter(t => !connectedServices.includes(t.service))
      .map(t => ({ ...t, needsConnection: true }));

    return NextResponse.json({
      quick_actions: quickActions,
      workflows,
      suggested: {
        quick_actions: suggestedQuick,
        workflows: suggestedWorkflows,
      },
      connected_services: connectedServices,
    });
  } catch (error: unknown) {
    console.error('Error fetching available actions:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch actions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
