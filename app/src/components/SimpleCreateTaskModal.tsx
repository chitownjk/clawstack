'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';

interface SimpleCreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
}

export default function SimpleCreateTaskModal({ 
  isOpen, 
  onClose, 
  onTaskCreated 
}: SimpleCreateTaskModalProps) {
  const [description, setDescription] = useState('');
  const [when, setWhen] = useState<'now' | 'today' | 'this_week' | 'later' | 'pick'>('later');
  const [customDate, setCustomDate] = useState('');
  const [needHelp, setNeedHelp] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  if (!isOpen) return null;

  function calculateDueDate(): string | null {
    const now = new Date();
    
    switch (when) {
      case 'now':
        return now.toISOString();
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59).toISOString();
      case 'this_week':
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return weekFromNow.toISOString();
      case 'pick':
        return customDate ? new Date(customDate).toISOString() : null;
      case 'later':
      default:
        return null;
    }
  }

  function calculatePriority(): 'now' | 'soon' | 'later' {
    switch (when) {
      case 'now':
        return 'now';
      case 'today':
      case 'this_week':
        return 'soon';
      case 'later':
      case 'pick':
      default:
        return 'later';
    }
  }

  async function handleSubmit() {
    if (!description.trim()) {
      setError('Please describe what you need');
      return;
    }

    if (needHelp === null) {
      setError('Please let us know if you need help');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get account ID
      const { data: account } = await supabase
        .from('accounts')
        .select('id')
        .eq('auth_uid', user.id)
        .single();

      if (!account) throw new Error('Account not found');

      // Get general assistant agent if help is needed
      let assignedAgentIds: string[] = [];
      if (needHelp) {
        const { data: agent } = await supabase
          .from('account_agent_templates')
          .select('id')
          .eq('account_id', account.id)
          .eq('name', 'General Assistant')
          .single();
        
        if (agent) {
          assignedAgentIds = [agent.id];
        }
      }

      // Create task
      const { error: insertError } = await supabase
        .from('mc_tasks')
        .insert({
          account_id: account.id,
          title: description.slice(0, 100), // First 100 chars as title
          description: description,
          status: needHelp ? 'assigned' : 'inbox',
          assigned_agent_ids: assignedAgentIds,
          due_date: calculateDueDate(),
          priority: calculatePriority(),
        });

      if (insertError) throw insertError;

      // Reset and close
      setDescription('');
      setWhen('later');
      setCustomDate('');
      setNeedHelp(null);
      onTaskCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-lg w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">What do you need? 👋</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* What do you need? */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              Just describe it naturally
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., 'Plan Jake's birthday party for March 22' or 'I need to find a plumber for the kitchen leak'"
              className="w-full p-3 border border-gray-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px] resize-none bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              autoFocus
            />
          </div>

          {/* When? */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              When do you need this?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'now', label: '🔴 Now', desc: 'Urgent' },
                { id: 'today', label: '📅 Today', desc: 'End of day' },
                { id: 'this_week', label: '📆 This week', desc: 'Within 7 days' },
                { id: 'later', label: '📌 Later', desc: 'No rush' },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setWhen(option.id as any)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    when === option.id
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-gray-500">{option.desc}</div>
                </button>
              ))}
              <button
                onClick={() => setWhen('pick')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  when === 'pick'
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">🎯 Pick date</div>
                <div className="text-xs text-gray-500">Specific day</div>
              </button>
            </div>

            {when === 'pick' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="mt-2 w-full p-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                min={new Date().toISOString().split('T')[0]}
              />
            )}
          </div>

          {/* Need help? */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              Need help with this?
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setNeedHelp(false)}
                className={`flex-1 p-3 rounded-lg border text-center transition-all ${
                  needHelp === false
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">🙋‍♂️</div>
                <div className="font-medium">No, I'll handle it</div>
              </button>
              <button
                onClick={() => setNeedHelp(true)}
                className={`flex-1 p-3 rounded-lg border text-center transition-all ${
                  needHelp === true
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">🤖</div>
                <div className="font-medium">Yes, get AI help</div>
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !description.trim() || needHelp === null}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            )}
            {loading ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
