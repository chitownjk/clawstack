import { NextRequest, NextResponse } from 'next/server'
import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { getStripe, TIERS } from '@/lib/stripe'

async function createCheckoutSession(request: NextRequest) {
  try {
    // Get plan from query params or body
    const url = new URL(request.url)
    const plan = url.searchParams.get('plan') || 'solo'
    
    // Validate plan
    const validPlans = ['solo', 'developer', 'team']
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      )
    }
    
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
      .select('id, email, stripe_customer_id, plan_tier')
      .eq('auth_uid', user.id)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Check if already on this exact tier
    if (account.plan_tier === plan) {
      return NextResponse.json(
        { error: `You're already on the ${plan} plan` },
        { status: 400 }
      )
    }

    // Get or create Stripe customer
    const stripe = getStripe()
    let customerId = account.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: account.email,
        metadata: {
          account_id: account.id,
          user_id: user.id,
        },
      })
      customerId = customer.id

      // Save customer ID to account
      await adminClient
        .from('accounts')
        .update({ stripe_customer_id: customerId })
        .eq('id', account.id)
    }

    // Get tier configuration
    const tierConfig = TIERS[plan as keyof typeof TIERS]
    const priceId = tierConfig.priceId
    
    if (!priceId) {
      return NextResponse.json(
        { error: `${tierConfig.name} tier price not configured` },
        { status: 500 }
      )
    }

    // Get origin for success/cancel URLs
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Create Stripe Checkout Session
    const sessionConfig: any = {
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard?success=true`,
      cancel_url: `${origin}/?canceled=true`,
      metadata: {
        account_id: account.id,
        plan: plan,
      },
      subscription_data: {
        metadata: {
          account_id: account.id,
          plan: plan,
        },
      },
      allow_promotion_codes: true,
    }
    
    // Add trial if configured
    if (tierConfig.trialDays && tierConfig.trialDays > 0) {
      sessionConfig.subscription_data.trial_period_days = tierConfig.trialDays
    }
    
    const session = await stripe.checkout.sessions.create(sessionConfig)

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return createCheckoutSession(request)
}

export async function GET(request: NextRequest) {
  const result = await createCheckoutSession(request)
  
  // If authentication required, redirect to login
  if (result.status === 401) {
    const url = new URL(request.url)
    const plan = url.searchParams.get('plan') || 'solo'
    return NextResponse.redirect(new URL(`/auth/login?next=/api/stripe/checkout?plan=${plan}`, request.url))
  }
  
  // If successful, redirect to Stripe Checkout
  if (result.status === 200) {
    const data = await result.json()
    if (data.url) {
      return NextResponse.redirect(data.url)
    }
  }
  
  // If already on tier or other error, redirect to usage page
  const url = new URL(request.url)
  const errorParam = result.status === 400 ? 'already_subscribed' : 'checkout_failed'
  return NextResponse.redirect(new URL(`/settings/usage?error=${errorParam}`, url.origin))
}
