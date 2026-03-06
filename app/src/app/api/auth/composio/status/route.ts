import { NextRequest, NextResponse } from 'next/server';
import { createRealSupabaseClient } from '@/lib/supabase-server';
import { getComposioConnectionStatuses } from '@/lib/composio';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createRealSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const composioUserId = `tiker_${user.id}`;
    const statuses = await getComposioConnectionStatuses(composioUserId);

    return NextResponse.json({ statuses });
  } catch (error) {
    console.error('Composio status error:', error);
    return NextResponse.json(
      { error: 'Failed to check connection statuses' },
      { status: 500 }
    );
  }
}
