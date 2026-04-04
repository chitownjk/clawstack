'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Task } from '@/types/views';
import { Agent, Activity } from '@/lib/mission-control';
import MeetingPrepCard from '@/components/MeetingPrepCard';
import FirstRunWelcome from '@/components/FirstRunWelcome';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  htmlLink?: string;
  attendees?: number;
  conferenceLink?: string;
}

interface BriefingData {
  content: {
    greeting: string;
    date: string;
    generated_at: string;
    raw_data: {
      calendar_count: number;
      active_tasks: number;
      review_tasks: number;
      extracted_items: number;
      recent_activities: number;
    };
  };
  sections: {
    summary?: string;
    schedule?: Array<{ time: string; title: string; type: string; note?: string }>;
    attention_items?: Array<{ type: string; title: string; action: string }>;
    tasks_summary?: {
      active: number;
      review: number;
      blocked: number;
      due_today: number;
      completed_today: number;
    };
    suggestions?: string[];
  };
}

interface ExtractedItem {
  id: string;
  type: string;
  title: string;
  source: string;
  source_id: string;
  data: Record<string, any>;
  processed: boolean;
  dismissed: boolean;
  created_at: string;
}

interface DailyBriefingProps {
  tasks: Task[];
  agents: Agent[];
  activities: Activity[];
  onTaskClick: (task: Task) => void;
  onOpenChat?: () => void;
  isConsumer?: boolean;
  firstName?: string | null;
  accountCreatedAt?: string | null;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DailyBriefing({ tasks, agents, activities, onTaskClick, onOpenChat, isConsumer = false, firstName, accountCreatedAt }: DailyBriefingProps) {
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [scanningEmail, setScanningEmail] = useState(false);
  const [lastScanAt, setLastScanAt] = useState<Date | null>(null);
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [showFirstRun, setShowFirstRun] = useState(false);

  const now = useMemo(() => new Date(), []);
  const todayStr = dateKey(now);

  // Detect first-run: account created < 1 hour ago and no briefing yet
  useEffect(() => {
    if (accountCreatedAt) {
      const created = new Date(accountCreatedAt);
      const ageMs = Date.now() - created.getTime();
      const oneHour = 60 * 60 * 1000;
      if (ageMs < oneHour) {
        setShowFirstRun(true);
      }
    }
  }, [accountCreatedAt]);

  // Fetch calendar events
  useEffect(() => {
    async function fetchCalendar() {
      try {
        const res = await fetch(`/api/command/calendar?start=${todayStr}&end=${todayStr}`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setCalendarEvents(data.events || []);
          setCalendarConnected(data.connected);
        }
      } catch (err) {
        console.error('Failed to fetch calendar:', err);
      }
    }
    fetchCalendar();
  }, [todayStr]);

  // Generate or fetch briefing
  const loadBriefing = useCallback(async (forceRefresh = false) => {
      setBriefingLoading(true);
      try {
        const res = await fetch('/api/briefing/generate', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: forceRefresh }),
        });
        if (res.ok) {
          const data = await res.json();
          const raw = data.briefing;
          if (raw) {
            // Normalize: sections might be a JSON string from the DB
            let sections = raw.sections;
            if (typeof sections === 'string') {
              try { sections = JSON.parse(sections); } catch { sections = {}; }
            }
            // If sections is still not an object, try treating the whole raw as sections
            if (!sections || typeof sections !== 'object') {
              sections = {};
            }
            // If the briefing itself IS the sections (no wrapper), detect by presence of summary key
            if (!raw.content && raw.summary) {
              sections = raw;
            }
            // If summary contains raw JSON (from a bad cached briefing), try to parse it
            if (sections.summary && typeof sections.summary === 'string') {
              const s = sections.summary.trim();
              // Detect JSON blob in summary (starts with { or ```)
              if (s.startsWith('{') || s.startsWith('```')) {
                try {
                  const cleaned = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
                  const parsed = JSON.parse(cleaned);
                  if (parsed && typeof parsed === 'object' && parsed.summary) {
                    sections = parsed;
                  }
                } catch {
                  // Not parseable, leave as is
                }
              }
            }
            setBriefing({
              content: raw.content || {
                greeting: '',
                date: '',
                generated_at: '',
                raw_data: { calendar_count: 0, active_tasks: 0, review_tasks: 0, extracted_items: 0, recent_activities: 0 },
              },
              sections,
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch briefing:', err);
      } finally {
        setBriefingLoading(false);
      }
  }, []);

  useEffect(() => {
    loadBriefing();
  }, [loadBriefing]);

  // Scan email for extracted items
  const scanEmail = useCallback(async () => {
    setScanningEmail(true);
    try {
      const res = await fetch('/api/email/scan', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 20 }),
      });
      if (res.ok) {
        const data = await res.json();
        setGmailConnected(data.connected !== false);
        if (data.connected !== false) {
          setLastScanAt(new Date());
        }
        if (data.items) {
          setExtractedItems(prev => {
            const existingIds = new Set(prev.map(i => i.id));
            const newItems = data.items.filter((i: any) => !existingIds.has(i.id));
            return [...prev, ...newItems];
          });
        }
      }
    } catch (err) {
      console.error('Failed to scan email:', err);
    } finally {
      setScanningEmail(false);
    }
  }, []);

  // Handle extracted item actions
  const handleExtractAction = useCallback(async (itemId: string, action: string) => {
    try {
      const res = await fetch('/api/email/extract', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, action }),
      });
      if (res.ok) {
        setExtractedItems(prev => prev.filter(i => i.id !== itemId));
      }
    } catch (err) {
      console.error('Failed to process extraction:', err);
    }
  }, []);

  // Compute task data
  const activeTasks = tasks.filter(t => t.status !== 'done');
  const urgentTasks = activeTasks.filter(t => t.priority === 'now');
  const reviewTasks = activeTasks.filter(t => t.status === 'review');
  const blockedTasks = activeTasks.filter(t => t.status === 'blocked');
  const inProgressTasks = activeTasks.filter(t => t.status === 'in_progress');

  const dueTodayTasks = activeTasks.filter(t => {
    if (!t.due_date) return false;
    return dateKey(new Date(t.due_date)) === todayStr;
  });

  const completedToday = tasks.filter(t => {
    if (t.status !== 'done' || !t.completed_at) return false;
    return dateKey(new Date(t.completed_at)) === todayStr;
  });

  // Recent activities (filter heartbeats)
  const recentActivities = activities
    .filter(a => a.type !== 'heartbeat')
    .slice(0, 10);

  // Sort calendar events
  const sortedEvents = [...calendarEvents].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  // Greeting
  const hour = now.getHours();
  const greetingBase = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const greeting = firstName ? `${greetingBase}, ${firstName}!` : greetingBase;

  const dateDisplay = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Show first-run welcome if account is new and no briefing loaded yet
  if (showFirstRun && !briefing) {
    return (
      <FirstRunWelcome
        firstName={firstName}
        onBriefingReady={() => {
          setShowFirstRun(false);
          loadBriefing(false);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto scroll-smooth">
      <div className="max-w-4xl w-full mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

        {/* Header + AI Summary */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{greeting}</h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{dateDisplay}</p>
            </div>
            <button
              onClick={() => loadBriefing(true)}
              disabled={briefingLoading}
              className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 disabled:opacity-50 transition-colors"
              title="Refresh briefing"
            >
              {briefingLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {/* AI-generated summary */}
          {briefing?.sections?.summary && (
            <p className="mt-3 text-base leading-relaxed text-neutral-700 dark:text-neutral-300">
              {briefing.sections.summary}
            </p>
          )}
          {briefingLoading && !briefing && (
            <div className="mt-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg animate-pulse">
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
            </div>
          )}
        </div>

        {/* Attention Items (from AI briefing) */}
        {briefing?.sections?.attention_items && briefing.sections.attention_items.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
              Needs your attention
            </h2>
            <div className="space-y-2">
              {briefing.sections.attention_items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
                >
                  <AttentionIcon type={item.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{item.title}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{item.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Fallback: show urgent/review/blocked if no AI attention items */}
        {(!briefing?.sections?.attention_items || briefing.sections.attention_items.length === 0) &&
          (urgentTasks.length > 0 || reviewTasks.length > 0 || blockedTasks.length > 0) && (
          <section>
            <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
              {isConsumer ? 'What needs your attention' : 'Needs your attention'}
            </h2>
            <div className="space-y-2">
              {reviewTasks.map(task => (
                <BriefingTaskRow key={task.id} task={task} agents={agents} badge={isConsumer ? 'Ready for you' : 'Review'}
                  badgeColor="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                  onClick={() => onTaskClick(task)} isConsumer={isConsumer} />
              ))}
              {urgentTasks.filter(t => t.status !== 'review').map(task => (
                <BriefingTaskRow key={task.id} task={task} agents={agents} badge="Urgent"
                  badgeColor="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                  onClick={() => onTaskClick(task)} isConsumer={isConsumer} />
              ))}
              {blockedTasks.map(task => (
                <BriefingTaskRow key={task.id} task={task} agents={agents} badge={isConsumer ? 'Needs attention' : 'Blocked'}
                  badgeColor="bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300"
                  onClick={() => onTaskClick(task)} isConsumer={isConsumer} />
              ))}
            </div>
          </section>
        )}

        {/* Two Column: Schedule + Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Today's Schedule */}
          <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Today's schedule
              </h2>
              {calendarConnected === false && (
                <a href="/settings/connections" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  Connect Calendar
                </a>
              )}
            </div>

            {sortedEvents.length > 0 ? (
              <div className="space-y-2">
                {sortedEvents.map(event => (
                  <MeetingPrepCard key={event.id} event={event} />
                ))}
              </div>
            ) : calendarConnected ? (
              <p className="text-sm text-neutral-400 dark:text-neutral-500 py-4 text-center">No events today</p>
            ) : (
              <p className="text-sm text-neutral-400 dark:text-neutral-500 py-4 text-center">
                Connect Google Calendar to see your schedule
              </p>
            )}

            {dueTodayTasks.length > 0 && (
              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">Tasks Due Today</p>
                <div className="space-y-1">
                  {dueTodayTasks.map(task => (
                    <button key={task.id} onClick={() => onTaskClick(task)}
                      className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors text-left">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        task.priority === 'now' ? 'bg-red-500' : task.priority === 'soon' ? 'bg-yellow-400' : 'bg-neutral-400'
                      }`} />
                      <span className="text-sm text-neutral-800 dark:text-neutral-200 truncate">{task.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* In Progress + Inbox */}
          <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
              In progress
            </h2>

            {inProgressTasks.length > 0 ? (
              <div className="space-y-2">
                {inProgressTasks.map(task => (
                  <BriefingTaskRow key={task.id} task={task} agents={agents} onClick={() => onTaskClick(task)} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400 dark:text-neutral-500 py-2">No tasks in progress</p>
            )}
          </section>
        </div>

        {/* Email Intelligence */}
        <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              From your inbox
            </h2>
            <span className="text-xs text-neutral-400 dark:text-neutral-500">
              {scanningEmail
                ? 'Checking your inbox...'
                : gmailConnected === false
                  ? 'Connect Gmail to see email highlights'
                  : lastScanAt
                    ? `Checked ${timeAgo(lastScanAt)}`
                    : null}
            </span>
          </div>

          {extractedItems.length > 0 ? (
            <div className="space-y-2">
              {extractedItems.map(item => (
                <ExtractedItemRow
                  key={item.id || `${item.type}-${item.title}`}
                  item={item}
                  onAction={handleExtractAction}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-400 dark:text-neutral-500 py-3 text-center">
              {scanningEmail
                ? 'Checking your inbox for flights, bills, and more...'
                : gmailConnected === false
                  ? 'Connect Gmail in Settings to see email highlights'
                  : 'No items found in recent emails'}
            </p>
          )}
        </section>

        {/* AI Suggestions */}
        {briefing?.sections?.suggestions && briefing.sections.suggestions.length > 0 && (
          <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
              Suggestions
            </h2>
            <div className="space-y-2">
              {briefing.sections.suggestions.map((suggestion, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-500 flex-shrink-0 mt-0.5">*</span>
                  <span className="text-neutral-700 dark:text-neutral-300">{suggestion}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* AI Activity - hidden in consumer mode */}
        {!isConsumer && recentActivities.length > 0 && (
          <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
              AI activity
            </h2>
            <div className="space-y-2">
              {recentActivities.map(activity => {
                const agent = agents.find(a => a.id === activity.agent_id);
                return (
                  <div key={activity.id} className="flex items-start gap-2.5 text-sm">
                    <span className="flex-shrink-0 text-base">{agent?.emoji || '>'}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-neutral-700 dark:text-neutral-300">{activity.message}</span>
                      <span className="text-neutral-400 dark:text-neutral-500 ml-2 text-xs">
                        {timeAgo(new Date(activity.created_at))}
                      </span>
                    </div>
                    <span className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 capitalize">
                      {activity.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Quick Action */}
        {onOpenChat && (
          <div className="text-center pb-4">
            <button
              onClick={onOpenChat}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <span>{isConsumer ? 'Ask me anything' : 'Ask your team anything'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// -- Sub-components -------

function StatCard({ label, value, color, pulse }: {
  label: string; value: number; color: string; pulse?: boolean;
}) {
  const colorMap: Record<string, { bg: string; text: string; value: string }> = {
    blue:  { bg: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900', text: 'text-blue-600 dark:text-blue-400', value: 'text-blue-700 dark:text-blue-300' },
    amber: { bg: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900', text: 'text-amber-600 dark:text-amber-400', value: 'text-amber-700 dark:text-amber-300' },
    red:   { bg: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900', text: 'text-red-600 dark:text-red-400', value: 'text-red-700 dark:text-red-300' },
    green: { bg: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900', text: 'text-green-600 dark:text-green-400', value: 'text-green-700 dark:text-green-300' },
    gray:  { bg: 'bg-neutral-50 border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700', text: 'text-neutral-500 dark:text-neutral-400', value: 'text-neutral-600 dark:text-neutral-300' },
  };
  const c = colorMap[color] || colorMap.gray;

  return (
    <div className={`p-3 rounded-lg border ${c.bg} ${pulse ? 'animate-pulse' : ''}`}>
      <p className={`text-2xl font-bold ${c.value}`}>{value}</p>
      <p className={`text-xs font-medium ${c.text} mt-0.5`}>{label}</p>
    </div>
  );
}

function BriefingTaskRow({ task, agents, badge, badgeColor, onClick, isConsumer }: {
  task: Task; agents: Agent[]; badge?: string; badgeColor?: string; onClick: () => void; isConsumer?: boolean;
}) {
  const assignedAgents = agents.filter(a => task.assigned_agent_ids?.includes(a.id));

  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all text-left group">
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
        task.priority === 'now' ? 'bg-red-500' : task.priority === 'soon' ? 'bg-yellow-400' : 'bg-neutral-400 dark:bg-neutral-600'
      }`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate group-hover:text-blue-800 dark:group-hover:text-blue-300">
          {task.title}
        </p>
        {!isConsumer && assignedAgents.length > 0 && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {assignedAgents.map(a => `${a.emoji} ${a.name}`).join(', ')}
          </p>
        )}
        {isConsumer && assignedAgents.length > 0 && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            AI is working on this
          </p>
        )}
      </div>
      {badge && (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${badgeColor || 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function ExtractedItemRow({ item, onAction }: {
  item: ExtractedItem;
  onAction: (id: string, action: string) => void;
}) {
  const typeConfig: Record<string, { icon: string; color: string; actionLabel: string }> = {
    flight: { icon: '\u2708', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300', actionLabel: 'Add to calendar' },
    hotel: { icon: '\uD83C\uDFE8', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', actionLabel: 'Add to calendar' },
    bill: { icon: '\uD83D\uDCB3', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', actionLabel: 'Acknowledge' },
    invite: { icon: '\uD83D\uDCE8', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', actionLabel: 'Add to calendar' },
    delivery: { icon: '\uD83D\uDCE6', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', actionLabel: 'Acknowledge' },
    subscription: { icon: '\uD83D\uDD04', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300', actionLabel: 'Acknowledge' },
    action_item: { icon: '\u2705', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', actionLabel: 'Acknowledge' },
  };

  const config = typeConfig[item.type] || { icon: '\u2022', color: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300', actionLabel: 'Acknowledge' };
  const calendarTypes = ['flight', 'hotel', 'invite'];
  const action = calendarTypes.includes(item.type) ? 'create_event' : 'acknowledge';

  return (
    <div className="flex items-start sm:items-center gap-3 p-3 sm:p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
      <span className={`text-xs font-medium px-2 py-1 rounded-full ${config.color} flex-shrink-0`}>
        {config.icon} {item.type}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-900 dark:text-neutral-100 line-clamp-2 sm:truncate">{item.title}</p>
        {item.data?.date && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{item.data.date}</p>
        )}
        {item.data?.amount && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">${item.data.amount}</p>
        )}
        {/* Mobile: action buttons below text */}
        <div className="flex gap-2 mt-2 sm:hidden">
          <button
            onClick={() => onAction(item.id, action)}
            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors touch-manipulation"
          >
            {config.actionLabel}
          </button>
          <button
            onClick={() => onAction(item.id, 'dismiss')}
            className="text-xs px-3 py-1.5 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition-colors touch-manipulation"
          >
            Dismiss
          </button>
        </div>
      </div>
      {/* Desktop: action buttons to the right */}
      <div className="hidden sm:flex gap-1.5 flex-shrink-0">
        <button
          onClick={() => onAction(item.id, action)}
          className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          {config.actionLabel}
        </button>
        <button
          onClick={() => onAction(item.id, 'dismiss')}
          className="text-xs px-2 py-1 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function AttentionIcon({ type }: { type: string }) {
  const icons: Record<string, { icon: string; color: string }> = {
    conflict: { icon: '\u26A0', color: 'text-amber-500' },
    review: { icon: '\u2606', color: 'text-amber-500' },
    blocked: { icon: '\u2718', color: 'text-red-500' },
    due: { icon: '\u23F0', color: 'text-orange-500' },
    extracted: { icon: '\u2709', color: 'text-blue-500' },
  };
  const config = icons[type] || { icon: '\u2022', color: 'text-neutral-500' };

  return <span className={`text-lg flex-shrink-0 ${config.color}`}>{config.icon}</span>;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
