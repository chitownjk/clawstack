import { NextRequest, NextResponse } from 'next/server';
import { createRealSupabaseClient } from '@/lib/supabase-server';
import { initiateComposioConnection, COMPOSIO_TOOLKITS } from '@/lib/composio';

export async function POST(request: NextRequest) {
  try {
    const { toolkit, authConfigId } = await request.json();

    if (!toolkit || !COMPOSIO_TOOLKITS[toolkit]) {
      return NextResponse.json(
        { error: 'Invalid toolkit. Supported: ' + Object.keys(COMPOSIO_TOOLKITS).join(', ') },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createRealSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use the Supabase user ID as the Composio user ID for consistent mapping
    const composioUserId = `tiker_${user.id}`;

    // Build callback URL from request origin
    const { origin } = new URL(request.url);
    const callbackUrl = `${origin}/api/auth/composio/callback?toolkit=${toolkit}`;

    const { redirectUrl, connectionRequestId } = await initiateComposioConnection(
      composioUserId,
      toolkit,
      callbackUrl,
      authConfigId
    );

    return NextResponse.json({
      redirectUrl,
      connectionRequestId,
    });
  } catch (error) {
    console.error('Composio initiate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate connection' },
      { status: 500 }
    );
  }
}
