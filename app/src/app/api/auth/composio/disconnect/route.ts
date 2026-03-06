import { NextRequest, NextResponse } from 'next/server';
import { createRealSupabaseClient } from '@/lib/supabase-server';
import { getComposioConnectionStatuses, disconnectComposioConnection } from '@/lib/composio';

export async function POST(request: NextRequest) {
  try {
    const { toolkit } = await request.json();

    if (!toolkit) {
      return NextResponse.json({ error: 'Toolkit is required' }, { status: 400 });
    }

    // Get authenticated user
    const supabase = await createRealSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const composioUserId = `tiker_${user.id}`;

    // Find the active connection for this toolkit
    const statuses = await getComposioConnectionStatuses(composioUserId);
    const connectionId = statuses[toolkit]?.connectionId;

    if (!connectionId) {
      return NextResponse.json({ error: 'No active connection found' }, { status: 404 });
    }

    await disconnectComposioConnection(connectionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Composio disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
