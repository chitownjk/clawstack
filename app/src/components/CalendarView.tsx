'use client';

import { useState, useMemo, useEffect } from 'react';
import { Task, RecurrenceRule } from '@/types/views';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  description?: string;
  htmlLink?: string;
  status?: string;
  attendees?: number;
}

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onDayClick?: (date: Date) => void;
}

// -- Helpers ------------------------------------------------------------------

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getMonthGrid(monthStart: Date): Date[] {
  const dates: Date[] = [];
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());

  for (let i = 0; i < 42; i++) {
    dates.push(addDays(gridStart, i));
  }

  const lastWeekStart = 35;
  const allNextMonth = dates
    .slice(lastWeekStart)
    .every(d => d.getMonth() !== monthStart.getMonth());
  if (allNextMonth) {
    dates.splice(lastWeekStart);
  }

  return dates;
}

/** Check if a recurring task should appear on a given date. */
function matchesRecurrence(rule: RecurrenceRule, taskDueDate: string, targetDate: Date): boolean {
  const start = new Date(taskDueDate);
  const startKey = dateKey(start);
  const targetKey = dateKey(targetDate);

  // Don't generate instance on the original due date (it's already shown)
  if (startKey === targetKey) return false;

  // Only generate instances after the start date
  if (targetDate < start) return false;

  // Check end date
  if (rule.endDate && targetKey > rule.endDate) return false;

  const dayOfWeek = targetDate.getDay(); // 0=Sun

  switch (rule.freq) {
    case 'daily':
      return true;
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6;
    case 'weekly':
      if (rule.days && rule.days.length > 0) {
        return rule.days.includes(dayOfWeek);
      }
      // Default: same day of week as original
      return dayOfWeek === start.getDay();
    case 'monthly':
      return targetDate.getDate() === start.getDate();
    default:
      return false;
  }
}

