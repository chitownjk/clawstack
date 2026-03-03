import { NextRequest, NextResponse } from 'next/server'
import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'

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

    // Check if key exists
    if (!account.api_key_hash) {
      return NextResponse.json(
        { error: 'No API key exists' },
        { status: 400 }
      )
    }

    // Clear API key fields
    const { error: updateError } = await adminClient
      .from('accounts')
      .update({
        api_key_hash: null,
        api_key_prefix: null,
        api_key_created_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.id)

    if (updateError) {
      console.error('Error revoking API key:', updateError)
      return NextResponse.json(
        { error: 'Failed to revoke API key' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'API key revoked successfully',
    })
  } catch (error) {
    console.error('Key revocation error:', error)
    return NextResponse.json(
      { error: 'Failed to revoke API key' },
      { status: 500 }
    )
  }
}
