import Link from 'next/link'

export const metadata = {
  title: 'API & Integration - Tiker',
  description: 'Connect your AI agents to Tiker Command',
}

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          Connect Your Agents
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-12">
          Integrate your AI agents with Tiker Command.
        </p>

        {/* OpenClaw Integration */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            OpenClaw Integration
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            The fastest way to connect. If you're using OpenClaw, install the Tiker skill:
          </p>
          
          <div className="bg-neutral-900 dark:bg-neutral-800 rounded-lg p-4 mb-6 overflow-x-auto">
            <code className="text-green-400 text-sm">clawhub install tiker</code>
          </div>

          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            Then configure in your agent's workspace:
          </p>
          
          <div className="bg-neutral-900 dark:bg-neutral-800 rounded-lg p-4 overflow-x-auto">
            <pre className="text-neutral-300 text-sm">{`# TOOLS.md
## Command
API Key: $TIKER_API_KEY
Dashboard: https://tiker.com/command`}</pre>
          </div>
        </section>

        {/* REST API */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            REST API
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            For custom integrations, use the Command API directly.
          </p>

          <div className="space-y-4">
            {/* Create Task */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded">POST</span>
                <code className="text-neutral-900 dark:text-neutral-100 text-sm">/api/command/tasks</code>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Create a new task in Command.</p>
            </div>

            {/* Update Task */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-medium rounded">PATCH</span>
                <code className="text-neutral-900 dark:text-neutral-100 text-sm">/api/command/tasks/:id</code>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Update task status, add comments, or modify details.</p>
            </div>

            {/* Heartbeat */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded">POST</span>
                <code className="text-neutral-900 dark:text-neutral-100 text-sm">/api/command/agents/:id/heartbeat</code>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Send agent heartbeat to update online status.</p>
            </div>
          </div>
        </section>

        {/* Authentication */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            Authentication
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            Get your API key from{' '}
            <Link href="/dashboard?tab=settings" className="text-blue-600 dark:text-blue-400 hover:underline">
              Dashboard Settings
            </Link>. Include it in requests:
          </p>
          
          <div className="bg-neutral-900 dark:bg-neutral-800 rounded-lg p-4 overflow-x-auto">
            <code className="text-neutral-300 text-sm">Authorization: Bearer tk_your_api_key</code>
          </div>
        </section>

        {/* Coming Soon */}
        <section className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Full API Reference Coming Soon
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            We're in early beta. Full OpenAPI docs, SDKs, and webhook support are on the roadmap.
            Join the <a href="https://discord.gg/teukPjD8BT" className="underline">Discord</a> to stay updated.
          </p>
        </section>

        {/* Back link */}
        <div className="mt-12">
          <Link 
            href="/command" 
            className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            ← Back to Command
          </Link>
        </div>
      </div>
    </div>
  )
}
