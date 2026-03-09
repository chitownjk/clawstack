import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { createLinkToken, exchangePublicToken, syncRecurringToExtractedItems, isPlaidConfigured, getBalances } from '@/lib/plaid'
import { encrypt, decrypt } from '@/lib/crypto'

// GET /api/finance/plaid
// Returns Plaid connection status and a link token if not connected.
export async function GET() {
  try {
    if (!isPlaidConfigured()) {
      return NextResponse.json({ configured: false, message: 'Plaid not configured' })
    }

    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: account } = await adminClient
      .from('accounts')
      .select('id, plaid_access_token')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    if (account.plaid_access_token) {
      // Already connected -- return status + balances
      const accessToken = decrypt(account.plaid_access_token)
      const balances = await getBalances(accessToken)

      return NextResponse.json({
        configured: true,
        connected: true,
        accounts: balances?.map(b => ({
          name: b.name,
          type: b.type,
          last_four: b.lastFour,
          balance: b.currentBalance,
        })) || [],
      })
    }

    // Not connected -- generate link token
    const linkToken = await createLinkToken(account.id)

    return NextResponse.json({
      configured: true,
      connected: false,
      link_token: linkToken,
    })
  } catch (error) {
    console.error('[Plaid] GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// POST /api/finance/plaid
// Exchange public token from Plaid Link, store access token, sync recurring.
// Body: { public_token: string } OR { action: 'sync' }
export async function POST(request: Request) {
  try {
    if (!isPlaidConfigured()) {
      return NextResponse.json({ error: 'Plaid not configured' }, { status: 503 })
    }

    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: account } = await adminClient
      .from('accounts')
      .select('id, plaid_access_token, plaid_item_id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const body = await request.json()

    // Token exchange flow
    if (body.public_token) {
      const result = await exchangePublicToken(body.public_token)
      if (!result) {
        return NextResponse.json({ error: 'Token exchange failed' }, { status: 500 })
      }

      // Store encrypted access token
      await adminClient
        .from('accounts')
        .update({
          plaid_access_token: encrypt(result.accessToken),
          plaid_item_id: result.itemId,
        })
        .eq('id', account.id)

      // Immediately sync recurring transactions
      const synced = await syncRecurringToExtractedItems(
        adminClient,
        account.id,
        result.accessToken
      )

      return NextResponse.json({
        success: true,
        connected: true,
        synced_items: synced,
      })
    }

    // Manual sync
    if (body.action === 'sync') {
      if (!account.plaid_access_token) {
        return NextResponse.json({ error: 'Plaid not connected' }, { status: 400 })
      }

      const accessToken = decrypt(account.plaid_access_token)
      const synced = await syncRecurringToExtractedItems(
        adminClient,
        account.id,
        accessToken
      )

      return NextResponse.json({ success: true, synced_items: synced })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('[Plaid] POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
