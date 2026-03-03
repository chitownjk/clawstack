import { NextRequest, NextResponse } from 'next/server'
import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { getStripe } from '@/lib/stripe'
import { getService } from '@/lib/services'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user - use REAL Supabase client (checkout requires actual auth)
    const supabase = await createRealSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('[Checkout] Auth check:', { userId: user?.id, authError: authError?.message })

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { service_type, amount_cents, notes, price_id, variant } = body as {
      service_type: string
      amount_cents?: number
      notes?: string
      price_id?: string  // Direct Stripe price ID
      variant?: string   // Variant selection (e.g., '128gb' or '256gb')
    }

    // Validate service type
    const service = getService(service_type)
    if (!service) {
      return NextResponse.json(
        { error: 'Invalid service type' },
        { status: 400 }
      )
    }
    
    // Determine the correct Stripe price ID
    // Priority: 1) Passed price_id, 2) Variant price, 3) Service default
    let stripePriceId = price_id
    if (!stripePriceId && variant && service.variants) {
      const selectedVariant = service.variants.find(v => v.id === variant)
      stripePriceId = selectedVariant?.stripePriceId
    }
    if (!stripePriceId) {
      stripePriceId = service.stripePriceId
    }

    // Get account from database
    const adminClient = createAdminClient()
    const { data: account, error: accountError } = await adminClient
      .from('accounts')
      .select('id, email, stripe_customer_id')
      .eq('auth_uid', user.id)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Handle contact/inquiry requests (no immediate payment)
    if (service.ctaType === 'contact') {
      // For contact/inquiry, redirect to the contact form section
      // The actual inquiry handling is done via /api/services/inquiry
      return NextResponse.json({
        success: true,
        message: 'Please use the contact form for custom work inquiries.',
        redirect: '/services#contact-form',
      })
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

    // Get origin for success/cancel URLs
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Determine checkout mode and pricing
    const isRecurring = service.pricing.type === 'recurring'
    const priceAmount = amount_cents || service.pricing.amount

    // stripePriceId was already determined above from price_id, variant, or service default

    let session: Stripe.Checkout.Session

    if (stripePriceId) {
      // Use existing price
      const params: Stripe.Checkout.SessionCreateParams = {
        customer: customerId,
        mode: isRecurring ? 'subscription' : 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price: stripePriceId,
            quantity: 1,
          },
        ],
        success_url: `${origin}/services?success=true&service=${service_type}`,
        cancel_url: `${origin}/services?canceled=true`,
        metadata: {
          account_id: account.id,
          service_type: service_type,
        },
        allow_promotion_codes: true,
      }

      if (isRecurring) {
        params.subscription_data = {
          metadata: {
            account_id: account.id,
            service_type: service_type,
          },
        }
      }

      session = await stripe.checkout.sessions.create(params)
    } else if (isRecurring) {
      // For recurring without a price ID, we need to create product + price first
      const product = await stripe.products.create({
        name: service.name,
        description: service.description,
        metadata: {
          service_type: service_type,
        },
      })

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: priceAmount,
        currency: 'usd',
        recurring: {
          interval: service.pricing.interval || 'month',
        },
      })

      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        success_url: `${origin}/services?success=true&service=${service_type}`,
        cancel_url: `${origin}/services?canceled=true`,
        metadata: {
          account_id: account.id,
          service_type: service_type,
        },
        subscription_data: {
          metadata: {
            account_id: account.id,
            service_type: service_type,
          },
        },
        allow_promotion_codes: true,
      })
    } else {
      // One-time payment with inline price
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: service.name,
                description: service.shortDesc,
              },
              unit_amount: priceAmount,
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/services?success=true&service=${service_type}`,
        cancel_url: `${origin}/services?canceled=true`,
        metadata: {
          account_id: account.id,
          service_type: service_type,
        },
        payment_intent_data: {
          metadata: {
            account_id: account.id,
            service_type: service_type,
          },
        },
        allow_promotion_codes: true,
      })
    }

    // Create pending purchase record
    await adminClient
      .from('service_purchases')
      .insert({
        account_id: account.id,
        service_type: service_type,
        amount_cents: priceAmount,
        stripe_checkout_session_id: session.id,
        payment_status: 'pending',
        fulfillment_status: 'pending',
      })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Service checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
