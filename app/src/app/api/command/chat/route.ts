import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { decrypt, encrypt } from '@/lib/crypto'
import Anthropic from '@anthropic-ai/sdk'

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_MESSAGE_LENGTH = 2000       // Max chars per user message
const MAX_MESSAGES_PER_REQUEST = 20   // Max conversation turns sent to API
const MAX_BODY_SIZE = 50_000          // ~50KB max request body
const MAX_TOKENS_RESPONSE = 2048      // Allow longer responses for tool use
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'  // Fast + cheap for chat
const MAX_TOOL_ROUNDS = 3            // Max tool use rounds per request
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000  // 1 hour window

// Admin emails bypass plan checks and rate limits
const ADMIN_EMAILS = [
  'jklauminzer@gmail.com',
]

// Per-plan rate limits (requests per hour)
const PLAN_RATE_LIMITS: Record<string, number> = {
  free: 0,             // No chat on free
  cloud: 60,           // Solo: 60/hr
  'cloud-developer': 60, // Legacy Solo
  'cloud-plus': 200,   // Team: 200/hr
  byok: 300,           // BYOK: higher since they pay for tokens
}

// In-memory rate limiter (resets on deploy, which is fine for Vercel)
const rateBuckets = new Map<string, { count: number; windowStart: number }>()

function checkRateLimit(accountId: string, planTier: string, isBYOK: boolean): {
  allowed: boolean
  remaining: number
  limit: number
} {
  const key = isBYOK ? 'byok' : planTier
  const limit = PLAN_RATE_LIMITS[key] ?? 0
  if (limit === 0) return { allowed: false, remaining: 0, limit: 0 }

  const now = Date.now()
  const bucket = rateBuckets.get(accountId)

  if (!bucket || now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(accountId, { count: 1, windowStart: now })
    return { allowed: true, remaining: limit - 1, limit }
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, limit }
  }

  bucket.count++
  return { allowed: true, remaining: limit - bucket.count, limit }
}

// ── Input Sanitization ───────────────────────────────────────────────────────

