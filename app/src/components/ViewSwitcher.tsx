'use client';

import { getViewsForMode, getViewDisplayName, getViewDisplayDescription, ViewType } from '@/types/views';

interface ViewSwitcherProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  isConsumer?: boolean;
}

export default function ViewSwitcher({ currentView, onViewChange, isConsumer = false }: ViewSwitcherProps) {
  const views = getViewsForMode(isConsumer);

  return (
    <div className="flex items-center gap-2 p-4 bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800">
      <span className="text-sm text-gray-600 dark:text-neutral-400 font-medium mr-2">View:</span>

      <div className="flex gap-1">
        {views.map((view) => {
          const isActive = currentView === view.id;
          const displayName = getViewDisplayName(view, isConsumer);
          const displayDesc = getViewDisplayDescription(view, isConsumer);

          return (
            <button
              key={view.id}
              onClick={() => onViewChange(view.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                transition-all duration-200
                ${isActive
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'bg-gray-50 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700'
                }
              `}
              title={displayDesc}
            >
              <span className="text-lg">{view.icon}</span>
              <span className="hidden sm:inline">{displayName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
