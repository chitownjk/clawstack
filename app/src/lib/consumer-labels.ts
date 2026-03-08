/**
 * Consumer-friendly label mappings
 *
 * In consumer mode, technical terminology is replaced with
 * plain language that non-technical users understand.
 */

const consumerLabels: Record<string, string> = {
  // Navigation
  'Command': 'Home',
  'Hub': 'Home',
  'Agents': 'AI Helpers',

  // Views
  'Briefing': 'Today',
  'List': 'Tasks',
  'Time': 'Timeline',
  'Kanban': 'Board',
  'Calendar': 'Calendar',

  // Task statuses
  'inbox': 'To do',
  'assigned': 'Working on it',
  'in_progress': 'In progress',
  'blocked': 'Needs attention',
  'review': 'Ready for you',
  'done': 'Done',
  'error': 'Something went wrong',

  // View descriptions
  "What's on deck today": "Your day at a glance",
  'Simple checklist view': 'Your task list',
  'Today / This Week / Later': 'Organized by when things are due',
  'Status columns (dev view)': 'Track progress visually',
  'Weekly calendar grid': 'See your week',

  // Misc
  'Create Task': 'Add',
  'Priority Tasks': 'What needs your attention',
  'Agent-created': 'AI completed',
  'Assigned': 'Working on it',
}

const advancedLabels: Record<string, string> = {
  // Advanced mode uses the original labels (identity mapping)
}

/**
 * Get the appropriate label for a given key based on mode.
 * Returns the consumer-friendly label in consumer mode,
 * or the original key in advanced mode.
 */
export function getLabel(key: string, isConsumer: boolean): string {
  if (isConsumer && consumerLabels[key]) {
    return consumerLabels[key]
  }
  return advancedLabels[key] || key
}

/**
 * Get consumer-friendly status label
 */
export function getStatusLabel(status: string, isConsumer: boolean): string {
  if (!isConsumer) return status
  return consumerLabels[status] || status
}

/**
 * Get consumer-friendly view name
 */
export function getViewName(viewName: string, isConsumer: boolean): string {
  if (!isConsumer) return viewName
  return consumerLabels[viewName] || viewName
}

/**
 * Get consumer-friendly view description
 */
export function getViewDescription(description: string, isConsumer: boolean): string {
  if (!isConsumer) return description
  return consumerLabels[description] || description
}
