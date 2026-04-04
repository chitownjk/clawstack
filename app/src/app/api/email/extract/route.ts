import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getComposio } from '@/lib/composio'
import { GCAL_SLUGS, executeWithSlugFallback } from '@/lib/composio-slugs'

// POST /api/email/extract
// Takes an extracted_item ID and creates a calendar event from it.
// Supports types: flight, hotel, invite
// Marks the extracted_item as processed after successful creation.
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
    const { item_id, action } = body

    if (!item_id) {
      return NextResponse.json({ error: 'item_id is required' }, { status: 400 })
    }

    // Fetch the extracted item
    const { data: item, error: fetchError } = await adminClient
      .from('extracted_items')
      .select('*')
      .eq('id', item_id)
      .eq('account_id', account.id)
      .single()

    if (fetchError || !item) {
      return NextResponse.json({ error: 'Extracted item not found' }, { status: 404 })
    }

    if (item.processed) {
      return NextResponse.json({ error: 'Item already processed', item }, { status: 400 })
    }

    // Handle different actions
    if (action === 'dismiss') {
      await adminClient
        .from('extracted_items')
        .update({ dismissed: true })
        .eq('id', item_id)

      return NextResponse.json({ success: true, action: 'dismissed' })
    }

    // Default action: create calendar event
    if (['flight', 'hotel', 'invite'].includes(item.type)) {
      const eventResult = await createCalendarEvent(session.user.id, item)

      if (eventResult.success) {
        // Mark as processed
        await adminClient
          .from('extracted_items')
          .update({
            processed: true,
            data: {
              ...item.data,
              calendar_event_id: eventResult.eventId,
              processed_at: new Date().toISOString(),
            },
          })
          .eq('id', item_id)

        return NextResponse.json({
          success: true,
          action: 'calendar_event_created',
          event_id: eventResult.eventId,
        })
      } else {
        return NextResponse.json({
          success: false,
          error: eventResult.error,
        }, { status: 500 })
      }
    }

    // For other types (bill, delivery, subscription, action_item),
    // just mark as processed since they don't map to calendar events
    if (action === 'acknowledge') {
      await adminClient
        .from('extracted_items')
        .update({ processed: true })
        .eq('id', item_id)

      return NextResponse.json({ success: true, action: 'acknowledged' })
    }

    return NextResponse.json({
      error: `Unsupported action for type: ${item.type}`,
      supported_types: ['flight', 'hotel', 'invite'],
      supported_actions: ['dismiss', 'acknowledge'],
    }, { status: 400 })
  } catch (error) {
    console.error('[Extract] Error:', error)
    return NextResponse.json({ error: 'Failed to process extraction' }, { status: 500 })
  }
}

// ---- Calendar Event Creation ----

async function createCalendarEvent(
  authUid: string,
  item: any
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const composio = getComposio()
    const userId = `tiker_${authUid}`

    // Check Google Calendar connection
    const connectedAccounts = await composio.connectedAccounts.list({
      userIds: [userId],
      toolkitSlugs: ['GOOGLECALENDAR'],
      statuses: ['ACTIVE'],
    })

    if (!connectedAccounts.items?.[0]) {
      return { success: false, error: 'Google Calendar not connected' }
    }

    // Build event details based on extraction type
    const eventDetails = buildEventFromExtraction(item)

    const { result, slugUsed } = await executeWithSlugFallback(
      composio,
      userId,
      GCAL_SLUGS.createEvent,
      eventDetails
    )
    console.log(`[Extract] Calendar event created with slug: ${slugUsed}`)

    // Try to extract the event ID from the result
    const r = result as Record<string, any>
    const eventId = r?.data?.id || r?.id || r?.data?.eventId || 'created'

    return { success: true, eventId }
  } catch (error: any) {
    console.error('[Extract] Calendar create error:', error)
    return { success: false, error: error?.message || 'Unknown error' }
  }
}

function buildEventFromExtraction(item: any): Record<string, any> {
  const data = item.data || {}

  switch (item.type) {
    case 'flight': {
      const departure = data.date || data.departure_date
      const summary = `${data.airline || 'Flight'} ${data.flight_number || ''} - ${data.departure || ''} to ${data.arrival || ''}`.trim()
      const description = [
        data.confirmation_number ? `Confirmation: ${data.confirmation_number}` : '',
        data.airline ? `Airline: ${data.airline}` : '',
        data.flight_number ? `Flight: ${data.flight_number}` : '',
        `Source: Extracted from email by Tiker`,
      ].filter(Boolean).join('\n')

      return {
        summary,
        description,
        start: {
          dateTime: departure ? new Date(departure).toISOString() : new Date().toISOString(),
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: departure
            ? new Date(new Date(departure).getTime() + 3 * 60 * 60 * 1000).toISOString() // +3 hours default
            : new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          timeZone: 'America/New_York',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 3 * 60 },  // 3 hours before
          ],
        },
      }
    }

    case 'hotel': {
      const checkIn = data.check_in
      const checkOut = data.check_out
      const summary = `Hotel: ${data.hotel_name || 'Hotel Stay'}`
      const description = [
        data.confirmation_number ? `Confirmation: ${data.confirmation_number}` : '',
        data.address ? `Address: ${data.address}` : '',
        data.hotel_name ? `Hotel: ${data.hotel_name}` : '',
        `Source: Extracted from email by Tiker`,
      ].filter(Boolean).join('\n')

      return {
        summary,
        description,
        start: {
          date: checkIn || new Date().toISOString().split('T')[0],
        },
        end: {
          date: checkOut || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        },
      }
    }

    case 'invite': {
      const eventDate = data.date
      const summary = data.event_name || item.title || 'Event'
      const description = [
        data.organizer ? `Organizer: ${data.organizer}` : '',
        data.location ? `Location: ${data.location}` : '',
        `Source: Extracted from email by Tiker`,
      ].filter(Boolean).join('\n')

      // If we have a specific time
      if (data.time && eventDate) {
        const dateTimeStr = `${eventDate}T${data.time}`
        return {
          summary,
          description,
          location: data.location,
          start: {
            dateTime: new Date(dateTimeStr).toISOString(),
            timeZone: 'America/New_York',
          },
          end: {
            dateTime: new Date(new Date(dateTimeStr).getTime() + 60 * 60 * 1000).toISOString(), // +1 hour
            timeZone: 'America/New_York',
          },
        }
      }

      // All-day event
      return {
        summary,
        description,
        location: data.location,
        start: {
          date: eventDate || new Date().toISOString().split('T')[0],
        },
        end: {
          date: eventDate || new Date().toISOString().split('T')[0],
        },
      }
    }

    default:
      return {
        summary: item.title,
        description: `Extracted from email by Tiker\nType: ${item.type}`,
        start: { date: new Date().toISOString().split('T')[0] },
        end: { date: new Date().toISOString().split('T')[0] },
      }
  }
}
