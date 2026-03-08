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

    console.log(`[Composio] Initiating connection for toolkit=${toolkit}, user=${composioUserId}, callback=${callbackUrl}`);

    const { redirectUrl, connectionRequestId } = await initiateComposioConnection(
      composioUserId,
      toolkit,
      callbackUrl,
      authConfigId
    );

    console.log(`[Composio] Got redirectUrl=${redirectUrl}, connectionRequestId=${connectionRequestId}`);

    if (!redirectUrl) {
      return NextResponse.json(
        { error: `No OAuth redirect URL returned for ${toolkit}. This service may require API credentials to be configured in Composio first.` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      redirectUrl,
      connectionRequestId,
    });
  } catch (error) {
    console.error('Composio initiate error:', error);
    const message = error instanceof Error ? error.message : 'Failed to initiate connection';
    console.error('Composio initiate full error:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
