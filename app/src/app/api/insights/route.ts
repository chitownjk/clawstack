import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getComposio } from '@/lib/composio'

// GET /api/insights
// Gathers passive insights from all connected integrations.
// Each integration contributes its own intelligence without the user having to ask.
// Returns a unified list of insights sorted by relevance/priority.
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

    const userId = `tiker_${session.user.id}`
    const insights: Insight[] = []

    // Gather insights from all sources in parallel
    const [
      calendarInsights,
      taskInsights,
      emailInsights,
      reminderInsights,
    ] = await Promise.all([
      getCalendarInsights(userId, adminClient, account.id),
      getTaskInsights(adminClient, account.id),
      getEmailInsights(adminClient, account.id),
      getReminderInsights(adminClient, account.id),
    ])

    insights.push(...calendarInsights, ...taskInsights, ...emailInsights, ...reminderInsights)

    // Sort by priority (high first), then by timestamp
    insights.sort((a, b) => {
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
      const pDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2)
      if (pDiff !== 0) return pDiff
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })

    return NextResponse.json({
      insights: insights.slice(0, 15),
      total: insights.length,
      sources: {
        calendar: calendarInsights.length,
        tasks: taskInsights.length,
        email: emailInsights.length,
        reminders: reminderInsights.length,
      },
    })
  } catch (error) {
    console.error('[Insights] Error:', error)
    return NextResponse.json({ error: 'Failed to gather insights' }, { status: 500 })
  }
}

interface Insight {
  id: string
  source: string
  type: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  action?: string
  action_url?: string
  timestamp: string
}

// Calendar insights: busy day warnings, meeting-free blocks, upcoming travel
async function getCalendarInsights(userId: string, adminClient: any, accountId: string): Promise<Insight[]> {
  const insights: Insight[] = []

  try {
    const composio = getComposio()
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const connectedAccounts = await composio.connectedAccounts.list({
      userIds: [userId],
      toolkitSlugs: ['GOOGLECALENDAR'],
      statuses: ['ACTIVE'],
    })

    if (!connectedAccounts.items?.[0]) return insights

    const SLUGS = ['GOOGLECALENDAR_EVENTS_LIST', 'GOOGLECALENDAR_LIST_EVENTS']

    let events: any[] = []
    for (const slug of SLUGS) {
      try {
        const result = await composio.tools.execute(slug, {
          userId,
          dangerouslySkipVersionCheck: true,
          arguments: {
            timeMin: now.toISOString(),
            timeMax: tomorrow.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 30,
          },
        })
        events = findArray(result)
        if (events.length > 0) break
      } catch { continue }
    }

    // Busy day warning (5+ meetings)
    const meetingCount = events.filter(e => e.start?.dateTime).length
    if (meetingCount >= 5) {
      insights.push({
        id: `cal_busy_${now.toISOString().split('T')[0]}`,
        source: 'calendar',
        type: 'busy_day',
        title: `Heavy meeting day: ${meetingCount} meetings`,
        description: `You have ${meetingCount} meetings today. Consider declining or rescheduling non-critical ones.`,
        priority: 'medium',
        action: 'review_calendar',
        timestamp: now.toISOString(),
      })
    }

    // No meetings today
    if (meetingCount === 0 && events.length === 0) {
      insights.push({
        id: `cal_free_${now.toISOString().split('T')[0]}`,
        source: 'calendar',
        type: 'free_day',
        title: 'Meeting-free day',
        description: 'No meetings scheduled. Great time for deep work or tackling overdue tasks.',
        priority: 'low',
        timestamp: now.toISOString(),
      })
    }

    // Back-to-back detection
    const timedEvents = events
      .filter((e: any) => e.start?.dateTime)
      .sort((a: any, b: any) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime())

    let backToBackCount = 0
    for (let i = 1; i < timedEvents.length; i++) {
      const prevEnd = new Date(timedEvents[i - 1].end?.dateTime || '').getTime()
      const currStart = new Date(timedEvents[i].start?.dateTime || '').getTime()
      if (currStart - prevEnd < 5 * 60 * 1000) { // less than 5 min gap
        backToBackCount++
      }
    }

    if (backToBackCount >= 2) {
      insights.push({
        id: `cal_b2b_${now.toISOString().split('T')[0]}`,
        source: 'calendar',
        type: 'back_to_back',
        title: `${backToBackCount + 1} back-to-back meetings`,
        description: 'Multiple meetings with no break between them. Try to add buffer time.',
        priority: 'medium',
        timestamp: now.toISOString(),
      })
    }
  } catch {
    // Calendar not connected or error
  }

  return insights
}

