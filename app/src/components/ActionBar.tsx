'use client';

import { ActionDefinition } from '@/lib/action-registry';
import Link from 'next/link';

interface ActionBarProps {
  actions: ActionDefinition[];
  loading: boolean;
  onActionClick: (action: ActionDefinition) => void;
  onMoreClick: () => void;
}

export default function ActionBar({ actions, loading, onActionClick, onMoreClick }: ActionBarProps) {
  if (loading) {
    return (
      <div className="flex gap-2 px-1 py-3 overflow-x-auto scrollbar-hide">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-9 w-28 rounded-full bg-neutral-100 dark:bg-neutral-800 animate-pulse flex-shrink-0" />
        ))}
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="flex items-center gap-3 px-1 py-3">
        <span className="text-sm text-neutral-400 dark:text-neutral-500">
          Connect a service to unlock quick actions
        </span>
        <Link
          href="/settings/connections"
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          Connect
        </Link>
      </div>
    );
  }

  return (
    <div className="flex gap-2 px-1 py-3 overflow-x-auto scrollbar-hide">
      {actions.map(action => (
        <button
          key={action.id}
          onClick={() => onActionClick(action)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 hover:border-neutral-300 dark:hover:border-neutral-600 transition-all text-sm font-medium text-neutral-700 dark:text-neutral-300 flex-shrink-0 active:scale-95"
        >
          <span className="text-base leading-none">{action.icon}</span>
          <span>{action.name}</span>
        </button>
      ))}

      <button
        onClick={onMoreClick}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-dashed border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all text-sm text-neutral-500 dark:text-neutral-400 flex-shrink-0 active:scale-95"
      >
        <span>+</span>
        <span>More</span>
      </button>
    </div>
  );
}
