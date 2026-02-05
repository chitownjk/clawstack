'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type TechnicalLevel = 'very' | 'somewhat' | 'not';
type ViewMode = 'board' | 'list';
type UseCases = string[];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [technicalLevel, setTechnicalLevel] = useState<TechnicalLevel | null>(null);
  const [useCases, setUseCases] = useState<UseCases>([]);
  const [viewMode, setViewMode] = useState<ViewMode | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const toggleUseCase = (useCase: string) => {
    setUseCases(prev =>
      prev.includes(useCase)
        ? prev.filter(u => u !== useCase)
        : [...prev, useCase]
    );
  };

  const getRecommendedTier = (): 'openclaw' | 'cloud-user-keys' | 'cloud-our-keys' => {
    if (technicalLevel === 'very') return 'openclaw';
    if (technicalLevel === 'somewhat') return 'cloud-user-keys';
    return 'cloud-our-keys';
  };

  const completeOnboarding = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const recommendedTier = getRecommendedTier();

      // Save onboarding data
      await supabase
        .from('accounts')
        .update({
          onboarding_completed: true,
          onboarding_data: {
            technical_level: technicalLevel,
            use_cases: useCases,
            view_mode: viewMode,
            recommended_tier: recommendedTier,
          },
          ui_preferences: {
            view: viewMode,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      // Redirect to setup based on recommendation
      if (recommendedTier === 'openclaw') {
        router.push('/onboarding/setup-openclaw');
      } else if (recommendedTier === 'cloud-user-keys') {
        router.push('/onboarding/setup-keys');
      } else {
        router.push('/onboarding/trial');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-950 dark:to-neutral-900 py-12 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Progress bar */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              Step {step} of 3
            </span>
            <button
              onClick={() => router.push('/command')}
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:underline"
            >
              Skip →
            </button>
          </div>
          <div className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Technical Level */}
        {step === 1 && (
          <div className="space-y-8">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                Let's find the best setup for you
              </h1>
              <p className="text-xl text-neutral-600 dark:text-neutral-400">
                Just 3 quick questions to get started
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
                How comfortable are you with technical tools?
              </h2>

              <div className="space-y-4">
                <button
                  onClick={() => {
                    setTechnicalLevel('very');
                    setStep(2);
                  }}
                  className={`w-full p-6 border-2 rounded-xl text-left transition ${
                    technicalLevel === 'very'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/20'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">💻</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                        Very technical
                      </h3>
                      <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                        I run servers, use CLIs, and have API keys ready
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setTechnicalLevel('somewhat');
                    setStep(2);
                  }}
                  className={`w-full p-6 border-2 rounded-xl text-left transition ${
                    technicalLevel === 'somewhat'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/20'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">⚙️</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                        Somewhat technical
                      </h3>
                      <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                        I can follow setup guides and copy/paste API keys
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setTechnicalLevel('not');
                    setStep(2);
                  }}
                  className={`w-full p-6 border-2 rounded-xl text-left transition ${
                    technicalLevel === 'not'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/20'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">✨</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                        Not technical
                      </h3>
                      <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                        I just want something that works, no setup required
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Use Cases */}
        {step === 2 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
                What do you want AI agents to help with?
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 mb-8">
                Select all that apply
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { id: 'email', icon: '📧', label: 'Email & calendar management' },
                  { id: 'research', icon: '🔍', label: 'Research & analysis' },
                  { id: 'writing', icon: '✍️', label: 'Writing & content' },
                  { id: 'projects', icon: '📋', label: 'Project management' },
                  { id: 'code', icon: '💻', label: 'Software development' },
                  { id: 'personal', icon: '✅', label: 'Personal to-dos' },
                  { id: 'team', icon: '👥', label: 'Team coordination' },
                  { id: 'other', icon: '🎯', label: 'Something else' },
                ].map(useCase => (
                  <button
                    key={useCase.id}
                    onClick={() => toggleUseCase(useCase.id)}
                    className={`p-4 border-2 rounded-xl text-left transition ${
                      useCases.includes(useCase.id)
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/20'
                        : 'border-neutral-200 dark:border-neutral-800 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{useCase.icon}</span>
                      <span className="text-sm font-medium">{useCase.label}</span>
                      {useCases.includes(useCase.id) && (
                        <span className="ml-auto text-blue-600">✓</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 border-2 border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={useCases.length === 0}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: View Mode */}
        {step === 3 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
                How do you prefer to organize tasks?
              </h2>

              <div className="space-y-4">
                <button
                  onClick={() => setViewMode('board')}
                  className={`w-full p-6 border-2 rounded-xl text-left transition ${
                    viewMode === 'board'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/20'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2 flex items-center gap-2">
                        <span>📊</span>
                        Project Board (Kanban style)
                      </h3>
                      <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-4">
                        Columns for Inbox/In Progress/Done. Great for teams & projects.
                      </p>
                      <div className="h-32 bg-neutral-100 dark:bg-neutral-800 rounded border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-400 text-sm">
                        [Kanban screenshot preview]
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setViewMode('list')}
                  className={`w-full p-6 border-2 rounded-xl text-left transition ${
                    viewMode === 'list'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/20'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2 flex items-center gap-2">
                        <span>☰</span>
                        Simple To-Do List
                      </h3>
                      <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-4">
                        Just checkboxes, no complexity. Great for personal tasks.
                      </p>
                      <div className="h-32 bg-neutral-100 dark:bg-neutral-800 rounded border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-400 text-sm">
                        [List screenshot preview]
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-4 text-center">
                (You can change this anytime in Settings)
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 border-2 border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
              >
                ← Back
              </button>
              <button
                onClick={completeOnboarding}
                disabled={!viewMode || loading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Continue →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
