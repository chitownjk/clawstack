import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getComposio } from '@/lib/composio'
import { decrypt } from '@/lib/crypto'
import Anthropic from '@anthropic-ai/sdk'

// POST /api/briefing/generate
// Generates a daily briefing for the authenticated user.
// Pulls: calendar events, tasks, agent activity, extracted items.
// Synthesizes with Claude Haiku into structured sections.
export async function POST(request: Request) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get account
    const { data: account } = await adminClient
      .from('accounts')
      .select('id, plan_tier')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD

    // Check if we already have today's briefing
    const { data: existing } = await adminClient
      .from('briefings')
      .select('id, content, sections, metadata, created_at')
      .eq('account_id', account.id)
      .eq('date', todayStr)
      .single()

    // If briefing exists and is less than 1 hour old, return cached
    const body = await request.json().catch(() => ({}))
    const forceRefresh = body.force === true

    if (existing && !forceRefresh) {
      const age = Date.now() - new Date(existing.created_at).getTime()
      if (age < 60 * 60 * 1000) {
        return NextResponse.json({
          briefing: existing,
          cached: true,
        })
      }
    }

    // Gather all data sources in parallel
    const [calendarData, tasksData, activitiesData, extractedData] = await Promise.all([
      fetchCalendarEvents(session.user.id, todayStr),
      fetchTasks(adminClient, account.id),
      fetchRecentActivity(adminClient, account.id),
      fetchExtractedItems(adminClient, account.id),
    ])

    // Build the prompt for Claude Haiku
    const briefingPrompt = buildBriefingPrompt({
      date: todayStr,
      calendar: calendarData,
      tasks: tasksData,
      activities: activitiesData,
      extracted: extractedData,
    })

    // Call Claude Haiku for synthesis
    const anthropic = new Anthropic()
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: `You are Tiker, a personal life operator AI. Generate a concise, actionable daily briefing. Be warm but efficient. Use short sentences. Highlight conflicts, urgent items, and things that need attention. Output valid JSON matching the schema provided.`,
      messages: [
        { role: 'user', content: briefingPrompt },
      ],
    })

    // Parse the AI response
    const aiText = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('')

    let sections: Record<string, any> = {}
    try {
      sections = JSON.parse(aiText)
    } catch {
      // If JSON parsing fails, wrap the raw text
      console.error('[Briefing] Failed to parse AI response as JSON, using raw text')
      sections = {
        summary: aiText,
        schedule: [],
        tasks: [],
        email_intel: [],
        suggestions: [],
      }
    }

    // Build the full briefing content
    const content = {
      greeting: getGreeting(),
      date: todayStr,
      generated_at: new Date().toISOString(),
      raw_data: {
        calendar_count: calendarData.length,
        active_tasks: tasksData.active.length,
        review_tasks: tasksData.review.length,
        extracted_items: extractedData.length,
        recent_activities: activitiesData.length,
      },
    }

    // Upsert the briefing (one per user per day)
    const { data: briefing, error: upsertError } = await adminClient
      .from('briefings')
      .upsert(
        {
          account_id: account.id,
          date: todayStr,
          content,
          sections,
          metadata: {
            model: 'claude-haiku-4-5-20251001',
            tokens_used: response.usage?.input_tokens + response.usage?.output_tokens,
            data_sources: ['calendar', 'tasks', 'activities', 'extracted_items'],
          },
        },
        { onConflict: 'account_id,date' }
      )
      .select()
      .single()

    if (upsertError) {
      console.error('[Briefing] Upsert error:', upsertError)
      // Still return the generated data even if storage fails
      return NextResponse.json({
        briefing: { content, sections, date: todayStr },
        cached: false,
        storage_error: true,
      })
    }

    return NextResponse.json({
      briefing,
      cached: false,
    })
  } catch (error) {
    console.error('[Briefing] Generation error:', error)
    return NextResponse.json({ error: 'Failed to generate briefing' }, { status: 500 })
  }
}

// ---- Data Fetchers ----

