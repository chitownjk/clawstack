'use client';

import { useState, useEffect, useMemo } from 'react';
import { Task } from '@/types/views';
import { Agent, Activity } from '@/lib/mission-control';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  htmlLink?: string;
  attendees?: number;
}

interface DailyBriefingProps {
  tasks: Task[];
  agents: Agent[];
  activities: Activity[];
  onTaskClick: (task: Task) => void;
  onOpenChat?: () => void;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DailyBriefing({ tasks, agents, activities, onTaskClick, onOpenChat }: DailyBriefingProps) {
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null);
  const now = useMemo(() => new Date(), []);
  const todayStr = dateKey(now);

  // Fetch today's calendar events
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

  // Compute briefing data
  const activeTasks = tasks.filter(t => t.status !== 'done');
  const urgentTasks = activeTasks.filter(t => t.priority === 'now');
  const reviewTasks = activeTasks.filter(t => t.status === 'review');
  const blockedTasks = activeTasks.filter(t => t.status === 'blocked');
  const inProgressTasks = activeTasks.filter(t => t.status === 'in_progress');
  const inboxTasks = activeTasks.filter(t => t.status === 'inbox');

  // Tasks due today
  const dueTodayTasks = activeTasks.filter(t => {
    if (!t.due_date) return false;
    return dateKey(new Date(t.due_date)) === todayStr;
  });

  // Tasks completed today
  const completedToday = tasks.filter(t => {
    if (t.status !== 'done' || !t.completed_at) return false;
    return dateKey(new Date(t.completed_at)) === todayStr;
  });

  // Recent activities (last 10)
  const recentActivities = activities.slice(0, 10);

  // Agent status summary
  const activeAgents = agents.filter(a => a.status === 'active');
  const idleAgents = agents.filter(a => a.status === 'idle');

  // Sort calendar events by start time
  const sortedEvents = [...calendarEvents].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  // Greeting based on time of day
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const dateDisplay = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{greeting}</h1>
          <p className="text-sm text-gray-500 mt-1">{dateDisplay}</p>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Active Tasks"
            value={activeTasks.length}
            color="blue"
          />
          <StatCard
            label="Needs Review"
            value={reviewTasks.length}
            color={reviewTasks.length > 0 ? 'amber' : 'gray'}
            pulse={reviewTasks.length > 0}
          />
          <StatCard
            label="Blocked"
            value={blockedTasks.length}
            color={blockedTasks.length > 0 ? 'red' : 'gray'}
          />
          <StatCard
            label="Done Today"
            value={completedToday.length}
            color="green"
          />
        </div>

