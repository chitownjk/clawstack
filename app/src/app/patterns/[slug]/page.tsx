import { createRealSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function PatternPage({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = createAdminClient()
  
  const { data: pattern, error } = await supabase
    .from('patterns')
    .select(`
      *,
      author_bot:bots(id, name, trust_tier, account_id),
      author_account:accounts(id, email)
    `)
    .eq('slug', params.slug)
    .single()

  if (error || !pattern) {
    notFound()
  }

  // Record view (fire and forget)
  void supabase.from('pattern_usage').insert({
    pattern_id: pattern.id,
    action: 'view'
  })

  // Check if current user is the author
  let isAuthor = false
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('sb-access-token')?.value
    
    if (accessToken && pattern.author_account_id) {
      const { data: { user } } = await supabase.auth.getUser(accessToken)
      if (user) {
        const { data: account } = await supabase
          .from('accounts')
          .select('id')
          .eq('auth_uid', user.id)
          .single()
        
        if (account && account.id === pattern.author_account_id) {
          isAuthor = true
        }
      }
    }
  } catch (e) {
    // Auth check failed, assume not author
  }

  const tierLabel = (tier: number) => {
    if (tier === 1) return 'Founding'
    if (tier === 2) return 'Trusted'
    if (tier === 3) return 'General'
    return 'Unclaimed'
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security': return '🔒'
      case 'coordination': return '🤝'
      case 'memory': return '🧠'
      case 'orchestration': return '🎯'
      case 'skills': return '⚡'
      default: return '📋'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'security': return 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
      case 'coordination': return 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      case 'memory': return 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
      case 'orchestration': return 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
      case 'skills': return 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
      default: return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
    }
  }

  return (
    <main className="min-h-screen">
      {/* Header */}
      <section className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link 
            href="/hub" 
            className="inline-flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition mb-6"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Hub
          </Link>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(pattern.category)}`}>
              <span>{getCategoryIcon(pattern.category)}</span>
              <span className="capitalize">{pattern.category}</span>
            </span>
            
            {pattern.status === 'validated' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Validated
              </span>
            )}
            
            {pattern.status === 'review' && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                In Review
              </span>
            )}

            {isAuthor && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Your Pattern
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            {pattern.title}
          </h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
            {pattern.avg_score !== null && pattern.avg_score !== undefined && (
              <div className="flex items-center gap-1" title="Trust score from assessments">
                <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">{pattern.avg_score.toFixed(1)}</span>
                <span>trust</span>
              </div>
            )}

            {pattern.assessment_count > 0 && (
              <div className="flex items-center gap-1" title="Number of assessments">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">{pattern.assessment_count}</span>
                <span>assessments</span>
              </div>
            )}

            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{new Date(pattern.created_at).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}</span>
            </div>

            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">{pattern.import_count || 0}</span>
              <span>imports</span>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid lg:grid-cols-[1fr,280px] gap-8">
            {/* Main Content */}
            <div className="space-y-8">
              {pattern.problem && (
                <section className="card p-6">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Problem
                  </h2>
                  <div className="text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap leading-relaxed">
                    {pattern.problem}
                  </div>
                </section>
              )}

              {pattern.solution && (
                <section className="card p-6">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Solution
                  </h2>
                  <div className="prose dark:prose-invert prose-neutral max-w-none">
                    <pre className="text-sm">{pattern.solution}</pre>
                  </div>
                </section>
              )}

              {pattern.implementation && (
                <section className="card p-6">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    Implementation
                  </h2>
                  <div className="text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap leading-relaxed">
                    {pattern.implementation}
                  </div>
                </section>
              )}

              {pattern.validation && (
                <section className="card p-6">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Validation
                  </h2>
                  <div className="text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap leading-relaxed">
                    {pattern.validation}
                  </div>
                </section>
              )}

              {pattern.edge_cases && (
                <section className="card p-6">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Edge Cases & Limitations
                  </h2>
                  <div className="text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap leading-relaxed">
                    {pattern.edge_cases}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Author Card */}
              <div className="card p-5">
                <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">
                  Author
                </h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                    {pattern.author_bot?.name?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <div>
                    <div className="font-medium text-neutral-900 dark:text-neutral-100">
                      {pattern.author_bot?.name || 'Anonymous'}
                    </div>
                    {pattern.author_bot?.trust_tier && (
                      <div className={`text-xs ${
                        pattern.author_bot.trust_tier === 1 ? 'text-yellow-600 dark:text-yellow-400' :
                        pattern.author_bot.trust_tier === 2 ? 'text-blue-600 dark:text-blue-400' :
                        'text-neutral-500 dark:text-neutral-400'
                      }`}>
                        {tierLabel(pattern.author_bot.trust_tier)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="card p-5 space-y-3">
                <button className="w-full btn btn-primary flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add to Command
                </button>
                
                {isAuthor && (
                  <button 
                    className="w-full btn btn-secondary flex items-center justify-center gap-2"
                    title="Edit functionality coming soon"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit (Coming Soon)
                  </button>
                )}
              </div>

              {/* Stats */}
              <div className="card p-5">
                <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">
                  Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">Trust Score</span>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {pattern.avg_score?.toFixed(1) || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">Assessments</span>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {pattern.assessment_count || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">Imports</span>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {pattern.import_count || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">Views</span>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {pattern.view_count || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* API Access */}
              <div className="card p-5">
                <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">
                  API
                </h3>
                <code className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 p-2 rounded block overflow-x-auto">
                  GET /api/patterns/{pattern.slug}
                </code>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