function sanitizeForContext(text: string, maxLength: number = 500): string {
  return text
    .slice(0, maxLength)
    .replace(/```/g, '')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function sanitizeMessages(
  raw: unknown
): { role: 'user' | 'assistant'; content: string }[] | null {
  if (!Array.isArray(raw)) return null

  const cleaned: { role: 'user' | 'assistant'; content: string }[] = []

  for (const msg of raw) {
    if (!msg || typeof msg !== 'object') continue
    const role = msg.role === 'assistant' ? 'assistant' : 'user'
    const content = typeof msg.content === 'string' ? msg.content : ''
    if (!content.trim()) continue

    const trimmedContent = role === 'user'
      ? content.slice(0, MAX_MESSAGE_LENGTH)
      : content.slice(0, MAX_MESSAGE_LENGTH * 4)

    cleaned.push({ role, content: trimmedContent })
  }

  if (cleaned.length > MAX_MESSAGES_PER_REQUEST) {
    return cleaned.slice(-MAX_MESSAGES_PER_REQUEST)
  }

  return cleaned.length > 0 ? cleaned : null
}

// ── Tools Definition ─────────────────────────────────────────────────────────

const CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'create_task',
    description: 'Create a new task in the user\'s task board. Use this whenever the user asks you to do something actionable -- schedule a meeting, send an email, research something, draft a document, etc. The task will be picked up by an AI agent and executed. Set priority to "now" for urgent items, "soon" for today/tomorrow, "later" for non-urgent.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Short, action-oriented task title (e.g. "Schedule meeting with Jay at Solis Interactive for tomorrow")',
        },
        description: {
          type: 'string',
          description: 'Detailed instructions for the AI agent that will execute this task. Include all context: names, emails, dates, times, specifics about what to do.',
        },
        priority: {
          type: 'string',
          enum: ['now', 'soon', 'later'],
          description: 'Task priority. "now" = urgent/immediate, "soon" = today or tomorrow, "later" = whenever.',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags to categorize the task (e.g. ["email", "meeting", "research"])',
        },
        due_date: {
          type: 'string',
          description: 'Optional due date in YYYY-MM-DD format',
        },
      },
      required: ['title', 'description', 'priority'],
    },
  },
  {
    name: 'update_task',
    description: 'Update an existing task\'s status, priority, or details. Use when the user wants to mark a task done, change priority, or modify task info.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task_id: {
          type: 'string',
          description: 'The ID of the task to update',
        },
        status: {
          type: 'string',
          enum: ['inbox', 'assigned', 'running', 'review', 'done', 'cancelled'],
          description: 'New status for the task',
        },
        priority: {
          type: 'string',
          enum: ['now', 'soon', 'later'],
          description: 'New priority',
        },
        title: {
          type: 'string',
          description: 'New title',
        },
        description: {
          type: 'string',
          description: 'New description',
        },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'list_tasks',
    description: 'List the user\'s recent tasks, optionally filtered by status. Use this to help the user understand what\'s on their plate, find specific tasks, or give status updates.',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['inbox', 'assigned', 'running', 'review', 'done', 'cancelled'],
          description: 'Filter by status. Omit to get all active tasks.',
        },
        limit: {
          type: 'number',
          description: 'Max tasks to return (default 10, max 25)',
        },
      },
      required: [],
    },
  },
]

// ── Tool Execution ───────────────────────────────────────────────────────────

async function executeTool(
  toolName: string,
  toolInput: Record<string, any>,
  accountId: string,
  adminClient: any
): Promise<string> {
  try {
    switch (toolName) {
      case 'create_task': {
        const { title, description, priority, tags, due_date } = toolInput

        // Look up available agents to auto-assign
        const { data: agents } = await adminClient
          .from('mc_agents')
          .select('id, name')
          .eq('account_id', accountId)
          .eq('status', 'active')

        // Pick the General Assistant by default, or first available agent
        const generalAgent = agents?.find((a: any) =>
          a.name.toLowerCase().includes('general') || a.name.toLowerCase().includes('assistant')
        )
        const assignedAgentIds = generalAgent ? [generalAgent.id] : (agents?.length ? [agents[0].id] : [])

        const insertData: Record<string, any> = {
          title: encrypt(title),
          description: description ? encrypt(description) : null,
          assigned_agent_ids: assignedAgentIds,
          tags: tags || [],
          priority: priority || 'soon',
          status: assignedAgentIds.length > 0 ? 'assigned' : 'inbox',
          account_id: accountId,
        }

        if (due_date) {
          insertData.due_date = due_date
        }

        const { data: task, error } = await adminClient
          .from('mc_tasks')
          .insert(insertData)
          .select('id, status, priority, due_date')
          .single()

        if (error) {
          console.error('[Chat Tool] Create task error:', error)
          return `Failed to create task: ${error.message}`
        }

        const agentName = generalAgent?.name || agents?.[0]?.name || 'unassigned'
        return `Task created successfully! ID: ${task.id}, Status: ${task.status}, Priority: ${task.priority}, Assigned to: ${agentName}${task.due_date ? ', Due: ' + task.due_date : ''}. The AI agent will pick this up and execute it.`
      }

      case 'update_task': {
        const { task_id, status, priority, title, description } = toolInput

        const updateData: Record<string, any> = {}
        if (status) updateData.status = status
        if (priority) updateData.priority = priority
        if (title) updateData.title = encrypt(title)
        if (description) updateData.description = encrypt(description)

        if (Object.keys(updateData).length === 0) {
          return 'No updates specified.'
        }

        const { error } = await adminClient
          .from('mc_tasks')
          .update(updateData)
          .eq('id', task_id)
          .eq('account_id', accountId)

        if (error) {
          console.error('[Chat Tool] Update task error:', error)
          return `Failed to update task: ${error.message}`
        }

        return `Task ${task_id} updated successfully.`
      }

      case 'list_tasks': {
        const { status, limit: taskLimit } = toolInput
        const maxTasks = Math.min(taskLimit || 10, 25)

        let query = adminClient
          .from('mc_tasks')
          .select('id, title, status, priority, tags, due_date, created_at')
          .eq('account_id', accountId)
          .order('created_at', { ascending: false })
          .limit(maxTasks)

        if (status) {
          query = query.eq('status', status)
        } else {
          // By default exclude done/cancelled
          query = query.not('status', 'in', '("done","cancelled")')
        }

        const { data: tasks, error } = await query

        if (error) {
          console.error('[Chat Tool] List tasks error:', error)
          return `Failed to list tasks: ${error.message}`
        }

        if (!tasks || tasks.length === 0) {
          return status
            ? `No tasks found with status "${status}".`
            : 'No active tasks found.'
        }

        // Decrypt titles for display
        const taskList = tasks.map((t: any) => {
          let decryptedTitle = t.title
          try { decryptedTitle = decrypt(t.title) } catch { /* already decrypted or error */ }
          return `- [${t.status}] ${decryptedTitle} (priority: ${t.priority}${t.due_date ? ', due: ' + t.due_date : ''}, id: ${t.id})`
        })

        return `Found ${tasks.length} task(s):\n${taskList.join('\n')}`
      }

      default:
        return `Unknown tool: ${toolName}`
    }
  } catch (err: any) {
    console.error(`[Chat Tool] Error executing ${toolName}:`, err)
    return `Error: ${err.message || 'Unknown error'}`
  }
}

// ── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(taskContext?: {
  title?: string
  status?: string
  description?: string
  assignedAgents?: string
  tags?: string[]
}): string {
  let prompt = `You are the AI assistant inside Tiker, a task management app with AI agents that execute work for the user. You are the user's command center -- they talk to you, and you make things happen.

Your capabilities:
- CREATE TASKS for things the user wants done. Tasks are picked up by AI agents and executed automatically. This includes: sending emails, scheduling meetings, doing research, drafting documents, making phone calls, analyzing data, and more.
- UPDATE existing tasks (change status, priority, details).
- LIST and search the user's tasks to give status updates.

How to handle requests:
- When the user asks you to DO something (send email, schedule meeting, research X, draft Y), CREATE A TASK for it immediately. Don't ask for permission -- just do it. Include all relevant details in the task description so the agent can execute without follow-up.
- When the user asks about their tasks or workload, use list_tasks to show them.
- When the user wants to change a task, use update_task.
- For questions and conversation, respond naturally. You can help with planning, brainstorming, and general advice.

Task description best practices:
- Write the description as clear instructions for the AI agent that will execute the task.
- Include all context: full names, email addresses, dates, times, specific details.
- Be specific about the desired outcome.

Style:
- Be concise and action-oriented. Confirm what you did, don't over-explain.
- Use a friendly, professional tone.

Current date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`

  if (taskContext?.title) {
    const title = sanitizeForContext(taskContext.title, 200)
    const status = sanitizeForContext(taskContext.status || 'unknown', 50)
    const desc = taskContext.description
      ? sanitizeForContext(taskContext.description, 500)
      : 'None'
    const agents = taskContext.assignedAgents
      ? sanitizeForContext(taskContext.assignedAgents, 200)
      : 'Unassigned'
    const tags = taskContext.tags?.length
      ? taskContext.tags.map(t => sanitizeForContext(t, 50)).join(', ')
      : 'None'

    prompt += `

The user is currently viewing this task:
Title: ${title}
Status: ${status}
Description: ${desc}
Assigned to: ${agents}
Tags: ${tags}

Help them with this task. You can update it, suggest improvements, or create follow-up tasks.`
  }

  return prompt
}

// ── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: 'Request too large', code: 'PAYLOAD_TOO_LARGE' },
        { status: 413 }
      )
    }

    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { taskId, taskContext } = body

    const messages = sanitizeMessages(body.messages)
    if (!messages) {
      return NextResponse.json({ error: 'Valid messages required' }, { status: 400 })
    }

    if (messages[messages.length - 1].role !== 'user') {
      return NextResponse.json({ error: 'Last message must be from user' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const { data: account } = await adminClient
      .from('accounts')
      .select('id, plan_tier, execution_mode, api_keys')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Check admin status
    const isAdmin = ADMIN_EMAILS.includes(session.user.email ?? '')

    // Check plan access (admins bypass)
    const isBYOK = account.execution_mode === 'cloud-user-keys'
    const hasAI = isAdmin || account.plan_tier !== 'free' || isBYOK
    if (!hasAI) {
      return NextResponse.json({
        error: 'AI chat requires an upgraded plan',
        code: 'UPGRADE_REQUIRED',
      }, { status: 403 })
    }

    // Rate limit check (admins bypass)
    const rateCheck = isAdmin
      ? { allowed: true, limit: 999999, remaining: 999999 }
      : checkRateLimit(account.id, account.plan_tier, isBYOK)
    if (!rateCheck.allowed) {
      return NextResponse.json({
        error: 'Rate limit exceeded. Please wait before sending more messages.',
        code: 'RATE_LIMITED',
        retryAfter: 60,
      }, {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': String(rateCheck.limit),
          'X-RateLimit-Remaining': '0',
        },
      })
    }

    // Resolve API key
    let apiKey = process.env.ANTHROPIC_API_KEY

    if (isBYOK && account.api_keys) {
      try {
        const keys = typeof account.api_keys === 'string'
          ? JSON.parse(decrypt(account.api_keys))
          : account.api_keys
        if (keys.anthropic) {
          apiKey = keys.anthropic
        }
      } catch {
        // Fall back to platform key
      }
    }

    if (!apiKey) {
      return NextResponse.json({
        error: 'No API key configured. The ANTHROPIC_API_KEY environment variable is not set.',
        code: 'NO_API_KEY',
      }, { status: 500 })
    }

    const systemPrompt = buildSystemPrompt(taskContext)
    const anthropic = new Anthropic({ apiKey })
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let currentMessages: any[] = [...messages]
          let toolRounds = 0

          // Tool use loop: call the API, handle tool calls, repeat
          while (toolRounds <= MAX_TOOL_ROUNDS) {
            const response = await anthropic.messages.create({
              model: DEFAULT_MODEL,
              max_tokens: MAX_TOKENS_RESPONSE,
              system: systemPrompt,
              messages: currentMessages,
              tools: CHAT_TOOLS,
              stream: false, // Non-streaming for tool use simplicity
            })

            let hasToolUse = false
            let textContent = ''
            const toolResults: any[] = []

            for (const block of response.content) {
              if (block.type === 'text') {
                textContent += block.text
                // Stream text to client
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'delta', text: block.text })}\n\n`)
                )
              }

              if (block.type === 'tool_use') {
                hasToolUse = true

                // Show the user what we're doing
                const actionMsg = getToolActionMessage(block.name, block.input as Record<string, any>)
                if (actionMsg) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'delta', text: actionMsg })}\n\n`)
                  )
                  textContent += actionMsg
                }

                // Execute the tool
                const result = await executeTool(
                  block.name,
                  block.input as Record<string, any>,
                  account.id,
                  adminClient
                )

                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: result,
                })
              }
            }

            // Track usage
            const inputTokens = response.usage?.input_tokens ?? 0
            const outputTokens = response.usage?.output_tokens ?? 0
            logUsage(adminClient, account.id, inputTokens, outputTokens).catch(() => {})

            if (!hasToolUse) {
              // No tool calls -- we're done
              if (taskId && textContent) {
                saveAsComment(adminClient, account.id, taskId, textContent).catch(err =>
                  console.error('Failed to save chat comment:', err)
                )
              }

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'done',
                  usage: { input: inputTokens, output: outputTokens },
                })}\n\n`)
              )
              break
            }

            // Add assistant response and tool results to conversation
            currentMessages.push({ role: 'assistant', content: response.content })
            currentMessages.push({ role: 'user', content: toolResults })

            toolRounds++

            if (toolRounds > MAX_TOOL_ROUNDS) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'done',
                  usage: { input: inputTokens, output: outputTokens },
                })}\n\n`)
              )
            }
          }

          controller.close()
        } catch (err: any) {
          console.error('Chat streaming error:', err)

          const safeMessage = err.status === 429
            ? 'AI provider rate limited. Please try again in a moment.'
            : 'Something went wrong. Please try again.'

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', message: safeMessage })}\n\n`)
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-RateLimit-Remaining': String(rateCheck.remaining),
      },
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── UI Helpers ───────────────────────────────────────────────────────────────

