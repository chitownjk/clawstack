/**
 * View types for task display
 */

export type ViewType = 'briefing' | 'list' | 'kanban' | 'time' | 'calendar';

export interface ViewConfig {
  id: ViewType;
  name: string;
  consumerName?: string; // Friendly name shown in consumer mode
  icon: string;
  description: string;
  consumerDescription?: string;
  consumer: boolean; // true = show in consumer mode
}

export const AVAILABLE_VIEWS: ViewConfig[] = [
  {
    id: 'briefing',
    name: 'Briefing',
    consumerName: 'Today',
    icon: '◉',
    description: "What's on deck today",
    consumerDescription: 'Your day at a glance',
    consumer: true,
  },
  {
    id: 'list',
    name: 'List',
    consumerName: 'Tasks',
    icon: '☰',
    description: 'Simple checklist view',
    consumerDescription: 'Your task list',
    consumer: true,
  },
  {
    id: 'time',
    name: 'Time',
    consumerName: 'Timeline',
    icon: '⊡',
    description: 'Today / This Week / Later',
    consumerDescription: 'Organized by when things are due',
    consumer: true,
  },
  {
    id: 'kanban',
    name: 'Kanban',
    icon: '⊞',
    description: 'Status columns (dev view)',
    consumer: false,
  },
  {
    id: 'calendar',
    name: 'Calendar',
    icon: '▦',
    description: 'Weekly calendar grid',
    consumerDescription: 'See your week',
    consumer: true,
  }
];

/**
 * Get views filtered for the current mode
 */
export function getViewsForMode(isConsumer: boolean): ViewConfig[] {
  if (!isConsumer) return AVAILABLE_VIEWS;
  return AVAILABLE_VIEWS.filter(v => v.consumer);
}

/**
 * Get the display name for a view based on mode
 */
export function getViewDisplayName(view: ViewConfig, isConsumer: boolean): string {
  if (isConsumer && view.consumerName) return view.consumerName;
  return view.name;
}

/**
 * Get the display description for a view based on mode
 */
export function getViewDisplayDescription(view: ViewConfig, isConsumer: boolean): string {
  if (isConsumer && view.consumerDescription) return view.consumerDescription;
  return view.description;
}

import { TaskStatus } from '@/lib/mission-control';

export interface Task {
  id: string;
  account_id?: string;
  title: string;
  description?: string;
  status: TaskStatus | string;  // Allow both specific and general
  assigned_agent_ids?: string[];
  tags?: string[];
  priority: 'now' | 'soon' | 'later' | string;
  due_date?: string;
  assigned_human?: string;
  position?: number;
  time_block?: boolean;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  recurrence_rule?: RecurrenceRule | null;
}

export interface RecurrenceRule {
  freq: 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'monthly';
  days?: number[];       // 0=Sun, 1=Mon, ... 6=Sat (for weekly)
  endDate?: string;      // ISO date string
}

export interface TaskFilter {
  status?: string[];
  priority?: string[];
  assigned_to_ai?: boolean;
  waiting_for_me?: boolean;
  waiting_for_others?: boolean;
  completed?: boolean;
  overdue?: boolean;
}
