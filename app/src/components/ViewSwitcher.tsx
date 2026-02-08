'use client';

import { AVAILABLE_VIEWS, ViewType } from '@/types/views';

interface ViewSwitcherProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export default function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="flex items-center gap-2 p-4 bg-white border-b border-gray-200">
      <span className="text-sm text-gray-600 font-medium mr-2">View:</span>
      
      <div className="flex gap-1">
        {AVAILABLE_VIEWS.map((view) => {
          const isActive = currentView === view.id;
          const isDisabled = view.id === 'calendar'; // Coming soon
          
          return (
            <button
              key={view.id}
              onClick={() => !isDisabled && onViewChange(view.id)}
              disabled={isDisabled}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                transition-all duration-200
                ${isActive 
                  ? 'bg-blue-100 text-blue-700 shadow-sm' 
                  : isDisabled
                    ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }
              `}
              title={view.description}
            >
              <span className="text-lg">{view.icon}</span>
              <span className="hidden sm:inline">{view.name}</span>
              {isDisabled && (
                <span className="text-xs opacity-60">(soon)</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
