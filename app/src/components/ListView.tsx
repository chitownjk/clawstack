'use client';

import { useState } from 'react';
import { Task, TaskFilter } from '@/types/views';

interface ListViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskComplete: (taskId: string) => void;
}

export default function ListView({ tasks, onTaskClick, onTaskComplete }: ListViewProps) {
  const [filters, setFilters] = useState<TaskFilter>({});
  
  // Apply filters
  const filteredTasks = tasks.filter(task => {
    if (filters.status && !filters.status.includes(task.status)) return false;
    if (filters.priority && !filters.priority.includes(task.priority)) return false;
    if (filters.assigned_to_ai && (!task.assigned_agent_ids || task.assigned_agent_ids.length === 0)) return false;
    if (filters.waiting_for_me && task.status !== 'review') return false;
    if (filters.completed && task.status !== 'done') return false;
    if (filters.overdue) {
      if (!task.due_date) return false;
      const dueDate = new Date(task.due_date);
      const now = new Date();
      if (dueDate >= now || task.status === 'done') return false;
    }
    return true;
  });
  
  // Sort by position, then created_at
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const posA = a.position ?? 0;
    const posB = b.position ?? 0;
    if (posA !== posB) return posA - posB;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  
  const toggleFilter = (key: keyof TaskFilter, value?: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key] === value ? undefined : value
    }));
  };
  
  // Count badges
  const counts = {
    all: tasks.length,
    waitingOnAI: tasks.filter(t => t.assigned_agent_ids && t.assigned_agent_ids.length > 0 && t.status !== 'done').length,
    waitingForMe: tasks.filter(t => t.status === 'review').length,
    completed: tasks.filter(t => t.status === 'done').length,
    overdue: tasks.filter(t => {
      if (!t.due_date || t.status === 'done') return false;
      return new Date(t.due_date) < new Date();
    }).length
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex flex-wrap gap-2">
          <FilterChip
            label="All"
            count={counts.all}
            active={Object.keys(filters).length === 0}
            onClick={() => setFilters({})}
          />
          <FilterChip
            label="🤖 Waiting on AI"
            count={counts.waitingOnAI}
            active={filters.assigned_to_ai === true}
            onClick={() => toggleFilter('assigned_to_ai', true)}
          />
          <FilterChip
            label="👤 AI waiting for me"
            count={counts.waitingForMe}
            active={filters.waiting_for_me === true}
            onClick={() => toggleFilter('waiting_for_me', true)}
          />
          <FilterChip
            label="✅ Completed"
            count={counts.completed}
            active={filters.completed === true}
            onClick={() => toggleFilter('completed', true)}
          />
          <FilterChip
            label="🔴 Overdue"
            count={counts.overdue}
            active={filters.overdue === true}
            onClick={() => toggleFilter('overdue', true)}
          />
        </div>
      </div>
      
      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {sortedTasks.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No tasks found</p>
            <p className="text-sm mt-2">Try adjusting your filters or create a new task</p>
          </div>
        ) : (
          sortedTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              onComplete={() => onTaskComplete(task.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Filter chip component
function FilterChip({ 
  label, 
  count, 
  active, 
  onClick 
}: { 
  label: string; 
  count: number; 
  active: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
        transition-all duration-200
        ${active 
          ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-400' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }
      `}
    >
      <span>{label}</span>
      <span className={`text-xs ${active ? 'text-blue-600' : 'text-gray-500'}`}>
        {count}
      </span>
    </button>
  );
}

// Task item component
function TaskItem({ 
  task, 
  onClick, 
  onComplete 
}: { 
  task: Task; 
  onClick: () => void; 
  onComplete: () => void;
}) {
  const isComplete = task.status === 'done';
  const isReview = task.status === 'review';
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isComplete;

  const priorityColor = {
    now: 'text-red-600',
    soon: 'text-yellow-600',
    later: 'text-gray-400'
  }[task.priority] || 'text-gray-400';

  return (
    <div
      className={`
        group flex items-start gap-3 p-3 rounded-lg border
        transition-all duration-200
        ${isComplete
          ? 'bg-gray-50 dark:bg-neutral-800/50 border-gray-200 dark:border-neutral-700 opacity-60'
          : isReview
          ? 'bg-purple-50 dark:bg-purple-950/20 border-purple-300 dark:border-purple-700 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-sm ring-1 ring-purple-200 dark:ring-purple-800'
          : 'bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600 hover:shadow-sm'
        }
        cursor-pointer
      `}
      onClick={onClick}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onComplete();
        }}
        className={`
          mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center
          transition-all duration-200
          ${isComplete 
            ? 'bg-blue-500 border-blue-500' 
            : 'border-gray-300 hover:border-blue-400 group-hover:border-blue-400'
          }
        `}
      >
        {isComplete && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      
      {/* Task content */}
      <div className="flex-1 min-w-0">
        <h3 className={`font-medium ${isComplete ? 'line-through text-gray-400' : 'text-gray-900'}`}>
          {task.title}
        </h3>
        
        {/* Metadata */}
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          {task.due_date && (
            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
              {isOverdue && '🔴 '}
              {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
          
          {task.assigned_human && (
            <span>👤 {task.assigned_human}</span>
          )}
          
          {task.assigned_agent_ids && task.assigned_agent_ids.length > 0 && (
            <span>🤖 AI assigned</span>
          )}

          {isReview && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-[10px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              AI done - review
            </span>
          )}

          <span className={`${priorityColor} font-medium uppercase`}>
            {task.priority}
          </span>
        </div>
      </div>
    </div>
  );
}
