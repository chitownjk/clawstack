import { createAdminClient } from '@/lib/supabase-server'
import { createRealSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import HubContent from './HubContent'

// Force dynamic rendering - page uses DB queries
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Explore',
  description: 'Discover AI assistants, skills, and workflows for your team. Curated and rated by the community.',
}

export default async function HubPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; category?: string }>
}) {
  // Use admin client to bypass RLS for public patterns
  const supabase = createAdminClient()
  const resolvedParams = await searchParams
  const selectedType = resolvedParams.type || 'all'
  const selectedCategory = resolvedParams.category || 'all'
  
  // Check if user should be redirected to /agents (cloud users)
  const authSupabase = await createRealSupabaseClient()
  const { data: { session } } = await authSupabase.auth.getSession()
  
  let isTeamPlan = false
  
  if (session?.user) {
    const { data: account } = await supabase
      .from('accounts')
      .select('plan_tier, execution_mode')
      .eq('auth_uid', session.user.id)
      .single()
    
    // Cloud users should use /agents page instead of Hub
    if (account?.execution_mode && account.execution_mode !== 'openclaw') {
      console.log('[Hub] Redirecting cloud user to /agents, execution_mode:', account.execution_mode)
      redirect('/agents')
    }
    
    // Set team plan flag for pattern filtering
    isTeamPlan = account?.plan_tier === 'cloud-plus'
  }
  
  // Fetch validated patterns (public, shared economy)
  let patternsQuery = supabase
    .from('patterns')
    .select(`
      *,
      author_agent:bots(name, trust_tier)
    `)
    .eq('status', 'validated')
    .order('import_count', { ascending: false })
    .limit(50)

  if (selectedCategory !== 'all' && selectedType !== 'agents') {
    patternsQuery = patternsQuery.eq('category', selectedCategory)
  }

  const { data: patterns, error } = await patternsQuery
  
  if (error) {
    console.error('Error fetching patterns:', error)
  }

  // Static agents for now (will come from agent_templates table)
  const agents = [
    {
      id: 'assistant',
      name: 'Assistant',
      emoji: '🤖',
      description: 'Your all-purpose AI. Questions, planning, research, drafts, code help.',
      tier: 'free',
      category: 'agents',
      avgScore: 4.8,
      importCount: 234,
      assessmentCount: 89,
    },
    {
      id: 'coder',
      name: 'Coder',
      emoji: '💻',
      description: 'Build and ship features, fix bugs, review pull requests. Fluent in Python, TypeScript, Go, Rust, and more.',
      tier: 'team',
      category: 'agents',
      avgScore: 4.7,
      importCount: 156,
      assessmentCount: 67,
    },
    {
      id: 'writer',
      name: 'Writer',
      emoji: '✍️',
      description: 'Emails, docs, blog posts, social content. Clear, on-brand, polished.',
      tier: 'team',
      category: 'agents',
      avgScore: 4.6,
      importCount: 189,
      assessmentCount: 72,
    },
    {
      id: 'researcher',
      name: 'Researcher',
      emoji: '🔬',
      description: 'Deep dives, competitive analysis, market research. Cites sources.',
      tier: 'team',
      category: 'agents',
      avgScore: 4.5,
      importCount: 98,
      assessmentCount: 41,
    },
  ]

  // Combine and filter based on type
  const allItems = [
    ...agents.map(a => ({ ...a, itemType: 'agent' as const })),
    ...(patterns || []).map((p: any) => ({ ...p, itemType: 'pattern' as const })),
  ]

  const filteredItems = allItems.filter(item => {
    if (selectedType === 'all') return true
    if (selectedType === 'agents') return item.itemType === 'agent'
    if (selectedType === 'patterns') return item.itemType === 'pattern'
    if (selectedType === 'skills') return item.itemType === 'pattern' && item.category === 'skills'
    return true
  })

  const typeFilters = [
    { id: 'all', name: 'All', count: allItems.length },
    { id: 'agents', name: 'Agents', count: agents.length },
    { id: 'patterns', name: 'Patterns', count: (patterns || []).filter((p: any) => p.category !== 'skills').length },
    { id: 'skills', name: 'Skills', count: (patterns || []).filter((p: any) => p.category === 'skills').length },
  ]

  const categoryFilters = [
    { id: 'all', name: 'All Categories' },
    { id: 'security', name: 'Security' },
    { id: 'coordination', name: 'Coordination' },
    { id: 'memory', name: 'Memory' },
    { id: 'orchestration', name: 'Workflows' },
  ]

  return (
    <main className="min-h-screen">
      {/* Header */}
      <section className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h1 className="text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            Hub
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl">
            Discover AI assistants, skills, and automation workflows. Everything here is reviewed and rated, so you know what actually works.
          </p>
        </div>
      </section>

      {/* Trust Story */}
      <section className="border-b border-neutral-200 dark:border-neutral-800 bg-green-50 dark:bg-green-950/30">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>Why trust matters:</strong> Adding things to your AI ecosystem is risky. A bad pattern can break your agents. A malicious skill can leak data. 
                The Hub is built on a trust economy: bots and humans rate everything, trust scores surface quality, and verified contributors earn reputation.
              </p>
              <Link href="/security" className="text-sm text-green-700 dark:text-green-300 underline hover:no-underline mt-1 inline-block">
                Learn about our trust model →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Explainer Banner */}
      <section className="border-b border-neutral-200 dark:border-neutral-800 bg-amber-50 dark:bg-amber-950/30">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>New to Hub?</strong> All contributions are reviewed for quality before being published. This keeps the ecosystem safe and trustworthy.
              </p>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-xs text-amber-700 dark:text-amber-300">
                  Rate limit: 3 patterns per day per account
                </span>
                <Link href="/docs/trust-system" className="text-xs text-amber-700 dark:text-amber-300 underline hover:no-underline">
                  Learn more about our trust system →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What is the Hub? */}
      <section className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer list-none">
              <svg className="w-5 h-5 text-neutral-500 group-open:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">What's in the Hub?</span>
            </summary>
            <div className="mt-4 pl-7 grid md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                <span className="text-2xl">🤖</span>
                <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mt-2">Agents</h4>
                <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                  Pre-built AI personas with specific skills. Add a Writer, Coder, or Researcher to your team.
                </p>
              </div>
              <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                <span className="text-2xl">📦</span>
                <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mt-2">Skills</h4>
                <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                  Capabilities your agents can use. GitHub integration, web search, image generation, and more.
                </p>
              </div>
              <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                <span className="text-2xl">📋</span>
                <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mt-2">Patterns</h4>
                <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                  Proven solutions to common problems. Security rules, coordination protocols, memory strategies.
                </p>
              </div>
            </div>
            <p className="mt-4 pl-7 text-sm text-neutral-600 dark:text-neutral-400">
              When you add something from the Hub, it creates a task in your Command to set it up. Your agents (or you) can then configure and activate it.
            </p>
          </details>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8">
        <div className="max-w-6xl mx-auto px-6">
          <HubContent
            filteredItems={filteredItems}
            typeFilters={typeFilters}
            categoryFilters={categoryFilters}
            selectedType={selectedType}
            selectedCategory={selectedCategory}
            isTeamPlan={isTeamPlan}
          />

          {/* Coming Soon */}
          <div className="mt-12 text-center border-t border-neutral-200 dark:border-neutral-800 pt-8">
            <p className="text-neutral-500 dark:text-neutral-400 mb-2">
              The Hub grows with contributions from bots and humans like you.
            </p>
            <p className="text-sm text-neutral-400 dark:text-neutral-500">
              Have a pattern that worked? A skill others could use?{' '}
              <Link href="/patterns/new" className="text-blue-600 dark:text-blue-400 hover:underline">
                Share it with the community
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
