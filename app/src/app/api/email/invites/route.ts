import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getComposio } from '@/lib/composio'

// GET /api/email/invites
// Returns calendar events where the user has not responded (RSVP pending).
// Uses Google Calendar API via Composio to check attendee responseStatus.
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

    const composio = getComposio()
    const userId = `tiker_${session.user.id}`

    // Check calendar connection
    const connectedAccounts = await composio.connectedAccounts.list({
      userIds: [userId],
      toolkitSlugs: ['GOOGLECALENDAR'],
      statuses: ['ACTIVE'],
    })

    if (!connectedAccounts.items?.[0]) {
      return NextResponse.json({
        connected: false,
        invites: [],
        message: 'Google Calendar not connected.',
      })
    }

    // Get upcoming events (next 14 days)
    const now = new Date()
    const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

    const TOOL_SLUGS = [
      'GOOGLECALENDAR_EVENTS_LIST',
      'GOOGLECALENDAR_LIST_EVENTS',
      'GOOGLECALENDAR_FIND_EVENTS',
    ]

    let events: any[] = []

    for (const slug of TOOL_SLUGS) {
      try {
        const result = await composio.tools.execute(slug, {
          userId,
          dangerouslySkipVersionCheck: true,
          arguments: {
            calendarId: 'primary',
            timeMin: now.toISOString(),
            timeMax: twoWeeksOut.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 100,
          },
        })

        events = findEvents(result)
        if (events.length > 0) {
          console.log(`[Invites] Found ${events.length} events with slug: ${slug}`)
          break
        }
      } catch (slugError: any) {
        if (slugError?.message?.includes('Unable to retrieve tool')) continue
        throw slugError
      }
    }

    if (events.length === 0) {
      return NextResponse.json({
        connected: true,
        invites: [],
        message: 'No upcoming events found.',
      })
    }

    // Find the user's email to check their attendee status
    const userEmail = session.user.email?.toLowerCase() || ''

    // Filter for events where user has not responded
    const pendingInvites = events
      .filter(event => {
        const attendees = event.attendees || []
        if (!Array.isArray(attendees) || attendees.length === 0) return false

        // Find user in attendees list
        const userAttendee = attendees.find(
          (a: any) => a.email?.toLowerCase() === userEmail
        )

        if (!userAttendee) return false

        // Check if they haven't responded
        // responseStatus: 'needsAction' means not responded
        // 'tentative' also counts as not firmly responded
        return (
          userAttendee.responseStatus === 'needsAction' ||
          userAttendee.responseStatus === 'tentative'
        )
      })
      .map(event => {
        const start = event.start?.dateTime || event.start?.date || ''
        const end = event.end?.dateTime || event.end?.date || ''
        const organizer = event.organizer?.email || event.organizer?.displayName || 'Unknown'
        const attendeeCount = (event.attendees || []).length

        return {
          id: event.id,
          title: event.summary || 'No title',
          start,
          end,
          location: event.location || null,
          organizer,
          attendee_count: attendeeCount,
          description: (event.description || '').slice(0, 200),
          html_link: event.htmlLink || null,
          status: event.attendees?.find(
            (a: any) => a.email?.toLowerCase() === userEmail
          )?.responseStatus || 'needsAction',
        }
      })

    // Also store pending invites as extracted items for the briefing
    for (const invite of pendingInvites) {
      const sourceId = `gcal_invite_${invite.id}`
      const { data: existing } = await adminClient
        .from('extracted_items')
        .select('id')
        .eq('account_id', account.id)
        .eq('source', 'calendar')
        .eq('source_id', sourceId)
        .eq('type', 'invite')
        .limit(1)

      if (!existing || existing.length === 0) {
        await adminClient.from('extracted_items').insert({
          account_id: account.id,
          source: 'calendar',
          source_id: sourceId,
          type: 'invite',
          title: `RSVP pending: ${invite.title}`,
          data: {
            event_name: invite.title,
            date: invite.start,
            location: invite.location,
            organizer: invite.organizer,
            attendee_count: invite.attendee_count,
            rsvp_status: invite.status,
            html_link: invite.html_link,
          },
          expires_at: invite.start || null,
        })
      }
    }

    return NextResponse.json({
      connected: true,
      total_events: events.length,
      pending_count: pendingInvites.length,
      invites: pendingInvites,
    })
  } catch (error) {
    console.error('[Invites] Error:', error)
    return NextResponse.json({ error: 'Failed to check invites' }, { status: 500 })
  }
}

// Recursively find events array in Composio response
function findEvents(obj: any, depth = 0): any[] {
  if (!obj || depth > 6) return []
  if (Array.isArray(obj)) return obj
  for (const key of ['items', 'events', 'data', 'response_data', 'result', 'body', 'output']) {
    if (!obj[key]) continue
    if (Array.isArray(obj[key])) return obj[key]
    if (typeof obj[key] === 'object') {
      const found = findEvents(obj[key], depth + 1)
      if (found.length > 0) return found
    }
  }
  return []
}
