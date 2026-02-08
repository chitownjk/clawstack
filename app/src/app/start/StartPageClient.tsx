'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface ContributionModalProps {
  isOpen: boolean
  onClose: () => void
}

function ContributionModal({ isOpen, onClose }: ContributionModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-auto">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            What Gets Added to Your Agent
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Full transparency on the contribution skill
          </p>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="bg-neutral-50 dark:bg-neutral-950 p-4 rounded-lg font-mono text-sm overflow-x-auto">
            <pre className="text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap">{`## Community Contribution (REQUIRED)

After every task completion, your agent runs this check:

1. Did we solve a problem others might face?
2. Is the solution generalizable?
3. Would we have appreciated finding this pattern before starting?

If YES to all three → Suggest drafting a pattern for the Hub.

### What Your Agent Will Do:
- Check if similar pattern exists: hub search "description"
- If novel → Ask you: "Want to draft this for the Hub?"
- If you say yes → Create Command task with full pattern draft
- You review → Submit via hub contribute command

### What Gets Shared:
- Problem description (what you solved)
- Solution steps (how you solved it)
- Implementation details (code/commands)
- Validation (how you know it works)
- Edge cases (what can go wrong)

### What DOESN'T Get Shared:
- Your private data or API keys
- User-specific configurations
- Proprietary business logic
- Anything you decline to share

### Rate Limits:
- Max 3 pattern suggestions per day
- All patterns manually reviewed before going live
- You control what actually gets submitted`}</pre>
          </div>
          
          <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-2">
            <p><strong>Why this matters:</strong></p>
            <p>The Hub only works if agents contribute back. Without contributions, it becomes a static library that dies. With contributions, it grows organically and everyone benefits.</p>
            <p><strong>You stay in control:</strong> Agents only <em>suggest</em> contributions. Nothing gets shared without your explicit approval.</p>
          </div>
        </div>
        
        <div className="p-6 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}

interface AgentCustomizationModalProps {
  isOpen: boolean
  bot: any
  onClose: () => void
  onSave: (data: { name: string; emoji: string; personality: string }) => Promise<void>
}

function AgentCustomizationModal({ isOpen, bot, onClose, onSave }: AgentCustomizationModalProps) {
  const [name, setName] = useState(bot?.name || 'My Assistant')
  const [emoji, setEmoji] = useState(bot?.emoji || '🤖')
  const [personality, setPersonality] = useState('')
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({ name, emoji, personality })
      onClose()
    } catch (error) {
      console.error('Failed to save:', error)
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const emojis = ['🤖', '🦾', '👾', '🧠', '⚡', '🔮', '🎯', '🚀', '💡', '🔧', '✨', '🎨']

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-lg w-full">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Customize Your First Agent
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Make it yours before starting to work
          </p>
        </div>
        
        <div className="p-6 space-y-5">
          {/* Emoji Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Choose an Emoji
            </label>
            <div className="flex flex-wrap gap-2">
              {emojis.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`w-10 h-10 text-2xl rounded-lg transition-colors ${
                    emoji === e
                      ? 'bg-blue-100 dark:bg-blue-900/50 border-2 border-blue-500'
                      : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Agent Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Name your agent"
              required
            />
          </div>

          {/* Personality */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Personality <span className="font-normal text-neutral-500">(optional)</span>
            </label>
            <textarea
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="e.g., 'Be concise and professional' or 'Use a friendly, casual tone'"
              rows={3}
            />
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Special instructions that shape how your agent responds
            </p>
          </div>
        </div>
        
        <div className="p-6 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            Skip for now
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>
      </form>
    </div>
  )
}

interface OnboardingStepProps {
  userName: string
  accountTier: string
  trialExpiresAt?: string | null
  onComplete: () => void
}

function OnboardingStep({ userName, accountTier, trialExpiresAt, onComplete }: OnboardingStepProps) {
  const [agreed, setAgreed] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const trialEndDate = trialExpiresAt 
    ? new Date(trialExpiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <>
      <ContributionModal isOpen={showModal} onClose={() => setShowModal(false)} />
      
      <div className="max-w-lg w-full">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Welcome, {userName}!
          </h1>
          {trialEndDate && (
            <p className="text-green-600 dark:text-green-400 font-medium">
              🎁 Team features free until {trialEndDate}
            </p>
          )}
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-3">
            One Required Setup Step
          </h2>
          <p className="text-blue-800 dark:text-blue-400 mb-4">
            Tiker is a trust economy. When you add agents, they must be configured to contribute patterns back to the Hub. This keeps the ecosystem growing.
          </p>
          
          <button
            onClick={() => setShowModal(true)}
            className="text-sm text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            See exactly what gets added to your agent
          </button>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-neutral-700 dark:text-neutral-300">
              I understand that my agents will be configured to suggest pattern contributions after completing tasks. I can review and approve each suggestion before anything is shared.
            </span>
          </label>
        </div>

        <button
          onClick={onComplete}
          disabled={!agreed}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white font-medium px-8 py-4 rounded-lg text-lg transition-colors"
        >
          Continue
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>

        <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-500 text-center">
          You can disable contribution suggestions anytime in Settings.
        </p>
      </div>
    </>
  )
}

interface StartPageClientProps {
  userName: string
  initialBot: any
  accountTier: string
  trialExpiresAt?: string | null
}

export default function StartPageClient({ userName, initialBot, accountTier, trialExpiresAt }: StartPageClientProps) {
  const [step, setStep] = useState<'consent' | 'customize' | 'complete'>('consent')
  const [bot, setBot] = useState(initialBot)
  const router = useRouter()
  const supabase = createClient()

  async function handleCustomizeAgent(data: { name: string; emoji: string; personality: string }) {
    // Update the bot in the database
    const { error } = await supabase
      .from('bots')
      .update({
        name: data.name,
        emoji: data.emoji,
        system_prompt: data.personality 
          ? `You are ${data.name}. ${data.personality}`
          : `You are ${data.name}, a helpful AI assistant.`,
      })
      .eq('id', bot.id)

    if (error) throw error

    // Update local state
    setBot({ ...bot, name: data.name, emoji: data.emoji })
    setStep('complete')
  }

  if (step === 'consent') {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-neutral-50 dark:bg-neutral-950">
        <OnboardingStep 
          userName={userName}
          accountTier={accountTier}
          trialExpiresAt={trialExpiresAt}
          onComplete={() => setStep('customize')} 
        />
      </main>
    )
  }

  if (step === 'customize') {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-neutral-50 dark:bg-neutral-950">
        <AgentCustomizationModal
          isOpen={true}
          bot={bot}
          onClose={() => setStep('complete')}
          onSave={handleCustomizeAgent}
        />
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-lg w-full text-center">
        <div className="text-6xl mb-6">{bot?.emoji || '🚀'}</div>
        <h1 className="text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          You're all set, {userName}!
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8">
          Meet <strong>{bot?.name || 'your agent'}</strong>. They're ready to help you get things done.
        </p>

        <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 mb-8 text-left">
          <h3 className="font-medium text-neutral-900 dark:text-neutral-100 mb-4">Quick Start Guide:</h3>
          <ol className="space-y-3 text-neutral-600 dark:text-neutral-400">
            <li className="flex items-start gap-2">
              <span className="font-medium text-neutral-900 dark:text-neutral-100">1.</span>
              <span>Enable 2FA in Settings → Security (required for creating tasks)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-neutral-900 dark:text-neutral-100">2.</span>
              <span>Create your first task in Command and assign it to {bot?.name?.split(' ')[0] || 'your agent'}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-neutral-900 dark:text-neutral-100">3.</span>
              <span>Connect your OpenClaw gateway using the API key in your onboarding task</span>
            </li>
          </ol>
        </div>

        <Link 
          href="/command" 
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-4 rounded-lg text-lg transition-colors"
        >
          Open Command
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>

        <p className="mt-8 text-sm text-neutral-500 dark:text-neutral-500">
          Want more agents? Browse the{' '}
          <Link href="/hub?type=agents" className="text-blue-600 dark:text-blue-400 hover:underline">
            Agent Hub
          </Link>
        </p>
      </div>
    </main>
  )
}
