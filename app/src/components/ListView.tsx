'use client';

import { useState } from 'react';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
}

interface ListViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
}

export function ListView({ tasks, onTaskClick, onStatusChange }: ListViewProps) {
  const [showCompleted, setShowCompleted] = useState(false);

  const incompleteTasks = tasks.filter(t => t.status !== 'done');
  const completedTasks = tasks.filter(t => t.status === 'done');

  const TaskItem = ({ task }: { task: Task }) => {
    const isDone = task.status === 'done';

    return (
      <div
        className="group flex items-start gap-3 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition cursor-pointer border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
        onClick={() => onTaskClick(task)}
      >
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStatusChange(task.id, isDone ? 'inbox' : 'done');
          }}
          className={`mt-0.5 flex-shrink-0 w-5 h-5 border-2 rounded transition ${
            isDone
              ? 'bg-green-600 border-green-600'
              : 'border-neutral-300 dark:border-neutral-600 hover:border-green-600'
          }`}
        >
          {isDone && (
            <svg className="w-full h-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Task content */}
        <div className="flex-1 min-w-0">
          <h3 className={`font-medium ${
            isDone 
              ? 'line-through text-neutral-400 dark:text-neutral-600' 
              : 'text-neutral-900 dark:text-neutral-100'
          }`}>
            {task.title}
          </h3>
          {task.description && task.description !== task.title && (
            <p className={`text-sm mt-1 ${
              isDone
                ? 'text-neutral-400 dark:text-neutral-600'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}>
              {task.description}
            </p>
          )}
        </div>

        {/* Status badge */}
        {!isDone && task.status !== 'inbox' && (
          <span className="flex-shrink-0 text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
            {task.status === 'assigned' && 'Assigned'}
            {task.status === 'executing' && 'Running...'}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          My Tasks
        </h1>
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          {incompleteTasks.length} active
          {completedTasks.length > 0 && ` • ${completedTasks.length} done`}
        </div>
      </div>

      {/* Active Tasks */}
      <div className="space-y-1">
        {incompleteTasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-400 dark:text-neutral-600 mb-4">
              No active tasks
            </p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Create your first task
            </button>
          </div>
        ) : (
          incompleteTasks.map(task => (
            <TaskItem key={task.id} task={task} />
          ))
        )}
      </div>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition mb-4"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showCompleted ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-sm font-medium">
              Completed ({completedTasks.length})
            </span>
          </button>

          {showCompleted && (
            <div className="space-y-1 opacity-60">
              {completedTasks.map(task => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
