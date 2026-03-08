import { NextResponse } from 'next/server';
import { encrypt } from '@/lib/crypto';
import { createRealSupabaseClient } from '@/lib/supabase-server';

/**
 * POST /api/encrypt
 * Encrypts a single value on the server (authenticated only)
 */
export async function POST(request: Request) {
  try {
    // Require authentication
    const supabase = await createRealSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { value } = await request.json();

    if (!value || typeof value !== 'string') {
      return NextResponse.json(
        { error: 'Value required' },
        { status: 400 }
      );
    }

    const encrypted = encrypt(value);

    return NextResponse.json({ encrypted });
  } catch (error) {
    console.error('Encryption error:', error);
    return NextResponse.json(
      { error: 'Encryption failed' },
      { status: 500 }
    );
  }
}
