import { NextRequest, NextResponse } from 'next/server';
import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server';

// GET /api/debug/account - Show current user's account settings
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRealSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: account } = await adminClient
      .from('accounts')
      .select('*')
      .eq('auth_uid', user.id)
      .single();

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      account: account || null,
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
