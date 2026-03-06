import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { decrypt, encrypt } from '@/lib/crypto'
import Anthropic from '@anthropic-ai/sdk'

// POST /api/command/chat - Stream a chat response
export async function POST(request: Request) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messages, taskId, taskContext } = await request.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Get account
    const { data: account } = await adminClient
      .from('accounts')
      .select('id, plan_tier, execution_mode, api_keys')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Check if AI is enabled
    const hasAI = account.plan_tier !== 'free' || account.execution_mode === 'cloud-user-keys'
    if (!hasAI) {
      return NextResponse.json({
        error: 'AI not available on free plan',
        code: 'UPGRADE_REQUIRED',
      }, { status: 403 })
    }

    // Build system prompt with task context
    let systemPrompt = `You are a helpful AI assistant in Tiker, a task management platform. You help users manage tasks, plan their work, and get things done.

Be concise and actionable. Focus on helping the user with their immediate request. When giving suggestions, be specific rather than generic.

Current date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`

    if (taskContext) {
      systemPrompt += `

The user is currently viewing this task:
- Title: ${taskContext.title}
- Status: ${taskContext.status}
- Description: ${taskContext.description || 'None'}
- Assigned to: ${taskContext.assignedAgents || 'Unassigned'}
- Tags: ${taskContext.tags?.join(', ') || 'None'}

Help them with whatever they need regarding this task. You can suggest status changes, draft content, brainstorm ideas, or help plan next steps.`
    }

    // Get API key
    let apiKey = process.env.ANTHROPIC_API_KEY

    if (account.execution_mode === 'cloud-user-keys' && account.api_keys) {
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
        error: 'No API key configured',
        code: 'NO_API_KEY',
      }, { status: 500 })
    }

    // Create Anthropic client
    const anthropic = new Anthropic({ apiKey })

    // Stream the response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            system: systemPrompt,
            messages: messages.map((m: any) => ({
              role: m.role,
              content: m.content,
            })),
            stream: true,
          })

          let fullContent = ''

          for await (const event of response) {
            if (event.type === 'content_block_delta') {
              const delta = event.delta
              if ('text' in delta) {
                fullContent += delta.text
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'delta', text: delta.text })}\n\n`)
                )
              }
            }

            if (event.type === 'message_stop') {
              // If chat is in task context, save the exchange as comments
              if (taskId && fullContent) {
                try {
                  // Find or create a chat agent
                  const { data: chatAgent } = await adminClient
                    .from('mc_agents')
                    .select('id')
                    .eq('name', 'Chat')
                    .eq('account_id', account.id)
                    .single()

                  let chatAgentId = chatAgent?.id

                  if (!chatAgentId) {
                    const { data: newAgent } = await adminClient
                      .from('mc_agents')
                      .insert({
                        name: 'Chat',
                        session_key: `chat:${account.id}`,
                        role: 'Real-time AI assistant',
                        level: 'specialist',
                        emoji: '💬',
                        status: 'active',
                        account_id: account.id,
                      })
                      .select('id')
                      .single()
                    chatAgentId = newAgent?.id
                  }

                  if (chatAgentId) {
                    // Save AI response as a comment
                    await adminClient
                      .from('mc_comments')
                      .insert({
                        task_id: taskId,
                        agent_id: chatAgentId,
                        content: encrypt(fullContent),
                        account_id: account.id,
                      })
                  }
                } catch (err) {
                  console.error('Failed to save chat as comment:', err)
                }
              }

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
              )
            }
          }

          controller.close()
        } catch (err: any) {
          console.error('Chat streaming error:', err)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', message: err.message || 'Streaming failed' })}\n\n`)
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
      },
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
