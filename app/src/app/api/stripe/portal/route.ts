import { NextRequest, NextResponse } from 'next/server'
import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { getStripe } from '@/lib/stripe'

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
      .select('id, stripe_customer_id')
      .eq('auth_uid', user.id)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    if (!account.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing history found' },
        { status: 400 }
      )
    }

    // Get return URL
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Create Stripe Billing Portal Session
    const stripe = getStripe()
    const session = await stripe.billingPortal.sessions.create({
      customer: account.stripe_customer_id,
      return_url: `${origin}/settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Portal error:', error)
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