// Task insights: overdue tasks, completion velocity, stale items
async function getTaskInsights(adminClient: any, accountId: string): Promise<Insight[]> {
  const insights: Insight[] = []

  const { data: tasks } = await adminClient
    .from('mc_tasks')
    .select('id, title, status, priority, due_date, created_at, completed_at')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (!tasks) return insights

  const now = new Date()
  const active = tasks.filter((t: any) => t.status !== 'done')
  const overdue = active.filter((t: any) => t.due_date && new Date(t.due_date) < now)

  if (overdue.length > 0) {
    insights.push({
      id: `tasks_overdue_${overdue.length}`,
      source: 'tasks',
      type: 'overdue',
      title: `${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}`,
      description: `You have ${overdue.length} task${overdue.length > 1 ? 's' : ''} past their due date. Consider reprioritizing or rescheduling.`,
      priority: overdue.length >= 3 ? 'high' : 'medium',
      action: 'view_tasks',
      timestamp: now.toISOString(),
    })
  }

  // Stale tasks (in todo for > 14 days)
  const stale = active.filter((t: any) => {
    const created = new Date(t.created_at)
    return (now.getTime() - created.getTime()) > 14 * 24 * 60 * 60 * 1000 && t.status === 'todo'
  })

  if (stale.length >= 3) {
    insights.push({
      id: `tasks_stale_${stale.length}`,
      source: 'tasks',
      type: 'stale',
      title: `${stale.length} tasks sitting for 2+ weeks`,
      description: 'These tasks may need to be broken down, delegated, or removed.',
      priority: 'low',
      timestamp: now.toISOString(),
    })
  }

  // Completion velocity
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const completedThisWeek = tasks.filter((t: any) =>
    t.completed_at && new Date(t.completed_at) >= weekAgo
  ).length

  if (completedThisWeek >= 10) {
    insights.push({
      id: `tasks_velocity_${completedThisWeek}`,
      source: 'tasks',
      type: 'velocity',
      title: `Great week: ${completedThisWeek} tasks completed`,
      description: 'You are on a productive streak. Keep it up!',
      priority: 'low',
      timestamp: now.toISOString(),
    })
  }

  return insights
}

// Email insights: unprocessed items, pending invites
async function getEmailInsights(adminClient: any, accountId: string): Promise<Insight[]> {
  const insights: Insight[] = []

  try {
    const { data: items } = await adminClient
      .from('extracted_items')
      .select('type, title, data, created_at')
      .eq('account_id', accountId)
      .eq('dismissed', false)
      .eq('processed', false)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!items || items.length === 0) return insights

    const actionItems = items.filter((i: any) => i.type === 'action_item')
    const bills = items.filter((i: any) => i.type === 'bill')
    const invites = items.filter((i: any) => i.type === 'invite')

    if (actionItems.length > 0) {
      insights.push({
        id: `email_actions_${actionItems.length}`,
        source: 'email',
        type: 'pending_actions',
        title: `${actionItems.length} email action item${actionItems.length > 1 ? 's' : ''} pending`,
        description: 'These were extracted from your inbox and need attention.',
        priority: 'medium',
        action: 'view_briefing',
        timestamp: new Date().toISOString(),
      })
    }

    if (bills.length > 0) {
      const totalAmount = bills.reduce((sum: number, b: any) => {
        const amt = parseFloat(String(b.data?.amount || '0').replace(/[^0-9.]/g, ''))
        return isNaN(amt) ? sum : sum + amt
      }, 0)

      insights.push({
        id: `email_bills_${bills.length}`,
        source: 'email',
        type: 'bills_due',
        title: `${bills.length} bill${bills.length > 1 ? 's' : ''} detected${totalAmount > 0 ? ` ($${totalAmount.toFixed(2)})` : ''}`,
        description: 'Bills found in your inbox. Review and acknowledge them.',
        priority: 'medium',
        timestamp: new Date().toISOString(),
      })
    }

    if (invites.length > 0) {
      insights.push({
        id: `email_invites_${invites.length}`,
        source: 'email',
        type: 'pending_invites',
        title: `${invites.length} pending invitation${invites.length > 1 ? 's' : ''}`,
        description: 'You have calendar invites waiting for your RSVP.',
        priority: 'medium',
        timestamp: new Date().toISOString(),
      })
    }
  } catch {
    // Table may not exist
  }

  return insights
}

// Reminder insights: escalated reminders
async function getReminderInsights(adminClient: any, accountId: string): Promise<Insight[]> {
  const insights: Insight[] = []

  try {
    const { data: reminders } = await adminClient
      .from('reminders')
      .select('title, escalation_level, next_remind_at')
      .eq('account_id', accountId)
      .eq('status', 'active')
      .limit(20)

    if (!reminders || reminders.length === 0) return insights

    const escalated = reminders.filter((r: any) => r.escalation_level >= 2)

    if (escalated.length > 0) {
      insights.push({
        id: `reminders_escalated_${escalated.length}`,
        source: 'reminders',
        type: 'escalated',
        title: `${escalated.length} reminder${escalated.length > 1 ? 's' : ''} at critical level`,
        description: `These reminders have been escalated to the highest level: ${escalated.map((r: any) => r.title).join(', ')}`,
        priority: 'high',
        timestamp: new Date().toISOString(),
      })
    }
  } catch {
    // Table may not exist
  }

  return insights
}

function findArray(obj: any, depth = 0): any[] {
  if (!obj || depth > 5) return []
  if (Array.isArray(obj)) return obj
  for (const key of ['items', 'events', 'data', 'response_data', 'result', 'body', 'output']) {
    if (!obj[key]) continue
    if (Array.isArray(obj[key])) return obj[key]
    if (typeof obj[key] === 'object') {
      const found = findArray(obj[key], depth + 1)
      if (found.length > 0) return found
    }
  }
  return []
}
