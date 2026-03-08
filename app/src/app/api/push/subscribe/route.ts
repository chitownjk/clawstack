import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// POST /api/push/subscribe
// Stores a push subscription for the user.
// Body: { subscription: PushSubscription }
export async function POST(request: Request) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: account } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const body = await request.json()
    const { subscription } = body

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Valid push subscription required' }, { status: 400 })
    }

    // Store the subscription in user preferences
    await adminClient
      .from('mc_user_preferences')
      .upsert(
        {
          account_id: account.id,
          push_subscription: subscription,
          push_enabled: true,
        },
        { onConflict: 'account_id' }
      )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Push] Subscribe error:', error)
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
  }
}

// DELETE /api/push/subscribe
// Removes a push subscription.
export async function DELETE(request: Request) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: account } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    await adminClient
      .from('mc_user_preferences')
      .update({
        push_subscription: null,
        push_enabled: false,
      })
      .eq('account_id', account.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Push] Unsubscribe error:', error)
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
  }
}
