import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getComposio } from '@/lib/composio'
import Anthropic from '@anthropic-ai/sdk'

// GET /api/schedule/optimize
// Analyzes today's calendar and tasks to find optimization opportunities.
// Returns suggestions like: adding focus blocks, rescheduling low-priority meetings,
// identifying back-to-back fatigue, suggesting prep time before important meetings.
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

    // Fetch calendar events and tasks in parallel
    const [events, tasks] = await Promise.all([
      fetchTodayEvents(userId),
      fetchActiveTasks(adminClient, account.id),
    ])

    // Analyze the schedule
    const analysis = analyzeSchedule(events)

    // Generate AI optimization suggestions
    const suggestions = await generateOptimizations(events, tasks, analysis)

    return NextResponse.json({
      analysis,
      suggestions,
      events_count: events.length,
      generated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[ScheduleOptimize] Error:', error)
    return NextResponse.json({ error: 'Failed to optimize schedule' }, { status: 500 })
  }
}

// POST /api/schedule/optimize
// Apply a specific optimization suggestion.
// Body: { suggestion_id, action, event_id?, new_time? }
export async function POST(request: Request) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = `tiker_${session.user.id}`
    const body = await request.json()
    const { action, event_id, new_start, new_end } = body

    if (action === 'reschedule' && event_id && new_start && new_end) {
      const result = await rescheduleEvent(userId, event_id, new_start, new_end)
      return NextResponse.json({ success: true, result })
    }

    if (action === 'create_focus_block' && new_start && new_end) {
      const result = await createFocusBlock(userId, new_start, new_end)
      return NextResponse.json({ success: true, result })
    }

    if (action === 'create_prep_block' && new_start && new_end) {
      const meetingTitle = body.meeting_title || 'Meeting'
      const result = await createPrepBlock(userId, new_start, new_end, meetingTitle)
      return NextResponse.json({ success: true, result })
    }

    return NextResponse.json({ error: 'Invalid action or missing parameters' }, { status: 400 })
  } catch (error) {
    console.error('[ScheduleOptimize] Action error:', error)
    return NextResponse.json({ error: 'Failed to apply optimization' }, { status: 500 })
  }
}

interface CalendarEvent {
  id: string
  summary: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  attendees?: Array<{ email: string; responseStatus?: string }>
  organizer?: { email: string; self?: boolean }
  description?: string
}

interface ScheduleAnalysis {
  total_meetings: number
  total_meeting_hours: number
  focus_blocks: Array<{ start: string; end: string; duration_minutes: number }>
  back_to_back_chains: number
  longest_meeting_streak_hours: number
  meetings_you_organized: number
  meetings_with_many_attendees: number
  free_percentage: number
  busiest_period: string
}