function getToolActionMessage(toolName: string, input: Record<string, any>): string {
  switch (toolName) {
    case 'create_task':
      return `\n\n> Creating task: "${input.title}"...\n\n`
    case 'update_task':
      return `\n\n> Updating task...\n\n`
    case 'list_tasks':
      return '' // Don't show a message for listing
    default:
      return ''
  }
}

// ── Helpers (non-blocking, fire-and-forget) ──────────────────────────────────

async function logUsage(
  adminClient: any,
  accountId: string,
  inputTokens: number,
  outputTokens: number
) {
  const today = new Date().toISOString().split('T')[0]
  const { data: existing } = await adminClient
    .from('chat_usage')
    .select('id, request_count, input_tokens, output_tokens')
    .eq('account_id', accountId)
    .eq('date', today)
    .single()

  if (existing) {
    await adminClient
      .from('chat_usage')
      .update({
        request_count: existing.request_count + 1,
        input_tokens: existing.input_tokens + inputTokens,
        output_tokens: existing.output_tokens + outputTokens,
      })
      .eq('id', existing.id)
  } else {
    await adminClient
      .from('chat_usage')
      .insert({
        account_id: accountId,
        date: today,
        request_count: 1,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      })
      .catch(() => {
        // Table might not exist yet, that's fine
      })
  }
}

async function saveAsComment(
  adminClient: any,
  accountId: string,
  taskId: string,
  content: string
) {
  const { data: chatAgent } = await adminClient
    .from('mc_agents')
    .select('id')
    .eq('name', 'Chat')
    .eq('account_id', accountId)
    .single()

  let chatAgentId = chatAgent?.id

  if (!chatAgentId) {
    const { data: newAgent } = await adminClient
      .from('mc_agents')
      .insert({
        name: 'Chat',
        session_key: `chat:${accountId}`,
        role: 'Real-time AI assistant',
        level: 'specialist',
        emoji: '\uD83D\uDCAC',
        status: 'active',
        account_id: accountId,
      })
      .select('id')
      .single()
    chatAgentId = newAgent?.id
  }

  if (chatAgentId) {
    await adminClient
      .from('mc_comments')
      .insert({
        task_id: taskId,
        agent_id: chatAgentId,
        content: encrypt(content),
        account_id: accountId,
      })
  }
}
