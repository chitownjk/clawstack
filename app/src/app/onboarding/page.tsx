'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    checkOnboarding();
  }, []);

  async function checkOnboarding() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }

    const { data: account } = await supabase
      .from('accounts')
      .select('onboarding_completed')
      .eq('auth_uid', user.id)
      .single();

    if (account?.onboarding_completed) {
      router.push('/dashboard');
      return;
    }

    setLoading(false);
  }

  async function selectPlan(tier: 'free' | 'byok' | 'solo' | 'developer' | 'team') {
    setSelecting(tier);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (tier === 'free') {
        // Set plan to free (no AI)
        await supabase
          .from('accounts')
          .update({
            plan_tier: 'free',
            execution_mode: 'openclaw',
            onboarding_completed: true,
          })
          .eq('auth_uid', user.id);

        router.push('/dashboard');
      } else if (tier === 'byok') {
        // Set plan to free BYOK (cloud-user-keys)
        await supabase
          .from('accounts')
          .update({
            plan_tier: 'free',
            execution_mode: 'cloud-user-keys',
            onboarding_completed: true,
          })
          .eq('auth_uid', user.id);

        router.push('/dashboard');
      } else {
        // Redirect to Stripe checkout for paid tiers
        const response = await fetch(`/api/stripe/checkout?plan=${tier}`);
        const { url } = await response.json();
        
        if (url) {
          window.location.href = url;
        } else {
          alert('Failed to start checkout. Please try again.');
          setSelecting(null);
        }
      }
    } catch (error) {
      console.error('Error selecting plan:', error);
      alert('Something went wrong. Please try again.');
      setSelecting(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neutral-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center px-6 py-12">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            Welcome to Tiker! 🎉
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            Choose the plan that's right for you. You can always upgrade later.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Free (No AI) */}
          <div className="p-6 bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800 rounded-xl flex flex-col">
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
                All views (Kanban, list, calendar)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-neutral-400 mt-0.5">—</span>
                <span className="text-neutral-400">No AI agents</span>
              </li>
            </ul>
            <button
              onClick={() => selectPlan('free')}
              disabled={selecting !== null}
              className="block w-full text-center px-4 py-2 border-2 border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors font-medium disabled:opacity-50"
            >
              {selecting === 'free' ? 'Setting up...' : 'Get Started'}
            </button>
          </div>

          {/* Free - BYOK */}
          <div className="p-6 bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-500 dark:border-blue-600 rounded-xl flex flex-col">
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
                All features & tools
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">💳</span>
                You handle AI billing directly
              </li>
            </ul>
            <button
              onClick={() => selectPlan('byok')}
              disabled={selecting !== null}
              className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              {selecting === 'byok' ? 'Setting up...' : 'Get Started Free'}
            </button>
          </div>

          {/* Solo */}
          <div className="p-6 bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800 rounded-xl flex flex-col">
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
                Haiku, Sonnet & Kimi
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                Email support
              </li>
            </ul>
            <button
              onClick={() => selectPlan('solo')}
              disabled={selecting !== null}
              className="block w-full text-center px-4 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors font-medium disabled:opacity-50"
            >
              {selecting === 'solo' ? 'Redirecting...' : 'Start 7-Day Trial'}
            </button>
          </div>

          {/* Developer */}
          <div className="p-6 bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800 rounded-xl flex flex-col">
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
                All models (Opus, GPT-4)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                API & webhooks
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                Priority support
              </li>
            </ul>
            <button
              onClick={() => selectPlan('developer')}
              disabled={selecting !== null}
              className="block w-full text-center px-4 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors font-medium disabled:opacity-50"
            >
              {selecting === 'developer' ? 'Redirecting...' : 'Start 7-Day Trial'}
            </button>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">
            Need a team plan? Contact us for pricing.
          </p>
          <a href="/services#contact" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Contact Sales →
          </a>
        </div>
      </div>
    </div>
  );
}
