'use client';

import { useState, useMemo, useEffect } from 'react';
import { Task } from '@/types/views';

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
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const todayKey = dateKey(today);

  // Build the 7 day-keys for the current week
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const weekDayKeys = useMemo(() => weekDays.map(dateKey), [weekDays]);

  // Fetch Google Calendar events when week changes
  useEffect(() => {
    async function fetchCalendarEvents() {
      setCalendarLoading(true);
      try {
        const startDate = dateKey(weekStart);
        const endDate = dateKey(addDays(weekStart, 6));
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
  }, [weekStart]);

  // Bucket calendar events by date
  const eventBuckets = useMemo(() => {
    const buckets: Record<string, CalendarEvent[]> = {};
    weekDayKeys.forEach(k => (buckets[k] = []));

    calendarEvents.forEach(event => {
      const startStr = event.start;
      if (!startStr) return;
      const d = new Date(startStr);
      const key = dateKey(d);
      if (buckets[key]) {
        buckets[key].push(event);
      }
    });

    // Sort by start time
    Object.values(buckets).forEach(arr =>
      arr.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    );

    return buckets;
  }, [calendarEvents, weekDayKeys]);

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
  const totalEventsThisWeek = weekDayKeys.reduce((sum, k) => sum + eventBuckets[k].length, 0);

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

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      {calendarConnected && (
        <div className="flex items-center gap-4 px-4 py-2 text-[11px] text-gray-500 border-b border-gray-100">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Task (Now)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Task (Soon)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Google Calendar
          </span>
          {calendarLoading && (
            <span className="text-blue-500 ml-auto">Syncing calendar...</span>
          )}
        </div>
      )}

      {/* ── Google Calendar Connection Banner ─────────────────────────── */}
      {calendarConnected === false && (
        <div className="mx-4 mt-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-blue-800">
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

      {/* ── Calendar Grid ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-4">
        {totalTasksThisWeek === 0 && totalEventsThisWeek === 0 && noDateTasks.length === 0 ? (
          /* ── Empty Week State ──────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-lg font-medium">Nothing this week</p>
            <p className="text-sm mt-1">No tasks or calendar events scheduled</p>
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
                const dayEvents = eventBuckets[key] || [];
                const isEmpty = dayTasks.length === 0 && dayEvents.length === 0;

                return (
                  <div
                    key={`cell-${key}`}
                    className={`min-h-[120px] sm:min-h-[160px] p-1.5 flex flex-col gap-1 ${
                      isToday ? 'bg-blue-50/40' : 'bg-white'
                    }`}
                  >
                    {isEmpty && (
                      <div className="flex-1 flex items-center justify-center">
                        <span className="text-[10px] text-gray-300 select-none">--</span>
                      </div>
                    )}
                    {/* Google Calendar events */}
                    {dayEvents.map(event => (
                      <CalendarEventCard key={event.id} event={event} />
                    ))}
                    {/* Tiker tasks */}
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
          {task.assigned_human}
        </span>
      )}
    </button>
  );
}

// ── Google Calendar Event Card ───────────────────────────────────────────────

function CalendarEventCard({ event }: { event: CalendarEvent }) {
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
      className="w-full text-left px-2 py-1.5 rounded-md border border-green-200 bg-green-50 hover:bg-green-100 text-xs transition-all duration-200 cursor-pointer group hover:shadow-sm block"
    >
      <div className="flex items-start gap-1.5">
        <span className="mt-0.5 flex-shrink-0 w-2 h-2 rounded-full bg-green-500" />
        <span className="font-medium text-green-900 leading-tight line-clamp-2 group-hover:text-green-950">
          {event.title}
        </span>
      </div>
      <span className="block mt-0.5 text-[10px] text-green-600 pl-3.5">
        {startTime}
        {event.location && ` \u00B7 ${event.location}`}
      </span>
    </a>
  );
}
