import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { decrypt } from '@/lib/crypto'

// GET /api/suggestions
// Generates proactive suggestions based on user's data patterns.
// Analyzes calendar, tasks, extracted items, and activities to surface
// actionable recommendations.
export async function GET() {
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

    // Gather data in parallel
    const [tasks, activities, extractedItems, reminders] = await Promise.all([
      fetchTasks(adminClient, account.id),
      fetchRecentActivities(adminClient, account.id),
      fetchExtractedItems(adminClient, account.id),
      fetchReminders(adminClient, account.id),
    ])

    // Build analysis context
    const context = buildAnalysisContext(tasks, activities, extractedItems, reminders)

    // Generate suggestions via AI
    const suggestions = await generateSuggestions(context)

    return NextResponse.json({
      suggestions,
      data_summary: {
        tasks_analyzed: tasks.length,
        activities_analyzed: activities.length,
        extracted_items: extractedItems.length,
        active_reminders: reminders.length,
      },
      generated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Suggestions] Error:', error)
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
  }
}

async function fetchTasks(adminClient: any, accountId: string) {
  const { data } = await adminClient
    .from('mc_tasks')
    .select('id, title, status, priority, due_date, created_at, completed_at')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(50)

  return (data || []).map((t: any) => ({
    ...t,
    title: t.title ? decrypt(t.title) : '',
  }))
}

async function fetchRecentActivities(adminClient: any, accountId: string) {
  const { data } = await adminClient
    .from('mc_activities')
    .select('id, type, message, created_at')
    .eq('account_id', accountId)
    .neq('type', 'heartbeat')
    .order('created_at', { ascending: false })
    .limit(30)

  return (data || []).map((a: any) => ({
    ...a,
    message: a.message ? decrypt(a.message) : '',
  }))
}

async function fetchExtractedItems(adminClient: any, accountId: string) {
  try {
    const { data } = await adminClient
      .from('extracted_items')
      .select('type, title, data, created_at, processed, dismissed')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(30)
    return data || []
  } catch {
    return []
  }
}

async function fetchReminders(adminClient: any, accountId: string) {
  try {
    const { data } = await adminClient
      .from('reminders')
      .select('title, status, escalation_level, next_remind_at')
      .eq('account_id', accountId)
      .eq('status', 'active')
      .limit(20)
    return data || []
  } catch {
    return []
  }
}

function buildAnalysisContext(
  tasks: any[],
  activities: any[],
  extractedItems: any[],
  reminders: any[]
): string {
  const parts: string[] = []

  // Task patterns
  const activeTasks = tasks.filter(t => t.status !== 'done')
  const overdue = activeTasks.filter(t => t.due_date && new Date(t.due_date) < new Date())
  const highPriority = activeTasks.filter(t => t.priority === 'high')
  const stale = activeTasks.filter(t => {
    const created = new Date(t.created_at)
    const daysSinceCreation = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)
    return daysSinceCreation > 7 && t.status === 'todo'
  })

  parts.push(`TASKS: ${activeTasks.length} active, ${overdue.length} overdue, ${highPriority.length} high priority, ${stale.length} stale (>7 days in todo)`)
  if (overdue.length > 0) {
    parts.push(`Overdue: ${overdue.map(t => t.title).join(', ')}`)
  }
  if (stale.length > 0) {
    parts.push(`Stale tasks: ${stale.map(t => t.title).join(', ')}`)
  }

  // Completion rate
  const completedThisWeek = tasks.filter(t => {
    if (!t.completed_at) return false
    const completed = new Date(t.completed_at)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return completed >= weekAgo
  })
  parts.push(`Completed this week: ${completedThisWeek.length}`)

  // Extracted items
  const unprocessed = extractedItems.filter(e => !e.processed && !e.dismissed)
  const bills = extractedItems.filter(e => e.type === 'bill')
  const actionItems = extractedItems.filter(e => e.type === 'action_item' && !e.processed)

  if (unprocessed.length > 0) {
    parts.push(`\nUNPROCESSED ITEMS: ${unprocessed.length}`)
    parts.push(`Types: ${unprocessed.map(e => e.type).join(', ')}`)
  }
  if (bills.length > 0) {
    parts.push(`Bills detected: ${bills.map(b => `${b.title} (${b.data?.amount || 'unknown amount'})`).join(', ')}`)
  }
  if (actionItems.length > 0) {
    parts.push(`Email action items pending: ${actionItems.map(a => a.title).join(', ')}`)
  }

  // Reminders
  if (reminders.length > 0) {
    const escalated = reminders.filter(r => r.escalation_level >= 2)
    parts.push(`\nREMINDERS: ${reminders.length} active, ${escalated.length} at high escalation`)
  }

  // Recent activity summary
  const activityTypes = activities.reduce((acc: Record<string, number>, a: any) => {
    acc[a.type] = (acc[a.type] || 0) + 1
    return acc
  }, {})
  parts.push(`\nRECENT ACTIVITY: ${JSON.stringify(activityTypes)}`)

  return parts.join('\n')
}

async function generateSuggestions(context: string): Promise<Array<{
  text: string
  category: string
  priority: string
  action?: string
}>> {
  try {
    const anthropic = new Anthropic()

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1000,
      system: `You are Tiker, a proactive life operator. Analyze the user's data and generate 3-5 actionable suggestions. Each suggestion should be specific and useful, not generic.

Categories: productivity, health, finance, organization, follow_up
Priorities: high, medium, low

Return a JSON array of objects: { "text": "...", "category": "...", "priority": "...", "action": "..." }
The "action" field is optional and describes what Tiker can do about it (e.g., "create_task", "create_reminder", "create_list", "scan_email").`,
      messages: [
        {
          role: 'user',
          content: `Analyze this data and generate proactive suggestions:\n\n${context}\n\nReturn ONLY a JSON array.`,
        },
      ],
    })

    const aiText = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('')

    const cleaned = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)

    if (Array.isArray(parsed)) {
      return parsed
    }

    return []
  } catch (error) {
    console.error('[Suggestions] AI error:', error)
    return []
  }
}
