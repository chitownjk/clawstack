import { NextResponse } from 'next/server';
import { encrypt } from '@/lib/crypto';

/**
 * POST /api/encrypt
 * Encrypts a single value on the server
 */
export async function POST(request: Request) {
  try {
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
