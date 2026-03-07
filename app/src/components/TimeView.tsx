'use client';

import { Task } from '@/types/views';

interface TimeViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

type TimeBucket = 'today' | 'this_week' | 'later';

export default function TimeView({ tasks, onTaskClick }: TimeViewProps) {
  // Bucket tasks by time
  const buckets: Record<TimeBucket, Task[]> = {
    today: [],
    this_week: [],
    later: []
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  tasks.forEach(task => {
    if (task.status === 'done') return; // Skip completed tasks

    if (!task.due_date) {
      buckets.later.push(task);
      return;
    }

    const dueDate = new Date(task.due_date);
    const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

    if (dueDay <= today) {
      buckets.today.push(task);
    } else if (dueDay < weekFromNow) {
      buckets.this_week.push(task);
    } else {
      buckets.later.push(task);
    }
  });

  // Sort within each bucket by due_date (earliest first)
  Object.keys(buckets).forEach(key => {
    buckets[key as TimeBucket].sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  });

  return (
    <div className="flex gap-4 p-4 h-full overflow-x-auto">
      <TimeColumn
        title="Today"
        emoji="🔴"
        tasks={buckets.today}
        onTaskClick={onTaskClick}
        emptyMessage="Nothing due today!"
        color="red"
      />

      <TimeColumn
        title="This Week"
        emoji="🟡"
        tasks={buckets.this_week}
        onTaskClick={onTaskClick}
        emptyMessage="Nothing due this week"
        color="yellow"
      />

      <TimeColumn
        title="Later"
        emoji="⚪️"
        tasks={buckets.later}
        onTaskClick={onTaskClick}
        emptyMessage="No tasks scheduled"
        color="gray"
      />
    </div>
  );
}

function TimeColumn({
  title,
  emoji,
  tasks,
  onTaskClick,
  emptyMessage,
  color
}: {
  title: string;
  emoji: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  emptyMessage: string;
  color: 'red' | 'yellow' | 'gray';
}) {
  const colorClasses = {
    red: {
      border: 'border-red-200 dark:border-red-800',
      bg: 'bg-red-50 dark:bg-red-950/20',
      header: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
      count: 'bg-red-200 dark:bg-red-800/50 text-red-800 dark:text-red-200'
    },
    yellow: {
      border: 'border-yellow-200 dark:border-yellow-800',
      bg: 'bg-yellow-50 dark:bg-yellow-950/20',
      header: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
      count: 'bg-yellow-200 dark:bg-yellow-800/50 text-yellow-800 dark:text-yellow-200'
    },
    gray: {
      border: 'border-gray-200 dark:border-neutral-700',
      bg: 'bg-gray-50 dark:bg-neutral-900',
      header: 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300',
      count: 'bg-gray-200 dark:bg-neutral-700 text-gray-800 dark:text-neutral-200'
    }
  }[color];

  return (
    <div className={`
      flex-1 min-w-[300px] max-w-md flex flex-col rounded-lg border-2
      ${colorClasses.border} ${colorClasses.bg}
    `}>
      {/* Column header */}
      <div className={`p-4 ${colorClasses.header} rounded-t-md`}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span>{emoji}</span>
            <span>{title}</span>
          </h2>
          <span className={`text-sm font-medium px-2 py-1 rounded ${colorClasses.count}`}>
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-neutral-500">
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          tasks.map(task => (
            <TimeTaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TimeTaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date();
  const isReview = task.status === 'review';

  const priorityDot = {
    now: '🔴',
    soon: '🟡',
    later: '⚪️'
  }[task.priority] || '⚪️';

  return (
    <div
      onClick={onClick}
      className={`
        p-3 rounded-lg border
        hover:shadow-sm
        transition-all duration-200 cursor-pointer
        group
        ${isReview
          ? 'bg-purple-50 dark:bg-purple-950/20 border-purple-300 dark:border-purple-700 hover:border-purple-400 ring-1 ring-purple-200 dark:ring-purple-800'
          : 'bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600'
        }
      `}
    >
      <div className="flex items-start gap-2">
        <span className="text-xs mt-0.5">{priorityDot}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
            {task.title}
          </h3>

          {/* Metadata */}
          <div className="flex items-center gap-2 mt-1 text-xs">
            {task.due_date && (
              <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-neutral-400'}>
                {new Date(task.due_date).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            )}

            {task.assigned_human && (
              <span className="text-gray-500 dark:text-neutral-400">
                👤 {task.assigned_human}
              </span>
            )}

            {task.assigned_agent_ids && task.assigned_agent_ids.length > 0 && (
              <span className="text-gray-500 dark:text-neutral-400">
                🤖
              </span>
            )}

            {isReview && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-[10px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                Review
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
