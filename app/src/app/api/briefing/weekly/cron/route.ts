import { createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getComposio } from '@/lib/composio'
import Anthropic from '@anthropic-ai/sdk'
import { sendWeeklyEmail } from '@/lib/weekly-email'

// GET /api/briefing/weekly/cron
// Vercel Cron: sends a weekly look-ahead email every Sunday evening.
// Covers the full upcoming week so users can plan ahead.
//
// vercel.json: { "path": "/api/briefing/weekly/cron", "schedule": "0 20 * * 0" }
// (20 UTC Sunday = 4 PM ET during EDT)
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      return NextResponse.json({ error: 'Cron not configured' }, { status: 503 })
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: accounts, error: accountsError } = await adminClient
      .from('accounts')
      .select('id, auth_uid')

    if (accountsError || !accounts) {
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
    }

    const { data: preferences } = await adminClient
      .from('mc_user_preferences')
      .select('account_id, briefing_email, timezone')

    const prefMap = new Map((preferences || []).map(p => [p.account_id, p]))
    const anthropic = new Anthropic()
    const results: Array<{ account_id: string; status: string; error?: string }> = []

    for (const account of accounts) {
      try {
        const prefs = prefMap.get(account.id)
        // Default email to ON
        if (prefs?.briefing_email === false) {
          results.push({ account_id: account.id, status: 'email_disabled' })
          continue
        }

        const userTimezone = prefs?.timezone || 'America/New_York'

        // Get the upcoming week (Mon-Sun)
        const now = new Date()
        const monday = new Date(now)
        monday.setDate(now.getDate() + 1) // Tomorrow is Monday
        monday.setHours(0, 0, 0, 0)
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)
        sunday.setHours(23, 59, 59, 999)

        const mondayStr = monday.toISOString().split('T')[0]
        const sundayStr = sunday.toISOString().split('T')[0]

        // Fetch calendar events for the whole week
        const calendarEvents = await fetchCalendarForWeek(account.auth_uid, mondayStr, sundayStr)

        // Fetch tasks
        const { data: tasks } = await adminClient
          .from('mc_tasks')
          .select('id, title, status, priority, due_date')
          .eq('account_id', account.id)
          .neq('status', 'done')
          .order('due_date', { ascending: true })
          .limit(50)

        // Fetch unprocessed extracted items
        let extractedItems: any[] = []
        try {
          const { data } = await adminClient
            .from('extracted_items')
            .select('type, title, data, expires_at')
            .eq('account_id', account.id)
            .eq('dismissed', false)
            .eq('processed', false)
            .limit(20)
          extractedItems = data || []
        } catch { /* table may not exist */ }

        // Fetch upcoming bills
        const upcomingBills = extractedItems.filter(i => i.type === 'bill')
        const upcomingTravel = extractedItems.filter(i => ['flight', 'hotel'].includes(i.type))

        // Group calendar events by day
        const eventsByDay: Record<string, any[]> = {}
        for (const event of calendarEvents) {
          const date = (event.start || '').split('T')[0] || mondayStr
          if (!eventsByDay[date]) eventsByDay[date] = []
          eventsByDay[date].push(event)
        }

        const calSummary = Object.entries(eventsByDay)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, events]) => {
            const dayName = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', timeZone: userTimezone })
            const eventList = events.map((e: any) => {
              const time = e.allDay ? 'All day' : new Date(e.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: userTimezone })
              return `  - ${time}: ${e.title}${e.location ? ` @ ${e.location}` : ''}`
            }).join('\n')
            return `${dayName} (${date}):\n${eventList}`
          })
          .join('\n\n')

        const taskSummary = (tasks || []).length > 0
          ? `TASKS: ${(tasks || []).length} active. Due this week: ${(tasks || []).filter((t: any) => t.due_date && t.due_date >= mondayStr && t.due_date <= sundayStr).length}`
          : 'TASKS: None active.'

        const travelSummary = upcomingTravel.length > 0
          ? `TRAVEL: ${upcomingTravel.map(t => t.title).join(', ')}`
          : ''

        const billsSummary = upcomingBills.length > 0
          ? `BILLS: ${upcomingBills.map(b => `${b.title}${b.data?.amount ? ` ($${b.data.amount})` : ''}${b.data?.due_date ? ` due ${b.data.due_date}` : ''}`).join(', ')}`
          : ''

        const prompt = `Generate a weekly look-ahead for the week of ${mondayStr} to ${sundayStr}.

CALENDAR:
${calSummary || 'No events scheduled.'}

${taskSummary}
${travelSummary}
${billsSummary}

Output JSON:
{
  "headline": "One punchy sentence about the week ahead",
  "days": [{ "day": "Monday", "date": "YYYY-MM-DD", "highlights": ["key thing 1", "key thing 2"] }],
  "travel": "Travel summary if applicable, null otherwise",
  "bills_due": ["Bill 1 description", "Bill 2 description"],
  "prep_suggestions": ["Things to do tonight/tomorrow morning to prep for the week"],
  "heads_up": "Anything notable: busy days, back-to-back meetings, light days to batch errands"
}`

        const response = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2000,
          system: `You are Tiker, a weekly planner for busy people with families. Your Sunday evening digest helps them walk into Monday feeling prepared.

Rules:
- Lead with travel if there's a trip this week
- Flag the busiest day and the lightest day
- Bills due this week are always mentioned
- Prep suggestions should be concrete: "Pack lunches tonight", "Confirm dentist appointment", "Review Wednesday's presentation"
- Keep it scannable. Parents read this on their phone while kids are in the bath.
- Be warm, not corporate. This is a personal assistant, not a project manager.`,
          messages: [{ role: 'user', content: prompt }],
        })

        const aiText = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')
        let sections: any = {}
        try {
          const cleaned = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
          sections = JSON.parse(cleaned)
        } catch {
          sections = { headline: aiText }
        }

        // Get user email
        const { data: authData } = await adminClient.auth.admin.getUserById(account.auth_uid)
        const userEmail = authData?.user?.email
        const userName = authData?.user?.user_metadata?.full_name || authData?.user?.email?.split('@')[0] || 'there'

        if (userEmail && process.env.SMTP_HOST) {
          const sent = await sendWeeklyEmail({
            to: userEmail,
            userName,
            weekStart: mondayStr,
            weekEnd: sundayStr,
            digest: sections,
            extractedItems,
          })

          results.push({
            account_id: account.id,
            status: sent ? 'sent' : 'send_failed',
          })
        } else {
          results.push({ account_id: account.id, status: 'no_email' })
        }
      } catch (err: any) {
        console.error(`[WeeklyCron] Error for ${account.id}:`, err?.message)
        results.push({ account_id: account.id, status: 'error', error: err?.message })
      }
    }

    const sent = results.filter(r => r.status === 'sent').length
    console.log(`[WeeklyCron] Complete: ${sent} sent out of ${accounts.length}`)

    return NextResponse.json({ success: true, total: accounts.length, sent, results })
  } catch (error) {
    console.error('[WeeklyCron] Fatal error:', error)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}

