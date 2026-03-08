import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// POST /api/admin/health/test
// Tests connectivity for a specific subsystem.
// Body: { category: string }
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
      .select('role')
      .eq('auth_uid', session.user.id)
      .single()

    if (account?.role !== 'mc_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { category } = body

    switch (category) {
      case 'core': {
        // Test Supabase connectivity
        const { count, error } = await adminClient
          .from('accounts')
          .select('id', { count: 'exact', head: true })
        if (error) throw error
        return NextResponse.json({ success: true, message: `Supabase OK. ${count} accounts found.` })
      }

      case 'ai': {
        if (!process.env.ANTHROPIC_API_KEY) {
          return NextResponse.json({ success: false, message: 'ANTHROPIC_API_KEY not set' }, { status: 400 })
        }
        // Quick validation: check that the key format looks right
        const key = process.env.ANTHROPIC_API_KEY
        if (!key.startsWith('sk-ant-')) {
          return NextResponse.json({ success: false, message: 'API key format looks incorrect (expected sk-ant-...)' }, { status: 400 })
        }
        return NextResponse.json({ success: true, message: 'Anthropic API key format valid' })
      }

      case 'composio': {
        if (!process.env.COMPOSIO_API_KEY) {
          return NextResponse.json({ success: false, message: 'COMPOSIO_API_KEY not set' }, { status: 400 })
        }
        try {
          const { getComposio } = await import('@/lib/composio')
          const composio = getComposio()
          // Try listing connected accounts (lightweight call)
          return NextResponse.json({ success: true, message: 'Composio client initialized successfully' })
        } catch (err) {
          return NextResponse.json({ success: false, message: `Composio error: ${err}` }, { status: 400 })
        }
      }

      case 'stripe': {
        if (!process.env.STRIPE_SECRET_KEY) {
          return NextResponse.json({ success: false, message: 'STRIPE_SECRET_KEY not set' }, { status: 400 })
        }
        const key = process.env.STRIPE_SECRET_KEY
        if (!key.startsWith('sk_')) {
          return NextResponse.json({ success: false, message: 'Stripe key format looks incorrect (expected sk_...)' }, { status: 400 })
        }
        return NextResponse.json({ success: true, message: 'Stripe key format valid' })
      }

      case 'briefing_email': {
        if (!process.env.SMTP_HOST) {
          return NextResponse.json({ success: false, message: 'SMTP_HOST not set' }, { status: 400 })
        }
        try {
          const { getTransporter } = await import('@/lib/briefing-email')
          const transporter = getTransporter()
          if (!transporter) {
            return NextResponse.json({ success: false, message: 'Could not create SMTP transporter' }, { status: 400 })
          }
          await transporter.verify()
          return NextResponse.json({ success: true, message: 'SMTP connection verified' })
        } catch (err) {
          return NextResponse.json({ success: false, message: `SMTP error: ${err}` }, { status: 400 })
        }
      }

      case 'cron': {
        if (!process.env.CRON_SECRET) {
          return NextResponse.json({ success: false, message: 'CRON_SECRET not set' }, { status: 400 })
        }
        return NextResponse.json({ success: true, message: 'CRON_SECRET is configured' })
      }

      case 'voice_agent': {
        const hasTwilio = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
        const hasEleven = !!process.env.ELEVENLABS_API_KEY
        if (!hasTwilio && !hasEleven) {
          return NextResponse.json({ success: false, message: 'Neither Twilio nor ElevenLabs configured' }, { status: 400 })
        }
        const messages = []
        if (hasTwilio) messages.push('Twilio credentials present')
        else messages.push('Twilio not configured')
        if (hasEleven) messages.push('ElevenLabs key present')
        else messages.push('ElevenLabs not configured')
        return NextResponse.json({
          success: hasTwilio && hasEleven,
          message: messages.join('. '),
        })
      }

      case 'push': {
        const hasVapid = !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
        if (!hasVapid) {
          return NextResponse.json({ success: false, message: 'VAPID keys not set' }, { status: 400 })
        }
        return NextResponse.json({ success: true, message: 'VAPID keys configured' })
      }

      case 'finance': {
        const hasPlaid = !!(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET)
        if (!hasPlaid) {
          return NextResponse.json({
            success: true,
            message: 'Plaid not configured. Finance uses email-extracted data (bills, subs).',
          })
        }
        return NextResponse.json({ success: true, message: 'Plaid credentials present' })
      }

      default:
        return NextResponse.json({ error: 'Unknown category' }, { status: 400 })
    }
  } catch (error) {
    console.error('[AdminHealthTest] Error:', error)
    return NextResponse.json({ error: 'Test failed', details: String(error) }, { status: 500 })
  }
}
