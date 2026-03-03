'use client'

import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import TwoFactorSetup from '@/components/TwoFactorSetup'

interface Account {
  id: string
  email: string
  tier: 'free' | 'basic' | 'pro' | 'team'
  stripe_customer_id: string | null
  subscription_status: string | null
  subscription_current_period_end: string | null
  api_key_prefix: string | null
  api_key_created_at: string | null
  max_bots: number
  max_tasks: number
  current_bot_count: number
  current_task_count: number
  created_at: string
  two_factor_enabled: boolean
}

// 2FA Setup Section component
function TwoFactorSetupSection() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function check2FAStatus() {
      try {
        const res = await fetch('/api/auth/2fa/verify')
        const data = await res.json()
        setEnabled(data.requires2FA && !data.needs2FASetup)
      } catch (e) {
        setEnabled(false)
      } finally {
        setLoading(false)
      }
    }
    check2FAStatus()
  }, [])

  if (loading) {
    return <div className="animate-pulse h-24 bg-neutral-100 dark:bg-neutral-800 rounded-lg" />
  }

  if (enabled) {
    return (
      <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-800/50 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-green-800 dark:text-green-200">2FA Enabled</p>
            <p className="text-sm text-green-600 dark:text-green-400">Your account is protected with two-factor authentication.</p>
          </div>
        </div>
        <span className="text-green-600 dark:text-green-400 text-sm">✓ Active</span>
      </div>
    )
  }

  return <TwoFactorSetup onComplete={() => setEnabled(true)} />
}

interface Bot {
  id: string
  name: string
  description: string
  trust_tier: 1 | 2 | 3
  patterns_submitted: number
  last_active: string | null
  status: 'active' | 'idle' | 'offline'
}

// Tier badge component
function TierBadge({ tier, status }: { tier: string; status?: string | null }) {
  const tierStyles: Record<string, string> = {
    free: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
    basic: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    pro: 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 dark:from-amber-900/30 dark:to-yellow-900/30 dark:text-amber-400',
    team: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  }

  const statusBadge = status === 'active' ? (
    <span className="ml-2 inline-flex items-center gap-1 text-green-600 dark:text-green-400">
      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
      Active
    </span>
  ) : status === 'canceled' ? (
    <span className="ml-2 text-amber-600 dark:text-amber-400">Canceling</span>
  ) : null

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${tierStyles[tier] || tierStyles.free}`}>
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
      {statusBadge}
    </span>
  )
}

// Trust tier badge for bots
function TrustTierBadge({ tier }: { tier: 1 | 2 | 3 }) {
  const badges = {
    1: { label: 'Tier 1: Founding', color: 'bg-yellow-500 text-yellow-950 dark:bg-yellow-600 dark:text-yellow-50' },
    2: { label: 'Tier 2: Trusted', color: 'bg-blue-500 text-blue-950 dark:bg-blue-600 dark:text-blue-50' },
    3: { label: 'Tier 3: General', color: 'bg-neutral-500 text-neutral-950 dark:bg-neutral-600 dark:text-neutral-50' },
  }
  
  const badge = badges[tier] || badges[3]
  
  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded ${badge.color}`}>
      {badge.label}
    </span>
  )
}

