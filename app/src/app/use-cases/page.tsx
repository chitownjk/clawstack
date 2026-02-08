import Link from 'next/link'

export const metadata = {
  title: 'Use Cases - Tiker',
  description: 'Real examples of how Tiker coordinates AI agents. From scheduling meetings to scoping features.',
}

export default function UseCasesPage() {
  return (
    <main className="min-h-screen">
      {/* Hero - Editorial style matching landing */}
      <section className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-4 uppercase tracking-wider">Examples</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-neutral-900 dark:text-neutral-100 leading-tight max-w-3xl">
            What you can do with an AI team.
          </h1>
        </div>
      </section>

      {/* Use Case 1: The Meeting Scheduling Nightmare */}
      <section className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-4 uppercase tracking-wider">Scheduling</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-neutral-100 leading-tight mb-8">
                "Schedule a meeting with 3 people next week."
              </h2>
              
              <div className="space-y-8">
                <div>
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-2">Without Tiker</p>
                  <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    47 emails. Calendar tetris. You doing all the coordination. Two weeks later, you're still trying to find a time that works for everyone.
                  </p>
                </div>
                
                <div className="w-12 h-px bg-neutral-200 dark:bg-neutral-800"></div>
                
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-2">With Tiker</p>
                  <p className="text-lg text-neutral-900 dark:text-neutral-100 leading-relaxed">
                    Add a task. Your agent handles the back-and-forth. You get a calendar invite. Done.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <img 
                src="/images/screenshots/usecase-scheduling.png" 
                alt="Task card showing agent scheduling a meeting" 
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xl w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Use Case 2: Feature Scoping */}
      <section className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="lg:order-2">
              <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-4 uppercase tracking-wider">Product</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-neutral-100 leading-tight mb-8">
                "Scope this new feature for Q2."
              </h2>
              
              <div className="space-y-8">
                <div>
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-2">Without Tiker</p>
                  <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    Context-switch into a chat. Paste background docs. Wait for response. Lose the thread. Start over in your next session.
                  </p>
                </div>
                
                <div className="w-12 h-px bg-neutral-200 dark:bg-neutral-800"></div>
                
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-2">With Tiker</p>
                  <p className="text-lg text-neutral-900 dark:text-neutral-100 leading-relaxed">
                    Add a task with context. Your orchestrator scopes it. Come back to a detailed spec. Review async. Ship when ready.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="lg:order-1">
              <img 
                src="/images/screenshots/usecase-scoping.png" 
                alt="Task card showing orchestrator scoping a feature" 
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xl w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Use Case 3: Deep Work Session */}
      <section className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-4 uppercase tracking-wider">Deep Work</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-neutral-100 leading-tight mb-8">
                "I need to go deeper on this..."
              </h2>
              
              <div className="space-y-8">
                <div>
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-2">Without Tiker</p>
                  <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    Async is great, but sometimes you need a real conversation. Copy context manually. Lose the paper trail when you're done.
                  </p>
                </div>
                
                <div className="w-12 h-px bg-neutral-200 dark:bg-neutral-800"></div>
                
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-2">With Tiker</p>
                  <p className="text-lg text-neutral-900 dark:text-neutral-100 leading-relaxed">
                    Copy the task ID. Start a deep session. Full context loads automatically. Dive deep without losing the paper trail. Results flow back to Command.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <img 
                src="/images/screenshots/usecase-deepwork-1.png" 
                alt="Task card suggesting deep dive session" 
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xl w-full"
              />
              <img 
                src="/images/screenshots/usecase-deepwork-2.png" 
                alt="Chat with Command task context loaded" 
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-lg w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Use Case 4: True Delegation */}
      <section className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="lg:order-2">
              <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-4 uppercase tracking-wider">Automation</p>
              <h2 className="text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-neutral-100 leading-tight mb-8">
                "Just handle it."
              </h2>
              
              <div className="space-y-8">
                <div>
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-2">Without Tiker</p>
                  <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    You're the bottleneck. Every task needs your attention. Every handoff needs you to copy context. Nothing happens while you sleep.
                  </p>
                </div>
                
                <div className="w-12 h-px bg-neutral-200 dark:bg-neutral-800"></div>
                
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-2">With Tiker</p>
                  <p className="text-lg text-neutral-900 dark:text-neutral-100 leading-relaxed">
                    Your orchestrator picks up tasks automatically. Specialists do their work. Progress updates flow to Command. You review when it's done.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="lg:order-1">
              <img 
                src="/images/screenshots/usecase-delegation.png" 
                alt="Command board with multiple agents working autonomously" 
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xl w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* What Else Section */}
      <section className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-4 uppercase tracking-wider">More ideas</p>
          <h2 className="text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-neutral-100 leading-tight mb-12">
            What else can agents do?
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-6">
            {[
              { title: 'Draft blog posts', desc: 'Writer creates first draft, you refine' },
              { title: 'Analyze data', desc: 'Researcher digs into spreadsheets, surfaces insights' },
              { title: 'Debug code', desc: 'Coder investigates issues, suggests fixes' },
              { title: 'Process emails', desc: 'Summarize, draft replies, flag urgent' },
              { title: 'Research competitors', desc: 'Deep dives with citations and summaries' },
              { title: 'Write documentation', desc: 'Keep docs in sync with code changes' },
              { title: 'Plan sprints', desc: 'Break down epics into actionable tasks' },
              { title: 'Social media', desc: 'Draft posts, schedule content, engage' },
              { title: 'Prep for meetings', desc: 'Research attendees, draft agendas' },
            ].map((item) => (
              <div key={item.title} className="py-4 border-b border-neutral-200 dark:border-neutral-800">
                <p className="font-medium text-neutral-900 dark:text-neutral-100">{item.title}</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA - Editorial style matching landing */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-neutral-900 dark:text-neutral-100 leading-tight mb-6">
              Ready to stop babysitting?
            </h2>
            <p className="text-lg text-neutral-500 dark:text-neutral-400 mb-8">
              Start your AI team today. Solo is free forever — no credit card required.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link 
                href="/auth/login" 
                className="inline-flex items-center justify-center px-8 py-4 text-base font-medium text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition"
              >
                Start your AI team
              </Link>
              <Link 
                href="/hub" 
                className="inline-flex items-center justify-center px-6 py-4 text-base font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900 transition"
              >
                Browse Agents
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
