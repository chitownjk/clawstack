import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getComposio } from '@/lib/composio'
import { encrypt, decrypt } from '@/lib/crypto'
import Anthropic from '@anthropic-ai/sdk'

// POST /api/agents/execute
// Autonomous Task Completion Agent.
// Takes a task and breaks it down into steps, executes what it can,
// and requests approval for anything that modifies external state.
//
// Body: {
//   task_id?: string (existing task to complete),
//   instruction?: string (ad-hoc instruction),
//   auto_approve?: string[] (types of actions to auto-approve: 'calendar', 'task', 'reminder', 'list')
// }
export async function POST(request: Request) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const userId = `tiker_${session.user.id}`

    const { data: account } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const body = await request.json()
    const { task_id, instruction, auto_approve } = body

    if (!task_id && !instruction) {
      return NextResponse.json({ error: 'task_id or instruction required' }, { status: 400 })
    }

    // Get task details if task_id provided
    let taskTitle = instruction || ''
    let taskDescription = ''

    if (task_id) {
      const { data: task } = await adminClient
        .from('mc_tasks')
        .select('title, description, status, priority, due_date')
        .eq('id', task_id)
        .eq('account_id', account.id)
        .single()

      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }

      taskTitle = task.title ? decrypt(task.title) : ''
      taskDescription = task.description ? decrypt(task.description) : ''
    }

    // Gather user context for the agent
    const context = await gatherContext(adminClient, account.id, userId)

    // Plan the execution
    const plan = await planExecution(taskTitle, taskDescription, context)

    // Execute auto-approved steps
    const autoApproveSet = new Set(auto_approve || [])
    const results: StepResult[] = []

    for (const step of plan.steps) {
      if (step.requires_approval && !autoApproveSet.has(step.action_type)) {
        results.push({
          step: step.description,
          status: 'pending_approval',
          action_type: step.action_type,
          action_details: step.action_details,
        })
        continue
      }

      // Execute the step
      const result = await executeStep(step, adminClient, account.id, userId)
      results.push(result)
    }

    const completed = results.filter(r => r.status === 'completed').length
    const pending = results.filter(r => r.status === 'pending_approval').length
    const failed = results.filter(r => r.status === 'failed').length

    // If task_id provided and all steps completed, mark task as done
    if (task_id && pending === 0 && failed === 0 && completed > 0) {
      await adminClient
        .from('mc_tasks')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', task_id)
        .eq('account_id', account.id)
    }

    // Log the execution
    await adminClient
      .from('mc_activities')
      .insert({
        account_id: account.id,
        type: 'agent_execute',
        message: encrypt(`Executed: ${taskTitle} (${completed} done, ${pending} pending, ${failed} failed)`),
        metadata: {
          task_id,
          steps_total: plan.steps.length,
          steps_completed: completed,
          steps_pending: pending,
          steps_failed: failed,
        },
      })

    return NextResponse.json({
      task: taskTitle,
      plan: {
        summary: plan.summary,
        total_steps: plan.steps.length,
      },
      results,
      status: pending > 0 ? 'partially_completed' : failed > 0 ? 'completed_with_errors' : 'completed',
    })
  } catch (error) {
    console.error('[ExecuteAgent] Error:', error)
    return NextResponse.json({ error: 'Failed to execute task' }, { status: 500 })
  }
}

// PATCH /api/agents/execute
// Approve a pending step from a previous execution.
// Body: { step_index, action_type, action_details, approve: boolean }
export async function PATCH(request: Request) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const userId = `tiker_${session.user.id}`

    const { data: account } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const body = await request.json()
    const { approve, action_type, action_details } = body

    if (!approve) {
      return NextResponse.json({ success: true, status: 'rejected' })
    }

    // Execute the approved step
    const step: ExecutionStep = {
      description: action_details?.description || 'Approved step',
      action_type: action_type || 'unknown',
      action_details: action_details || {},
      requires_approval: false,
    }

    const result = await executeStep(step, adminClient, account.id, userId)

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('[ExecuteAgent] Approval error:', error)
    return NextResponse.json({ error: 'Failed to execute approved step' }, { status: 500 })
  }
}

interface ExecutionStep {
  description: string
  action_type: string // 'calendar', 'task', 'reminder', 'list', 'email_draft', 'research'
  action_details: Record<string, any>
  requires_approval: boolean
}

interface ExecutionPlan {
  summary: string
  steps: ExecutionStep[]
}

interface StepResult {
  step: string
  status: 'completed' | 'pending_approval' | 'failed'
  action_type: string
  action_details?: Record<string, any>
  result?: any
  error?: string
}

async function gatherContext(adminClient: any, accountId: string, userId: string) {
  const [tasks, reminders, lists] = await Promise.all([
    adminClient
      .from('mc_tasks')
      .select('id, title, status, priority, due_date')
      .eq('account_id', accountId)
      .neq('status', 'done')
      .limit(20)
      .then((r: any) => (r.data || []).map((t: any) => ({
        ...t,
        title: t.title ? decrypt(t.title) : '',
      }))),
    adminClient
      .from('reminders')
      .select('id, title, status, next_remind_at')
      .eq('account_id', accountId)
      .eq('status', 'active')
      .limit(10)
      .then((r: any) => r.data || []),
    adminClient
      .from('smart_lists')
      .select('id, name, type')
      .eq('account_id', accountId)
      .eq('is_active', true)
      .limit(10)
      .then((r: any) => r.data || [])
      .catch(() => []),
  ])

  return {
    active_tasks: tasks.map((t: any) => `${t.title} (${t.priority}, due: ${t.due_date || 'none'})`).join('; '),
    active_reminders: reminders.map((r: any) => `${r.title} (next: ${r.next_remind_at})`).join('; '),
    smart_lists: lists.map((l: any) => `${l.name} (${l.type})`).join('; '),
  }
}

