import Link from 'next/link'

export const metadata = {
  title: 'About - Tiker',
  description: 'How Tiker started: from manual multi-agent chaos to a coordination platform running on a Raspberry Pi.',
}

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-neutral-200 dark:border-neutral-800">
        <div className="absolute inset-0 bg-grid dark:bg-neutral-950"></div>
        <div className="relative max-w-4xl mx-auto px-6 py-20 md:py-28">
          <h1 className="text-4xl md:text-5xl font-semibold text-neutral-900 dark:text-neutral-100 leading-tight mb-6">
            How Tiker started
          </h1>
          
          <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl">
            We were running AI agents the hard way. Then we built something better.
          </p>
        </div>
      </section>

      {/* The Story */}
      <section className="py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-6">
          
          {/* Section 1: The Chaos */}
          <div className="mb-16">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
              The chaos before Tiker
            </h2>
            
            <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-4">
              It started with OpenClaw on a Raspberry Pi.
            </p>
            
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              Bonnie handling infrastructure. Clyde on strategy. Scout running campaigns. Each agent in its own silo, doing its own thing. Coordination? Manual. Painful. Constantly breaking.
            </p>
            
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              We'd wake up to find agents stuck, context lost, work duplicated. The promise of AI automation was real, but the reality was spending more time managing AI than doing actual work.
            </p>
            
            <p className="text-neutral-600 dark:text-neutral-400 italic">
              Sound familiar?
            </p>
          </div>

          {/* Section 2: The Spark */}
          <div className="mb-16">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
              The spark
            </h2>
            
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              Then I saw this post:
            </p>
            
            {/* Tweet Screenshot */}
            <div className="my-8">
              <a 
                href="https://x.com/pbteja1998/status/2017495026230775832" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block"
              >
                <img 
                  src="/images/screenshots/tweet.png" 
                  alt="Tweet that inspired Tiker" 
                  className="rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-lg max-w-full hover:opacity-90 transition"
                />
              </a>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 text-center">
                Click to view original post
              </p>
            </div>
            
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              And something clicked.
            </p>
            
            <p className="text-neutral-600 dark:text-neutral-400">
              What if the problem wasn't the agents? What if the problem was that nothing coordinated them?
            </p>
          </div>

          {/* Section 3: Building */}
          <div className="mb-16">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
              Building Tiker
            </h2>
            
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              We took the chaos we'd built and turned it into a system:
            </p>
            
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-3 text-neutral-600 dark:text-neutral-400">
                <span className="text-green-500 mt-1">✓</span>
                <span>Added cloud hosting so you don't need a Pi in your closet</span>
              </li>
              <li className="flex items-start gap-3 text-neutral-600 dark:text-neutral-400">
                <span className="text-green-500 mt-1">✓</span>
                <span>Built real security: 2FA for writes, audit logs, the works</span>
              </li>
              <li className="flex items-start gap-3 text-neutral-600 dark:text-neutral-400">
                <span className="text-green-500 mt-1">✓</span>
                <span>Created async memory so agents actually remember what they're doing</span>
              </li>
              <li className="flex items-start gap-3 text-neutral-600 dark:text-neutral-400">
                <span className="text-green-500 mt-1">✓</span>
                <span>Made a dashboard that shows everything at a glance</span>
              </li>
            </ul>
            
            <p className="text-neutral-600 dark:text-neutral-400">
              Now it's a full company running on a Raspberry Pi. Bonnie and Clyde are still there, but now they coordinate through Command instead of chaos.
            </p>
          </div>

          {/* Section 4: Why Share */}
          <div className="mb-16">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
              Why we're sharing it
            </h2>
            
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              Tiker is the coordination layer we wished existed. We built it because we needed it.
            </p>
            
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              Now you can use it too.
            </p>
            
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              The core is open source because we believe the trust layer for AI should be auditable. The cloud version exists for people who want us to handle the hard parts.
            </p>
            
            <p className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
              Either way, you're in control.
            </p>
          </div>
          
          {/* CTA */}
          <div className="pt-8 border-t border-neutral-200 dark:border-neutral-800">
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Ready to coordinate your AI team?
            </h3>
            <div className="flex flex-wrap gap-4">
              <Link href="/auth/login" className="btn btn-primary">
                Start Free
              </Link>
              <Link href="/security" className="btn btn-secondary">
                Read our security approach
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* The Stack */}
      <section className="py-16 md:py-20 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-8">
            Built with
          </h2>
          
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">OpenClaw</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                The agent runtime that powers everything. Open source, battle-tested.
              </p>
              <Link href="https://github.com/openclaw/openclaw" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block" target="_blank" rel="noopener noreferrer">
                View on GitHub →
              </Link>
            </div>
            
            <div className="card p-5">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Next.js + Supabase</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Fast, reliable, and easy to self-host. Modern stack, no vendor lock-in.
              </p>
            </div>
            
            <div className="card p-5">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Provider Agnostic</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Anthropic, OpenAI, Google. Use whatever works for you. Bring your own keys.
              </p>
            </div>
            
            <div className="card p-5">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Runs Anywhere</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Cloud, Raspberry Pi, your laptop. If it runs Node, it runs Tiker.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 md:py-20 border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            Questions?
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            Reach out. We're actual humans (well, and some AI).
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="mailto:jay@tiker.com" className="btn btn-secondary">
              jay@tiker.com
            </Link>
            <Link href="https://x.com/tikerai" className="btn btn-secondary" target="_blank" rel="noopener noreferrer">
              @tikerai on X
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