async function fetchCalendarEvents(authUid: string, dateStr: string): Promise<any[]> {
  try {
    const composio = getComposio()
    const userId = `tiker_${authUid}`

    // Check connection
    const connectedAccounts = await composio.connectedAccounts.list({
      userIds: [userId],
      toolkitSlugs: ['GOOGLECALENDAR'],
      statuses: ['ACTIVE'],
    })

    if (!connectedAccounts.items?.[0]) {
      console.log('[Briefing] Calendar not connected')
      return []
    }

    const timeMin = new Date(dateStr).toISOString()
    const timeMax = new Date(dateStr + 'T23:59:59').toISOString()

    const TOOL_SLUGS = [
      'GOOGLECALENDAR_EVENTS_LIST',
      'GOOGLECALENDAR_LIST_EVENTS',
      'GOOGLECALENDAR_FIND_EVENTS',
    ]

    let result: any = null
    for (const slug of TOOL_SLUGS) {
      try {
        result = await composio.tools.execute(slug, {
          userId,
          dangerouslySkipVersionCheck: true,
          arguments: {
            timeMin,
            timeMax,
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 50,
          },
        })
        break
      } catch (slugError: any) {
        if (slugError?.message?.includes('Unable to retrieve tool')) continue
        throw slugError
      }
    }

    if (!result) return []

    // Walk response tree to find events (same pattern as calendar route)
    const findEvents = (obj: any, depth = 0): any[] => {
      if (!obj || depth > 5) return []
      if (Array.isArray(obj)) return obj
      if (Array.isArray(obj.items)) return obj.items
      if (Array.isArray(obj.events)) return obj.events
      for (const key of ['data', 'response_data', 'result', 'body', 'output']) {
        if (obj[key] && typeof obj[key] === 'object') {
          const found = findEvents(obj[key], depth + 1)
          if (found.length > 0) return found
        }
      }
      return []
    }

    return findEvents(result)
      .filter((e: any) => e && (e.summary || e.title || e.subject))
      .map((e: any) => ({
        id: e.id || e.eventId || crypto.randomUUID(),
        title: e.summary || e.title || e.subject || 'Untitled',
        start: e.start?.dateTime || e.start?.date || e.startTime || e.start,
        end: e.end?.dateTime || e.end?.date || e.endTime || e.end,
        allDay: !e.start?.dateTime && !e.startTime,
        location: e.location,
        description: e.description,
        attendees: e.attendees?.map((a: any) => ({
          email: a.email,
          name: a.displayName,
          responseStatus: a.responseStatus,
        })) || [],
        htmlLink: e.htmlLink,
        conferenceLink: e.hangoutLink || e.conferenceData?.entryPoints?.[0]?.uri,
      }))
  } catch (error) {
    console.error('[Briefing] Calendar fetch error:', error)
    return []
  }
}

async function fetchTasks(
  adminClient: any,
  accountId: string
): Promise<{ active: any[]; review: any[]; blocked: any[]; dueToday: any[]; completedToday: any[] }> {
  try {
    const todayStr = new Date().toISOString().split('T')[0]

    const { data: tasks } = await adminClient
      .from('mc_tasks')
      .select('id, title, status, priority, due_date, assigned_agent_ids, created_at, completed_at, tags')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(200)

    const allTasks = (tasks || []).map((t: any) => ({
      ...t,
      title: t.title ? decrypt(t.title) : t.title,
    }))

    const active = allTasks.filter((t: any) => t.status !== 'done')
    const review = active.filter((t: any) => t.status === 'review')
    const blocked = active.filter((t: any) => t.status === 'blocked')
    const dueToday = active.filter((t: any) => t.due_date?.startsWith(todayStr))
    const completedToday = allTasks.filter(
      (t: any) => t.status === 'done' && t.completed_at?.startsWith(todayStr)
    )

    return { active, review, blocked, dueToday, completedToday }
  } catch (error) {
    console.error('[Briefing] Tasks fetch error:', error)
    return { active: [], review: [], blocked: [], dueToday: [], completedToday: [] }
  }
}

async function fetchRecentActivity(adminClient: any, accountId: string): Promise<any[]> {
  try {
    const { data: activities } = await adminClient
      .from('mc_activities')
      .select('id, type, message, agent_id, task_id, created_at')
      .eq('account_id', accountId)
      .neq('type', 'heartbeat')
      .order('created_at', { ascending: false })
      .limit(20)

    return (activities || []).map((a: any) => ({
      ...a,
      message: a.message ? decrypt(a.message) : a.message,
    }))
  } catch (error) {
    console.error('[Briefing] Activities fetch error:', error)
    return []
  }
}

