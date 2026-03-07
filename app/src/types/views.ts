/**
 * View types for task display
 */

export type ViewType = 'briefing' | 'list' | 'kanban' | 'time' | 'calendar';

export interface ViewConfig {
  id: ViewType;
  name: string;
  icon: string;
  description: string;
}

export const AVAILABLE_VIEWS: ViewConfig[] = [
  {
    id: 'briefing',
    name: 'Briefing',
    icon: '◉',
    description: "What's on deck today"
  },
  {
    id: 'list',
    name: 'List',
    icon: '☰',
    description: 'Simple checklist view'
  },
  {
    id: 'time',
    name: 'Time',
    icon: '⊡',
    description: 'Today / This Week / Later'
  },
  {
    id: 'kanban',
    name: 'Kanban',
    icon: '⊞',
    description: 'Status columns (dev view)'
  },
  {
    id: 'calendar',
    name: 'Calendar',
    icon: '▦',
    description: 'Weekly calendar grid'
  }
];

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