/** Generate virtual recurring task instances for the visible grid. */
function generateRecurringInstances(task: Task, gridDates: Date[]): Task[] {
  if (!task.recurrence_rule || !task.due_date) return [];

  const instances: Task[] = [];

  for (const gridDate of gridDates) {
    if (matchesRecurrence(task.recurrence_rule, task.due_date, gridDate)) {
      instances.push({
        ...task,
        id: `${task.id}__recur__${dateKey(gridDate)}`,
        due_date: gridDate.toISOString(),
      });
    }
  }

  return instances;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const PRIORITY_STYLES: Record<string, { dot: string; border: string; bg: string; bgDark: string }> = {
  now:   { dot: 'bg-red-500',    border: 'border-red-300 dark:border-red-700',    bg: 'hover:bg-red-50',    bgDark: 'dark:hover:bg-red-950/30' },
  soon:  { dot: 'bg-yellow-400', border: 'border-yellow-300 dark:border-yellow-700', bg: 'hover:bg-yellow-50', bgDark: 'dark:hover:bg-yellow-950/30' },
  later: { dot: 'bg-gray-400',   border: 'border-gray-300 dark:border-gray-600',  bg: 'hover:bg-gray-50',   bgDark: 'dark:hover:bg-gray-800' },
};

function priorityStyle(priority: string) {
  return PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.later;
}

// -- Main Component -----------------------------------------------------------

export default function CalendarView({ tasks, onTaskClick, onDayClick }: CalendarViewProps) {
  const today = useMemo(() => new Date(), []);
  const [monthStart, setMonthStart] = useState<Date>(() => startOfMonth(today));
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const todayKey = dateKey(today);
  const currentMonth = monthStart.getMonth();

  const gridDates = useMemo(() => getMonthGrid(monthStart), [monthStart]);
  const gridDateKeys = useMemo(() => gridDates.map(dateKey), [gridDates]);

  // Fetch Google Calendar events
  useEffect(() => {
    async function fetchCalendarEvents() {
      setCalendarLoading(true);
      try {
        const startDate = dateKey(gridDates[0]);
        const endDate = dateKey(gridDates[gridDates.length - 1]);
        const res = await fetch(`/api/command/calendar?start=${startDate}&end=${endDate}`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setCalendarEvents(data.events || []);
          setCalendarConnected(data.connected);
        }
      } catch (err) {
        console.error('Failed to fetch calendar events:', err);
      } finally {
        setCalendarLoading(false);
      }
    }
    fetchCalendarEvents();
  }, [monthStart]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bucket calendar events by date
  const eventBuckets = useMemo(() => {
    const buckets: Record<string, CalendarEvent[]> = {};
    gridDateKeys.forEach(k => (buckets[k] = []));

    calendarEvents.forEach(event => {
      const startStr = event.start;
      if (!startStr) return;
      const d = new Date(startStr);
      const key = dateKey(d);
      if (buckets[key]) {
        buckets[key].push(event);
      }
    });

    Object.values(buckets).forEach(arr =>
      arr.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    );

    return buckets;
  }, [calendarEvents, gridDateKeys]);

  // Bucket tasks by date (including recurring virtual instances)
  const { buckets, noDateTasks } = useMemo(() => {
    const buckets: Record<string, Task[]> = {};
    const noDateTasks: Task[] = [];

    gridDateKeys.forEach(k => (buckets[k] = []));

    // First pass: bucket real tasks
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
    });

    // Second pass: generate recurring virtual instances
    tasks.forEach(task => {
      if (task.status === 'done' || !task.recurrence_rule || !task.due_date) return;

      const instances = generateRecurringInstances(task, gridDates);
      instances.forEach(inst => {
        const key = dateKey(new Date(inst.due_date!));
        if (buckets[key]) {
          buckets[key].push(inst);
        }
      });
    });

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
  }, [tasks, gridDates, gridDateKeys]);

  // Navigation
  const goToday = () => setMonthStart(startOfMonth(today));
  const goPrev  = () => setMonthStart(prev => addMonths(prev, -1));
  const goNext  = () => setMonthStart(prev => addMonths(prev, 1));

  const isCurrentMonth =
    monthStart.getMonth() === today.getMonth() &&
    monthStart.getFullYear() === today.getFullYear();

  function handleDayClick(day: Date, e: React.MouseEvent) {
    // Only fire if clicking the cell background, not a task/event card
    if ((e.target as HTMLElement).closest('[data-calendar-item]')) return;
    onDayClick?.(day);
  }

  // -- Render -----------------------------------------------------------------

  return (
    <div className="flex flex-col h-full">
      {/* Month Navigation */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700">
        <button
          onClick={goPrev}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-neutral-300 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Prev
        </button>

        <div className="flex items-center gap-3">
          <h2 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-neutral-100">
            {monthLabel(monthStart)}
          </h2>
          {!isCurrentMonth && (
            <button
              onClick={goToday}
              className="px-2.5 py-1 rounded-md text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors duration-200"
            >
              Today
            </button>
          )}
          {calendarLoading && (
            <span className="text-xs text-blue-500">Syncing...</span>
          )}
        </div>

        <button
          onClick={goNext}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-neutral-300 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors duration-200"
        >
          Next
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Legend */}
      {calendarConnected && (
        <div className="flex items-center gap-4 px-4 py-2 text-[11px] text-gray-500 dark:text-neutral-400 border-b border-gray-100 dark:border-neutral-800">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Now
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Soon
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Calendar
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> Completed
          </span>
        </div>
      )}

      {/* Google Calendar Connection Banner */}
      {calendarConnected === false && (
        <div className="mx-4 mt-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Connect Google Calendar to see your events here</span>
          </div>
          <a
            href="/settings/connections"
            className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            Connect
          </a>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-neutral-700 rounded-lg overflow-hidden min-w-[640px]">
          {/* Day Headers */}
          {DAY_NAMES.map((name) => (
            <div
              key={`header-${name}`}
              className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide bg-gray-50 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400"
            >
              <span className="hidden sm:inline">{name}</span>
              <span className="sm:hidden">{name[0]}</span>
            </div>
          ))}

          {/* Day Cells */}
          {gridDates.map((day, i) => {
            const key = gridDateKeys[i];
            const isToday = key === todayKey;
            const isCurrentMonthDay = day.getMonth() === currentMonth;
            const dayTasks = buckets[key] || [];
            const dayEvents = eventBuckets[key] || [];
            const hasReviewTasks = dayTasks.some(t => t.status === 'review');
            const totalItems = dayEvents.length + dayTasks.length;

            return (
              <div
                key={`cell-${key}`}
                onClick={(e) => handleDayClick(day, e)}
                className={`min-h-[90px] sm:min-h-[110px] p-1 flex flex-col gap-0.5 group/cell relative ${
                  onDayClick ? 'cursor-pointer' : ''
                } ${
                  isToday
                    ? 'bg-blue-50/60 dark:bg-blue-950/20'
                    : isCurrentMonthDay
                    ? 'bg-white dark:bg-neutral-900'
                    : 'bg-gray-50/50 dark:bg-neutral-900/50'
                }`}
              >
                {/* Date number + add button */}
                <div className="flex items-center justify-between px-0.5 mb-0.5">
                  <span
                    className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
                      isToday
                        ? 'bg-blue-600 text-white'
                        : isCurrentMonthDay
                        ? 'text-gray-700 dark:text-neutral-300'
                        : 'text-gray-400 dark:text-neutral-600'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  <div className="flex items-center gap-1">
                    {hasReviewTasks && (
                      <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" title="Ready for your review" />
                    )}
                    {onDayClick && (
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-neutral-400 dark:text-neutral-500 opacity-0 group-hover/cell:opacity-100 transition-opacity hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400"
                        title="Add task"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </span>
                    )}
                  </div>
                </div>

                {/* Events and tasks */}
                <div className="flex-1 space-y-0.5 overflow-hidden">
                  {dayEvents.slice(0, 2).map(event => (
                    <div key={event.id} data-calendar-item>
                      <CalendarEventCard event={event} compact />
                    </div>
                  ))}
                  {dayTasks.slice(0, 2).map(task => {
                    const isVirtual = task.id.includes('__recur__');
                    return (
                      <div key={task.id} data-calendar-item>
                        <CalendarTaskCard
                          task={task}
                          onClick={() => {
                            if (isVirtual) {
                              // Click through to parent task
                              const parentId = task.id.split('__recur__')[0];
                              const parentTask = tasks.find(t => t.id === parentId);
                              if (parentTask) onTaskClick(parentTask);
                            } else {
                              onTaskClick(task);
                            }
                          }}
                          compact
                          isRecurring={!!task.recurrence_rule}
                        />
                      </div>
                    );
                  })}
                  {totalItems > 4 && (
                    <span className="text-[9px] text-gray-400 dark:text-neutral-500 pl-1">
                      +{totalItems - 4} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* No-Date Section */}
        {noDateTasks.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-neutral-500 mb-2 px-1">
              No Date Assigned ({noDateTasks.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {noDateTasks.map(task => (
                <CalendarTaskCard
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task)}
                  isRecurring={!!task.recurrence_rule}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// -- Task Card ----------------------------------------------------------------

function CalendarTaskCard({
  task,
  onClick,
  compact = false,
  isRecurring = false,
}: {
  task: Task;
  onClick: () => void;
  compact?: boolean;
  isRecurring?: boolean;
}) {
  const style = priorityStyle(task.priority);
  const isReview = task.status === 'review';

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-full text-left rounded-md border text-xs transition-all duration-200 cursor-pointer group ${style.border} ${style.bg} ${style.bgDark} bg-white dark:bg-neutral-800 hover:shadow-sm ${
        compact ? 'px-1.5 py-0.5' : 'px-2 py-1.5'
      } ${isReview ? 'ring-1 ring-purple-400 dark:ring-purple-600' : ''}`}
    >
      <div className="flex items-start gap-1">
        {/* Priority dot */}
        <span
          className={`mt-0.5 flex-shrink-0 w-1.5 h-1.5 rounded-full ${
            isReview ? 'bg-purple-500' : style.dot
          }`}
        />
        <span className={`font-medium text-gray-800 dark:text-neutral-200 leading-tight group-hover:text-gray-900 dark:group-hover:text-white flex-1 ${
          compact ? 'line-clamp-1 text-[10px]' : 'line-clamp-2'
        }`}>
          {task.title}
        </span>
        {isRecurring && (
          <span className="flex-shrink-0 text-[9px] text-neutral-400 dark:text-neutral-500 mt-0.5" title="Recurring">
            ↻
          </span>
        )}
      </div>
      {!compact && task.assigned_human && (
        <span className="block mt-0.5 text-[10px] text-gray-400 dark:text-neutral-500 truncate pl-3">
          {task.assigned_human}
        </span>
      )}
    </button>
  );
}

// -- Google Calendar Event Card -----------------------------------------------

function CalendarEventCard({ event, compact = false }: { event: CalendarEvent; compact?: boolean }) {
  const startTime = event.allDay
    ? 'All day'
    : new Date(event.start).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

  return (
    <a
      href={event.htmlLink || '#'}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`w-full text-left rounded-md border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-900/40 text-xs transition-all duration-200 cursor-pointer group hover:shadow-sm block ${
        compact ? 'px-1.5 py-0.5' : 'px-2 py-1.5'
      }`}
    >
      <div className="flex items-start gap-1">
        <span className={`mt-0.5 flex-shrink-0 rounded-full bg-green-500 ${compact ? 'w-1.5 h-1.5' : 'w-2 h-2'}`} />
        <span className={`font-medium text-green-900 dark:text-green-300 leading-tight group-hover:text-green-950 dark:group-hover:text-green-200 ${
          compact ? 'line-clamp-1 text-[10px]' : 'line-clamp-2'
        }`}>
          {compact ? event.title : `${startTime} ${event.title}`}
        </span>
      </div>
      {!compact && (
        <span className="block mt-0.5 text-[10px] text-green-600 dark:text-green-500 pl-3">
          {startTime}
          {event.location && ` \u00B7 ${event.location}`}
        </span>
      )}
    </a>
  );
}
