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

    // Check if Google Calendar is connected
    try {
      const connectedAccounts = await composio.connectedAccounts.list({
        user_id: userId,
      })

      const calendarConnection = connectedAccounts.items?.find(
        (acc: any) => acc.appName === 'googlecalendar' && acc.status === 'ACTIVE'
      )

      if (!calendarConnection) {
        return NextResponse.json({
          events: [],
          connected: false,
          message: 'Google Calendar not connected',
        })
      }

      // Execute the Google Calendar list events action
      const result = await composio.actions.execute({
        actionName: 'GOOGLECALENDAR_LIST_EVENTS',
        connectedAccountId: calendarConnection.id,
        input: {
          timeMin: new Date(start).toISOString(),
          timeMax: new Date(end + 'T23:59:59').toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 100,
        },
      })

      // Parse events from Composio response
      const rawEvents = result?.data?.items || result?.data?.events || []

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
    } catch (composioError: any) {
      console.error('Composio calendar error:', composioError)

      // If it's an auth error, return not connected
      if (composioError.message?.includes('auth') || composioError.message?.includes('token')) {
        return NextResponse.json({
          events: [],
          connected: false,
          message: 'Calendar connection expired. Please reconnect in Settings.',
        })
      }

      return NextResponse.json({
        events: [],
        connected: false,
        message: 'Failed to fetch calendar events',
      })
    }
  } catch (error) {
    console.error('Calendar API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
