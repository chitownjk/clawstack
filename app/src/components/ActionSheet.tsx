'use client';

import { useState, useEffect, useCallback } from 'react';
import { ActionDefinition } from '@/lib/action-registry';

interface ActionSheetProps {
  action: ActionDefinition | null;
  isOpen: boolean;
  onClose: () => void;
  onExecuted?: () => void;
}

type Step = 'input' | 'draft' | 'confirm' | 'result';

export default function ActionSheet({ action, isOpen, onClose, onExecuted }: ActionSheetProps) {
  const [step, setStep] = useState<Step>('input');
  const [formData, setFormData] = useState<Record<string, string | number | boolean>>({});
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  // Reset on open/close
  useEffect(() => {
    if (isOpen && action) {
      setStep(action.aiDraft ? 'input' : 'input');
      setFormData({});
      setDraft('');
      setError('');
      setResult(null);
      setLoading(false);
      setScheduleMode(false);

      // Set default values from form fields
      const defaults: Record<string, string | number | boolean> = {};
      for (const field of action.formFields) {
        if (field.defaultValue !== undefined) {
          defaults[field.name] = field.defaultValue;
        }
      }
      setFormData(defaults);
    }
  }, [isOpen, action]);

  const handleFieldChange = useCallback((name: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  // Step 1 -> Step 2: Generate AI draft (or skip to confirm for non-AI actions)
  async function handleInputSubmit() {
    if (!action) return;
    setError('');

    // Validate required fields
    for (const field of action.formFields) {
      if (field.required && !formData[field.name]) {
        setError(`${field.label} is required`);
        return;
      }
    }

    if (action.aiDraft) {
      setLoading(true);
      try {
        const res = await fetch('/api/actions/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action_id: action.id,
            user_input: formData,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to generate draft');
        setDraft(data.draft);
        setStep('draft');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to generate draft');
      } finally {
        setLoading(false);
      }
    } else {
      // No AI draft, go straight to confirm
      setStep('confirm');
    }
  }

  // Step 2 -> Step 3: User approves/edits draft
  function handleDraftApprove() {
    setStep('confirm');
  }

  // Regenerate AI draft
  async function handleRegenerate() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/actions/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_id: action?.id,
          user_input: formData,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to regenerate');
      setDraft(data.draft);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate');
    } finally {
      setLoading(false);
    }
  }

  // Step 3: Execute the action
  async function handleExecute() {
    if (!action) return;
    setLoading(true);
    setError('');

    const content = action.aiDraft ? draft : buildContentFromForm();

    try {
      const res = await fetch('/api/actions/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_id: action.id,
          content,
          form_data: formData,
          schedule_for: scheduleMode && scheduleDate && scheduleTime
            ? `${scheduleDate}T${scheduleTime}:00`
            : undefined,
          create_task: true,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setResult({
          success: false,
          message: data.error || 'Action failed. Please try again.',
        });
      } else if (data.scheduled) {
        setResult({
          success: true,
          message: data.message || 'Scheduled successfully!',
        });
      } else {
        setResult({
          success: true,
          message: `${action.name} completed successfully!`,
        });
      }
      setStep('result');
      if (data.success) onExecuted?.();
    } catch (err: unknown) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'Something went wrong',
      });
      setStep('result');
    } finally {
      setLoading(false);
    }
  }

  // Build content string from non-AI form data
  function buildContentFromForm(): string {
    const parts: string[] = [];
    for (const field of action?.formFields || []) {
      const val = formData[field.name];
      if (val) parts.push(String(val));
    }
    return parts.join('\n');
  }

  if (!isOpen || !action) return null;

  const charLimit = action.id === 'tweet' ? 280 : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-lg mx-4 mb-4 sm:mb-0 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{action.icon}</span>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {action.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1 px-5 pt-3">
          {['input', ...(action.aiDraft ? ['draft'] : []), 'confirm'].map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                getStepIndex(step, action.aiDraft) >= i
                  ? 'bg-blue-500'
                  : 'bg-neutral-200 dark:bg-neutral-700'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
          {/* Error message */}
          {error && (
            <div className="mb-3 px-3 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Step 1: Input */}
          {step === 'input' && (
            <div className="space-y-4">
              {action.aiDraft && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Tell me what you want to say and I will write it for you.
                </p>
              )}
              {action.formFields.map(field => {
                // Handle conditional fields
                if (field.showIf && !formData[field.showIf]) return null;

                return (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      {field.label}
                      {field.required && <span className="text-red-400 ml-0.5">*</span>}
                    </label>
                    {renderField(field, formData[field.name], handleFieldChange)}
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 2: AI Draft review */}
          {step === 'draft' && (
            <div className="space-y-3">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Here is your draft. Edit it or regenerate.
              </p>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={6}
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
              {charLimit && (
                <div className={`text-xs text-right ${draft.length > charLimit ? 'text-red-500' : 'text-neutral-400'}`}>
                  {draft.length}/{charLimit}
                </div>
              )}
              <button
                onClick={handleRegenerate}
                disabled={loading}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
              >
                {loading ? 'Regenerating...' : 'Regenerate'}
              </button>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Ready to go?
                </p>
                <div className="px-3 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {action.aiDraft ? draft : buildContentFromForm()}
                </div>
              </div>

              {/* Schedule toggle */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setScheduleMode(false)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    !scheduleMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  Post now
                </button>
                <button
                  onClick={() => setScheduleMode(true)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    scheduleMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  Schedule
                </button>
              </div>

              {scheduleMode && (
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-100"
                  />
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 4: Result */}
          {step === 'result' && result && (
            <div className="text-center py-4">
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-3 ${
                result.success
                  ? 'bg-green-100 dark:bg-green-950/40'
                  : 'bg-red-100 dark:bg-red-950/40'
              }`}>
                {result.success ? (
                  <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-7 h-7 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <p className={`text-sm font-medium ${
                result.success
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-red-700 dark:text-red-300'
              }`}>
                {result.message}
              </p>
            </div>
          )}
        </div>

        {/* Footer with action buttons */}
        <div className="px-5 py-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-between">
          {step === 'input' && (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition">
                Cancel
              </button>
              <button
                onClick={handleInputSubmit}
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <Spinner />}
                {action.aiDraft ? 'Write it' : 'Next'}
              </button>
            </>
          )}

          {step === 'draft' && (
            <>
              <button onClick={() => setStep('input')} className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition">
                Back
              </button>
              <button
                onClick={handleDraftApprove}
                disabled={charLimit ? draft.length > charLimit : false}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50"
              >
                Looks good
              </button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <button
                onClick={() => setStep(action.aiDraft ? 'draft' : 'input')}
                className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition"
              >
                Back
              </button>
              <button
                onClick={handleExecute}
                disabled={loading || (scheduleMode && (!scheduleDate || !scheduleTime))}
                className="px-5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <Spinner />}
                {scheduleMode ? 'Schedule' : `Post to ${action.name.split(' ').pop()}`}
              </button>
            </>
          )}

          {step === 'result' && (
            <div className="w-full flex justify-center">
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-300 transition"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helper Components ─────────────────────────────────────

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function getStepIndex(step: Step, hasAiDraft: boolean): number {
  if (step === 'input') return 0;
  if (step === 'draft') return 1;
  if (step === 'confirm') return hasAiDraft ? 2 : 1;
  return hasAiDraft ? 3 : 2;
}

function renderField(
  field: { name: string; type: string; placeholder?: string; maxLength?: number; min?: number; max?: number; options?: { label: string; value: string }[] },
  value: string | number | boolean | undefined,
  onChange: (name: string, value: string | number | boolean) => void
) {
  const baseClasses = 'w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition';

  switch (field.type) {
    case 'textarea':
      return (
        <div>
          <textarea
            value={String(value || '')}
            onChange={e => onChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            rows={3}
            className={`${baseClasses} resize-none`}
          />
          {field.maxLength && (
            <div className={`text-xs text-right mt-1 ${
              String(value || '').length > field.maxLength ? 'text-red-500' : 'text-neutral-400'
            }`}>
              {String(value || '').length}/{field.maxLength}
            </div>
          )}
        </div>
      );

    case 'select':
      return (
        <select
          value={String(value || '')}
          onChange={e => onChange(field.name, e.target.value)}
          className={baseClasses}
        >
          <option value="">Select...</option>
          {field.options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );

    case 'checkbox':
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={e => onChange(field.name, e.target.checked)}
            className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-neutral-600 dark:text-neutral-400">{field.placeholder}</span>
        </label>
      );

    case 'number':
      return (
        <input
          type="number"
          value={value !== undefined ? Number(value) : ''}
          onChange={e => onChange(field.name, Number(e.target.value))}
          min={field.min}
          max={field.max}
          className={baseClasses}
        />
      );

    default:
      return (
        <input
          type={field.type}
          value={String(value || '')}
          onChange={e => onChange(field.name, e.target.value)}
          placeholder={field.placeholder}
          className={baseClasses}
        />
      );
  }
}
