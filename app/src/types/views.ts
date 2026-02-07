/**
 * View types for task display
 */

export type ViewType = 'list' | 'kanban' | 'time' | 'calendar';

export interface ViewConfig {
  id: ViewType;
  name: string;
  icon: string;
  description: string;
}

export const AVAILABLE_VIEWS: ViewConfig[] = [
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
    description: 'Calendar grid (coming soon)'
  }
];

export interface Task {
  id: string;
  account_id?: string;  // Make optional to match mission-control
  title: string;
  description?: string;
  status: string;
  assigned_agent_ids?: string[];
  tags?: string[];
  priority: 'now' | 'soon' | 'later' | string;  // Allow old values too
  due_date?: string;
  assigned_human?: string;
  position?: number;
  time_block?: boolean;
  created_at: string;
  updated_at: string;
  completed_at?: string;
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
