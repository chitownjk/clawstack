import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

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

      // Fire background jobs for instant first-run experience (fire-and-forget)
      const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://tiker.com'
      const cookieHeader = (await cookies()).getAll().map(c => `${c.name}=${c.value}`).join('; ')

      // Scan last 14 days of email for a richer first briefing
      fetch(`${origin}/api/email/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader,
        },
        body: JSON.stringify({ firstRun: true, limit: 30 }),
      }).catch(err => console.error('[Select Plan] Background email scan failed:', err))

      // Generate initial briefing
      fetch(`${origin}/api/briefing/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader,
        },
        body: JSON.stringify({ force: true }),
      }).catch(err => console.error('[Select Plan] Background briefing generation failed:', err))

      return NextResponse.json({ success: true, redirect: '/command' })
    }

    // For paid plans, redirect to Stripe checkout
    return NextResponse.json({ success: true, redirect: `/api/stripe/checkout?plan=${plan}` })
  } catch (error) {
    console.error('[Select Plan] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
