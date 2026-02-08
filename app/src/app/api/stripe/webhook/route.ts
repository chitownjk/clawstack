import { NextRequest, NextResponse } from 'next/server'
import { getStripe, TIERS } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase-server'
import Stripe from 'stripe'

// Disable body parsing - we need the raw body for signature verification
export const runtime = 'nodejs'

async function getRawBody(request: NextRequest): Promise<Buffer> {
  const reader = request.body?.getReader()
  if (!reader) {
    throw new Error('No request body')
  }
  
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  
  return Buffer.concat(chunks)
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    )
  }

  let event: Stripe.Event

  try {
    const rawBody = await getRawBody(request)
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    // Verify the event came from Stripe
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  const adminClient = createAdminClient()

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const accountId = subscription.metadata.account_id
        const plan = subscription.metadata.plan || 'solo' // Default to solo if not specified

        if (!accountId) {
          console.error('No account_id in subscription metadata')
          break
        }

        const status = subscription.status
        // Get current period end from the first item's period
        const periodEnd = (subscription as any).current_period_end || 
                          subscription.items?.data?.[0]?.current_period_end
        const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000) : new Date()

        // Determine plan_tier based on subscription status
        let planTier = 'free'
        if (status === 'active' || status === 'trialing') {
          planTier = plan // solo, developer, or team
        }

        const tierConfig = TIERS[planTier as keyof typeof TIERS]

        // Update account with plan tier and subscription details
        const updateData: any = {
          stripe_subscription_id: subscription.id,
          subscription_status: status,
          subscription_current_period_end: currentPeriodEnd.toISOString(),
          plan_tier: planTier,
          updated_at: new Date().toISOString(),
        }
        
        // Set trial dates if in trial
        if (status === 'trialing' && subscription.trial_end) {
          updateData.trial_starts_at = new Date(subscription.trial_start! * 1000).toISOString()
          updateData.trial_ends_at = new Date(subscription.trial_end * 1000).toISOString()
        }

        await adminClient
          .from('accounts')
          .update(updateData)
          .eq('id', accountId)

        console.log(`Subscription ${subscription.id} updated for account ${accountId}: ${planTier} (${status})`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const accountId = subscription.metadata.account_id

        if (!accountId) {
          console.error('No account_id in subscription metadata')
          break
        }

        // Downgrade to free tier
        await adminClient
          .from('accounts')
          .update({
            subscription_status: 'canceled',
            plan_tier: 'free',
            updated_at: new Date().toISOString(),
          })
          .eq('id', accountId)

        console.log(`Subscription deleted for account ${accountId}, downgraded to free`)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`Payment succeeded for invoice ${invoice.id}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        // Find account by customer ID and update status
        const { data: account } = await adminClient
          .from('accounts')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (account) {
          await adminClient
            .from('accounts')
            .update({
              subscription_status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('id', account.id)

          console.log(`Payment failed for account ${account.id}`)
        }
        break
      }

      // Service purchases - one-time payments
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const serviceType = session.metadata?.service_type
        const accountId = session.metadata?.account_id

        if (serviceType && accountId) {
          // This is a service purchase, update the record
          await adminClient
            .from('service_purchases')
            .update({
              payment_status: 'paid',
              stripe_payment_intent_id: session.payment_intent as string,
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_checkout_session_id', session.id)

          console.log(`Service purchase completed: ${serviceType} for account ${accountId}`)
        }
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const serviceType = paymentIntent.metadata?.service_type
        const accountId = paymentIntent.metadata?.account_id

        if (serviceType && accountId) {
          // Update service purchase by payment intent
          await adminClient
            .from('service_purchases')
            .update({
              payment_status: 'paid',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_payment_intent_id', paymentIntent.id)

          console.log(`Payment intent succeeded for service: ${serviceType}`)
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const serviceType = paymentIntent.metadata?.service_type

        if (serviceType) {
          await adminClient
            .from('service_purchases')
            .update({
              payment_status: 'failed',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_payment_intent_id', paymentIntent.id)

          console.log(`Payment failed for service: ${serviceType}`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
