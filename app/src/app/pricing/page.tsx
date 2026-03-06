import { createRealSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PricingPage() {
  const supabase = await createRealSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If not logged in, redirect to homepage with pricing
  if (!user) {
    redirect('/#pricing')
  }

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="mb-8">
          <Link
            href="/settings/usage"
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            &larr; Back to Usage
          </Link>
        </div>

        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            Simple Pricing
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            Free to start. Upgrade when your AI team is ready.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {/* Free */}
          <div className="bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl p-8">
            <h3 className="text-2xl font-semibold mb-2">Free</h3>
            <div className="mb-6">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-neutral-600 dark:text-neutral-400">/month</span>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
              A powerful task board with no AI. Use it as your daily planner.
            </p>
            <ul className="space-y-3 mb-8 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">&check;</span>
                <span>Unlimited manual tasks</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">&check;</span>
                <span>Kanban, list, and calendar views</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">&check;</span>
                <span>File attachments (10 MB)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-neutral-400 mt-1">&mdash;</span>
                <span className="text-neutral-400">No AI agents</span>
              </li>
            </ul>
            <span className="block w-full text-center px-6 py-3 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-lg font-medium">
              Current Plan
            </span>
          </div>

          {/* Pro */}
          <div className="bg-white dark:bg-neutral-800 border-2 border-blue-500 dark:border-blue-400 rounded-xl p-8 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-full">
              RECOMMENDED
            </div>
            <h3 className="text-2xl font-semibold mb-2">Pro</h3>
            <div className="mb-6">
              <span className="text-4xl font-bold">$29</span>
              <span className="text-neutral-600 dark:text-neutral-400">/month</span>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
              AI agents that handle tasks for you. One price, everything included.
            </p>
            <ul className="space-y-3 mb-8 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">&check;</span>
                <span>200 AI tasks/month</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">&check;</span>
                <span>All models (Sonnet, Opus, GPT-4, Gemini)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">&check;</span>
                <span>All integrations (Gmail, Slack, GitHub, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">&check;</span>
                <span>API access and webhooks</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">&check;</span>
                <span>2 GB file storage</span>
              </li>
            </ul>
            <a
              href="/api/stripe/checkout?plan=pro"
              className="block w-full text-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Start 7-Day Free Trial
            </a>
          </div>

          {/* Team */}
          <div className="bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl p-8">
            <h3 className="text-2xl font-semibold mb-2">Team</h3>
            <div className="mb-6">
              <span className="text-4xl font-bold">$99</span>
              <span className="text-neutral-600 dark:text-neutral-400">/month</span>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
              Shared boards and collaboration for your whole team.
            </p>
            <ul className="space-y-3 mb-8 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">&check;</span>
                <span>1,000 AI tasks/month</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">&check;</span>
                <span>Everything in Pro</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">&check;</span>
                <span>Up to 10 team members</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">&check;</span>
                <span>Shared boards and role permissions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">&check;</span>
                <span>10 GB file storage</span>
              </li>
            </ul>
            <a
              href="/api/stripe/checkout?plan=team"
              className="block w-full text-center px-6 py-3 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition font-medium"
            >
              Contact Us
            </a>
          </div>
        </div>

        <div className="text-center mt-8 text-sm text-neutral-500 dark:text-neutral-400">
          All paid plans include a 7-day free trial. Cancel anytime.
        </div>
      </div>
    </main>
  )
}