        {/* Urgent / Review Section */}
        {(urgentTasks.length > 0 || reviewTasks.length > 0) && (
          <section>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Needs Your Attention
            </h2>
            <div className="space-y-2">
              {reviewTasks.map(task => (
                <BriefingTaskRow
                  key={task.id}
                  task={task}
                  agents={agents}
                  badge="Review"
                  badgeColor="bg-amber-100 text-amber-700"
                  onClick={() => onTaskClick(task)}
                />
              ))}
              {urgentTasks.filter(t => t.status !== 'review').map(task => (
                <BriefingTaskRow
                  key={task.id}
                  task={task}
                  agents={agents}
                  badge="Urgent"
                  badgeColor="bg-red-100 text-red-700"
                  onClick={() => onTaskClick(task)}
                />
              ))}
              {blockedTasks.map(task => (
                <BriefingTaskRow
                  key={task.id}
                  task={task}
                  agents={agents}
                  badge="Blocked"
                  badgeColor="bg-gray-200 text-gray-700"
                  onClick={() => onTaskClick(task)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Two Column Layout: Schedule + Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Today's Schedule (Calendar) */}
          <section className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Today's Schedule
              </h2>
              {calendarConnected === false && (
                <a href="/settings/connections" className="text-xs text-blue-600 hover:underline">
                  Connect Calendar
                </a>
              )}
            </div>

            {/* Calendar Events */}
            {sortedEvents.length > 0 ? (
              <div className="space-y-2">
                {sortedEvents.map(event => (
                  <a
                    key={event.id}
                    href={event.htmlLink || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-2 rounded-md hover:bg-green-50 transition-colors group"
                  >
                    <div className="w-1.5 rounded-full bg-green-500 self-stretch min-h-[28px] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-green-800 truncate">
                        {event.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {event.allDay
                          ? 'All day'
                          : new Date(event.start).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                        {event.location && ` \u00B7 ${event.location}`}
                        {event.attendees && event.attendees > 0 && ` \u00B7 ${event.attendees} attendees`}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            ) : calendarConnected ? (
              <p className="text-sm text-gray-400 py-4 text-center">No events today</p>
            ) : (
              <p className="text-sm text-gray-400 py-4 text-center">
                Connect Google Calendar to see your schedule
              </p>
            )}

            {/* Due Today tasks */}
            {dueTodayTasks.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-2">Tasks Due Today</p>
                <div className="space-y-1">
                  {dueTodayTasks.map(task => (
                    <button
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-blue-50 transition-colors text-left"
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        task.priority === 'now' ? 'bg-red-500' :
                        task.priority === 'soon' ? 'bg-yellow-400' :
                        'bg-gray-400'
                      }`} />
                      <span className="text-sm text-gray-800 truncate">{task.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* In Progress + Inbox */}
          <section className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              In Progress
            </h2>

            {inProgressTasks.length > 0 ? (
              <div className="space-y-2">
                {inProgressTasks.map(task => (
                  <BriefingTaskRow
                    key={task.id}
                    task={task}
                    agents={agents}
                    onClick={() => onTaskClick(task)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 py-2">No tasks in progress</p>
            )}

            {inboxTasks.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-2">
                  Inbox ({inboxTasks.length})
                </p>
                <div className="space-y-1">
                  {inboxTasks.slice(0, 5).map(task => (
                    <button
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 transition-colors text-left"
                    >
                      <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{task.title}</span>
                    </button>
                  ))}
                  {inboxTasks.length > 5 && (
                    <p className="text-xs text-gray-400 pl-4">
                      +{inboxTasks.length - 5} more in inbox
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Agent Status */}
        {agents.length > 0 && (
          <section className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Agents
            </h2>
            <div className="flex flex-wrap gap-3">
              {agents.map(agent => {
                const agentTasks = activeTasks.filter(t =>
                  t.assigned_agent_ids?.includes(agent.id)
                );
                return (
                  <div
                    key={agent.id}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm"
                  >
                    <span className="text-lg">{agent.emoji}</span>
                    <div>
                      <span className="font-medium text-gray-800">{agent.name}</span>
                      <span className="text-gray-500 ml-2">
                        {agentTasks.length === 0
                          ? 'idle'
                          : `${agentTasks.length} task${agentTasks.length !== 1 ? 's' : ''}`}
                      </span>
                    </div>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        agent.status === 'active' ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Recent Activity */}
        {recentActivities.length > 0 && (
          <section className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Recent Activity
            </h2>
            <div className="space-y-2">
              {recentActivities.map(activity => {
                const agent = agents.find(a => a.id === activity.agent_id);
                return (
                  <div key={activity.id} className="flex items-start gap-2 text-sm">
                    <span className="flex-shrink-0 text-base">{agent?.emoji || '>'}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-700">{activity.message}</span>
                      <span className="text-gray-400 ml-2 text-xs">
                        {timeAgo(new Date(activity.created_at))}
                      </span>
                    </div>
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
              <span>Ask your team anything</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  pulse,
}: {
  label: string;
  value: number;
  color: string;
  pulse?: boolean;
}) {
  const colorMap: Record<string, { bg: string; text: string; value: string }> = {
    blue:  { bg: 'bg-blue-50 border-blue-200',  text: 'text-blue-600',  value: 'text-blue-700' },
    amber: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-600', value: 'text-amber-700' },
    red:   { bg: 'bg-red-50 border-red-200',     text: 'text-red-600',   value: 'text-red-700' },
    green: { bg: 'bg-green-50 border-green-200',  text: 'text-green-600', value: 'text-green-700' },
    gray:  { bg: 'bg-gray-50 border-gray-200',   text: 'text-gray-500',  value: 'text-gray-600' },
  };

  const c = colorMap[color] || colorMap.gray;

  return (
    <div className={`p-3 rounded-lg border ${c.bg} ${pulse ? 'animate-pulse' : ''}`}>
      <p className={`text-2xl font-bold ${c.value}`}>{value}</p>
      <p className={`text-xs font-medium ${c.text} mt-0.5`}>{label}</p>
    </div>
  );
}

function BriefingTaskRow({
  task,
  agents,
  badge,
  badgeColor,
  onClick,
}: {
  task: Task;
  agents: Agent[];
  badge?: string;
  badgeColor?: string;
  onClick: () => void;
}) {
  const assignedAgents = agents.filter(a => task.assigned_agent_ids?.includes(a.id));

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-left group"
    >
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
        task.priority === 'now' ? 'bg-red-500' :
        task.priority === 'soon' ? 'bg-yellow-400' :
        'bg-gray-400'
      }`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-800">
          {task.title}
        </p>
        {assignedAgents.length > 0 && (
          <p className="text-xs text-gray-500 mt-0.5">
            {assignedAgents.map(a => `${a.emoji} ${a.name}`).join(', ')}
          </p>
        )}
      </div>
      {badge && (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${badgeColor || 'bg-gray-100 text-gray-600'}`}>
          {badge}
        </span>
      )}
    </button>
  );
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
