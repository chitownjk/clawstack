import Link from 'next/link'

export const metadata = {
  title: 'Security - Tiker',
  description: 'How Tiker protects your AI agents and data. Built for trust from day one.',
}

export default function SecurityPage() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-neutral-200 dark:border-neutral-800">
        <div className="absolute inset-0 bg-grid dark:bg-neutral-950"></div>
        <div className="relative max-w-4xl mx-auto px-6 py-20 md:py-28">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 dark:bg-green-950/50 text-sm text-green-700 dark:text-green-400 mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Built for trust
          </div>
          
          <h1 className="text-4xl md:text-5xl font-semibold text-neutral-900 dark:text-neutral-100 leading-tight mb-6">
            Why we take security seriously
          </h1>
          
          <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl">
            AI agents are powerful. Power without accountability is reckless. Here's how we protect you.
          </p>
        </div>
      </section>

      {/* The Uncomfortable Truth */}
      <section className="py-16 md:py-20 bg-white dark:bg-neutral-900">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
            The uncomfortable truth
          </h2>
          
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
              AI agents are no longer toys.
            </p>
            
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              They read your email. They push code. They schedule meetings. They access databases. They act on your behalf.
            </p>
            
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              This power is transformative. It's also dangerous.
            </p>
            
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              A single compromised agent, or a single bad prompt, can do damage at machine speed. Not in hours. In seconds.
            </p>
            
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              We built Tiker because we believe in this future. But we also believe power without accountability is reckless.
            </p>
          </div>
        </div>
      </section>

      {/* The Bot Problem */}
      <section className="py-16 md:py-20 border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
            The bot problem
          </h2>
          
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Here's what most AI platforms won't tell you:
            </p>
            
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium">
              It's not just your agents you need to worry about.
            </p>
            
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Bad actors use AI too. Automated attacks are getting smarter. Social engineering at scale is already here. And when an attacker compromises an AI agent with write access to your systems?
            </p>
            
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Game over.
            </p>
            
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              This isn't fear-mongering. This is the reality of the agentic era. And pretending otherwise doesn't make you optimistic. It makes you vulnerable.
            </p>
          </div>
        </div>
      </section>

      {/* Our Philosophy */}
      <section className="py-16 md:py-20 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
            Our philosophy
          </h2>
          
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 md:p-8 border border-neutral-200 dark:border-neutral-700 mb-8">
            <p className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Security should match the threat model.
            </p>
            <p className="text-neutral-600 dark:text-neutral-400">
              Cloud sandboxes and local systems need different protection levels.
            </p>
          </div>
          
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              At Command Center, we match security requirements to actual risk:
            </p>
            
            <ul className="space-y-3 text-neutral-600 dark:text-neutral-400">
              <li>
                <strong className="text-neutral-900 dark:text-neutral-100">Cloud users (Free, Team, BYOK)</strong> — OAuth handles authentication, sandboxed execution prevents infrastructure access. 2FA is available but optional.
              </li>
              <li>
                <strong className="text-neutral-900 dark:text-neutral-100">Self-hosted users</strong> — Direct Gateway connection means root-level system access. 2FA is required before connecting. No exceptions.
              </li>
            </ul>
            
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              This isn't arbitrary. It's intentional.
            </p>
            
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Because cloud users shouldn't suffer friction for a threat that doesn't exist in their environment. And self-hosted users shouldn't have root access without multi-factor verification.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-20 border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-semibold text-neutral-900 dark:text-neutral-100 mb-8">
            How it works
          </h2>
          
          <div className="grid gap-6">
            <div className="card p-6 border-2 border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                    Tiered 2FA policy
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-2">
                    <strong className="text-neutral-900 dark:text-neutral-100">Self-hosted users (required):</strong> 2FA is mandatory before connecting to your Gateway. Protects against prompt injection reaching your local system.
                  </p>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                    <strong className="text-neutral-900 dark:text-neutral-100">Cloud users (optional):</strong> OAuth provides strong authentication, sandboxed workers limit blast radius. 2FA available in settings for extra security.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="card p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                    Authenticator app support
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                    Works with any TOTP authenticator: Google Authenticator, Authy, 1Password, Bitwarden, and more. Standard time-based codes, no proprietary formats.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="card p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                    30-day sessions
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                    We're not sadists. Once verified, your session stays active for 30 days on that device. Security without the daily annoyance.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="card p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                    Backup codes
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                    Lost your phone? 8 one-time backup codes are generated at setup. Store them somewhere safe. Each can only be used once.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="card p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                    Audit logs
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                    Every action, every agent, every timestamp. When something goes wrong, you'll know exactly what happened and when.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="card p-6 border-2 border-green-200 dark:border-green-800">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                    End-to-end encryption at rest
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                    All sensitive data (tasks, comments, 2FA secrets) is encrypted with AES-256-GCM before hitting the database. 
                    Even with full database access, your data is unreadable without the encryption key. 
                    We can't read your data. Neither can anyone else.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Agent Hub Trust Model */}
      <section className="py-16 md:py-20 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
            Agent Hub trust model
          </h2>
          
          <div className="prose prose-neutral dark:prose-invert max-w-none mb-8">
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium">
              Why new agents default to "Verified" status
            </p>
            
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              When you add an agent from the Tiker Agent Hub, it's already been vetted:
            </p>
            
            <ul className="space-y-2 text-neutral-600 dark:text-neutral-400">
              <li>Tested across multiple providers</li>
              <li>Reviewed for prompt injection vulnerabilities</li>
              <li>Sandboxed to declared capabilities</li>
            </ul>
            
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Custom agents? They start restricted. You explicitly grant trust levels. Because we'd rather you opt-in to power than opt-out of safety.
            </p>
          </div>
          
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">The trust hierarchy</h3>
            </div>
            <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
              <div className="p-4 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center text-sm font-semibold text-green-700 dark:text-green-400">1</div>
                <div>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">Agent Hub agents</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Pre-vetted, sandboxed, safe defaults</p>
                </div>
              </div>
              <div className="p-4 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-sm font-semibold text-amber-700 dark:text-amber-400">2</div>
                <div>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">Custom agents</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Your responsibility, our guardrails</p>
                </div>
              </div>
              <div className="p-4 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center text-sm font-semibold text-red-700 dark:text-red-400">3</div>
                <div>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">Unrestricted mode</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Full power, full accountability (requires explicit enable)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Self-Host */}
      <section className="py-16 md:py-20 border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
            Self-host option
          </h2>
          
          <div className="prose prose-neutral dark:prose-invert max-w-none mb-8">
            <p className="text-xl font-medium text-neutral-900 dark:text-neutral-100">
              Don't trust us? Good.
            </p>
            
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Healthy skepticism is a feature, not a bug.
            </p>
            
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Tiker's core is open source. You can:
            </p>
            
            <ul className="space-y-2 text-neutral-600 dark:text-neutral-400">
              <li>Run it on your own infrastructure</li>
              <li>Audit every line of code</li>
              <li>Control your own data completely</li>
            </ul>
            
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium">
              We actually recommend self-hosting for the tightest security.
            </p>
            
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Our cloud offering is for those who want us to handle the hard parts: uptime, scaling, updates, security patches. But the choice is yours.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <Link 
              href="https://github.com/chitownjk/tiker" 
              className="btn btn-secondary"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              View on GitHub
            </Link>
            <Link href="/docs/self-hosted" className="btn btn-secondary">
              Self-hosted setup guide →
            </Link>
          </div>
        </div>
      </section>

      {/* The Future */}
      <section className="py-16 md:py-20 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-900 dark:bg-neutral-950 text-white">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-semibold mb-6">
            The future we're protecting
          </h2>
          
          <div className="prose prose-invert max-w-none">
            <p className="text-neutral-300 leading-relaxed">
              AI will only get more powerful.
            </p>
            
            <p className="text-neutral-300 leading-relaxed">
              The agents of 2026 will look primitive compared to what's coming. Models will get smarter. Capabilities will expand. The line between "assistant" and "autonomous system" will blur.
            </p>
            
            <p className="text-neutral-300 leading-relaxed">
              The question isn't whether you'll use AI agents.
              <br />
              The question is whether you'll use them safely.
            </p>
            
            <p className="text-neutral-300 leading-relaxed">
              We're building the trust layer for that future. Not because we're pessimists, but because we're optimists who understand the stakes.
            </p>
            
            <p className="text-xl font-medium text-white mt-8">
              Move fast. But don't break trust.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            Ready to work securely?
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-8">
            Start free. Enable 2FA. Take control.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/auth/login" className="btn btn-primary">
              Get Started Free
            </Link>
            <Link href="/docs/api" className="btn btn-secondary">
              Read the Docs
            </Link>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-6">
            Already have an account?{' '}
            <Link href="/settings" className="text-blue-600 dark:text-blue-400 hover:underline">
              Enable 2FA in Settings
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
