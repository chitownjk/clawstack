import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { encrypt } from '@/lib/crypto'

// POST /api/agents/research
// Life Admin Research Agent: takes a life admin topic and generates
// a structured research report with a step-by-step checklist.
//
// Body: { topic, context?, location?, deadline? }
// Examples:
//   { "topic": "renew passport", "location": "Illinois" }
//   { "topic": "moving to a new apartment", "deadline": "2026-04-01" }
//   { "topic": "file taxes as freelancer", "location": "California" }
export async function POST(request: Request) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: account } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const body = await request.json()
    const { topic, context, location, deadline } = body

    if (!topic) {
      return NextResponse.json({ error: 'topic required' }, { status: 400 })
    }

    // Generate research report via AI
    const report = await generateResearch(topic, { context, location, deadline })

    // Create a task for tracking this life admin item
    const taskTitle = `Life admin: ${topic}`
    const { data: task } = await adminClient
      .from('mc_tasks')
      .insert({
        account_id: account.id,
        title: encrypt(taskTitle),
        description: encrypt(report.summary),
        status: 'todo',
        priority: deadline ? 'high' : 'medium',
        due_date: deadline || null,
        source: 'research_agent',
        metadata: {
          agent_type: 'life_admin_research',
          topic,
          location,
          checklist_count: report.checklist.length,
        },
      })
      .select()
      .single()

    // If the research generated a checklist, also create a smart list
    if (report.checklist.length > 0) {
      try {
        await adminClient.from('smart_lists').insert({
          account_id: account.id,
          name: topic,
          type: 'prep',
          items: report.checklist.map((item: string, i: number) => ({
            text: item,
            checked: false,
            added_at: new Date().toISOString(),
            source: 'research_agent',
            order: i,
          })),
          context: { topic, location, deadline, task_id: task?.id },
          auto_generated: true,
        })
      } catch {
        // smart_lists table may not exist yet
      }
    }

    // Log activity
    await adminClient.from('mc_activities').insert({
      account_id: account.id,
      type: 'agent_research',
      message: encrypt(`Research agent completed: ${topic} (${report.checklist.length} steps)`),
      metadata: {
        topic,
        task_id: task?.id,
        steps: report.checklist.length,
      },
    })

    return NextResponse.json({
      success: true,
      task_id: task?.id,
      report,
    })
  } catch (error) {
    console.error('[ResearchAgent] Error:', error)
    return NextResponse.json({ error: 'Research failed' }, { status: 500 })
  }
}

interface ResearchReport {
  summary: string
  checklist: string[]
  tips: string[]
  estimated_time: string
  estimated_cost: string | null
  deadlines: Array<{ step: string; deadline: string }>
  resources: Array<{ name: string; url?: string; description: string }>
}

async function generateResearch(
  topic: string,
  options: { context?: string; location?: string; deadline?: string }
): Promise<ResearchReport> {
  const anthropic = new Anthropic()

  const locationContext = options.location ? `The user is located in ${options.location}.` : ''
  const deadlineContext = options.deadline ? `They need to complete this by ${options.deadline}.` : ''
  const extraContext = options.context ? `Additional context: ${options.context}` : ''

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    system: `You are Tiker's Life Admin Research Agent. You help people figure out and complete life admin tasks they keep putting off. Be practical, specific, and actionable. Include real timelines and cost estimates when possible. ${locationContext} ${deadlineContext}

Output a JSON object with:
- summary: A 2-3 sentence overview of what this task involves
- checklist: An ordered array of specific, actionable steps (10-20 items). Each step should be concrete ("Call DMV at 555-1234" not "Contact relevant authority")
- tips: 3-5 practical tips or common mistakes to avoid
- estimated_time: How long the whole process typically takes (e.g., "2-3 hours over 1 week")
- estimated_cost: Approximate cost if applicable, null otherwise
- deadlines: Array of { step, deadline } for time-sensitive steps
- resources: Array of { name, url (optional), description } for helpful links/offices/contacts`,
    messages: [
      {
        role: 'user',
        content: `Research this life admin task and give me a complete action plan:\n\nTopic: ${topic}\n${extraContext}\n\nReturn ONLY valid JSON.`,
      },
    ],
  })

  const aiText = response.content
    .filter(block => block.type === 'text')
    .map(block => (block as any).text)
    .join('')

  try {
    const cleaned = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return {
      summary: parsed.summary || topic,
      checklist: Array.isArray(parsed.checklist) ? parsed.checklist : [],
      tips: Array.isArray(parsed.tips) ? parsed.tips : [],
      estimated_time: parsed.estimated_time || 'Unknown',
      estimated_cost: parsed.estimated_cost || null,
      deadlines: Array.isArray(parsed.deadlines) ? parsed.deadlines : [],
      resources: Array.isArray(parsed.resources) ? parsed.resources : [],
    }
  } catch {
    return {
      summary: aiText.slice(0, 500),
      checklist: [],
      tips: [],
      estimated_time: 'Unknown',
      estimated_cost: null,
      deadlines: [],
      resources: [],
    }
  }
}
