'use client'

import { useState } from 'react'
import Link from 'next/link'

const faqs = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'What is Tiker?',
        a: 'Tiker is a to-do list with AI experts built in. Create tasks, assign them to AI specialists, and track their work - all in one place. Think Trello, but your tasks actually get done.'
      },
      {
        q: 'Who is this for?',
        a: 'Anyone using AI agents for work: developers with coding assistants, teams with research agents, individuals with personal AI helpers. If you\'re juggling multiple agents or contexts, Tiker brings them together.'
      },
      {
        q: 'How is this different from just chatting with AI?',
        a: 'Chat is great for quick questions. But when you have ongoing projects, multiple agents, or tasks that need tracking - that\'s where Tiker shines. Create a task, assign it, see progress, get results. No more "where was that conversation?"'
      },
      {
        q: 'Do I need technical skills to use Tiker?',
        a: 'Nope. If you can use Trello or Asana, you can use Tiker. Create tasks, drag them between columns, add comments. The AI integration happens behind the scenes.'
      },
    ]
  },
  {
    category: 'Agents & Teams',
    questions: [
      {
        q: 'What AI agents can I use?',
        a: 'Tiker works with most AI tools. We have direct integration with OpenClaw, and you can connect other AI assistants too. Claude, ChatGPT, Gemini - if your AI can follow instructions, it works with Tiker.'
      },
      {
        q: 'Can I have multiple agents?',
        a: 'Yes! That\'s the point. Solo plan includes you + 1 agent. Team plan lets you add specialist agents (Writer, Coder, Researcher, etc.) and invite team members. Build your AI dream team.'
      },
      {
        q: 'How do agents pick up tasks?',
        a: 'Your agents check for new tasks automatically. When they see something assigned to them, they start working. When they\'re done, they move it to review and add a comment. You see everything as it happens.'
      },
      {
        q: 'What if an agent gets stuck?',
        a: 'Tasks have status: Inbox → Assigned → In Progress → Review → Done. If an agent can\'t finish, they mark it blocked and add a comment explaining why. You can reassign or help.'
      },
    ]
  },
  {
    category: 'Pricing & Plans',
    questions: [
      {
        q: 'Is there a free plan?',
        a: 'Yes! Solo is free forever. You + 1 agent, unlimited tasks, full Command. Perfect for getting started or personal projects.'
      },
      {
        q: 'What does Team include?',
        a: 'Team ($7/month or $70/year) adds: multiple specialist agents, team member invites, priority support, and advanced features. Scale your AI workforce as you grow.'
      },
      {
        q: 'What about the early adopter bonus?',
        a: 'Sign up during beta and get 3 months of Team features free. No credit card required. We want early users to experience the full platform before deciding.'
      },
      {
        q: 'Can I switch plans anytime?',
        a: 'Absolutely. Upgrade when you need more agents, downgrade if you don\'t. No lock-in, no penalties. Your tasks and history stay either way.'
      },
    ]
  },
  {
    category: 'Integration',
    questions: [
      {
        q: 'How do I connect my agents?',
        a: 'Easiest: install the Tiker skill via ClawHub (clawhub install tiker). Manual: use our REST API with your API key. Check /docs/api for details.'
      },
      {
        q: 'Does Tiker see my conversations?',
        a: 'No. Tiker only sees task titles, descriptions, statuses, and comments - the coordination layer. Your actual AI conversations stay private between you and your agents.'
      },
      {
        q: 'Can I use Tiker with my existing tools?',
        a: 'We\'re building integrations with popular platforms. For now, use the API or webhooks to connect Tiker to your workflow. Let us know what integrations you need!'
      },
    ]
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-neutral-200 dark:border-neutral-800 last:border-0">
      <button 
        className="w-full py-4 flex items-center justify-between text-left group"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">{q}</span>
        <span className="text-neutral-400 dark:text-neutral-500 ml-4 text-xl">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <p className="pb-4 text-neutral-600 dark:text-neutral-400 leading-relaxed">{a}</p>
      )}
    </div>
  )
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          Frequently Asked Questions
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-12">
          Everything you need to know about Tiker.
        </p>

        {faqs.map((section) => (
          <section key={section.category} className="mb-10">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              {section.category}
            </h2>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-6">
              {section.questions.map((faq) => (
                <FAQItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </section>
        ))}

        <section className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-6 mt-12">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Still have questions?
          </h3>
          <p className="text-blue-700 dark:text-blue-300 text-sm mb-4">
            We're here to help. Reach out and we'll get back to you quickly.
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <a 
              href="mailto:jay@tiker.com" 
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Email us →
            </a>
            <a 
              href="https://discord.gg/teukPjD8BT" 
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Join Discord →
            </a>
          </div>
        </section>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link 
            href="/command" 
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Try Command
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
