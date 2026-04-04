'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [tikerEmail, setTikerEmail] = useState<string | null>(null);
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

    // Use API route to check onboarding status (avoids RLS issues)
    const res = await fetch('/api/account/me');
    if (res.ok) {
      const account = await res.json();
      if (account?.tiker_username) {
        setTikerEmail(`${account.tiker_username}@tiker.com`);
      }
      if (account?.onboarding_completed) {
        router.push('/command');
        return;
      }
    }

    setLoading(false);
  }

  async function selectPlan(tier: 'free' | 'solo') {
    setSelecting(tier);

    try {
      if (tier === 'free') {
        // Use server-side API route to bypass RLS
        const res = await fetch('/api/account/select-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: 'free' }),
        });

        if (res.ok) {
          router.push('/command');
        } else {
          const err = await res.json();
          console.error('Plan selection failed:', err);
          alert('Something went wrong. Please try again.');
          setSelecting(null);
        }
      } else {
        // Solo -- redirect to Stripe checkout with 7-day trial
        const response = await fetch('/api/stripe/checkout?plan=solo');
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
            Your AI life operator. Start free or unlock everything with Solo.
          </p>
        </div>

        {tikerEmail && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-3">
            <span className="text-xl mt-0.5">📬</span>
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Your Tiker email is ready
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-0.5">
                Forward emails or share{' '}
                <span className="font-mono font-semibold">{tikerEmail}</span>{' '}
                with anyone — emails sent here become tasks in your inbox automatically.
              </p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto mb-8">
          {/* Free */}
          <div className="p-8 bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800 rounded-xl flex flex-col">
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Free</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
              Organize without AI
            </p>
            <div className="mb-6">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-neutral-500">/month</span>
            </div>
            <ul className="space-y-3 text-sm text-neutral-600 dark:text-neutral-400 mb-8 flex-1">
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
            <button
              onClick={() => selectPlan('free')}
              disabled={selecting !== null}
              className="block w-full text-center px-4 py-3 border-2 border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors font-medium disabled:opacity-50"
            >
              {selecting === 'free' ? 'Setting up...' : 'Get Started'}
            </button>
          </div>

          {/* Solo */}
          <div className="p-8 bg-white dark:bg-neutral-900 border-2 border-blue-500 dark:border-blue-400 rounded-xl flex flex-col relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-500 text-white text-xs font-medium rounded-full">
              7-DAY FREE TRIAL
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Solo</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
              Your AI life operator
            </p>
            <div className="mb-6">
              <span className="text-4xl font-bold">$19</span>
              <span className="text-neutral-500">/month</span>
            </div>
            <ul className="space-y-3 text-sm text-neutral-600 dark:text-neutral-400 mb-8 flex-1">
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
                200 AI tasks/month
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">&#x2713;</span>
                Gmail and Calendar integration
              </li>
            </ul>
            <button
              onClick={() => selectPlan('solo')}
              disabled={selecting !== null}
              className="block w-full text-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              {selecting === 'solo' ? 'Redirecting...' : 'Start Free Trial'}
            </button>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Need a team plan? <a href="/#pricing" className="text-blue-600 dark:text-blue-400 hover:underline">See all plans</a>
          </p>
        </div>
      </div>
    </div>
  );
}