async function fetchCalendarForWeek(authUid: string, startDate: string, endDate: string): Promise<any[]> {
  try {
    const composio = getComposio()
    const userId = `tiker_${authUid}`

    const connectedAccounts = await composio.connectedAccounts.list({
      userIds: [userId],
      toolkitSlugs: ['GOOGLECALENDAR'],
      statuses: ['ACTIVE'],
    })

    if (!connectedAccounts.items?.[0]) return []

    const timeMin = new Date(startDate).toISOString()
    const timeMax = new Date(endDate + 'T23:59:59').toISOString()

    const SLUGS = ['GOOGLECALENDAR_EVENTS_LIST', 'GOOGLECALENDAR_LIST_EVENTS']
    for (const slug of SLUGS) {
      try {
        const result = await composio.tools.execute(slug, {
          userId,
          dangerouslySkipVersionCheck: true,
          arguments: { timeMin, timeMax, singleEvents: true, orderBy: 'startTime', maxResults: 100 },
        })

        const events = findEventsInResult(result)
        if (events.length > 0) {
          return events.map((e: any) => ({
            title: e.summary || e.title || 'Untitled',
            start: e.start?.dateTime || e.start?.date || e.start,
            end: e.end?.dateTime || e.end?.date || e.end,
            allDay: !e.start?.dateTime,
            location: e.location,
          }))
        }
      } catch (err: any) {
        if (err?.message?.includes('Unable to retrieve tool')) continue
        throw err
      }
    }

    return []
  } catch {
    return []
  }
}

function findEventsInResult(obj: any, depth = 0): any[] {
  if (!obj || depth > 5) return []
  if (Array.isArray(obj)) return obj
  if (Array.isArray(obj.items)) return obj.items
  if (Array.isArray(obj.events)) return obj.events
  for (const key of ['data', 'response_data', 'result', 'body', 'output']) {
    if (obj[key] && typeof obj[key] === 'object') {
      const found = findEventsInResult(obj[key], depth + 1)
      if (found.length > 0) return found
    }
  }
  return []
}
