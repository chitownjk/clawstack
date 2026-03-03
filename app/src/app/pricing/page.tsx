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
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="mb-8">
          <Link
            href="/settings/usage"
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            ← Back to Usage
          </Link>
        </div>

        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            Upgrade, downgrade, or switch modes anytime
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Solo */}
          <div className="bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl p-8">
            <h3 className="text-2xl font-semibold mb-2">Solo</h3>
            <div className="mb-6">
              <span className="text-4xl font-bold">$19</span>
              <span className="text-neutral-600 dark:text-neutral-400">/month</span>
            </div>
            <ul className="space-y-3 mb-8 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span>100 AI tasks/month</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span>Claude Sonnet 4.5</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span>Google integrations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span>100MB file storage</span>
              </li>
            </ul>
            <a
              href="/api/stripe/checkout?plan=solo"
              className="block w-full text-center px-6 py-3 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition font-medium"
            >
              Upgrade to Solo
            </a>
          </div>

          {/* Developer */}
          <div className="bg-white dark:bg-neutral-800 border-2 border-blue-500 dark:border-blue-400 rounded-xl p-8 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-full">
              RECOMMENDED
            </div>
            <h3 className="text-2xl font-semibold mb-2">Developer</h3>
            <div className="mb-6">
              <span className="text-4xl font-bold">$49</span>
              <span className="text-neutral-600 dark:text-neutral-400">/month</span>
            </div>
            <ul className="space-y-3 mb-8 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span>400 AI tasks/month</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span>Claude Sonnet 4.5</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span>All integrations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span>1GB file storage</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span>Priority support</span>
              </li>
            </ul>
            <a
              href="/api/stripe/checkout?plan=developer"
              className="block w-full text-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Upgrade to Developer
            </a>
          </div>

          {/* Team */}
          <div className="bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl p-8">
            <h3 className="text-2xl font-semibold mb-2">Team</h3>
            <div className="mb-6">
              <span className="text-4xl font-bold">$99</span>
              <span className="text-neutral-600 dark:text-neutral-400">/month</span>
            </div>
            <ul className="space-y-3 mb-8 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span>1,000 AI tasks/month</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span>Claude Sonnet 4.5 + Opus</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span>All integrations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span>10GB file storage</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span>Dedicated support</span>
              </li>
            </ul>
            <a
              href="/api/stripe/checkout?plan=team"
              className="block w-full text-center px-6 py-3 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition font-medium"
            >
              Upgrade to Team
            </a>
          </div>
        </div>

        {/* BYOK Option */}
        <div className="mt-16 max-w-3xl mx-auto bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl p-8">
          <div className="flex items-start gap-6">
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">Bring Your Own Keys (BYOK)</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Already have API keys for Anthropic, OpenAI, or Google? Connect them and use Tiker for free with unlimited tasks. You pay your providers directly.
              </p>
              <ul className="space-y-2 text-sm mb-4">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Unlimited tasks</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Your choice of models</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Pay providers directly</span>
                </li>
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <Link
                href="/settings/execution"
                className="px-6 py-3 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition font-medium whitespace-nowrap text-center"
              >
                Switch to BYOK
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
