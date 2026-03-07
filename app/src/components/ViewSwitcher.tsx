'use client';

import { AVAILABLE_VIEWS, ViewType } from '@/types/views';

interface ViewSwitcherProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export default function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="flex items-center gap-2 p-4 bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800">
      <span className="text-sm text-gray-600 dark:text-neutral-400 font-medium mr-2">View:</span>

      <div className="flex gap-1">
        {AVAILABLE_VIEWS.map((view) => {
          const isActive = currentView === view.id;
          const isDisabled = false;

          return (
            <button
              key={view.id}
              onClick={() => !isDisabled && onViewChange(view.id)}
              disabled={isDisabled}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                transition-all duration-200
                ${isActive
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'bg-gray-50 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700'
                }
              `}
              title={view.description}
            >
              <span className="text-lg">{view.icon}</span>
              <span className="hidden sm:inline">{view.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
