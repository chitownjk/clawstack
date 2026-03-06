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

  async function selectPlan(tier: 'free' | 'pro') {
    setSelecting(tier);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (tier === 'free') {
        // Free tier -- task board with no AI
        await supabase
          .from('accounts')
          .update({
            plan_tier: 'free',
            execution_mode: 'cloud-our-keys',
            onboarding_completed: true,
          })
          .eq('auth_uid', user.id);

        router.push('/command');
      } else {
        // Pro -- redirect to Stripe checkout with 7-day trial
        const response = await fetch('/api/stripe/checkout?plan=pro');
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
      <div className="max-w-3xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            Welcome to Tiker!
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            Your AI-powered task board. Start free or unlock AI agents with Pro.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto mb-8">
          {/* Free */}
          <div className="p-8 bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800 rounded-xl flex flex-col">
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Free</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
              A simple, powerful task board
            </p>
            <div className="mb-6">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-neutral-500">/month</span>
            </div>
            <ul className="space-y-3 text-sm text-neutral-600 dark:text-neutral-400 mb-8 flex-1">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">&check;</span>
                Unlimited tasks
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">&check;</span>
                Kanban, list, and calendar views
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">&check;</span>
                Organize and track your work
              </li>
              <li className="flex items-start gap-2">
                <span className="text-neutral-400 mt-0.5">&mdash;</span>
                <span className="text-neutral-400">No AI agents</span>
              </li>
            </ul>
            <button
              onClick={() => selectPlan('free')}
              disabled={selecting !== null}
              className="block w-full text-center px-4 py-3 border-2 border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors font-medium disabled:opacity-50"
            >
              {selecting === 'free' ? 'Setting up...' : 'Get Started'}
            </button>
          </div>

          {/* Pro */}
          <div className="p-8 bg-white dark:bg-neutral-900 border-2 border-blue-500 dark:border-blue-400 rounded-xl flex flex-col relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-500 text-white text-xs font-medium rounded-full">
              7-DAY FREE TRIAL
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Pro</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
              AI agents that work for you
            </p>
            <div className="mb-6">
              <span className="text-4xl font-bold">$29</span>
              <span className="text-neutral-500">/month</span>
            </div>
            <ul className="space-y-3 text-sm text-neutral-600 dark:text-neutral-400 mb-8 flex-1">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">&check;</span>
                200 AI tasks/month
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">&check;</span>
                All AI models and integrations
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">&check;</span>
                API access and webhooks
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">&check;</span>
                2 GB file storage
              </li>
            </ul>
            <button
              onClick={() => selectPlan('pro')}
              disabled={selecting !== null}
              className="block w-full text-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              {selecting === 'pro' ? 'Redirecting...' : 'Start Free Trial'}
            </button>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Need a team plan? <a href="/pricing" className="text-blue-600 dark:text-blue-400 hover:underline">See all plans</a>
          </p>
        </div>
      </div>
    </div>
  );
}