async function fetchExtractedItems(adminClient: any, accountId: string): Promise<any[]> {
  try {
    const { data: items } = await adminClient
      .from('extracted_items')
      .select('*')
      .eq('account_id', accountId)
      .eq('dismissed', false)
      .eq('processed', false)
      .order('created_at', { ascending: false })
      .limit(50)

    return items || []
  } catch (error) {
    // Table might not exist yet if migration hasn't been run
    console.log('[Briefing] Extracted items fetch skipped (table may not exist yet)')
    return []
  }
}

// ---- Prompt Builder ----

function buildBriefingPrompt(data: {
  date: string;
  calendar: any[];
  tasks: { active: any[]; review: any[]; blocked: any[]; dueToday: any[]; completedToday: any[] };
  activities: any[];
  extracted: any[];
}): string {
  const { date, calendar, tasks, activities, extracted } = data

  const calendarSection = calendar.length > 0
    ? `CALENDAR EVENTS (${calendar.length}):\n${calendar.map(e => {
        const time = e.allDay ? 'All day' : new Date(e.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        const attendeeCount = e.attendees?.length || 0
        return `- ${time}: ${e.title}${e.location ? ` @ ${e.location}` : ''}${attendeeCount > 0 ? ` (${attendeeCount} attendees)` : ''}`
      }).join('\n')}`
    : 'CALENDAR: No events today.'

  const taskSection = `TASKS:
- Active: ${tasks.active.length}
- Needs review: ${tasks.review.length} ${tasks.review.length > 0 ? `[${tasks.review.map((t: any) => t.title).join(', ')}]` : ''}
- Blocked: ${tasks.blocked.length} ${tasks.blocked.length > 0 ? `[${tasks.blocked.map((t: any) => t.title).join(', ')}]` : ''}
- Due today: ${tasks.dueToday.length} ${tasks.dueToday.length > 0 ? `[${tasks.dueToday.map((t: any) => t.title).join(', ')}]` : ''}
- Completed today: ${tasks.completedToday.length}`

  const activitySection = activities.length > 0
    ? `RECENT AI ACTIVITY (last ${activities.length}):\n${activities.slice(0, 10).map(a =>
        `- [${a.type}] ${a.message}`
      ).join('\n')}`
    : 'AI ACTIVITY: No recent agent activity.'

  const extractedSection = extracted.length > 0
    ? `EXTRACTED ITEMS (${extracted.length} unprocessed):\n${extracted.map(e =>
        `- [${e.type}] ${e.title}${e.data?.date ? ` (${e.data.date})` : ''}${e.data?.amount ? ` - $${e.data.amount}` : ''}`
      ).join('\n')}`
    : ''

  // Check for calendar conflicts
  const conflicts = findConflicts(calendar)
  const conflictSection = conflicts.length > 0
    ? `SCHEDULING CONFLICTS:\n${conflicts.map(c =>
        `- "${c.event1}" overlaps with "${c.event2}" (${c.overlapMinutes} min overlap)`
      ).join('\n')}`
    : ''

  return `Generate a daily briefing for ${date}.

${calendarSection}

${taskSection}

${activitySection}

${extractedSection}

${conflictSection}

Output JSON with this exact schema:
{
  "summary": "1-2 sentence overview of the day",
  "schedule": [
    { "time": "9:00 AM", "title": "Event name", "type": "meeting|focus|personal", "note": "optional context" }
  ],
  "attention_items": [
    { "type": "conflict|review|blocked|due|extracted", "title": "Short description", "action": "What to do" }
  ],
  "tasks_summary": {
    "active": number,
    "review": number,
    "blocked": number,
    "due_today": number,
    "completed_today": number
  },
  "suggestions": [
    "Short actionable suggestion based on the data"
  ]
}`
}

// ---- Helpers ----

function findConflicts(events: any[]): Array<{ event1: string; event2: string; overlapMinutes: number }> {
  const conflicts: Array<{ event1: string; event2: string; overlapMinutes: number }> = []
  const timedEvents = events
    .filter(e => !e.allDay && e.start && e.end)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

  for (let i = 0; i < timedEvents.length; i++) {
    for (let j = i + 1; j < timedEvents.length; j++) {
      const aEnd = new Date(timedEvents[i].end).getTime()
      const bStart = new Date(timedEvents[j].start).getTime()

      if (aEnd > bStart) {
        const overlapMs = aEnd - bStart
        conflicts.push({
          event1: timedEvents[i].title,
          event2: timedEvents[j].title,
          overlapMinutes: Math.round(overlapMs / 60000),
        })
      }
    }
  }

  return conflicts
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
