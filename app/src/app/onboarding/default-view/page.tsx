'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ViewType } from '@/types/views';

interface ViewOption {
  id: ViewType;
  label: string;
  icon: string;
  description: string;
}

const VIEW_OPTIONS: ViewOption[] = [
  {
    id: 'briefing',
    label: 'Today',
    icon: '◉',
    description: 'Your morning briefing and what\'s due',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: '▦',
    description: 'Your week at a glance',
  },
  {
    id: 'list',
    label: 'Tasks',
    icon: '☰',
    description: 'A clean checklist of everything',
  },
  {
    id: 'kanban',
    label: 'Board',
    icon: '⊞',
    description: 'Drag tasks across status columns',
  },
];

export default function DefaultViewPage() {
  const [selected, setSelected] = useState<ViewType>('briefing');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleContinue() {
    setSaving(true);
    try {
      await fetch('/api/account/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ default_view: selected }),
      });
    } catch {
      // Non-fatal — preference will just use the DB default
    }
    router.push('/command');
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center px-6 py-12">
      <div className="max-w-lg w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-3">
            How do you like to see your day?
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Pick a default — you can always change it in Settings.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {VIEW_OPTIONS.map((view) => {
            const isSelected = selected === view.id;
            return (
              <button
                key={view.id}
                onClick={() => setSelected(view.id)}
                className={[
                  'flex flex-col items-start gap-2 p-5 rounded-xl border-2 text-left transition-all',
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-400'
                    : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700',
                ].join(' ')}
              >
                <span className="text-2xl" aria-hidden="true">
                  {view.icon}
                </span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {view.label}
                </span>
                <span className="text-sm text-neutral-500 dark:text-neutral-400 leading-snug">
                  {view.description}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleContinue}
          disabled={saving}
          className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Get started'}
        </button>
      </div>
    </div>
  );
}
