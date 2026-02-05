'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import SettingsNav from '@/components/SettingsNav';

export default function UsagePage() {
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<any>(null);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  
  const supabase = createClient();

  useEffect(() => {
    loadUsage();
  }, []);

  async function loadUsage() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current month's usage
      const firstOfMonth = new Date();
      firstOfMonth.setDate(1);
      firstOfMonth.setHours(0, 0, 0, 0);

      const { data: monthlyUsage } = await supabase
        .from('monthly_usage')
        .select('*')
        .eq('account_id', user.id)
        .eq('month', firstOfMonth.toISOString().split('T')[0])
        .single();

      setUsage(monthlyUsage);

      // Get recent tasks with usage stats
      const { data: tasks } = await supabase
        .from('mc_tasks')
        .select('id, title, model_used, tokens_in, tokens_out, cost_usd, created_at')
        .eq('account_id', user.id)
        .not('model_used', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentTasks(tasks || []);
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
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Usage</h1>
        <div className="p-6 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
          <p className="text-blue-900 dark:text-blue-100">
            You're on a free plan with unlimited tasks (fair use applies).
          </p>
          <Link
            href="/#pricing"
            className="inline-block mt-4 text-blue-600 dark:text-blue-400 hover:underline"
          >
            View paid plans →
          </Link>
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

  // Group tasks by model for breakdown
  const modelBreakdown: Record<string, number> = {};
  recentTasks.forEach(task => {
    if (task.model_used) {
      modelBreakdown[task.model_used] = (modelBreakdown[task.model_used] || 0) + 1;
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
                href="/#pricing"
                className="inline-block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
              >
                Upgrade Plan
              </Link>
              <Link
                href="/settings/execution"
                className="inline-block px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition text-sm"
              >
                Switch to Free BYOK
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
              href="/#pricing"
              className="inline-block mt-2 text-yellow-700 dark:text-yellow-300 hover:underline text-sm"
            >
              View upgrade options →
            </Link>
          </div>
        )}
      </div>

      {/* Model Breakdown */}
      {Object.keys(modelBreakdown).length > 0 && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
          <h2 className="font-semibold mb-4">Model Usage Breakdown</h2>
          <div className="space-y-2">
            {Object.entries(modelBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([model, count]) => (
                <div key={model} className="flex justify-between items-center text-sm">
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {model.replace('claude-3-5-', '').replace('claude-', '')}
                  </span>
                  <span className="font-mono text-neutral-600 dark:text-neutral-400">
                    {count} tasks
                  </span>
                </div>
              ))}
          </div>

          {usage.cost_usd > 0 && (
            <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-600 dark:text-neutral-400">
                  Estimated cost to us:
                </span>
                <span className="font-mono font-medium">
                  ${usage.cost_usd.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Tasks */}
      {recentTasks.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
          <h2 className="font-semibold mb-4">Recent AI Tasks</h2>
          <div className="space-y-3">
            {recentTasks.map(task => (
              <div
                key={task.id}
                className="flex justify-between items-start gap-4 text-sm pb-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{task.title}</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {new Date(task.created_at).toLocaleDateString()} • {task.model_used}
                  </p>
                </div>
                <div className="text-right text-xs text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                  <div>{((task.tokens_in + task.tokens_out) / 1000).toFixed(1)}k tokens</div>
                  {task.cost_usd > 0 && (
                    <div className="font-mono">${task.cost_usd.toFixed(3)}</div>
                  )}
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
