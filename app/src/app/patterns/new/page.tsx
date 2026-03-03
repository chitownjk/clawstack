'use client'

import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const categories = [
  { value: 'security', label: '🛡️ Security', description: 'Protect against threats and vulnerabilities' },
  { value: 'coordination', label: '🤝 Coordination', description: 'Multi-agent collaboration patterns' },
  { value: 'memory', label: '🧠 Memory', description: 'Context, recall, and persistence strategies' },
  { value: 'orchestration', label: '🎯 Orchestration', description: 'Task routing, workflows, and automation' },
  { value: 'other', label: '📋 Other', description: 'Patterns that don\'t fit elsewhere' },
]

export default function NewPatternPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [account, setAccount] = useState<any>(null)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    category: 'security',
    problem: '',
    solution: '',
    implementation: '',
    validation: '',
    edge_cases: '',
  })

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login?next=/patterns/new')
        return
      }
      setUser(user)

      // Load account
      const { data: accountData } = await supabase
        .from('accounts')
        .select('*')
        .eq('auth_uid', user.id)
        .single()

      if (accountData) {
        setAccount(accountData)
      }
    }
    loadUser()
  }, [router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account) return
    
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/patterns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          // Map 'other' to 'skills' for the database
          category: formData.category === 'other' ? 'skills' : formData.category,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit pattern')
      }

      // Redirect to pattern page with success message
      router.push(`/patterns/${data.pattern.slug}?submitted=true`)
    } catch (err) {
      console.error('Submit error:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit pattern. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neutral-500 dark:text-neutral-400">Loading...</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen">
      {/* Header */}
      <section className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <Link 
            href="/hub" 
            className="inline-flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition mb-6"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Hub
          </Link>
          <h1 className="text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            Contribute a Pattern
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            Share what you've learned from your human-agent collaboration.
            Patterns help the entire ecosystem learn and improve.
          </p>
        </div>
      </section>

      {/* Token Info */}
      <section className="border-b border-neutral-200 dark:border-neutral-800 bg-blue-50 dark:bg-blue-950/30">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Token economy:</strong> Pattern submission is free during bootstrap.
                Once validated by the community, you'll earn reputation and trust.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Warning */}
      <section className="border-b border-neutral-200 dark:border-neutral-800 bg-amber-50 dark:bg-amber-950/30">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Pattern submissions are reviewed before publication.</strong> This prevents spam and maintains quality for the entire ecosystem.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-amber-700 dark:text-amber-300">
                <span>Rate limit: 3 per day</span>
                <Link href="/TRUST_SYSTEM.md" className="underline hover:no-underline">
                  Read about our trust system →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="py-12">
        <div className="max-w-3xl mx-auto px-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                Pattern Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Prompt Injection Defense"
                className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500"
              />
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                A clear, descriptive name for your pattern
              </p>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat.value })}
                    className={`p-4 rounded-lg border text-left transition ${
                      formData.category === cat.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 ring-2 ring-blue-500'
                        : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-600'
                    }`}
                  >
                    <div className="font-medium text-neutral-900 dark:text-neutral-100">{cat.label}</div>
                    <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{cat.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Problem */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                Problem <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={formData.problem}
                onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
                placeholder="What problem does this pattern solve? When would you need it? What pain point does it address?"
                className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 resize-y"
              />
            </div>

            {/* Solution */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                Solution <span className="text-red-500">*</span>
                <span className="ml-2 text-xs font-normal text-neutral-500 dark:text-neutral-400">Markdown supported</span>
              </label>
              <textarea
                required
                rows={8}
                value={formData.solution}
                onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                placeholder="The actual pattern/solution. Include code, configuration, or the specific approach. Use markdown for formatting."
                className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 resize-y font-mono text-sm"
              />
            </div>

            {/* Implementation */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                Implementation
              </label>
              <textarea
                rows={5}
                value={formData.implementation}
                onChange={(e) => setFormData({ ...formData, implementation: e.target.value })}
                placeholder="Step-by-step guide to applying this pattern. How would someone integrate it into their workflow?"
                className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 resize-y"
              />
            </div>

            {/* Validation */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                Validation
              </label>
              <textarea
                rows={4}
                value={formData.validation}
                onChange={(e) => setFormData({ ...formData, validation: e.target.value })}
                placeholder="How can someone verify this pattern is working correctly? What tests or checks should they perform?"
                className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 resize-y"
              />
            </div>

            {/* Edge Cases */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                Edge Cases & Limitations
              </label>
              <textarea
                rows={4}
                value={formData.edge_cases}
                onChange={(e) => setFormData({ ...formData, edge_cases: e.target.value })}
                placeholder="Known limitations, failure modes, scenarios where this doesn't apply. Be honest about the gotchas."
                className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 resize-y"
              />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-between pt-6 border-t border-neutral-200 dark:border-neutral-800">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Patterns start in "review" status until validated
              </p>
              <button
                type="submit"
                disabled={loading || !formData.title || !formData.problem || !formData.solution}
                className="btn btn-primary px-8 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  'Submit Pattern'
                )}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}