function analyzeSchedule(events: CalendarEvent[]): ScheduleAnalysis {
  const now = new Date()
  const dayStart = new Date(now)
  dayStart.setHours(8, 0, 0, 0) // Work day starts at 8 AM
  const dayEnd = new Date(now)
  dayEnd.setHours(18, 0, 0, 0) // Work day ends at 6 PM
  const workdayMinutes = 10 * 60 // 600 minutes

  const timedEvents = events
    .filter(e => e.start?.dateTime)
    .map(e => ({
      ...e,
      startTime: new Date(e.start.dateTime!),
      endTime: new Date(e.end?.dateTime || e.start.dateTime!),
    }))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

  // Calculate total meeting time
  let totalMeetingMinutes = 0
  for (const e of timedEvents) {
    const duration = (e.endTime.getTime() - e.startTime.getTime()) / (1000 * 60)
    totalMeetingMinutes += duration
  }

  // Find focus blocks (gaps >= 30 min during work hours)
  const focusBlocks: Array<{ start: string; end: string; duration_minutes: number }> = []
  let lastEnd = dayStart

  for (const e of timedEvents) {
    if (e.startTime > lastEnd) {
      const gapStart = lastEnd > dayStart ? lastEnd : dayStart
      const gapEnd = e.startTime < dayEnd ? e.startTime : dayEnd
      const gapMinutes = (gapEnd.getTime() - gapStart.getTime()) / (1000 * 60)
      if (gapMinutes >= 30) {
        focusBlocks.push({
          start: gapStart.toISOString(),
          end: gapEnd.toISOString(),
          duration_minutes: Math.round(gapMinutes),
        })
      }
    }
    if (e.endTime > lastEnd) lastEnd = e.endTime
  }

  // Check for gap after last meeting
  if (lastEnd < dayEnd) {
    const gapMinutes = (dayEnd.getTime() - lastEnd.getTime()) / (1000 * 60)
    if (gapMinutes >= 30) {
      focusBlocks.push({
        start: lastEnd.toISOString(),
        end: dayEnd.toISOString(),
        duration_minutes: Math.round(gapMinutes),
      })
    }
  }

  // Back-to-back chains
  let backToBackChains = 0
  let currentStreak = 0
  let longestStreakMinutes = 0
  let currentStreakMinutes = 0

  for (let i = 1; i < timedEvents.length; i++) {
    const gap = timedEvents[i].startTime.getTime() - timedEvents[i - 1].endTime.getTime()
    if (gap < 10 * 60 * 1000) { // less than 10 min gap
      if (currentStreak === 0) {
        const prevDuration = (timedEvents[i - 1].endTime.getTime() - timedEvents[i - 1].startTime.getTime()) / (1000 * 60)
        currentStreakMinutes = prevDuration
      }
      currentStreak++
      const duration = (timedEvents[i].endTime.getTime() - timedEvents[i].startTime.getTime()) / (1000 * 60)
      currentStreakMinutes += duration
    } else {
      if (currentStreak > 0) backToBackChains++
      if (currentStreakMinutes > longestStreakMinutes) longestStreakMinutes = currentStreakMinutes
      currentStreak = 0
      currentStreakMinutes = 0
    }
  }
  if (currentStreak > 0) {
    backToBackChains++
    if (currentStreakMinutes > longestStreakMinutes) longestStreakMinutes = currentStreakMinutes
  }

  // Meetings you organized vs. meetings with many attendees
  const organized = timedEvents.filter(e => e.organizer?.self).length
  const largeGroup = timedEvents.filter(e => (e.attendees?.length || 0) > 5).length

  // Busiest period
  const hours = new Array(24).fill(0)
  for (const e of timedEvents) {
    const startHour = e.startTime.getHours()
    const endHour = e.endTime.getHours()
    for (let h = startHour; h <= Math.min(endHour, 23); h++) {
      hours[h]++
    }
  }
  let busiestHour = 9
  let maxMeetings = 0
  for (let h = 8; h <= 18; h++) {
    if (hours[h] > maxMeetings) {
      maxMeetings = hours[h]
      busiestHour = h
    }
  }

  const focusTotalMinutes = focusBlocks.reduce((sum, b) => sum + b.duration_minutes, 0)
  const freePercentage = Math.round((focusTotalMinutes / workdayMinutes) * 100)

  return {
    total_meetings: timedEvents.length,
    total_meeting_hours: Math.round(totalMeetingMinutes / 60 * 10) / 10,
    focus_blocks: focusBlocks,
    back_to_back_chains: backToBackChains,
    longest_meeting_streak_hours: Math.round(longestStreakMinutes / 60 * 10) / 10,
    meetings_you_organized: organized,
    meetings_with_many_attendees: largeGroup,
    free_percentage: freePercentage,
    busiest_period: `${busiestHour}:00 - ${busiestHour + 1}:00`,
  }
}

async function generateOptimizations(
  events: CalendarEvent[],
  tasks: any[],
  analysis: ScheduleAnalysis
): Promise<Array<{
  id: string
  type: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  action?: { type: string; params: Record<string, string> }
}>> {
  try {
    const anthropic = new Anthropic()

    const eventsStr = events
      .filter(e => e.start?.dateTime)
      .map(e => {
        const start = new Date(e.start.dateTime!)
        const end = new Date(e.end?.dateTime || e.start.dateTime!)
        const attendees = e.attendees?.length || 0
        return `${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}: ${e.summary} (${attendees} attendees, ${e.organizer?.self ? 'you organized' : 'invited'})`
      })
      .join('\n')

    const highPriorityTasks = tasks
      .filter(t => t.priority === 'high' && t.status !== 'done')
      .map(t => t.title)
      .slice(0, 5)

    const overdueTasks = tasks
      .filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done')
      .map(t => t.title)
      .slice(0, 5)

    const prompt = `Analyze this schedule and suggest optimizations.

TODAY'S CALENDAR:
${eventsStr || 'No meetings scheduled'}

ANALYSIS:
- ${analysis.total_meetings} meetings (${analysis.total_meeting_hours}h total)
- ${analysis.focus_blocks.length} focus blocks available (${analysis.free_percentage}% of workday free)
- ${analysis.back_to_back_chains} back-to-back chains
- Longest meeting streak: ${analysis.longest_meeting_streak_hours}h
- You organized: ${analysis.meetings_you_organized} meetings
- Large group (6+): ${analysis.meetings_with_many_attendees}

HIGH PRIORITY TASKS: ${highPriorityTasks.length > 0 ? highPriorityTasks.join(', ') : 'None'}
OVERDUE TASKS: ${overdueTasks.length > 0 ? overdueTasks.join(', ') : 'None'}

Generate 2-5 specific, actionable schedule optimization suggestions. Consider:
1. Adding focus time blocks for deep work (especially if high-priority tasks exist)
2. Adding prep time before important meetings
3. Suggesting meetings to decline or shorten
4. Breaking up back-to-back chains with buffer time
5. Moving optional meetings to create longer focus blocks
6. Matching overdue/high-priority tasks to available focus blocks

Return a JSON array of objects: { "id": "opt_1", "type": "focus_block|prep_time|reschedule|decline|shorten|buffer", "title": "...", "description": "...", "priority": "high|medium|low" }

Be specific with times. Be practical, not theoretical.`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      system: 'You are Tiker, a proactive schedule optimizer. Generate specific, actionable schedule improvement suggestions. Return ONLY valid JSON arrays.',
      messages: [{ role: 'user', content: prompt }],
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
    console.error('[ScheduleOptimize] AI error:', error)
    return []
  }
}

