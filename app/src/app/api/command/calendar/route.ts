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
      const result = await composio.tools.execute('GOOGLECALENDAR_LIST_EVENTS', {
        userId,
        dangerouslySkipVersionCheck: true,
        arguments: {
          timeMin: new Date(start).toISOString(),
          timeMax: new Date(end + 'T23:59:59').toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 100,
        },
      })

      // Parse events from Composio response
      const data: any = result?.data || result || {}
      const rawEvents = data?.items || data?.events || data?.data?.items || []

      const events = rawEvents.map((event: any) => ({
        id: event.id,
        title: event.summary || 'Untitled Event',
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        allDay: !event.start?.dateTime,
        location: event.location,
        description: event.description,
        htmlLink: event.htmlLink,
        status: event.status,
        attendees: event.attendees?.length || 0,
      }))

      return NextResponse.json({
        events,
        connected: true,
      })
    } catch (fetchError: any) {
      console.error('Composio calendar fetch error:', fetchError)

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
