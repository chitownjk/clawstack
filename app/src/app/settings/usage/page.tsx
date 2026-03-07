'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import SettingsNav from '@/components/SettingsNav';

export default function UsagePage() {
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<any>(null);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    loadUsage();
    
    // Check for error in URL
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    if (error === 'already_subscribed') {
      setErrorMessage('You\'re already on this plan or a higher tier. Contact support to change plans.');
    } else if (error === 'checkout_failed') {
      setErrorMessage('Checkout failed. Please try again or contact support.');
    }
  }, []);

  async function loadUsage() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First get account to get the account ID and plan details
      const { data: account } = await supabase
        .from('accounts')
        .select('id, plan_tier, execution_mode')
        .eq('auth_uid', user.id)
        .single();

      if (!account) {
        console.error('Account not found');
        setLoading(false);
        return;
      }

      // Get current month's task count
      const firstOfMonth = new Date();
      firstOfMonth.setDate(1);
      firstOfMonth.setHours(0, 0, 0, 0);

      const { count: tasksThisMonth } = await supabase
        .from('mc_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', account.id)
        .gte('created_at', firstOfMonth.toISOString());

      setUsage({
        tasks_used: tasksThisMonth || 0,
        tasks_limit: account.plan_tier === 'cloud-plus' ? 1000 : (account.plan_tier === 'cloud' || account.plan_tier === 'cloud-developer') ? 200 : null,
        plan_tier: account.plan_tier,
        execution_mode: account.execution_mode,
        tokens_in_used: 0,
        tokens_out_used: 0,
        cost_usd: 0
      });

      // Get recent tasks (decrypted server-side)
      const tasksResponse = await fetch('/api/tasks/recent', {
        credentials: 'include'
      });
      
      if (tasksResponse.ok) {
        const tasks = await tasksResponse.json();
        setRecentTasks(tasks);
      } else {
        setRecentTasks([]);
      }
    } catch (error) {
      console.error('Error loading usage:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">Loading usage data...</div>
      </div>
    );
  }

  if (!usage || !usage.tasks_limit) {
    const isFree = !usage?.plan_tier || usage?.plan_tier === 'free';
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Usage</h1>
        <div className="p-6 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
          <p className="text-blue-900 dark:text-blue-100">
            {isFree
              ? "You're on the Free plan. Upgrade to unlock AI agents and chat."
              : "You're on a plan with unlimited tasks (fair use applies)."
            }
          </p>
          {isFree && (
            <a
              href="/api/stripe/checkout?plan=solo"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
              Upgrade to Solo
            </a>
          )}
        </div>
      </div>
    );
  }

  const percentage = (usage.tasks_used / usage.tasks_limit) * 100;
  const isNearLimit = percentage >= 80;
  const isOverLimit = percentage >= 100;

  // Calculate reset date (first of next month)
  const now = new Date();
  const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const daysUntilReset = Math.ceil((resetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Group tasks by status for breakdown
  const statusBreakdown: Record<string, number> = {};
  recentTasks.forEach(task => {
    if (task.status) {
      statusBreakdown[task.status] = (statusBreakdown[task.status] || 0) + 1;
    }
  });

  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          Settings
        </h1>
        
        <SettingsNav />

        <div className="space-y-6">
          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-4">
              <p className="text-red-900 dark:text-red-100">{errorMessage}</p>
            </div>
          )}



          {/* Current Plan */}
          {usage.plan_tier && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                    Current Plan
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-blue-600">
                      {usage.plan_tier === 'cloud-plus' ? 'Team' : (usage.plan_tier === 'cloud' || usage.plan_tier === 'cloud-developer') ? 'Solo' : 'Free'}
                    </span>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      {usage.tasks_limit} tasks/month
                    </span>
                  </div>
                  {usage.execution_mode === 'managed' && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
                      Managed mode - we handle API keys and billing
                    </p>
                  )}
                  {usage.execution_mode === 'byok' && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
                      BYOK mode - unlimited tasks with your API keys
                    </p>
                  )}
                </div>
                <a
                  href="/api/stripe/checkout?plan=solo"
                  className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition text-sm"
                >
                  Upgrade Plan
                </a>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Usage This Month</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1">
              Track your task usage and costs
            </p>
          </div>

      {/* Main Usage Card */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
        <div className="mb-4">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-3xl font-bold">
              {usage.tasks_used} / {usage.tasks_limit}
            </span>
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              tasks used
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                isOverLimit
                  ? 'bg-red-600'
                  : isNearLimit
                  ? 'bg-yellow-600'
                  : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>

          <div className="flex justify-between items-center mt-2 text-sm">
            <span className={isNearLimit ? 'text-yellow-600 font-medium' : 'text-neutral-600'}>
              {percentage.toFixed(0)}% used
            </span>
            <span className="text-neutral-600 dark:text-neutral-400">
              Resets in {daysUntilReset} days
            </span>
          </div>
        </div>

        {isOverLimit && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
            <p className="text-red-900 dark:text-red-100 font-medium mb-2">
              ⚠️ Monthly limit reached
            </p>
            <p className="text-sm text-red-800 dark:text-red-200 mb-3">
              You've used all {usage.tasks_limit} tasks this month. New tasks will queue until {resetDate.toLocaleDateString()}.
            </p>
            <div className="flex gap-2">
              <Link
                href="/api/stripe/checkout?plan=solo"
                className="inline-block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
              >
                Upgrade Plan
              </Link>
            </div>
          </div>
        )}

        {isNearLimit && !isOverLimit && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-lg">
            <p className="text-yellow-900 dark:text-yellow-100 font-medium mb-2">
              📊 Approaching limit
            </p>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              You have {usage.tasks_limit - usage.tasks_used} tasks remaining this month.
              Consider upgrading for more capacity.
            </p>
            <Link
              href="/api/stripe/checkout?plan=solo"
              className="inline-block mt-2 text-yellow-700 dark:text-yellow-300 hover:underline text-sm"
            >
              View upgrade options →
            </Link>
          </div>
        )}
      </div>

      {/* Status Breakdown */}
      {Object.keys(statusBreakdown).length > 0 && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
          <h2 className="font-semibold mb-4">Task Status Breakdown</h2>
          <div className="space-y-2">
            {Object.entries(statusBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([status, count]) => (
                <div key={status} className="flex justify-between items-center text-sm">
                  <span className="text-neutral-700 dark:text-neutral-300 capitalize">
                    {status}
                  </span>
                  <span className="font-mono text-neutral-600 dark:text-neutral-400">
                    {count} tasks
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Recent Tasks */}
      {recentTasks.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
          <h2 className="font-semibold mb-4">Recent Tasks</h2>
          <div className="space-y-3">
            {recentTasks.map(task => (
              <div
                key={task.id}
                className="flex justify-between items-start gap-4 text-sm pb-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{task.title}</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {new Date(task.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right text-xs whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    task.status === 'done' ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' :
                    task.status === 'review' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                    task.status === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' :
                    'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                  }`}>
                    {task.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/command"
            className="inline-block mt-4 text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            View all tasks →
          </Link>
        </div>
      )}
        </div>
      </div>
    </main>
  );
}
