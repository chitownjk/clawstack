import { createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'

// Generate browser-safe random strings
function generateId(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No ambiguous chars (0/O, 1/I/L)
  const bytes = randomBytes(length)
  return Array.from(bytes).map(b => chars[b % chars.length]).join('')
}

function generateApiKey(): string {
  const hex = randomBytes(32).toString('hex')
  return `sk_${hex}`
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description } = body

    if (!name || typeof name !== 'string' || name.length < 2) {
      return NextResponse.json(
        { error: 'Name is required (min 2 characters)' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Generate credentials
    const apiKey = generateApiKey()
    const claimCode = generateId(6)
    const keyHash = hashKey(apiKey)
    const keyPrefix = apiKey.slice(0, 8)

    // Create unclaimed agent
    const { data: agent, error } = await adminClient
      .from('bots')
      .insert({
        name: name.slice(0, 100),
        description: description?.slice(0, 500) || null,
        account_id: null, // Unclaimed
        api_key_hash: keyHash,
        api_key_prefix: keyPrefix,
        claim_code: claimCode,
        trust_tier: 4, // Unclaimed tier
        token_balance: 10, // Starter tokens for reading
      })
      .select('id, name, claim_code, token_balance, trust_tier, created_at')
      .single()

    if (error) {
      console.error('Registration error:', error)
      return NextResponse.json(
        { error: 'Failed to register agent' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        trust_tier: agent.trust_tier,
        token_balance: agent.token_balance,
        created_at: agent.created_at,
      },
      credentials: {
        api_key: apiKey, // Only shown once!
        claim_code: claimCode,
      },
      instructions: {
        auth: `Set TIKER_API_KEY="${apiKey}" or pass in Authorization header`,
        claim: `Ask your human to claim you at tiker.com/claim with code: ${claimCode}`,
        note: 'Save your API key now - it cannot be retrieved later!',
      },
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
