import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// GET /api/admin/health
// Returns system health status for each configured subsystem.
// Admin-only endpoint -- checks env var presence and basic connectivity.
export async function GET() {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Verify admin role
    const { data: account } = await adminClient
      .from('accounts')
      .select('role')
      .eq('auth_uid', session.user.id)
      .single()

    if (account?.role !== 'mc_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check all env vars
    const systems = buildHealthReport()

    // Gather platform stats
    const stats = await gatherStats(adminClient)

    return NextResponse.json({ systems, stats })
  } catch (error) {
    console.error('[AdminHealth] Error:', error)
    return NextResponse.json({ error: 'Failed to check health' }, { status: 500 })
  }
}

function checkEnv(key: string): { configured: boolean; value?: string } {
  const val = process.env[key]
  if (!val) return { configured: false }
  // Mask the value: show first 4 chars + asterisks
  const masked = val.length > 8 ? val.slice(0, 4) + '****' + val.slice(-2) : '****'
  return { configured: true, value: masked }
}

function buildHealthReport() {
  const systems = []

  // Core Platform
  const coreVars = [
    { key: 'NEXT_PUBLIC_SUPABASE_URL', label: 'Supabase URL' },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', label: 'Supabase Anon Key' },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase Service Key' },
    { key: 'NEXT_PUBLIC_APP_URL', label: 'App URL' },
  ]
  const coreChecks = coreVars.map(v => ({ ...v, ...checkEnv(v.key) }))
  const coreOk = coreChecks.every(c => c.configured)
  systems.push({
    category: 'core',
    label: 'Core Platform',
    status: coreOk ? 'ok' : 'error',
    message: coreOk ? 'Supabase and app URL configured' : 'Missing core environment variables',
    env_vars: coreChecks,
  })

  // AI
  const aiCheck = checkEnv('ANTHROPIC_API_KEY')
  systems.push({
    category: 'ai',
    label: 'AI / Claude',
    status: aiCheck.configured ? 'ok' : 'error',
    message: aiCheck.configured ? 'Anthropic API key configured' : 'ANTHROPIC_API_KEY is required for briefings and agents',
    env_vars: [{ key: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key', ...aiCheck }],
  })

  // Composio
  const composioCheck = checkEnv('COMPOSIO_API_KEY')
  systems.push({
    category: 'composio',
    label: 'Composio (Integrations)',
    status: composioCheck.configured ? 'ok' : 'error',
    message: composioCheck.configured ? 'Composio configured for Gmail, Calendar, etc.' : 'COMPOSIO_API_KEY is required for integrations',
    env_vars: [{ key: 'COMPOSIO_API_KEY', label: 'Composio API Key', ...composioCheck }],
  })

  // Stripe
  const stripeVars = [
    { key: 'STRIPE_SECRET_KEY', label: 'Stripe Secret Key' },
    { key: 'STRIPE_WEBHOOK_SECRET', label: 'Stripe Webhook Secret' },
    { key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', label: 'Stripe Publishable Key' },
  ]
  const stripeChecks = stripeVars.map(v => ({ ...v, ...checkEnv(v.key) }))
  const stripeOk = stripeChecks.every(c => c.configured)
  const stripePartial = stripeChecks.some(c => c.configured) && !stripeOk
  systems.push({
    category: 'stripe',
    label: 'Stripe (Payments)',
    status: stripeOk ? 'ok' : stripePartial ? 'warning' : 'unconfigured',
    message: stripeOk ? 'Stripe fully configured' : stripePartial ? 'Some Stripe keys missing' : 'Stripe not configured',
    env_vars: stripeChecks,
  })

  // Cron
  const cronCheck = checkEnv('CRON_SECRET')
  systems.push({
    category: 'cron',
    label: 'Cron Jobs',
    status: cronCheck.configured ? 'ok' : 'warning',
    message: cronCheck.configured ? 'Cron secret configured. Briefing cron runs at 10 UTC.' : 'CRON_SECRET not set. Cron endpoints are unprotected.',
    env_vars: [{ key: 'CRON_SECRET', label: 'Cron Secret', ...cronCheck }],
  })

  // Briefing Email (SMTP)
  const smtpVars = [
    { key: 'SMTP_HOST', label: 'SMTP Host' },
    { key: 'SMTP_PORT', label: 'SMTP Port' },
    { key: 'SMTP_USER', label: 'SMTP Username' },
    { key: 'SMTP_PASS', label: 'SMTP Password' },
    { key: 'SMTP_FROM', label: 'From Address' },
  ]
  const smtpChecks = smtpVars.map(v => ({ ...v, ...checkEnv(v.key) }))
  const smtpOk = smtpChecks.filter(c => ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].includes(c.key)).every(c => c.configured)
  const smtpPartial = smtpChecks.some(c => c.configured)
  systems.push({
    category: 'briefing_email',
    label: 'Briefing Email (SMTP)',
    status: smtpOk ? 'ok' : smtpPartial ? 'warning' : 'unconfigured',
    message: smtpOk
      ? 'SMTP configured. Briefing emails will be sent to opted-in users.'
      : smtpPartial
      ? 'Partial SMTP config. Set HOST, USER, and PASS at minimum.'
      : 'Not configured. Users will not receive briefing emails.',
    env_vars: smtpChecks,
  })

  // Voice Agent
  const voiceVars = [
    { key: 'TWILIO_ACCOUNT_SID', label: 'Twilio Account SID' },
    { key: 'TWILIO_AUTH_TOKEN', label: 'Twilio Auth Token' },
    { key: 'TWILIO_PHONE_NUMBER', label: 'Twilio Phone Number' },
    { key: 'ELEVENLABS_API_KEY', label: 'ElevenLabs API Key' },
    { key: 'ELEVENLABS_AGENT_URL', label: 'ElevenLabs Agent URL' },
  ]
  const voiceChecks = voiceVars.map(v => ({ ...v, ...checkEnv(v.key) }))
  const twilioOk = voiceChecks.filter(c => c.key.startsWith('TWILIO')).every(c => c.configured)
  const elevenOk = checkEnv('ELEVENLABS_API_KEY').configured
  const voiceOk = twilioOk && elevenOk
  const voicePartial = voiceChecks.some(c => c.configured)
  systems.push({
    category: 'voice_agent',
    label: 'Voice Agent (Twilio + ElevenLabs)',
    status: voiceOk ? 'ok' : voicePartial ? 'warning' : 'unconfigured',
    message: voiceOk
      ? 'Voice agent fully configured. Users can make AI phone calls.'
      : voicePartial
      ? `Partial config. ${!twilioOk ? 'Twilio' : 'ElevenLabs'} keys missing.`
      : 'Not configured. Voice agent features disabled.',
    env_vars: voiceChecks,
  })

  // Push Notifications
  const pushVars = [
    { key: 'NEXT_PUBLIC_VAPID_PUBLIC_KEY', label: 'VAPID Public Key' },
    { key: 'VAPID_PRIVATE_KEY', label: 'VAPID Private Key' },
  ]
  const pushChecks = pushVars.map(v => ({ ...v, ...checkEnv(v.key) }))
  const pushOk = pushChecks.every(c => c.configured)
  systems.push({
    category: 'push',
    label: 'Push Notifications',
    status: pushOk ? 'ok' : 'unconfigured',
    message: pushOk ? 'VAPID keys configured. Web push enabled.' : 'VAPID keys not set. Push notifications disabled.',
    env_vars: pushChecks,
  })

  // Finance / Plaid
  const plaidVars = [
    { key: 'PLAID_CLIENT_ID', label: 'Plaid Client ID' },
    { key: 'PLAID_SECRET', label: 'Plaid Secret' },
    { key: 'PLAID_ENV', label: 'Plaid Environment' },
  ]
  const plaidChecks = plaidVars.map(v => ({ ...v, ...checkEnv(v.key) }))
  const plaidOk = plaidChecks.every(c => c.configured)
  const plaidPartial = plaidChecks.some(c => c.configured)
  systems.push({
    category: 'finance',
    label: 'Finance / Plaid',
    status: plaidOk ? 'ok' : plaidPartial ? 'warning' : 'unconfigured',
    message: plaidOk
      ? 'Plaid configured. Bank account linking available.'
      : 'Plaid not configured. Finance features use email-extracted data only.',
    env_vars: plaidChecks,
  })

  return systems
}

async function gatherStats(adminClient: any) {
  try {
    const [accounts, tasks, briefings, activities] = await Promise.all([
      adminClient.from('accounts').select('id', { count: 'exact', head: true }),
      adminClient.from('mc_tasks').select('id', { count: 'exact', head: true }),
      adminClient.from('briefings').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
      adminClient.from('mc_activities').select('id', { count: 'exact', head: true }),
    ])

    return {
      total_accounts: accounts.count || 0,
      total_tasks: tasks.count || 0,
      total_briefings: (briefings as any).count || 0,
      total_activities: activities.count || 0,
    }
  } catch {
    return {
      total_accounts: 0,
      total_tasks: 0,
      total_briefings: 0,
      total_activities: 0,
    }
  }
}