async function planExecution(
  title: string,
  description: string,
  context: Record<string, string>
): Promise<ExecutionPlan> {
  try {
    const anthropic = new Anthropic()

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: `You are Tiker's execution agent. Break down a task into concrete, executable steps.

Available action types:
- "task": Create or update a task (action_details: { title, priority, due_date })
- "calendar": Create a calendar event (action_details: { summary, start, end, location })
- "reminder": Create a reminder (action_details: { title, remind_at })
- "list": Create or update a smart list (action_details: { name, type, items })
- "email_draft": Draft an email (action_details: { to, subject, body })
- "research": Research a topic (action_details: { topic, constraints })
- "subtask": Break into smaller tasks (action_details: { tasks: [{title, priority}] })

Rules:
- Steps that modify external state (calendar, email_draft) require approval (requires_approval: true)
- Steps that only create internal items (task, reminder, list, subtask) can be auto-executed (requires_approval: false)
- Keep steps specific and actionable
- 2-8 steps maximum

Return JSON: { "summary": "...", "steps": [{ "description": "...", "action_type": "...", "action_details": {...}, "requires_approval": bool }] }`,
      messages: [{
        role: 'user',
        content: `Task: ${title}\n${description ? `Details: ${description}\n` : ''}\nCurrent context:\n${Object.entries(context).map(([k, v]) => `${k}: ${v || 'none'}`).join('\n')}\n\nPlan the execution steps. Return ONLY JSON.`,
      }],
    })

    const aiText = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('')

    const cleaned = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return {
      summary: parsed.summary || 'Execution plan created',
      steps: Array.isArray(parsed.steps) ? parsed.steps : [],
    }
  } catch (error) {
    console.error('[ExecuteAgent] Planning error:', error)
    return {
      summary: 'Could not plan execution',
      steps: [],
    }
  }
}

async function executeStep(
  step: ExecutionStep,
  adminClient: any,
  accountId: string,
  userId: string
): Promise<StepResult> {
  try {
    switch (step.action_type) {
      case 'task': {
        const { title, priority, due_date } = step.action_details
        await adminClient
          .from('mc_tasks')
          .insert({
            account_id: accountId,
            title: encrypt(title || step.description),
            status: 'todo',
            priority: priority || 'medium',
            due_date: due_date || null,
            source: 'agent_execute',
          })
        return { step: step.description, status: 'completed', action_type: step.action_type }
      }

      case 'subtask': {
        const tasks = step.action_details.tasks || []
        for (const t of tasks) {
          await adminClient
            .from('mc_tasks')
            .insert({
              account_id: accountId,
              title: encrypt(t.title || ''),
              status: 'todo',
              priority: t.priority || 'medium',
              source: 'agent_execute',
            })
        }
        return { step: step.description, status: 'completed', action_type: step.action_type, result: { created: tasks.length } }
      }

      case 'reminder': {
        const { title, remind_at } = step.action_details
        await adminClient
          .from('reminders')
          .insert({
            account_id: accountId,
            title: title || step.description,
            status: 'active',
            escalation_level: 0,
            next_remind_at: remind_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          })
        return { step: step.description, status: 'completed', action_type: step.action_type }
      }

      case 'list': {
        const { name, type, items } = step.action_details
        await adminClient
          .from('smart_lists')
          .insert({
            account_id: accountId,
            name: name || step.description,
            type: type || 'custom',
            items: (items || []).map((text: string) => ({
              text,
              checked: false,
              added_at: new Date().toISOString(),
              source: 'agent_execute',
            })),
            auto_generated: true,
          })
        return { step: step.description, status: 'completed', action_type: step.action_type }
      }

      case 'calendar': {
        const { summary, start, end, location } = step.action_details
        if (!start) {
          return { step: step.description, status: 'failed', action_type: step.action_type, error: 'No start time provided' }
        }

        const composio = getComposio()
        const SLUGS = ['GOOGLECALENDAR_EVENTS_CREATE', 'GOOGLECALENDAR_CREATE_EVENT']
        let created = false

        for (const slug of SLUGS) {
          try {
            await composio.tools.execute(slug, {
              userId,
              dangerouslySkipVersionCheck: true,
              arguments: {
                summary: summary || step.description,
                location: location || '',
                start: { dateTime: start },
                end: { dateTime: end || new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString() },
              },
            })
            created = true
            break
          } catch { continue }
        }

        return {
          step: step.description,
          status: created ? 'completed' : 'failed',
          action_type: step.action_type,
          error: created ? undefined : 'Could not create calendar event',
        }
      }

      case 'email_draft': {
        // Store as a pending action -- actual sending requires explicit user action
        return {
          step: step.description,
          status: 'completed',
          action_type: step.action_type,
          result: {
            draft: step.action_details,
            note: 'Email draft prepared. Review and send manually.',
          },
        }
      }

      case 'research': {
        // Delegate to research agent pattern
        return {
          step: step.description,
          status: 'completed',
          action_type: step.action_type,
          result: {
            topic: step.action_details.topic,
            note: 'Use /api/agents/research for full research output.',
          },
        }
      }

      default:
        return {
          step: step.description,
          status: 'failed',
          action_type: step.action_type,
          error: `Unknown action type: ${step.action_type}`,
        }
    }
  } catch (error) {
    return {
      step: step.description,
      status: 'failed',
      action_type: step.action_type,
      error: String(error),
    }
  }
}
