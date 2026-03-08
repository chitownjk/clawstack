'use client'

import { useState } from 'react'
import { useConsumerMode } from '@/hooks/useConsumerMode'

interface ConsumerOnboardingProps {
  onComplete: () => void
}

type Step = 'name' | 'useCase' | 'connect'
type UseCase = 'household' | 'business' | 'both'

export default function ConsumerOnboarding({ onComplete }: ConsumerOnboardingProps) {
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [useCase, setUseCase] = useState<UseCase | null>(null)
  const [saving, setSaving] = useState(false)
  const { updateProfile } = useConsumerMode()

  async function handleNameSubmit() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await updateProfile({ first_name: name.trim() })
      setStep('useCase')
    } catch (err) {
      console.error('Failed to save name:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleUseCaseSelect(selected: UseCase) {
    setUseCase(selected)
    setSaving(true)
    try {
      await updateProfile({ use_case: selected })
      setStep('connect')
    } catch (err) {
      console.error('Failed to save use case:', err)
    } finally {
      setSaving(false)
    }
  }

  function handleFinish() {
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 pt-6">
          {(['name', 'useCase', 'connect'] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-colors ${
                s === step
                  ? 'bg-blue-600'
                  : (['name', 'useCase', 'connect'].indexOf(step) > i)
                  ? 'bg-blue-300'
                  : 'bg-neutral-300 dark:bg-neutral-600'
              }`}
            />
          ))}
        </div>

        <div className="p-8">
          {/* Step 1: Name */}
          {step === 'name' && (
            <div className="text-center">
              <div className="text-4xl mb-4">👋</div>
              <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                Welcome to Tiker!
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6">
                Let's get you set up. What should we call you?
              </p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                placeholder="Your first name"
                autoFocus
                className="w-full px-4 py-3 text-lg border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                maxLength={50}
              />
              <button
                onClick={handleNameSubmit}
                disabled={!name.trim() || saving}
                className="w-full mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Continue'}
              </button>
            </div>
          )}

          {/* Step 2: Use Case */}
          {step === 'useCase' && (
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                Hi, {name}!
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6">
                What will you use Tiker for?
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => handleUseCaseSelect('household')}
                  disabled={saving}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors text-left"
                >
                  <span className="text-3xl">🏠</span>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">Managing my household</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Groceries, schedules, family tasks</p>
                  </div>
                </button>

                <button
                  onClick={() => handleUseCaseSelect('business')}
                  disabled={saving}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors text-left"
                >
                  <span className="text-3xl">💼</span>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">Running my business</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Clients, invoices, social media</p>
                  </div>
                </button>

                <button
                  onClick={() => handleUseCaseSelect('both')}
                  disabled={saving}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors text-left"
                >
                  <span className="text-3xl">✨</span>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">Both!</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Home life and work, all in one place</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Connect Tools */}
          {step === 'connect' && (
            <div className="text-center">
              <div className="text-4xl mb-4">🔗</div>
              <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                Connect your tools
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6">
                Tiker works best when it can access your calendar and email. You can always connect more later in Settings.
              </p>

              <div className="space-y-3 mb-6">
                <a
                  href="/settings/connections"
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors text-left"
                >
                  <span className="text-2xl">📧</span>
                  <div className="flex-1">
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">Gmail</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Send and read emails</p>
                  </div>
                  <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">Connect</span>
                </a>

                <a
                  href="/settings/connections"
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors text-left"
                >
                  <span className="text-2xl">📅</span>
                  <div className="flex-1">
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">Google Calendar</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">See your schedule</p>
                  </div>
                  <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">Connect</span>
                </a>

                <a
                  href="/settings/connections"
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors text-left"
                >
                  <span className="text-2xl">💬</span>
                  <div className="flex-1">
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">Slack</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Messages and notifications</p>
                  </div>
                  <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">Connect</span>
                </a>
              </div>

              <button
                onClick={handleFinish}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Get Started
              </button>
              <button
                onClick={handleFinish}
                className="w-full mt-2 px-6 py-2 text-neutral-500 dark:text-neutral-400 text-sm hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
              >
                Skip for now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