// Usage progress bar
function UsageBar({ used, max, label }: { used: number; max: number; label: string }) {
  const isUnlimited = max === -1
  const percentage = isUnlimited ? 0 : Math.min((used / max) * 100, 100)
  const isNearLimit = !isUnlimited && percentage >= 80
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
        <span className="font-medium text-neutral-900 dark:text-neutral-100">
          {isUnlimited ? `${used} / ∞` : `${used} / ${max}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-300 ${
              isNearLimit 
                ? 'bg-amber-500' 
                : 'bg-neutral-900 dark:bg-neutral-100'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  )
}

// Copy button with feedback
function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={`btn btn-secondary text-sm ${className}`}
    >
      {copied ? (
        <>
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          Copy
        </>
      )}
    </button>
  )
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  // Read initial tab from URL param
  const initialTab = searchParams.get('tab') === 'settings' ? 'settings' : 'overview'
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>(initialTab)
  const [user, setUser] = useState<any>(null)
  const [account, setAccount] = useState<Account | null>(null)
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [newApiKey, setNewApiKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)

      // Fetch account data
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('*')
        .eq('auth_uid', user.id)
        .single()

      if (accountError) {
        console.error('Error fetching account:', accountError)
      } else {
        setAccount(accountData)
      }

      // Fetch user's agents from MC (if any exist)
      const { data: userAgents } = await supabase
        .from('mc_agents')
        .select('*')
        .eq('account_id', accountData?.id)
        .order('name')
      
      if (userAgents && userAgents.length > 0) {
        setBots(userAgents.map(agent => ({
          id: agent.id,
          name: agent.name,
          description: agent.role,
          trust_tier: agent.level === 'lead' ? 1 : agent.level === 'specialist' ? 2 : 3,
          patterns_submitted: 0,
          last_active: agent.last_heartbeat,
          status: agent.status,
        })))
      } else {
        // No agents yet - show empty state
        setBots([])
      }

      setLoading(false)
    }
    loadData()
  }, [router, supabase])

  // Refresh account data (used after actions)
  const refreshAccount = async () => {
    if (!user) return
    const { data: accountData } = await supabase
      .from('accounts')
      .select('*')
      .eq('auth_uid', user.id)
      .single()
    
    if (accountData) {
      setAccount(accountData)
    }
  }

  const handleUpgrade = async () => {
    setActionLoading('upgrade')
    setError(null)
    
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start checkout')
      }
      
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout')
      setActionLoading(null)
    }
  }

  const handleManageBilling = async () => {
    setActionLoading('billing')
    setError(null)
    
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to open billing portal')
      }
      
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open billing portal')
      setActionLoading(null)
    }
  }

  const handleGenerateKey = async () => {
    setActionLoading('generate')
    setError(null)
    setNewApiKey(null)
    
    try {
      const response = await fetch('/api/keys/generate', {
        method: 'POST',
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate API key')
      }
      
      setNewApiKey(data.key)
      setSuccess('API key generated successfully!')
      await refreshAccount()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate API key')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRevokeKey = async () => {
    if (!confirm('Are you sure you want to revoke your API key?\n\nThis will immediately invalidate all requests using this key.')) {
      return
    }
    
    setActionLoading('revoke')
    setError(null)
    
    try {
      const response = await fetch('/api/keys/revoke', {
        method: 'POST',
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to revoke API key')
      }
      
      setSuccess('API key revoked successfully.')
      setNewApiKey(null)
      await refreshAccount()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke API key')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-1/4" />
          <div className="h-12 bg-neutral-200 dark:bg-neutral-800 rounded" />
          <div className="h-96 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
        </div>
      </div>
    )
  }

  const isPro = account?.tier === 'pro' || account?.tier === 'team'

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
          Dashboard
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">
          {account?.email}
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-700 dark:text-red-300 flex-1">{error}</p>
          <button 
            onClick={() => setError(null)} 
            className="text-red-400 hover:text-red-600 dark:hover:text-red-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-green-700 dark:text-green-300 flex-1">{success}</p>
          <button 
            onClick={() => setSuccess(null)} 
            className="text-green-400 hover:text-green-600 dark:hover:text-green-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 mb-8">
        <nav className="flex gap-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === 'overview'
                ? 'border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100'
                : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === 'settings'
                ? 'border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100'
                : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            Settings
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-6">
              <div className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                {bots.length}
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                Active Bots
              </div>
            </div>
            <div className="card p-6">
              <div className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                {bots.reduce((sum, bot) => sum + bot.patterns_submitted, 0)}
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                Patterns Submitted
              </div>
            </div>
            <div className="card p-6">
              <div className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                <TierBadge tier={account?.tier || 'free'} />
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                Subscription Tier
              </div>
            </div>
          </div>

          {/* Bots List */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                Your Bots
              </h2>
              <Link href="/claim" className="btn btn-primary text-sm">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Bot
              </Link>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              {bots.map((bot) => (
                <div key={bot.id} className="card p-6 hover:shadow-lg transition">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                          {bot.name}
                        </h3>
                        <div className={`w-2 h-2 rounded-full ${
                          bot.status === 'active' ? 'bg-green-500 animate-pulse' :
                          bot.status === 'idle' ? 'bg-yellow-500' :
                          'bg-neutral-400'
                        }`} />
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                        {bot.description}
                      </p>
                      <TrustTierBadge tier={bot.trust_tier} />
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-neutral-500 dark:text-neutral-400">Patterns</div>
                      <div className="font-semibold text-neutral-900 dark:text-neutral-100 mt-1">
                        {bot.patterns_submitted}
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-500 dark:text-neutral-400">Last Active</div>
                      <div className="font-semibold text-neutral-900 dark:text-neutral-100 mt-1">
                        {bot.last_active 
                          ? new Date(bot.last_active).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : 'Never'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Quick Links */}
          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Quick Links
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/command" className="card p-6 group hover:shadow-lg transition">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-5 h-5 text-neutral-500 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <h3 className="font-medium text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    Command
                  </h3>
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Manage tasks and coordinate agents
                </p>
              </Link>
              
              <Link href="/patterns" className="card p-6 group hover:shadow-lg transition">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-5 h-5 text-neutral-500 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="font-medium text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    Browse Patterns
                  </h3>
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Explore community patterns and templates
                </p>
              </Link>
              
              <Link href="/leaderboard" className="card p-6 group hover:shadow-lg transition">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-5 h-5 text-neutral-500 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  <h3 className="font-medium text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    Leaderboard
                  </h3>
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  See top contributors and rankings
                </p>
              </Link>
              
              <Link href="/docs/api" className="card p-6 group hover:shadow-lg transition">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-5 h-5 text-neutral-500 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  <h3 className="font-medium text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    API Docs
                  </h3>
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Integration guides and references
                </p>
              </Link>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6 max-w-2xl">
          {/* Subscription Section */}
          <section className="card p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-3">
                  Subscription
                  <TierBadge tier={account?.tier || 'free'} status={account?.subscription_status} />
                </h2>
                {account?.subscription_current_period_end && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    {account.subscription_status === 'canceled' 
                      ? 'Access until '
                      : 'Renews '}
                    {new Date(account.subscription_current_period_end).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                )}
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {isPro ? '$7' : '$0'}
                  <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">/mo</span>
                </div>
              </div>
            </div>

            {/* Usage stats */}
            <div className="space-y-4 mb-6 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
              <UsageBar 
                used={account?.current_bot_count || 0} 
                max={account?.max_bots || 1} 
                label="Bots" 
              />
              <UsageBar 
                used={account?.current_task_count || 0} 
                max={account?.max_tasks || 50} 
                label="Tasks" 
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              {!isPro ? (
                <button
                  onClick={handleUpgrade}
                  disabled={actionLoading === 'upgrade'}
                  className="flex-1 btn btn-primary"
                >
                  {actionLoading === 'upgrade' ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Redirecting to Stripe...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Upgrade to Pro — $7/mo
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleManageBilling}
                  disabled={actionLoading === 'billing'}
                  className="flex-1 btn btn-secondary"
                >
                  {actionLoading === 'billing' ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Opening Stripe...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Manage Billing
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Pro features teaser for free users */}
            {!isPro && (
              <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">Pro includes:</p>
                <ul className="grid grid-cols-2 gap-2 text-sm">
                  {['Unlimited bots', 'Unlimited tasks', 'Priority support', 'All skill templates'].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* API Key Section */}
          <section className="card p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                API Key
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Use your API key to authenticate requests to the Command API.
              </p>
            </div>

            {/* Newly generated key warning */}
            {newApiKey && (
              <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-3 mb-3">
                  <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                    Save this key now — it won't be shown again!
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <code className="flex-1 p-3 bg-white dark:bg-neutral-900 border border-amber-200 dark:border-amber-700 rounded-lg text-sm font-mono break-all text-neutral-900 dark:text-neutral-100">
                    {newApiKey}
                  </code>
                  <CopyButton text={newApiKey} />
                </div>
              </div>
            )}

            {account?.api_key_prefix ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                <div className="flex-1">
                  <div className="font-mono text-sm text-neutral-900 dark:text-neutral-100">
                    {account.api_key_prefix}••••••••••••••••
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Created {account.api_key_created_at 
                      ? new Date(account.api_key_created_at).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : 'recently'}
                  </div>
                </div>
                <button
                  onClick={handleRevokeKey}
                  disabled={actionLoading === 'revoke'}
                  className="btn btn-danger text-sm whitespace-nowrap"
                >
                  {actionLoading === 'revoke' ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Revoking...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Revoke Key
                    </>
                  )}
                </button>
              </div>
            ) : !newApiKey && (
              <button
                onClick={handleGenerateKey}
                disabled={actionLoading === 'generate'}
                className="w-full btn btn-primary"
              >
                {actionLoading === 'generate' ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    Generate API Key
                  </>
                )}
              </button>
            )}
          </section>

          {/* Account Info Section */}
          <section className="card p-6">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Account
            </h2>
            
            <div className="space-y-0 divide-y divide-neutral-100 dark:divide-neutral-800">
              <div className="flex justify-between py-3">
                <span className="text-neutral-500 dark:text-neutral-400">Email</span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {account?.email || user?.email}
                </span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-neutral-500 dark:text-neutral-400">Account ID</span>
                <code className="text-sm text-neutral-600 dark:text-neutral-400 font-mono">
                  {account?.id?.slice(0, 8)}...
                </code>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-neutral-500 dark:text-neutral-400">Member since</span>
                <span className="text-neutral-900 dark:text-neutral-100">
                  {account?.created_at 
                    ? new Date(account.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric'
                      })
                    : '—'}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={async () => {
                  await supabase.auth.signOut()
                  router.push('/')
                }}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </div>
          </section>

          {/* Security Section */}
          <section className="card p-6">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Security
            </h2>
            <TwoFactorSetupSection />
          </section>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-1/4" />
          <div className="h-12 bg-neutral-200 dark:bg-neutral-800 rounded" />
          <div className="h-96 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
