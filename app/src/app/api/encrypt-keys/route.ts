import { NextResponse } from 'next/server';
import { encrypt } from '@/lib/crypto';

/**
 * POST /api/encrypt-keys
 * Encrypts multiple keys on the server
 * Body: { keys: { anthropic: "...", openai: "..." } }
 * Returns: { encrypted: { anthropic: "...", openai: "..." } }
 */
export async function POST(request: Request) {
  try {
    const { keys } = await request.json();

    if (!keys || typeof keys !== 'object') {
      return NextResponse.json(
        { error: 'Keys object required' },
        { status: 400 }
      );
    }

    const encrypted: Record<string, string> = {};

    for (const [provider, key] of Object.entries(keys)) {
      if (key && typeof key === 'string') {
        encrypted[provider] = encrypt(key);
      }
    }

    return NextResponse.json({ encrypted });
  } catch (error) {
    console.error('Key encryption error:', error);
    return NextResponse.json(
      { error: 'Encryption failed' },
      { status: 500 }
    );
  }
}
