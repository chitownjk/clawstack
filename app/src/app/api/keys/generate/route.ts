import { NextRequest, NextResponse } from 'next/server'
import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { randomBytes, createHash } from 'crypto'

// Generate a secure API key
function generateApiKey(): { key: string; hash: string; prefix: string } {
  // Generate 32 random bytes (256 bits of entropy)
  const bytes = randomBytes(32)
  
  // Create the key with a prefix for identification
  const prefix = 'mc_' // Command prefix
  const randomPart = bytes.toString('base64url') // URL-safe base64
  const key = `${prefix}${randomPart}`
  
  // Hash the key for storage (SHA-256)
  const hash = createHash('sha256').update(key).digest('hex')
  
  // Store first 8 chars of the full key for display
  const displayPrefix = key.substring(0, 11) // "mc_" + 8 chars
  
  return { key, hash, prefix: displayPrefix }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createRealSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get account from database
    const adminClient = createAdminClient()
    const { data: account, error: accountError } = await adminClient
      .from('accounts')
      .select('id, api_key_hash')
      .eq('auth_uid', user.id)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Check if key already exists
    if (account.api_key_hash) {
      return NextResponse.json(
        { error: 'API key already exists. Revoke the existing key first.' },
        { status: 400 }
      )
    }

    // Generate new API key
    const { key, hash, prefix } = generateApiKey()

    // Store hash and prefix in database
    const { error: updateError } = await adminClient
      .from('accounts')
      .update({
        api_key_hash: hash,
        api_key_prefix: prefix,
        api_key_created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.id)

    if (updateError) {
      console.error('Error storing API key:', updateError)
      return NextResponse.json(
        { error: 'Failed to generate API key' },
        { status: 500 }
      )
    }

    // Return the full key - this is the ONLY time it's shown!
    return NextResponse.json({
      key,
      prefix,
      message: 'Save this key securely. It will not be shown again.',
    })
  } catch (error) {
    console.error('Key generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate API key' },
      { status: 500 }
    )
  }
}
