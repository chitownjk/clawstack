'use client';

interface ViewSwitcherProps {
  currentView: 'board' | 'list' | 'calendar';
  onViewChange: (view: 'board' | 'list' | 'calendar') => void;
}

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  const views = [
    { id: 'list' as const, icon: '☰', label: 'List' },
    { id: 'board' as const, icon: '📊', label: 'Board' },
    { id: 'calendar' as const, icon: '📅', label: 'Calendar' },
  ];

  return (
    <div className="inline-flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
      {views.map(view => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition text-sm font-medium ${
            currentView === view.id
              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
          }`}
          title={view.label}
        >
          <span>{view.icon}</span>
          <span className="hidden sm:inline">{view.label}</span>
        </button>
      ))}
    </div>
  );
}
