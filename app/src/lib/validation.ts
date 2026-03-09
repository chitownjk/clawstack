import { z } from 'zod'

/**
 * Shared Zod schemas for API input validation.
 * Import these in route handlers to validate request bodies.
 */

// Task creation
export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title required').max(500, 'Title too long (max 500 characters)'),
  description: z.string().max(10000, 'Description too long (max 10,000 characters)').optional().nullable(),
  assigned_agent_ids: z.array(z.string()).optional().default([]),
  tags: z.array(z.string().max(100)).max(20).optional().default([]),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal'),
})

// Task update (PATCH)
export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional().nullable(),
  status: z.enum(['inbox', 'assigned', 'in_progress', 'review', 'blocked', 'done']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  assigned_agent_ids: z.array(z.string()).optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
  due_date: z.string().datetime().optional().nullable(),
})

// Pattern submission
export const createPatternSchema = z.object({
  title: z.string().min(1).max(300, 'Title must be under 300 characters'),
  category: z.enum(['security', 'coordination', 'memory', 'skills', 'orchestration']),
  problem: z.string().min(1).max(5000, 'Problem must be under 5,000 characters'),
  solution: z.string().min(1).max(10000, 'Solution must be under 10,000 characters'),
  implementation: z.string().max(10000).optional().nullable(),
  validation: z.string().max(5000).optional().nullable(),
  edge_cases: z.string().max(5000).optional().nullable(),
})

// Account deletion
export const deleteAccountSchema = z.object({
  confirm: z.literal('DELETE'),
  email: z.string().email('Valid email required'),
})

// Email signature
export const preferencesSchema = z.object({
  email_signature: z.string().max(500).optional(),
  briefing_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  briefing_email: z.boolean().optional(),
  timezone: z.string().max(100).optional(),
})

// Comment creation
export const createCommentSchema = z.object({
  task_id: z.string().uuid(),
  content: z.string().min(1).max(10000),
  is_agent: z.boolean().optional().default(false),
})

/**
 * Parse and validate request body with a Zod schema.
 * Returns { success: true, data } or { success: false, error }.
 */
export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown):
  { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const firstError = result.error.issues[0]
  return {
    success: false,
    error: firstError?.message || 'Invalid input'
  }
}
