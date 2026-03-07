import { createRealSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getComposio } from '@/lib/composio'

// GET /api/command/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD
// Fetches Google Calendar events for the given date range
export async function GET(request: Request) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const debug = searchParams.get('debug') === '1'

    if (!start || !end) {
      return NextResponse.json({ error: 'start and end dates required' }, { status: 400 })
    }

    const composio = getComposio()
    const userId = `tiker_${session.user.id}`

    // Step 1: Check if Google Calendar is connected (separate from event fetching)
    let calendarConnection: any = null
    try {
      const connectedAccounts = await composio.connectedAccounts.list({
        userIds: [userId],
        toolkitSlugs: ['GOOGLECALENDAR'],
        statuses: ['ACTIVE'],
      })
      calendarConnection = connectedAccounts.items?.[0]
    } catch (connCheckError) {
      console.error('Composio connection check error:', connCheckError)
    }

    if (!calendarConnection) {
      return NextResponse.json({
        events: [],
        connected: false,
        message: 'Google Calendar not connected',
      })
    }

    // Step 2: Fetch events (connection exists, so always return connected: true)
    try {
      const timeMin = new Date(start).toISOString()
      const timeMax = new Date(end + 'T23:59:59').toISOString()

      console.log('[Calendar] Fetching events:', { userId, timeMin, timeMax })

      const result = await composio.tools.execute('GOOGLECALENDAR_LIST_EVENTS', {
        userId,
        dangerouslySkipVersionCheck: true,
        arguments: {
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 100,
        },
      })

      // Log the full response structure to diagnose parsing issues
      console.log('[Calendar] Composio raw result keys:', result ? Object.keys(result) : 'null')
      console.log('[Calendar] Composio result preview:', JSON.stringify(result, null, 2).slice(0, 2000))

      // Walk the response tree to find the events array.
      // Composio SDK versions return data in varying shapes:
      //   result.data.items, result.items, result.response_data.items,
      //   result.data.response_data.items, etc.
      const data: any = result || {}

      const findEvents = (obj: any, depth = 0): any[] => {
        if (!obj || depth > 5) return []
        if (Array.isArray(obj)) return obj
        if (Array.isArray(obj.items)) return obj.items
        if (Array.isArray(obj.events)) return obj.events
        // Recurse into common wrapper keys
        for (const key of ['data', 'response_data', 'result', 'body', 'output']) {
          if (obj[key] && typeof obj[key] === 'object') {
            const found = findEvents(obj[key], depth + 1)
            if (found.length > 0) return found
          }
        }
        return []
      }

      const rawEvents = findEvents(data)
      console.log('[Calendar] Parsed event count:', rawEvents.length)
      if (rawEvents.length > 0) {
        console.log('[Calendar] First event sample:', JSON.stringify(rawEvents[0]).slice(0, 500))
      }

      const events = rawEvents
        .filter((event: any) => event && (event.summary || event.title || event.subject))
        .map((event: any) => ({
          id: event.id || event.eventId || event.iCalUID || crypto.randomUUID(),
          title: event.summary || event.title || event.subject || 'Untitled Event',
          start: event.start?.dateTime || event.start?.date || event.startTime || event.start,
          end: event.end?.dateTime || event.end?.date || event.endTime || event.end,
          allDay: !event.start?.dateTime && !event.startTime,
          location: event.location,
          description: event.description,
          htmlLink: event.htmlLink || event.webLink,
          status: event.status,
          attendees: event.attendees?.length || 0,
        }))

      // In debug mode, include raw response info for troubleshooting
      if (debug) {
        return NextResponse.json({
          events,
          connected: true,
          _debug: {
            rawResultKeys: result ? Object.keys(result) : null,
            rawEventCount: rawEvents.length,
            parsedEventCount: events.length,
            firstRawEvent: rawEvents[0] ? JSON.parse(JSON.stringify(rawEvents[0])) : null,
            resultPreview: JSON.stringify(result).slice(0, 3000),
          },
        })
      }

      return NextResponse.json({
        events,
        connected: true,
      })
    } catch (fetchError: any) {
      console.error('Composio calendar fetch error:', fetchError?.message || fetchError)
      console.error('Composio calendar fetch error detail:', JSON.stringify(fetchError, null, 2).slice(0, 1000))

      // Connection exists but fetch failed -- still report connected: true
      // so the CalendarView doesn't show the "Connect" banner
      return NextResponse.json({
        events: [],
        connected: true,
        message: fetchError.message?.includes('auth') || fetchError.message?.includes('token')
          ? 'Calendar token may have expired. Try reconnecting in Settings.'
          : 'Failed to fetch calendar events. Try again later.',
      })
    }
  } catch (error) {
    console.error('Calendar API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
