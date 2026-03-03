import Link from 'next/link'
import { createRealSupabaseClient } from '@/lib/supabase-server'
import { SplitScreenHero } from '@/components/SplitScreenHero'
import CommandRedirect from '@/components/CommandRedirect'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Tiker - Stop babysitting your AI tools',
  description: 'A command center for AI agents. Task board, not chat window. Async by design.',
}

export default async function LandingPage() {
  const supabase = await createRealSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen">
      {/* Hero - Logged in */}
      {user ? (
        <>
          <CommandRedirect />
          <section className="relative overflow-hidden border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
          <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-900 text-sm text-green-700 dark:text-green-300 mb-6">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Your AI team is active
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-neutral-900 dark:text-neutral-100 leading-[1] tracking-tight mb-6">
                Back to work.
              </h1>
              
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                <Link 
                  href="/command" 
                  className="group p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-blue-400 dark:hover:border-blue-600 transition"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                        Command
                      </h2>
                    </div>
                  </div>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                    Your task dashboard. Create, assign, track.
                  </p>
                </Link>
                
                <Link 
                  href="/hub" 
                  className="group p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-purple-400 dark:hover:border-purple-600 transition"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                        Agent Hub
                      </h2>
                    </div>
                  </div>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                    Add specialists to your team.
                  </p>
                </Link>
              </div>
            </div>
          </div>
        </section>
        </>
      ) : (
        <>
          {/* Split Screen Hero */}
          <SplitScreenHero />

          {/* Hero Section */}
          <section className="py-24 md:py-32 border-b border-neutral-200 dark:border-neutral-800 bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-950 dark:to-neutral-900">
            <div className="max-w-6xl mx-auto px-6 text-center">
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-neutral-900 dark:text-neutral-100 leading-tight mb-6">
                Your To-Do List.
                <br />
                <span className="text-blue-600 dark:text-blue-400">On Autopilot.</span>
              </h1>
              <p className="text-xl md:text-2xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto mb-12">
                AI agents handle email, calendar, research, and more.
                <br />
                You handle the strategy.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  href="/auth/login"
                  className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-lg"
                >
                  Start Free
                </Link>
                <Link
                  href="/#pricing"
                  className="px-8 py-4 bg-white dark:bg-neutral-800 border-2 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg font-semibold hover:border-neutral-400 dark:hover:border-neutral-600 transition text-lg"
                >
                  View Pricing
                </Link>
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-6">
                Free forever (with your API keys) • No credit card required
              </p>
            </div>
          </section>

          {/* The Solution */}
          <section className="py-24 md:py-32 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900" id="how-it-works">
            <div className="max-w-6xl mx-auto px-6">
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div>
                  <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-4 uppercase tracking-wider">The solution</p>
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-neutral-900 dark:text-neutral-100 leading-tight mb-6">
                    A command center for AI agents.
                  </h2>
                  <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-8">
                    Task board, not chat window.
                  </p>
                  
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-900 text-sm text-green-700 dark:text-green-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Async by design
                  </div>
                </div>
                
                <div className="relative">
                  <img 
                    src="/images/screenshots/kanban-full.png" 
                    alt="Tiker Command dashboard showing kanban board with AI agent tasks"
                    className="rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xl w-full"
                  />
                  <div className="absolute -bottom-4 -right-4 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-lg p-4 hidden md:block">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">3 agents active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* How it Works - Visual Steps */}
          <section className="py-24 md:py-32 border-b border-neutral-200 dark:border-neutral-800">
            <div className="max-w-6xl mx-auto px-6">
              <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-4 uppercase tracking-wider">How it works</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-neutral-900 dark:text-neutral-100 leading-tight mb-16">
                Create. Assign. Done.
              </h2>
              
              <div className="grid md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center font-semibold text-lg">
                    1
                  </div>
                  <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Create a task</h3>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    Write what you need. No special syntax. "Write Q1 investor update" or "Research competitors for Project X."
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center font-semibold text-lg">
                    2
                  </div>
                  <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Assign to an agent</h3>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    Writer, Coder, Researcher, Data Analyst — each optimized for specific work. Not one generalist pretending to do everything.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center font-semibold text-lg">
                    3
                  </div>
                  <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Get the result</h3>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    While you sleep, while you eat, while you do deep work. Your AI team never stops.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Visual Feature: Task Detail */}
          <section className="py-24 md:py-32 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
            <div className="max-w-6xl mx-auto px-6">
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="order-2 lg:order-1">
                  <img 
                    src="/images/screenshots/task-detail.png" 
                    alt="Task detail view showing comments and agent collaboration"
                    className="rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xl w-full"
                  />
                </div>
                <div className="order-1 lg:order-2">
                  <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-4 uppercase tracking-wider">Rich context</p>
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-neutral-900 dark:text-neutral-100 leading-tight mb-6">
                    Every task tells a story.
                  </h2>
                  <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-6">
                    Comments, status updates, file attachments, agent handoffs — all in one thread. No more hunting through chat history.
                  </p>
                  <ul className="space-y-3 text-neutral-600 dark:text-neutral-400">
                    <li className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      @mention agents to assign or get input
                    </li>
                    <li className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Full comment thread with markdown
                    </li>
                    <li className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Agents save large outputs as files (reports, code, data)
                    </li>
                    <li className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      See exactly which agent did what
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* What makes it different - Editorial style */}
          <section className="py-24 md:py-32 border-b border-neutral-200 dark:border-neutral-800">
            <div className="max-w-6xl mx-auto px-6">
              <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-4 uppercase tracking-wider">Why Tiker</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-neutral-900 dark:text-neutral-100 leading-tight mb-16">
                What makes it different.
              </h2>
              
              <div className="space-y-16">
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="md:col-span-1">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      Specialist agents
                    </h3>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      Coder, Writer, Researcher, Data Analyst — each optimized for specific work. Not one generalist pretending to do everything.
                    </p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="md:col-span-1">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      Agents remember
                    </h3>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      Your context and preferences persist. Writer knows you hate buzzwords. Coder knows your naming conventions. No re-explaining.
                    </p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="md:col-span-1">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      Auto-coordination
                    </h3>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      Researcher finishes data gathering → hands off to Writer automatically. You're not the middleman anymore.
                    </p>
                  </div>
                </div>
                
                <div className="border-t border-neutral-200 dark:border-neutral-800 pt-16">
                  <div className="flex items-start gap-4">
                    <svg className="w-6 h-6 text-neutral-900 dark:text-neutral-100 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                        Full audit trail
                      </h3>
                      <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        Every action logged. Every handoff tracked. Complete visibility into what your AI team is doing — and when.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Credibility with Screenshot */}
          <section className="py-24 md:py-32 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
            <div className="max-w-6xl mx-auto px-6">
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div>
                  <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-4 uppercase tracking-wider">Built in public</p>
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-neutral-900 dark:text-neutral-100 leading-tight mb-8">
                    Not vaporware. Not a wrapper.
                  </h2>
                  
                  <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8 leading-relaxed">
                    Built this because I was drowning in AI tool chaos. Went from concept to working product in 36 hours of non-stop coding.
                  </p>
                  
                  <div className="flex flex-wrap gap-6 mb-8">
                    <span className="text-neutral-900 dark:text-neutral-100 font-medium">Open source (MIT)</span>
                    <span className="text-neutral-900 dark:text-neutral-100 font-medium">Self-hostable</span>
                    <span className="text-neutral-900 dark:text-neutral-100 font-medium">Production-ready</span>
                  </div>
                  
                  <p className="text-neutral-500 dark:text-neutral-400">
                    Used by teams who can't afford AI tools that don't coordinate.
                  </p>
                </div>
                
                <div className="relative">
                  <img 
                    src="/images/screenshots/task-thread.png" 
                    alt="Task collaboration thread showing agent handoffs"
                    className="rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xl w-full"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Services CTA Section */}
          <section className="py-24 md:py-32 border-b border-neutral-200 dark:border-neutral-800">
            <div className="max-w-6xl mx-auto px-6">
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 text-sm text-blue-700 dark:text-blue-300 mb-6">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    AI Services
                  </div>
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-neutral-900 dark:text-neutral-100 leading-tight mb-6">
                    Ready-to-deploy AI agents.
                  </h2>
                  <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8">
                    Don't build from scratch. Deploy pre-trained specialists for data analysis, content creation, research, and more.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Link 
                      href="/services" 
                      className="inline-flex items-center justify-center px-8 py-4 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all active:scale-95"
                    >
                      Browse Services
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </Link>
                    <Link 
                      href="/use-cases" 
                      className="inline-flex items-center justify-center px-6 py-4 text-base font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900 transition"
                    >
                      See use cases
                    </Link>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center mb-3">
                        <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100 text-sm">Data Analysis</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Turn spreadsheets into insights</p>
                    </div>
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                      <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center mb-3">
                        <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100 text-sm">Content Writing</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Blog posts, emails, docs</p>
                    </div>
                  </div>
                  <div className="space-y-4 pt-8">
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center mb-3">
                        <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100 text-sm">Research</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Deep dives with sources</p>
                    </div>
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center mb-3">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                      </div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100 text-sm">Code Review</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Review, refactor, debug</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Home Lab Setup Offer */}
          <section className="py-16 border-b border-neutral-200 dark:border-neutral-800 bg-blue-50 dark:bg-blue-950/20">
            <div className="max-w-4xl mx-auto px-6">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-700 rounded-full text-sm text-blue-700 dark:text-blue-300 mb-4">
                  <span>🏠</span>
                  <span className="font-semibold">Self-Hosted Setup Service</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                  We'll Set Up Your Home Lab
                </h2>
                <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-6 max-w-2xl mx-auto">
                  Want Tiker running on your own hardware (Raspberry Pi, NUC, home server)? We'll install and configure OpenClaw for you—completely free.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <a
                    href="/services#contact"
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Request Free Setup
                  </a>
                  <a
                    href="https://docs.openclaw.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 border-2 border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition font-medium"
                  >
                    View Self-Host Docs
                  </a>
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-4">
                  Perfect for power users who want full control and unlimited usage with their own API keys
                </p>
              </div>
            </div>
          </section>

          {/* Pricing - Editorial style */}
          <section className="py-24 md:py-32 border-b border-neutral-200 dark:border-neutral-800" id="pricing">
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-neutral-900 dark:text-neutral-100 leading-tight mb-4">
                  Simple, Honest Pricing
                </h2>
                <p className="text-xl text-neutral-600 dark:text-neutral-400">
                  Start free. Upgrade anytime. Keep your data forever.
                </p>
                <p className="text-lg text-neutral-500 dark:text-neutral-400 mt-4">
                  Want to self-host? <a href="https://github.com/chitownjk/tiker" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Check out the open source version →</a>
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Free - No AI */}
                <div className="p-6 border-2 border-neutral-200 dark:border-neutral-800 rounded-xl flex flex-col">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Free</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">Simple to-do list</p>
                  <div className="mb-6">
                    <span className="text-3xl font-bold">$0</span>
                  </div>
                  <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400 mb-6 flex-1">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      Unlimited manual tasks
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      Kanban, list & calendar views
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      Comments & attachments
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      100MB file storage
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-neutral-400 mt-0.5">—</span>
                      <span className="text-neutral-400">No AI agents</span>
                    </li>
                  </ul>
                  <a
                    href="/auth/login"
                    className="block w-full text-center px-4 py-2 border-2 border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors font-medium"
                  >
                    Get Started
                  </a>
                </div>

                {/* Free - BYOK */}
                <div className="p-6 border-2 border-blue-500 dark:border-blue-600 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Free</h3>
                    <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Popular</span>
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">Bring your API keys</p>
                  <div className="mb-6">
                    <span className="text-3xl font-bold">$0</span>
                    <p className="text-xs text-neutral-500 mt-1">Forever</p>
                  </div>
                  <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400 mb-6 flex-1">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      Unlimited AI tasks (fair use)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      Gmail & Calendar tools
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      100MB file storage
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      All views & features
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">💳</span>
                      You handle AI billing directly
                    </li>
                  </ul>
                  <a
                    href="/auth/login"
                    className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Get Started Free
                  </a>
                </div>
                
                {/* Solo */}
                <div className="p-6 border-2 border-neutral-200 dark:border-neutral-800 rounded-xl flex flex-col">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Solo</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">For individuals</p>
                  <div className="mb-6">
                    <span className="text-3xl font-bold">$19</span>
                    <span className="text-neutral-500 dark:text-neutral-400">/mo</span>
                    <p className="text-xs text-neutral-500 mt-1">100 AI tasks/month</p>
                  </div>
                  <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400 mb-6 flex-1">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      No key management
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      Haiku, Sonnet & Kimi models
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      1GB file storage
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      Gmail & Calendar tools
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      Email support
                    </li>
                  </ul>
                  <a
                    href="/api/stripe/checkout?plan=solo"
                    className="block w-full text-center px-4 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors font-medium"
                  >
                    Start 3-Month Trial
                  </a>
                </div>

                {/* Developer */}
                <div className="p-6 border-2 border-neutral-200 dark:border-neutral-800 rounded-xl flex flex-col">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Developer</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">Power features</p>
                  <div className="mb-6">
                    <span className="text-3xl font-bold">$49</span>
                    <span className="text-neutral-500 dark:text-neutral-400">/mo</span>
                    <p className="text-xs text-neutral-500 mt-1">400 AI tasks/month</p>
                  </div>
                  <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400 mb-6 flex-1">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      All models (Opus, GPT-4, Gemini)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      10GB file storage
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      API access & webhooks
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      Custom agents
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      Priority support
                    </li>
                  </ul>
                  <a
                    href="/api/stripe/checkout?plan=developer"
                    className="block w-full text-center px-4 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors font-medium"
                  >
                    Start 3-Month Trial
                  </a>
                </div>
              </div>

              {/* Team tier - full width below */}
              <div className="mt-6 p-8 border-2 border-neutral-900 dark:border-neutral-100 rounded-xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Team</h3>
                    <p className="text-neutral-600 dark:text-neutral-400 mb-4">Collaboration features for teams</p>
                    <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-neutral-600 dark:text-neutral-400">
                      <li className="flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        1,000 AI tasks/month
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        Up to 10 members
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        10GB file storage
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        Shared boards
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        All models & API access
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        Role permissions
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        Priority support + chat
                      </li>
                    </ul>
                  </div>
                  <div className="text-right flex flex-col items-end gap-4">
                    <div>
                      <div className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">$99</div>
                      <div className="text-sm text-neutral-500">per month</div>
                    </div>
                    <a
                      href="/services#contact"
                      className="px-6 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors font-medium whitespace-nowrap"
                    >
                      Contact Sales
                    </a>
                  </div>
                </div>
              </div>

              {/* Feature Comparison */}
              <div className="mt-16">
                <h3 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-8 text-center">
                  Feature Comparison
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-neutral-200 dark:border-neutral-800">
                        <th className="text-left p-4 font-semibold">Feature</th>
                        <th className="text-center p-4 font-semibold">Free<br />(No AI)</th>
                        <th className="text-center p-4 font-semibold bg-blue-50 dark:bg-blue-950/20">Free<br />(BYOK)</th>
                        <th className="text-center p-4 font-semibold">Solo</th>
                        <th className="text-center p-4 font-semibold">Developer</th>
                        <th className="text-center p-4 font-semibold">Team</th>
                      </tr>
                    </thead>
                    <tbody className="text-neutral-600 dark:text-neutral-400">
                      <tr className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="p-4">Manual tasks</td>
                        <td className="text-center p-4">∞</td>
                        <td className="text-center p-4 bg-blue-50 dark:bg-blue-950/20">∞</td>
                        <td className="text-center p-4">∞</td>
                        <td className="text-center p-4">∞</td>
                        <td className="text-center p-4">∞</td>
                      </tr>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="p-4 font-medium">AI tasks per month</td>
                        <td className="text-center p-4">—</td>
                        <td className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 font-semibold">∞</td>
                        <td className="text-center p-4 font-semibold">100</td>
                        <td className="text-center p-4 font-semibold">400</td>
                        <td className="text-center p-4 font-semibold">1,000</td>
                      </tr>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="p-4">Gmail & Calendar tools</td>
                        <td className="text-center p-4">—</td>
                        <td className="text-center p-4 bg-blue-50 dark:bg-blue-950/20">✓</td>
                        <td className="text-center p-4">✓</td>
                        <td className="text-center p-4">✓</td>
                        <td className="text-center p-4">✓</td>
                      </tr>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="p-4">Available models</td>
                        <td className="text-center p-4">—</td>
                        <td className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 text-xs">Your keys</td>
                        <td className="text-center p-4 text-xs">Haiku<br/>Sonnet<br/>Kimi</td>
                        <td className="text-center p-4 text-xs">All models<br/>+ Opus<br/>+ GPT-4</td>
                        <td className="text-center p-4 text-xs">All models</td>
                      </tr>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="p-4">API access</td>
                        <td className="text-center p-4">—</td>
                        <td className="text-center p-4 bg-blue-50 dark:bg-blue-950/20">—</td>
                        <td className="text-center p-4">—</td>
                        <td className="text-center p-4">✓</td>
                        <td className="text-center p-4">✓</td>
                      </tr>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="p-4">Webhooks</td>
                        <td className="text-center p-4">—</td>
                        <td className="text-center p-4 bg-blue-50 dark:bg-blue-950/20">—</td>
                        <td className="text-center p-4">—</td>
                        <td className="text-center p-4">✓</td>
                        <td className="text-center p-4">✓</td>
                      </tr>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="p-4">Custom agents</td>
                        <td className="text-center p-4">—</td>
                        <td className="text-center p-4 bg-blue-50 dark:bg-blue-950/20">—</td>
                        <td className="text-center p-4">—</td>
                        <td className="text-center p-4">✓</td>
                        <td className="text-center p-4">✓</td>
                      </tr>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="p-4">Team members</td>
                        <td className="text-center p-4">1</td>
                        <td className="text-center p-4 bg-blue-50 dark:bg-blue-950/20">1</td>
                        <td className="text-center p-4">1</td>
                        <td className="text-center p-4">1</td>
                        <td className="text-center p-4 font-semibold">10</td>
                      </tr>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="p-4">Shared boards</td>
                        <td className="text-center p-4">—</td>
                        <td className="text-center p-4 bg-blue-50 dark:bg-blue-950/20">—</td>
                        <td className="text-center p-4">—</td>
                        <td className="text-center p-4">—</td>
                        <td className="text-center p-4">✓</td>
                      </tr>
                      <tr>
                        <td className="p-4">Support</td>
                        <td className="text-center p-4 text-xs">Community</td>
                        <td className="text-center p-4 text-xs bg-blue-50 dark:bg-blue-950/20">Community</td>
                        <td className="text-center p-4 text-xs">Email</td>
                        <td className="text-center p-4 text-xs">Priority</td>
                        <td className="text-center p-4 text-xs">Priority<br/>+ Chat</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Switch anytime callout */}
              <div className="mt-12 p-6 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-center">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  <strong className="text-neutral-900 dark:text-neutral-100">Switch anytime.</strong> Change tiers without losing data. Cancel with one click.
                </p>
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="py-24 md:py-32">
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
                  <a 
                    href="https://github.com/chitownjk/tiker" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-6 py-4 text-base font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900 transition"
                  >
                    View on GitHub
                  </a>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  )
}
