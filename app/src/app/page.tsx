import Link from 'next/link'
import { createRealSupabaseClient } from '@/lib/supabase-server'
import CommandRedirect from '@/components/CommandRedirect'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Tiker - Your life, handled.',
  description: 'The AI life operator. Daily briefings, email intelligence, meeting prep, smart reminders, and autonomous task handling. Your personal chief of staff.',
}

export default async function LandingPage() {
  const supabase = await createRealSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen">
      {/* Logged in: redirect to command */}
      {user ? (
        <>
          <CommandRedirect />
          <section className="relative overflow-hidden border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
            <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
              <div className="max-w-4xl">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-900 text-sm text-green-700 dark:text-green-300 mb-6">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Tiker is working for you
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-neutral-900 dark:text-neutral-100 leading-[1] tracking-tight mb-6">
                  Welcome back.
                </h1>

                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  <Link
                    href="/command"
                    className="group p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-blue-400 dark:hover:border-blue-600 transition"
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                          Today's Briefing
                        </h2>
                      </div>
                    </div>
                    <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                      Your daily intelligence report. Calendar, tasks, inbox highlights.
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
          {/* Navigation */}
          <nav className="sticky top-0 z-50 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md">
            <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
              <Link href="/" className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Tiker
              </Link>
              <div className="flex items-center gap-6 text-sm">
                <Link href="/pricing" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                  Pricing
                </Link>
                <Link href="/blog" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                  Blog
                </Link>
                <a href="https://github.com/chitownjk/tiker" target="_blank" rel="noopener noreferrer" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                  GitHub
                </a>
                <Link href="/auth/login" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm">
                  Sign In
                </Link>
              </div>
            </div>
          </nav>

          {/* Hero Section */}
          <section className="py-24 md:py-32 border-b border-neutral-200 dark:border-neutral-800 bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-950 dark:to-neutral-900">
            <div className="max-w-6xl mx-auto px-6 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 text-sm text-blue-700 dark:text-blue-300 mb-8">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                AI-powered life operations
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-neutral-900 dark:text-neutral-100 leading-tight mb-6">
                Your life,
                <br />
                <span className="text-blue-600 dark:text-blue-400">handled.</span>
              </h1>
              <p className="text-xl md:text-2xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto mb-12">
                Tiker scans your inbox, preps your meetings, manages your schedule,
                and handles the life admin you keep putting off.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  href="/auth/login"
                  className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-lg"
                >
                  Start Free
                </Link>
                <Link
                  href="/#how-it-works"
                  className="px-8 py-4 bg-white dark:bg-neutral-800 border-2 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg font-semibold hover:border-neutral-400 dark:hover:border-neutral-600 transition text-lg"
                >
                  See How It Works
                </Link>
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-6">
                Free tier available. No credit card required.
              </p>
            </div>
          </section>

          {/* The Problem */}
          <section className="py-24 md:py-32 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
            <div className="max-w-6xl mx-auto px-6">
              <div className="max-w-3xl mx-auto text-center">
                <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-4 uppercase tracking-wider">The problem</p>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-neutral-900 dark:text-neutral-100 leading-tight mb-8">
                  You're drowning in life admin.
                </h2>
                <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed mb-12">
                  Flights buried in your inbox. Bills you forgot about. Meetings you walked into cold.
                  Tasks that slip through the cracks. The small stuff piles up until it becomes big stuff.
                </p>
                <div className="grid sm:grid-cols-3 gap-6 text-left">
                  <div className="p-5 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <div className="text-2xl mb-2">&#x1f4e7;</div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Important emails buried under newsletters, receipts, and spam
                    </p>
                  </div>
                  <div className="p-5 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <div className="text-2xl mb-2">&#x1f4c5;</div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Back-to-back meetings with no time to prepare or follow up
                    </p>
                  </div>
                  <div className="p-5 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <div className="text-2xl mb-2">&#x1f914;</div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      That nagging feeling you forgot something important
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* How it Works */}
          <section className="py-24 md:py-32 border-b border-neutral-200 dark:border-neutral-800" id="how-it-works">
            <div className="max-w-6xl mx-auto px-6">
              <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-4 uppercase tracking-wider">How it works</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-neutral-900 dark:text-neutral-100 leading-tight mb-16">
                Your personal chief of staff.
              </h2>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-lg">
                    1
                  </div>
                  <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Connect your accounts</h3>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    Link Gmail, Google Calendar, and LinkedIn. Tiker starts watching in the background, pulling together the information that matters.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-lg">
                    2
                  </div>
                  <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Wake up to your briefing</h3>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    Every morning, Tiker delivers a personalized briefing: your schedule, tasks, inbox highlights, calendar conflicts, and AI-generated suggestions for the day.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-lg">
                    3
                  </div>
                  <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Let Tiker handle the rest</h3>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    Flights auto-added to your calendar. Meeting prep generated before you walk in. Reminders that escalate until things get done. You focus on what matters.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Core Features */}
          <section className="py-24 md:py-32 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
            <div className="max-w-6xl mx-auto px-6">
              <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-4 uppercase tracking-wider">What Tiker does</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-neutral-900 dark:text-neutral-100 leading-tight mb-16">
                Everything your assistant would do.
              </h2>

              <div className="space-y-16">
                {/* Daily Briefing */}
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300 mb-4">
                      Every morning
                    </div>
                    <h3 className="text-2xl md:text-3xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                      Daily Intelligence Briefing
                    </h3>
                    <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-6">
                      Your day at a glance. AI synthesizes your calendar, tasks, inbox, and agent activity into one actionable summary.
                      Delivered at your preferred time, in your timezone.
                    </p>
                    <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Calendar conflicts flagged automatically
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Tasks needing attention surfaced first
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        AI-generated suggestions for your day
                      </div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Good morning</p>
                        <p className="text-xs text-neutral-500">Friday, March 7</p>
                      </div>
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
                      You have 4 meetings today, starting with a 1:1 at 9 AM. Two tasks are due, and your flight confirmation from United arrived overnight.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">Conflict</span>
                        <span className="text-neutral-500 dark:text-neutral-400">Team sync overlaps with design review at 2 PM</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">Flight</span>
                        <span className="text-neutral-500 dark:text-neutral-400">UA 234 to SFO added to calendar</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Email Intelligence */}
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  <div className="order-2 lg:order-1 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-lg">
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">Extracted from inbox</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">&#x2708;</span>
                          <div>
                            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Flight: JFK to SFO</p>
                            <p className="text-xs text-neutral-500">Mar 15, 8:30 AM</p>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">Added</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">&#x1f3e8;</span>
                          <div>
                            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Hotel: Marriott Union Square</p>
                            <p className="text-xs text-neutral-500">Mar 15-17, 2 nights</p>
                          </div>
                        </div>
                        <button className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">Add to cal</button>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">&#x1f4b3;</span>
                          <div>
                            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Bill: AWS Invoice</p>
                            <p className="text-xs text-neutral-500">$247.83 due Mar 20</p>
                          </div>
                        </div>
                        <button className="text-xs px-2 py-1 bg-neutral-200 dark:bg-neutral-600 text-neutral-700 dark:text-neutral-300 rounded">Remind me</button>
                      </div>
                    </div>
                  </div>
                  <div className="order-1 lg:order-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-xs text-green-700 dark:text-green-300 mb-4">
                      Automatic
                    </div>
                    <h3 className="text-2xl md:text-3xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                      Email Intelligence
                    </h3>
                    <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-6">
                      Tiker scans your Gmail and pulls out the things that matter: flight confirmations, hotel bookings,
                      bills, event invites, deliveries, and action items. Then acts on them.
                    </p>
                    <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Flights and hotels auto-added to your calendar
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Bills and due dates tracked with reminders
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        7 extraction types with one-click actions
                      </div>
                    </div>
                  </div>
                </div>

                {/* Meeting Prep */}
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs text-purple-700 dark:text-purple-300 mb-4">
                      One click
                    </div>
                    <h3 className="text-2xl md:text-3xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                      Meeting Prep
                    </h3>
                    <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-6">
                      Never walk into a meeting cold again. Click "Prep" on any calendar event and Tiker researches attendees,
                      pulls prior context from your tasks and activities, and generates talking points and questions to ask.
                    </p>
                    <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        LinkedIn profiles for every attendee
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Prior interactions and related tasks surfaced
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        AI-generated talking points and questions
                      </div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-1.5 rounded-full bg-green-500 self-stretch min-h-[36px]"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Product Review with Sarah Chen</p>
                        <p className="text-xs text-neutral-500">2:00 PM / 3 attendees</p>
                      </div>
                    </div>
                    <div className="space-y-3 pl-4 border-l-2 border-neutral-100 dark:border-neutral-700">
                      <div>
                        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">Attendees</p>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-xs font-medium">S</div>
                          <div>
                            <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">Sarah Chen</p>
                            <p className="text-xs text-neutral-500">VP Product at Acme Corp</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">Talking Points</p>
                        <div className="space-y-1">
                          <p className="text-xs text-neutral-600 dark:text-neutral-300">1. Q1 roadmap progress and blockers</p>
                          <p className="text-xs text-neutral-600 dark:text-neutral-300">2. User feedback on new onboarding flow</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Smart Reminders */}
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  <div className="order-2 lg:order-1 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-lg">
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">Escalation timeline</p>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-medium w-16 text-center">Day 1</span>
                        <div className="flex-1 h-0.5 bg-neutral-200 dark:bg-neutral-700"></div>
                        <span className="text-xs text-neutral-500">Gentle nudge in briefing</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-xs font-medium w-16 text-center">Day 3</span>
                        <div className="flex-1 h-0.5 bg-neutral-200 dark:bg-neutral-700"></div>
                        <span className="text-xs text-neutral-500">Highlighted in attention items</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs font-medium w-16 text-center">Day 7</span>
                        <div className="flex-1 h-0.5 bg-neutral-200 dark:bg-neutral-700"></div>
                        <span className="text-xs text-neutral-500">Email escalation sent</span>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                        "Renew car registration" has been pending for 3 days. Escalating to attention items.
                      </p>
                    </div>
                  </div>
                  <div className="order-1 lg:order-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 mb-4">
                      Persistent
                    </div>
                    <h3 className="text-2xl md:text-3xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                      Smart Reminders
                    </h3>
                    <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-6">
                      Reminders that do not give up. When you miss something, Tiker escalates with increasing urgency
                      over days 1, 3, and 7. Snooze when you need to. Get emailed when it is critical.
                    </p>
                    <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Three-stage escalation with visual urgency
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Configurable snooze and email delivery
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Linked to tasks, calendar events, and extracted items
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Plus: AI Agents */}
          <section className="py-24 md:py-32 border-b border-neutral-200 dark:border-neutral-800">
            <div className="max-w-6xl mx-auto px-6">
              <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-4 uppercase tracking-wider">Plus</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-neutral-900 dark:text-neutral-100 leading-tight mb-16">
                AI agents that do the work.
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
                      Writer, Coder, Researcher, Data Analyst. Each optimized for specific work. Assign a task and it gets done in the background while you focus on what matters.
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                  <div className="md:col-span-1">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      Persistent memory
                    </h3>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      Your context and preferences persist across sessions. Writer knows your tone. Coder knows your stack. No re-explaining every time.
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
                      Agents hand off to each other automatically. Researcher gathers data, Writer drafts the report. You review the final output, not every step.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section className="py-24 md:py-32 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900" id="pricing">
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-neutral-900 dark:text-neutral-100 leading-tight mb-4">
                  Simple, Honest Pricing
                </h2>
                <p className="text-xl text-neutral-600 dark:text-neutral-400">
                  Start free. Upgrade when Tiker earns it.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {/* Free */}
                <div className="p-6 border-2 border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 flex flex-col">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Free</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">Organize without AI</p>
                  <div className="mb-6">
                    <span className="text-3xl font-bold">$0</span>
                  </div>
                  <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400 mb-6 flex-1">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">&#x2713;</span>
                      Unlimited manual tasks
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">&#x2713;</span>
                      Kanban, list, and calendar views
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">&#x2713;</span>
                      Comments and attachments
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">&#x2713;</span>
                      100MB file storage
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-neutral-400 mt-0.5">-</span>
                      <span className="text-neutral-400">No AI features</span>
                    </li>
                  </ul>
                  <a
                    href="/auth/login"
                    className="block w-full text-center px-4 py-2 border-2 border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors font-medium"
                  >
                    Get Started
                  </a>
                </div>

                {/* Solo */}
                <div className="p-6 border-2 border-blue-500 dark:border-blue-600 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Solo</h3>
                    <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Popular</span>
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">Your AI life operator</p>
                  <div className="mb-6">
                    <span className="text-3xl font-bold">$19</span>
                    <span className="text-neutral-500 dark:text-neutral-400">/mo</span>
                    <p className="text-xs text-neutral-500 mt-1">200 AI tasks/month</p>
                  </div>
                  <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400 mb-6 flex-1">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">&#x2713;</span>
                      Daily AI briefings
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">&#x2713;</span>
                      Email intelligence (flights, bills, invites)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">&#x2713;</span>
                      Meeting prep with attendee research
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">&#x2713;</span>
                      Smart reminders with escalation
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">&#x2713;</span>
                      AI agents (Writer, Coder, Researcher)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">&#x2713;</span>
                      Gmail and Calendar integration
                    </li>
                  </ul>
                  <a
                    href="/api/stripe/checkout?plan=solo"
                    className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Start Free Trial
                  </a>
                </div>

                {/* Team */}
                <div className="p-6 border-2 border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 flex flex-col">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Team</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">Collaborate with your team</p>
                  <div className="mb-6">
                    <span className="text-3xl font-bold">$99</span>
                    <span className="text-neutral-500 dark:text-neutral-400">/mo</span>
                    <p className="text-xs text-neutral-500 mt-1">1,000 AI tasks/month</p>
                  </div>
                  <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400 mb-6 flex-1">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">&#x2713;</span>
                      Everything in Solo
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">&#x2713;</span>
                      Up to 10 team members
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">&#x2713;</span>
                      Shared boards and projects
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">&#x2713;</span>
                      Role-based permissions
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">&#x2713;</span>
                      10GB file storage
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">&#x2713;</span>
                      Priority support
                    </li>
                  </ul>
                  <a
                    href="mailto:jay@tiker.io?subject=Tiker Team Plan"
                    className="block w-full text-center px-4 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors font-medium"
                  >
                    Contact Sales
                  </a>
                </div>
              </div>

              {/* Feature Comparison */}
              <div className="mt-16">
                <h3 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-8 text-center">
                  Feature Comparison
                </h3>
                <div className="overflow-x-auto max-w-3xl mx-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-neutral-200 dark:border-neutral-800">
                        <th className="text-left p-4 font-semibold">Feature</th>
                        <th className="text-center p-4 font-semibold">Free</th>
                        <th className="text-center p-4 font-semibold bg-blue-50 dark:bg-blue-950/20">Solo</th>
                        <th className="text-center p-4 font-semibold">Team</th>
                      </tr>
                    </thead>
                    <tbody className="text-neutral-600 dark:text-neutral-400">
                      <tr className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="p-4">Manual tasks</td>
                        <td className="text-center p-4">Unlimited</td>
                        <td className="text-center p-4 bg-blue-50 dark:bg-blue-950/20">Unlimited</td>
                        <td className="text-center p-4">Unlimited</td>
                      </tr>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="p-4 font-medium">AI tasks per month</td>
                        <td className="text-center p-4">-</td>
                        <td className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 font-semibold">200</td>
                        <td className="text-center p-4 font-semibold">1,000</td>
                      </tr>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="p-4">Daily briefings</td>
                        <td className="text-center p-4">-</td>
                        <td className="text-center p-4 bg-blue-50 dark:bg-blue-950/20">&#x2713;</td>
                        <td className="text-center p-4">&#x2713;</td>
                      </tr>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="p-4">Email intelligence</td>
                        <td className="text-center p-4">-</td>
                        <td className="text-center p-4 bg-blue-50 dark:bg-blue-950/20">&#x2713;</td>
                        <td className="text-center p-4">&#x2713;</td>
                      </tr>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="p-4">Meeting prep</td>
                        <td className="text-center p-4">-</td>
                        <td className="text-center p-4 bg-blue-50 dark:bg-blue-950/20">&#x2713;</td>
                        <td className="text-center p-4">&#x2713;</td>
                      </tr>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="p-4">Smart reminders</td>
                        <td className="text-center p-4">-</td>
                        <td className="text-center p-4 bg-blue-50 dark:bg-blue-950/20">&#x2713;</td>
                        <td className="text-center p-4">&#x2713;</td>
                      </tr>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="p-4">Gmail and Calendar</td>
                        <td className="text-center p-4">-</td>
                        <td className="text-center p-4 bg-blue-50 dark:bg-blue-950/20">&#x2713;</td>
                        <td className="text-center p-4">&#x2713;</td>
                      </tr>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="p-4">File storage</td>
                        <td className="text-center p-4">100MB</td>
                        <td className="text-center p-4 bg-blue-50 dark:bg-blue-950/20">1GB</td>
                        <td className="text-center p-4">10GB</td>
                      </tr>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="p-4">Team members</td>
                        <td className="text-center p-4">1</td>
                        <td className="text-center p-4 bg-blue-50 dark:bg-blue-950/20">1</td>
                        <td className="text-center p-4 font-semibold">10</td>
                      </tr>
                      <tr>
                        <td className="p-4">Support</td>
                        <td className="text-center p-4 text-xs">Community</td>
                        <td className="text-center p-4 text-xs bg-blue-50 dark:bg-blue-950/20">Email</td>
                        <td className="text-center p-4 text-xs">Priority + Chat</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-12 p-6 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-center">
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
                  Stop managing. Start living.
                </h2>
                <p className="text-lg text-neutral-500 dark:text-neutral-400 mb-8">
                  Your briefing is waiting. Connect your accounts and let Tiker handle the rest.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/auth/login"
                    className="inline-flex items-center justify-center px-8 py-4 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
                  >
                    Get Started Free
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

          {/* Footer */}
          <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
            <div className="max-w-6xl mx-auto px-6 py-12">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div>
                  <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Product</h4>
                  <div className="space-y-2 text-sm">
                    <Link href="/pricing" className="block text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Pricing</Link>
                    <Link href="/use-cases" className="block text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Use Cases</Link>
                    <Link href="/security" className="block text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Security</Link>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Resources</h4>
                  <div className="space-y-2 text-sm">
                    <Link href="/blog" className="block text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Blog</Link>
                    <Link href="/docs" className="block text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Docs</Link>
                    <Link href="/faq" className="block text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">FAQ</Link>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Company</h4>
                  <div className="space-y-2 text-sm">
                    <Link href="/about" className="block text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">About</Link>
                    <a href="https://github.com/chitownjk/tiker" target="_blank" rel="noopener noreferrer" className="block text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">GitHub</a>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Legal</h4>
                  <div className="space-y-2 text-sm">
                    <Link href="/privacy" className="block text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Privacy</Link>
                    <Link href="/terms" className="block text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Terms</Link>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-neutral-200 dark:border-neutral-800 text-sm text-neutral-500 dark:text-neutral-400">
                <p>&copy; {new Date().getFullYear()} Tiker. All rights reserved.</p>
              </div>
            </div>
          </footer>
        </>
      )}
    </main>
  )
}
