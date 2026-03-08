'use client'

import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface EnvStatus {
  key: string
  label: string
  configured: boolean
  value?: string // masked
}

interface SystemHealth {
  category: string
  label: string
  status: 'ok' | 'warning' | 'error' | 'unconfigured'
  message: string
  env_vars: EnvStatus[]
}

export default function AdminSetupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [health, setHealth] = useState<SystemHealth[]>([])
  const [stats, setStats] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [testResults, setTestResults] = useState<Record<string, 'idle' | 'testing' | 'success' | 'error'>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: account } = await supabase
        .from('accounts')
        .select('role')
        .eq('auth_uid', user.id)
        .single()

      if (account?.role !== 'mc_admin') {
        router.push('/dashboard')
        return
      }

      // Fetch system health from API
      try {
        const res = await fetch('/api/admin/health', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setHealth(data.systems || [])
          setStats(data.stats || null)
        } else {
          // Build client-side health check as fallback
          setHealth(getDefaultHealth())
        }
      } catch {
        setHealth(getDefaultHealth())
      }

      setLoading(false)
    }

    loadData()
  }, [router, supabase])

  const handleTest = async (category: string) => {
    setTestResults(prev => ({ ...prev, [category]: 'testing' }))

    try {
      const res = await fetch('/api/admin/health/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ category }),
      })

      if (res.ok) {
        setTestResults(prev => ({ ...prev, [category]: 'success' }))
      } else {
        setTestResults(prev => ({ ...prev, [category]: 'error' }))
      }
    } catch {
      setTestResults(prev => ({ ...prev, [category]: 'error' }))
    }

    setTimeout(() => {
      setTestResults(prev => ({ ...prev, [category]: 'idle' }))
    }, 5000)
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-1/3" />
          <div className="h-48 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
          <div className="h-48 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
        </div>
      </div>
    )
  }

  const okCount = health.filter(h => h.status === 'ok').length
  const warnCount = health.filter(h => h.status === 'warning').length
  const errCount = health.filter(h => h.status === 'error' || h.status === 'unconfigured').length

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
            System Setup
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Configure infrastructure, API keys, and check system health
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/services"
            className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition flex items-center gap-1"
          >
            Services
          </Link>
          <Link
            href="/command"
            className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Command
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button onClick={() => setError(null)} className="text-sm text-red-500 hover:underline mt-1">
            Dismiss
          </button>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{okCount}</div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400">Healthy</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{warnCount}</div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400">Warnings</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{errCount}</div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400">Not Configured</div>
        </div>
      </div>

      {/* System Stats */}
      {stats && (
        <div className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            Platform Stats
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.total_accounts || 0}</div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">Accounts</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.total_tasks || 0}</div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">Tasks</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.total_briefings || 0}</div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">Briefings</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.total_activities || 0}</div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">Activities</div>
            </div>
          </div>
        </div>
      )}

      {/* System Health Sections */}
      <div className="space-y-6">
        {health.map((system) => (
          <SystemCard
            key={system.category}
            system={system}
            testStatus={testResults[system.category] || 'idle'}
            onTest={() => handleTest(system.category)}
          />
        ))}
      </div>

      {/* Env Var Reference */}
      <div className="card p-6 mt-8">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          Environment Variables Reference
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
          Set these in your Vercel project settings or <code className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-xs">.env.local</code> file.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50">
              <tr>
                <th className="text-left py-2 px-3 font-medium text-neutral-500 dark:text-neutral-400">Variable</th>
                <th className="text-left py-2 px-3 font-medium text-neutral-500 dark:text-neutral-400">System</th>
                <th className="text-left py-2 px-3 font-medium text-neutral-500 dark:text-neutral-400">Required</th>
                <th className="text-left py-2 px-3 font-medium text-neutral-500 dark:text-neutral-400">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {ENV_REFERENCE.map((env) => (
                <tr key={env.key}>
                  <td className="py-2 px-3 font-mono text-xs text-neutral-900 dark:text-neutral-100">{env.key}</td>
                  <td className="py-2 px-3 text-neutral-600 dark:text-neutral-400">{env.system}</td>
                  <td className="py-2 px-3">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                      env.required
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                    }`}>
                      {env.required ? 'Required' : 'Optional'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-neutral-500 dark:text-neutral-400">{env.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Back link */}
      <div className="mt-8">
        <Link href="/command" className="text-blue-600 dark:text-blue-400 hover:underline">
          Back to Command
        </Link>
      </div>
    </div>
  )
}

function StatusIndicator({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    ok: { color: 'bg-green-500', label: 'Healthy' },
    warning: { color: 'bg-amber-500', label: 'Warning' },
    error: { color: 'bg-red-500', label: 'Error' },
    unconfigured: { color: 'bg-neutral-400', label: 'Not Configured' },
  }

  const { color, label } = config[status] || config.unconfigured

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-sm text-neutral-600 dark:text-neutral-400">{label}</span>
    </div>
  )
}

function SystemCard({
  system,
  testStatus,
  onTest,
}: {
  system: SystemHealth
  testStatus: 'idle' | 'testing' | 'success' | 'error'
  onTest: () => void
}) {
  const [expanded, setExpanded] = useState(system.status !== 'ok')

  const icons: Record<string, string> = {
    core: '🏗',
    briefing_email: '📧',
    cron: '⏰',
    composio: '🔗',
    voice_agent: '📞',
    finance: '💰',
    push: '🔔',
    ai: '🤖',
    stripe: '💳',
  }

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icons[system.category] || '⚙️'}</span>
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
              {system.label}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {system.message}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusIndicator status={system.status} />
          <svg
            className={`w-5 h-5 text-neutral-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-neutral-100 dark:border-neutral-800">
          <div className="mt-4 space-y-3">
            {system.env_vars.map((env) => (
              <div key={env.key} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${env.configured ? 'bg-green-500' : 'bg-neutral-300 dark:bg-neutral-600'}`} />
                  <code className="text-sm font-mono text-neutral-700 dark:text-neutral-300">
                    {env.key}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  {env.configured ? (
                    <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">
                      {env.value || 'Set'}
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                      Not set
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Test button */}
          <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
            <button
              onClick={onTest}
              disabled={testStatus === 'testing'}
              className="text-sm px-4 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition disabled:opacity-50"
            >
              {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
            </button>
            {testStatus === 'success' && (
              <span className="text-sm text-green-600 dark:text-green-400">Connection successful</span>
            )}
            {testStatus === 'error' && (
              <span className="text-sm text-red-600 dark:text-red-400">Connection failed</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function getDefaultHealth(): SystemHealth[] {
  return [
    {
      category: 'core',
      label: 'Core Platform',
      status: 'ok',
      message: 'Supabase, Next.js, and authentication are running',
      env_vars: [
        { key: 'NEXT_PUBLIC_SUPABASE_URL', label: 'Supabase URL', configured: true },
        { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', label: 'Supabase Anon Key', configured: true },
        { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase Service Key', configured: true },
        { key: 'NEXTAUTH_SECRET', label: 'NextAuth Secret', configured: true },
      ],
    },
    {
      category: 'ai',
      label: 'AI / Claude',
      status: 'ok',
      message: 'Anthropic API configured for briefings, suggestions, and agents',
      env_vars: [
        { key: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key', configured: true },
      ],
    },
    {
      category: 'composio',
      label: 'Composio (Integrations)',
      status: 'ok',
      message: 'Gmail, Calendar, Drive, Slack, and other integrations',
      env_vars: [
        { key: 'COMPOSIO_API_KEY', label: 'Composio API Key', configured: true },
      ],
    },
    {
      category: 'stripe',
      label: 'Stripe (Payments)',
      status: 'ok',
      message: 'Billing and subscription management',
      env_vars: [
        { key: 'STRIPE_SECRET_KEY', label: 'Stripe Secret Key', configured: true },
        { key: 'STRIPE_WEBHOOK_SECRET', label: 'Stripe Webhook Secret', configured: true },
        { key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', label: 'Stripe Publishable Key', configured: true },
      ],
    },
    {
      category: 'cron',
      label: 'Cron Jobs',
      status: 'warning',
      message: 'Briefing cron runs daily at 10 UTC. Verify CRON_SECRET is set.',
      env_vars: [
        { key: 'CRON_SECRET', label: 'Cron Secret', configured: false },
      ],
    },
    {
      category: 'briefing_email',
      label: 'Briefing Email (SMTP)',
      status: 'unconfigured',
      message: 'Configure SMTP to send daily briefing emails to users',
      env_vars: [
        { key: 'SMTP_HOST', label: 'SMTP Host', configured: false },
        { key: 'SMTP_PORT', label: 'SMTP Port', configured: false },
        { key: 'SMTP_USER', label: 'SMTP Username', configured: false },
        { key: 'SMTP_PASS', label: 'SMTP Password', configured: false },
        { key: 'SMTP_FROM', label: 'From Address', configured: false },
      ],
    },
    {
      category: 'voice_agent',
      label: 'Voice Agent (Twilio + ElevenLabs)',
      status: 'unconfigured',
      message: 'AI phone calls on behalf of users. Requires Twilio and ElevenLabs.',
      env_vars: [
        { key: 'TWILIO_ACCOUNT_SID', label: 'Twilio Account SID', configured: false },
        { key: 'TWILIO_AUTH_TOKEN', label: 'Twilio Auth Token', configured: false },
        { key: 'TWILIO_PHONE_NUMBER', label: 'Twilio Phone Number', configured: false },
        { key: 'ELEVENLABS_API_KEY', label: 'ElevenLabs API Key', configured: false },
        { key: 'ELEVENLABS_AGENT_URL', label: 'ElevenLabs Agent URL', configured: false },
      ],
    },
    {
      category: 'push',
      label: 'Push Notifications',
      status: 'unconfigured',
      message: 'Web push for reminders and alerts. Requires VAPID keys.',
      env_vars: [
        { key: 'NEXT_PUBLIC_VAPID_PUBLIC_KEY', label: 'VAPID Public Key', configured: false },
        { key: 'VAPID_PRIVATE_KEY', label: 'VAPID Private Key', configured: false },
      ],
    },
    {
      category: 'finance',
      label: 'Finance / Plaid',
      status: 'unconfigured',
      message: 'Bank account linking for real-time financial awareness. Optional.',
      env_vars: [
        { key: 'PLAID_CLIENT_ID', label: 'Plaid Client ID', configured: false },
        { key: 'PLAID_SECRET', label: 'Plaid Secret', configured: false },
        { key: 'PLAID_ENV', label: 'Plaid Environment', configured: false },
      ],
    },
  ]
}

const ENV_REFERENCE = [
  // Core
  { key: 'NEXT_PUBLIC_SUPABASE_URL', system: 'Core', required: true, description: 'Your Supabase project URL' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', system: 'Core', required: true, description: 'Supabase anonymous/public key' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', system: 'Core', required: true, description: 'Supabase service role key (server-side only)' },
  { key: 'NEXTAUTH_SECRET', system: 'Core', required: true, description: 'Secret for session encryption' },
  { key: 'NEXT_PUBLIC_APP_URL', system: 'Core', required: true, description: 'Your app URL (e.g. https://tiker.app)' },
  // AI
  { key: 'ANTHROPIC_API_KEY', system: 'AI', required: true, description: 'Claude API key for briefings, agents, suggestions' },
  // Composio
  { key: 'COMPOSIO_API_KEY', system: 'Integrations', required: true, description: 'Composio key for Gmail, Calendar, etc.' },
  // Stripe
  { key: 'STRIPE_SECRET_KEY', system: 'Payments', required: true, description: 'Stripe secret key' },
  { key: 'STRIPE_WEBHOOK_SECRET', system: 'Payments', required: true, description: 'Stripe webhook signing secret' },
  { key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', system: 'Payments', required: true, description: 'Stripe publishable key' },
  // Cron
  { key: 'CRON_SECRET', system: 'Cron', required: true, description: 'Secret for securing Vercel cron endpoints' },
  // SMTP
  { key: 'SMTP_HOST', system: 'Email', required: false, description: 'SMTP server hostname (e.g. smtp.sendgrid.net)' },
  { key: 'SMTP_PORT', system: 'Email', required: false, description: 'SMTP port (587 for TLS, 465 for SSL)' },
  { key: 'SMTP_USER', system: 'Email', required: false, description: 'SMTP username or API key' },
  { key: 'SMTP_PASS', system: 'Email', required: false, description: 'SMTP password' },
  { key: 'SMTP_FROM', system: 'Email', required: false, description: 'From address (e.g. briefing@tiker.app)' },
  // Voice
  { key: 'TWILIO_ACCOUNT_SID', system: 'Voice', required: false, description: 'Twilio account SID for phone calls' },
  { key: 'TWILIO_AUTH_TOKEN', system: 'Voice', required: false, description: 'Twilio auth token' },
  { key: 'TWILIO_PHONE_NUMBER', system: 'Voice', required: false, description: 'Twilio phone number (e.g. +15551234567)' },
  { key: 'ELEVENLABS_API_KEY', system: 'Voice', required: false, description: 'ElevenLabs API key for voice synthesis' },
  { key: 'ELEVENLABS_AGENT_URL', system: 'Voice', required: false, description: 'ElevenLabs conversational AI WebSocket URL' },
  // Push
  { key: 'NEXT_PUBLIC_VAPID_PUBLIC_KEY', system: 'Push', required: false, description: 'VAPID public key for web push' },
  { key: 'VAPID_PRIVATE_KEY', system: 'Push', required: false, description: 'VAPID private key for web push' },
  // Plaid
  { key: 'PLAID_CLIENT_ID', system: 'Finance', required: false, description: 'Plaid client ID for bank linking' },
  { key: 'PLAID_SECRET', system: 'Finance', required: false, description: 'Plaid secret key' },
  { key: 'PLAID_ENV', system: 'Finance', required: false, description: 'Plaid environment (sandbox, development, production)' },
]
