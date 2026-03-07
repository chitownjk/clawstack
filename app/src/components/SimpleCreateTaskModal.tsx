'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { RecurrenceRule } from '@/types/views';

interface SimpleCreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
  initialDate?: string; // YYYY-MM-DD format
}

type RecurrenceFreq = RecurrenceRule['freq'];

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function SimpleCreateTaskModal({
  isOpen,
  onClose,
  onTaskCreated,
  initialDate,
}: SimpleCreateTaskModalProps) {
  const [description, setDescription] = useState('');
  const [when, setWhen] = useState<'now' | 'today' | 'this_week' | 'later' | 'pick'>('later');
  const [customDate, setCustomDate] = useState('');
  const [needHelp, setNeedHelp] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Recurrence state
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<RecurrenceFreq>('weekly');
  const [weeklyDays, setWeeklyDays] = useState<number[]>([]);

  const supabase = createClient();

  // Pre-populate date when initialDate is provided
  useEffect(() => {
    if (initialDate && isOpen) {
      setWhen('pick');
      setCustomDate(initialDate);
    }
  }, [initialDate, isOpen]);

  // When recurrence is enabled, default to "pick" if no date set
  useEffect(() => {
    if (recurrenceEnabled && when !== 'pick' && when !== 'today') {
      setWhen('pick');
      if (!customDate) {
        setCustomDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [recurrenceEnabled]);

  // Auto-select the day of week when a date is picked with weekly recurrence
  useEffect(() => {
    if (recurrenceFreq === 'weekly' && customDate && weeklyDays.length === 0) {
      const dayOfWeek = new Date(customDate + 'T12:00:00').getDay();
      setWeeklyDays([dayOfWeek]);
    }
  }, [customDate, recurrenceFreq]);

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
        return customDate ? new Date(customDate + 'T12:00:00').toISOString() : null;
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

  function buildRecurrenceRule(): RecurrenceRule | null {
    if (!recurrenceEnabled) return null;

    const rule: RecurrenceRule = { freq: recurrenceFreq };

    if (recurrenceFreq === 'weekly' && weeklyDays.length > 0) {
      rule.days = [...weeklyDays].sort();
    }

    return rule;
  }

  function toggleWeeklyDay(day: number) {
    setWeeklyDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }

  function resetForm() {
    setDescription('');
    setWhen('later');
    setCustomDate('');
    setNeedHelp(null);
    setRecurrenceEnabled(false);
    setRecurrenceFreq('weekly');
    setWeeklyDays([]);
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
          title: description.slice(0, 100),
          description: description,
          status: needHelp ? 'assigned' : 'inbox',
          assigned_agent_ids: assignedAgentIds,
          due_date: calculateDueDate(),
          priority: calculatePriority(),
          recurrence_rule: buildRecurrenceRule(),
        });

      if (insertError) throw insertError;

      resetForm();
      onTaskCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  }

  const recurrenceLabel = (freq: RecurrenceFreq): string => {
    switch (freq) {
      case 'daily': return 'Every day';
      case 'weekdays': return 'Weekdays';
      case 'weekends': return 'Weekends';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">New task</h2>
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Just describe it naturally
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., 'Plan Jake's birthday party for March 22' or 'I need to find a plumber for the kitchen leak'"
              className="w-full p-3 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px] resize-none bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              autoFocus
            />
          </div>

          {/* When? */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              When do you need this?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'now', label: 'Now', desc: 'Urgent', icon: '🔴' },
                { id: 'today', label: 'Today', desc: 'End of day', icon: '📅' },
                { id: 'this_week', label: 'This week', desc: 'Within 7 days', icon: '📆' },
                { id: 'later', label: 'Later', desc: 'No rush', icon: '📌' },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setWhen(option.id as any)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    when === option.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                  }`}
                >
                  <div className="font-medium text-neutral-900 dark:text-neutral-100">{option.icon} {option.label}</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">{option.desc}</div>
                </button>
              ))}
              <button
                onClick={() => setWhen('pick')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  when === 'pick'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800'
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                <div className="font-medium text-neutral-900 dark:text-neutral-100">🎯 Pick date</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Specific day</div>
              </button>
            </div>

            {when === 'pick' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="mt-2 w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                min={new Date().toISOString().split('T')[0]}
              />
            )}
          </div>

          {/* Repeat? */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Repeat?
              </label>
              <button
                onClick={() => setRecurrenceEnabled(!recurrenceEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  recurrenceEnabled ? 'bg-blue-600' : 'bg-neutral-300 dark:bg-neutral-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    recurrenceEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {recurrenceEnabled && (
              <div className="space-y-3">
                {/* Frequency presets */}
                <div className="flex flex-wrap gap-2">
                  {(['daily', 'weekdays', 'weekends', 'weekly', 'monthly'] as RecurrenceFreq[]).map(freq => (
                    <button
                      key={freq}
                      onClick={() => {
                        setRecurrenceFreq(freq);
                        if (freq !== 'weekly') setWeeklyDays([]);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        recurrenceFreq === freq
                          ? 'bg-blue-600 text-white'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {recurrenceLabel(freq)}
                    </button>
                  ))}
                </div>

                {/* Weekly day picker */}
                {recurrenceFreq === 'weekly' && (
                  <div className="flex gap-1.5">
                    {DAY_LABELS.map((label, i) => (
                      <button
                        key={i}
                        onClick={() => toggleWeeklyDay(i)}
                        className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${
                          weeklyDays.includes(i)
                            ? 'bg-blue-600 text-white'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Summary */}
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {recurrenceFreq === 'daily' && 'Repeats every day'}
                  {recurrenceFreq === 'weekdays' && 'Repeats Monday through Friday'}
                  {recurrenceFreq === 'weekends' && 'Repeats Saturday and Sunday'}
                  {recurrenceFreq === 'weekly' && weeklyDays.length > 0 && (
                    `Repeats every ${weeklyDays.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}`
                  )}
                  {recurrenceFreq === 'weekly' && weeklyDays.length === 0 && 'Select which days'}
                  {recurrenceFreq === 'monthly' && customDate && (
                    `Repeats on the ${new Date(customDate + 'T12:00:00').getDate()}${
                      ['th','st','nd','rd'][(new Date(customDate + 'T12:00:00').getDate() % 100 > 10 && new Date(customDate + 'T12:00:00').getDate() % 100 < 14) ? 0 : new Date(customDate + 'T12:00:00').getDate() % 10 < 4 ? new Date(customDate + 'T12:00:00').getDate() % 10 : 0] || 'th'
                    } of each month`
                  )}
                  {recurrenceFreq === 'monthly' && !customDate && 'Pick a date first'}
                </p>
              </div>
            )}
          </div>

          {/* Need help? */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Need help with this?
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setNeedHelp(false)}
                className={`flex-1 p-3 rounded-lg border text-center transition-all ${
                  needHelp === false
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800'
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                <div className="text-2xl mb-1">🙋</div>
                <div className="font-medium text-neutral-900 dark:text-neutral-100">No, I'll handle it</div>
              </button>
              <button
                onClick={() => setNeedHelp(true)}
                className={`flex-1 p-3 rounded-lg border text-center transition-all ${
                  needHelp === true
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800'
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                <div className="text-2xl mb-1">🤖</div>
                <div className="font-medium text-neutral-900 dark:text-neutral-100">Yes, get AI help</div>
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="flex-1 px-4 py-3 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 font-medium"
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