async function fetchTodayEvents(userId: string): Promise<CalendarEvent[]> {
  try {
    const composio = getComposio()
    const now = new Date()
    const endOfDay = new Date(now)
    endOfDay.setHours(23, 59, 59, 999)

    const connectedAccounts = await composio.connectedAccounts.list({
      userIds: [userId],
      toolkitSlugs: ['GOOGLECALENDAR'],
      statuses: ['ACTIVE'],
    })

    if (!connectedAccounts.items?.[0]) return []

    const SLUGS = ['GOOGLECALENDAR_EVENTS_LIST', 'GOOGLECALENDAR_LIST_EVENTS']

    for (const slug of SLUGS) {
      try {
        const result = await composio.tools.execute(slug, {
          userId,
          dangerouslySkipVersionCheck: true,
          arguments: {
            timeMin: now.toISOString(),
            timeMax: endOfDay.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 50,
          },
        })
        const events = findArray(result)
        if (events.length > 0) return events
      } catch { continue }
    }

    return []
  } catch {
    return []
  }
}

async function fetchActiveTasks(adminClient: any, accountId: string) {
  const { data } = await adminClient
    .from('mc_tasks')
    .select('id, title, status, priority, due_date')
    .eq('account_id', accountId)
    .neq('status', 'done')
    .order('priority', { ascending: true })
    .limit(30)

  return data || []
}

async function rescheduleEvent(userId: string, eventId: string, newStart: string, newEnd: string) {
  const composio = getComposio()
  const SLUGS = ['GOOGLECALENDAR_EVENTS_UPDATE', 'GOOGLECALENDAR_UPDATE_EVENT']

  for (const slug of SLUGS) {
    try {
      return await composio.tools.execute(slug, {
        userId,
        dangerouslySkipVersionCheck: true,
        arguments: {
          eventId,
          start: { dateTime: newStart },
          end: { dateTime: newEnd },
        },
      })
    } catch { continue }
  }

  throw new Error('Could not reschedule event')
}

async function createFocusBlock(userId: string, start: string, end: string) {
  const composio = getComposio()
  const SLUGS = ['GOOGLECALENDAR_EVENTS_CREATE', 'GOOGLECALENDAR_CREATE_EVENT']

  for (const slug of SLUGS) {
    try {
      return await composio.tools.execute(slug, {
        userId,
        dangerouslySkipVersionCheck: true,
        arguments: {
          summary: 'Focus Time (Tiker)',
          description: 'Protected focus time created by Tiker schedule optimizer.',
          start: { dateTime: start },
          end: { dateTime: end },
          colorId: '2', // Sage/green
          transparency: 'opaque',
        },
      })
    } catch { continue }
  }

  throw new Error('Could not create focus block')
}

async function createPrepBlock(userId: string, start: string, end: string, meetingTitle: string) {
  const composio = getComposio()
  const SLUGS = ['GOOGLECALENDAR_EVENTS_CREATE', 'GOOGLECALENDAR_CREATE_EVENT']

  for (const slug of SLUGS) {
    try {
      return await composio.tools.execute(slug, {
        userId,
        dangerouslySkipVersionCheck: true,
        arguments: {
          summary: `Prep: ${meetingTitle}`,
          description: `Preparation time before "${meetingTitle}". Created by Tiker.`,
          start: { dateTime: start },
          end: { dateTime: end },
          colorId: '5', // Banana/yellow
          transparency: 'opaque',
        },
      })
    } catch { continue }
  }

  throw new Error('Could not create prep block')
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
