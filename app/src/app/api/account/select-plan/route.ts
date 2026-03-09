import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { plan } = await request.json()

    if (!['free', 'solo', 'pro'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    if (plan === 'free') {
      const { error } = await adminClient
        .from('accounts')
        .update({
          plan_tier: 'free',
          execution_mode: 'cloud-our-keys',
          onboarding_completed: true,
        })
        .eq('auth_uid', session.user.id)

      if (error) {
        console.error('[Select Plan] Update error:', error)
        return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 })
      }

      return NextResponse.json({ success: true, redirect: '/command' })
    }

    // For paid plans, redirect to Stripe checkout
    return NextResponse.json({ success: true, redirect: `/api/stripe/checkout?plan=${plan}` })
  } catch (error) {
    console.error('[Select Plan] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
