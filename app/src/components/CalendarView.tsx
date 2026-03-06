'use client';

import { useState, useMemo } from 'react';
import { Task } from '@/types/views';

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Return the Sunday that starts the week containing `date`. */
function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay()); // rewind to Sunday
  return d;
}

/** Add `n` days to a date (pure). */
function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** YYYY-MM-DD key for bucketing. */
function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Format like "Mar 2 – Mar 8, 2026" */
function weekRangeLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const startStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startStr} – ${endStr}`;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const PRIORITY_STYLES: Record<string, { dot: string; border: string; bg: string }> = {
  now:   { dot: 'bg-red-500',    border: 'border-red-300',    bg: 'hover:bg-red-50' },
  soon:  { dot: 'bg-yellow-400', border: 'border-yellow-300', bg: 'hover:bg-yellow-50' },
  later: { dot: 'bg-gray-400',   border: 'border-gray-300',   bg: 'hover:bg-gray-50' },
};

function priorityStyle(priority: string) {
  return PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.later;
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  const today = useMemo(() => new Date(), []);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(today));

  const todayKey = dateKey(today);

  // Build the 7 day-keys for the current week
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const weekDayKeys = useMemo(() => weekDays.map(dateKey), [weekDays]);

  // Filter out completed tasks, then bucket by date key
  const { buckets, noDateTasks } = useMemo(() => {
    const buckets: Record<string, Task[]> = {};
    const noDateTasks: Task[] = [];

    // Initialise empty buckets for every day in the week
    weekDayKeys.forEach(k => (buckets[k] = []));

    tasks.forEach(task => {
      if (task.status === 'done') return;

      if (!task.due_date) {
        noDateTasks.push(task);
        return;
      }

      const d = new Date(task.due_date);
      const key = dateKey(d);

      if (buckets[key]) {
        buckets[key].push(task);
      }
      // Tasks outside this week are simply not shown
    });

    // Sort each bucket by priority weight then position
    const priorityWeight: Record<string, number> = { now: 0, soon: 1, later: 2 };
    const sorter = (a: Task, b: Task) => {
      const pa = priorityWeight[a.priority] ?? 2;
      const pb = priorityWeight[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      return (a.position ?? 0) - (b.position ?? 0);
    };
    Object.values(buckets).forEach(arr => arr.sort(sorter));
    noDateTasks.sort(sorter);

    return { buckets, noDateTasks };
  }, [tasks, weekDayKeys]);

  const totalTasksThisWeek = weekDayKeys.reduce((sum, k) => sum + buckets[k].length, 0);

  // ── Navigation ─────────────────────────────────────────────────────────────

  const goToday = () => setWeekStart(startOfWeek(today));
  const goPrev  = () => setWeekStart(prev => addDays(prev, -7));
  const goNext  = () => setWeekStart(prev => addDays(prev, 7));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* ── Week Navigation Bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <button
          onClick={goPrev}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Prev
        </button>

        <div className="flex items-center gap-3">
          <h2 className="text-sm sm:text-base font-semibold text-gray-800">
            {weekRangeLabel(weekStart)}
          </h2>
          {dateKey(weekStart) !== dateKey(startOfWeek(today)) && (
            <button
              onClick={goToday}
              className="px-2.5 py-1 rounded-md text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors duration-200"
            >
              Today
            </button>
          )}
        </div>

        <button
          onClick={goNext}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
        >
          Next
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* ── Calendar Grid ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-4">
        {totalTasksThisWeek === 0 && noDateTasks.length === 0 ? (
          /* ── Empty Week State ──────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-lg font-medium">No tasks this week</p>
            <p className="text-sm mt-1">Try navigating to another week or create a new task</p>
          </div>
        ) : (
          <>
            {/* 7-column grid — scrolls horizontally on mobile */}
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden min-w-[640px]">
              {/* ── Day Headers ──────────────────────────────────────── */}
              {weekDays.map((day, i) => {
                const key = weekDayKeys[i];
                const isToday = key === todayKey;
                return (
                  <div
                    key={`header-${key}`}
                    className={`px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide ${
                      isToday
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-gray-50 text-gray-500'
                    }`}
                  >
                    <span className="hidden sm:inline">{DAY_NAMES[i]}</span>
                    <span className="sm:hidden">{DAY_NAMES[i][0]}</span>
                    <span
                      className={`ml-1.5 inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        isToday
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700'
                      }`}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                );
              })}

              {/* ── Day Cells ────────────────────────────────────────── */}
              {weekDays.map((day, i) => {
                const key = weekDayKeys[i];
                const isToday = key === todayKey;
                const dayTasks = buckets[key];

                return (
                  <div
                    key={`cell-${key}`}
                    className={`min-h-[120px] sm:min-h-[160px] p-1.5 flex flex-col gap-1 ${
                      isToday ? 'bg-blue-50/40' : 'bg-white'
                    }`}
                    title="Click to add task (coming soon)"
                  >
                    {dayTasks.length === 0 && (
                      <div className="flex-1 flex items-center justify-center">
                        <span className="text-[10px] text-gray-300 select-none">—</span>
                      </div>
                    )}
                    {dayTasks.map(task => (
                      <CalendarTaskCard
                        key={task.id}
                        task={task}
                        onClick={() => onTaskClick(task)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>

            {/* ── No-Date Section ────────────────────────────────────── */}
            {noDateTasks.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2 px-1">
                  No Date Assigned ({noDateTasks.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {noDateTasks.map(task => (
                    <CalendarTaskCard
                      key={task.id}
                      task={task}
                      onClick={() => onTaskClick(task)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Task Card ────────────────────────────────────────────────────────────────

function CalendarTaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const style = priorityStyle(task.priority);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2 py-1.5 rounded-md border text-xs transition-all duration-200 cursor-pointer group ${style.border} ${style.bg} bg-white hover:shadow-sm`}
    >
      <div className="flex items-start gap-1.5">
        {/* Priority dot */}
        <span
          className={`mt-0.5 flex-shrink-0 w-2 h-2 rounded-full ${style.dot}`}
          aria-label={`Priority: ${task.priority}`}
        />
        <span className="font-medium text-gray-800 leading-tight line-clamp-2 group-hover:text-gray-900">
          {task.title}
        </span>
      </div>
      {task.assigned_human && (
        <span className="block mt-0.5 text-[10px] text-gray-400 truncate pl-3.5">
          👤 {task.assigned_human}
        </span>
      )}
    </button>
  );
}
