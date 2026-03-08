import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getComposio } from '@/lib/composio'
import { encrypt } from '@/lib/crypto'
import Anthropic from '@anthropic-ai/sdk'

// POST /api/agents/booking
// AI-initiated booking agent. Takes a booking request, researches options,
// returns structured results with an approval gate before any action.
// Supports: restaurants, appointments, travel, services.
//
// Body: {
//   type: 'restaurant' | 'flight' | 'hotel' | 'appointment' | 'service',
//   query: string (natural language request),
//   constraints?: { date?, time?, location?, budget?, party_size?, preferences? },
//   auto_calendar?: boolean (create calendar event on approval)
// }
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
    const { type, query, constraints, auto_calendar } = body

    if (!type || !query) {
      return NextResponse.json({ error: 'type and query are required' }, { status: 400 })
    }

    // Generate booking research and options via AI
    const research = await researchBookingOptions(type, query, constraints || {})

    // Store the booking request for tracking
    const { data: bookingRecord } = await adminClient
      .from('mc_activities')
      .insert({
        account_id: account.id,
        type: 'agent_booking',
        message: encrypt(`Booking request: ${type} - ${query}`),
        metadata: {
          booking_type: type,
          query,
          constraints,
          status: 'researched',
          options_count: research.options.length,
        },
      })
      .select('id')
      .single()

    return NextResponse.json({
      booking_id: bookingRecord?.id,
      type,
      research: {
        summary: research.summary,
        options: research.options,
        tips: research.tips,
        estimated_cost: research.estimated_cost,
        next_steps: research.next_steps,
      },
      status: 'awaiting_approval',
      auto_calendar: auto_calendar || false,
    })
  } catch (error) {
    console.error('[BookingAgent] Error:', error)
    return NextResponse.json({ error: 'Failed to process booking request' }, { status: 500 })
  }
}

// PATCH /api/agents/booking
// Approve or modify a booking option. Creates calendar event if requested.
// Body: { booking_id, action: 'approve' | 'modify' | 'cancel', option_index?, modifications?, create_calendar_event? }
export async function PATCH(request: Request) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const userId = `tiker_${session.user.id}`

    const { data: account } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const body = await request.json()
    const { booking_id, action, option_index, create_calendar_event } = body

    if (!booking_id || !action) {
      return NextResponse.json({ error: 'booking_id and action required' }, { status: 400 })
    }

    if (action === 'cancel') {
      await adminClient
        .from('mc_activities')
        .update({ metadata: { status: 'cancelled' } })
        .eq('id', booking_id)
        .eq('account_id', account.id)

      return NextResponse.json({ success: true, status: 'cancelled' })
    }

    if (action === 'approve' && create_calendar_event) {
      // Create calendar event for the approved booking
      const eventDetails = body.event_details || {}
      const calendarResult = await createBookingCalendarEvent(userId, {
        summary: eventDetails.title || 'Booking',
        description: eventDetails.description || '',
        location: eventDetails.location || '',
        start: eventDetails.start,
        end: eventDetails.end,
      })

      await adminClient
        .from('mc_activities')
        .update({
          metadata: {
            status: 'approved',
            option_index,
            calendar_event_created: true,
          },
        })
        .eq('id', booking_id)
        .eq('account_id', account.id)

      // Also create a task to track/confirm the booking
      await adminClient
        .from('mc_tasks')
        .insert({
          account_id: account.id,
          title: encrypt(`Confirm booking: ${eventDetails.title || 'Booking'}`),
          description: encrypt(eventDetails.description || ''),
          status: 'todo',
          priority: 'medium',
          due_date: eventDetails.start ? new Date(eventDetails.start).toISOString().split('T')[0] : null,
          source: 'agent_booking',
        })

      return NextResponse.json({
        success: true,
        status: 'approved',
        calendar_event: calendarResult ? 'created' : 'failed',
      })
    }

    // Simple approval without calendar
    await adminClient
      .from('mc_activities')
      .update({ metadata: { status: 'approved', option_index } })
      .eq('id', booking_id)
      .eq('account_id', account.id)

    return NextResponse.json({ success: true, status: 'approved' })
  } catch (error) {
    console.error('[BookingAgent] Approval error:', error)
    return NextResponse.json({ error: 'Failed to process approval' }, { status: 500 })
  }
}

interface BookingOption {
  name: string
  description: string
  estimated_price?: string
  rating?: string
  location?: string
  availability?: string
  booking_url?: string
  pros: string[]
  cons: string[]
}

interface BookingResearch {
  summary: string
  options: BookingOption[]
  tips: string[]
  estimated_cost: string
  next_steps: string[]
}

async function researchBookingOptions(
  type: string,
  query: string,
  constraints: Record<string, any>
): Promise<BookingResearch> {
  try {
    const anthropic = new Anthropic()

    const constraintStr = Object.entries(constraints)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: `You are Tiker's booking research agent. You help users find and compare booking options.
Given a booking request, generate realistic and helpful options with detailed information.
Be practical and specific. Include price estimates, pros/cons, and actionable next steps.

Return a JSON object with this structure:
{
  "summary": "Brief overview of what you found",
  "options": [
    {
      "name": "Option name",
      "description": "Brief description",
      "estimated_price": "$XX-$XX",
      "rating": "4.5/5",
      "location": "Address or area",
      "availability": "Available times/dates",
      "booking_url": "URL if applicable",
      "pros": ["Pro 1", "Pro 2"],
      "cons": ["Con 1"]
    }
  ],
  "tips": ["Booking tip 1", "Tip 2"],
  "estimated_cost": "$XX-$XX total",
  "next_steps": ["Step 1", "Step 2"]
}`,
      messages: [{
        role: 'user',
        content: `Find ${type} options for: ${query}\n\nConstraints:\n${constraintStr || 'None specified'}\n\nReturn ONLY a JSON object.`,
      }],
    })

    const aiText = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('')

    const cleaned = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return {
      summary: parsed.summary || 'Research complete',
      options: Array.isArray(parsed.options) ? parsed.options : [],
      tips: Array.isArray(parsed.tips) ? parsed.tips : [],
      estimated_cost: parsed.estimated_cost || 'Varies',
      next_steps: Array.isArray(parsed.next_steps) ? parsed.next_steps : [],
    }
  } catch (error) {
    console.error('[BookingAgent] Research error:', error)
    return {
      summary: 'Could not complete research',
      options: [],
      tips: [],
      estimated_cost: 'Unknown',
      next_steps: ['Try again with more specific details'],
    }
  }
}

async function createBookingCalendarEvent(
  userId: string,
  details: {
    summary: string
    description: string
    location: string
    start?: string
    end?: string
  }
) {
  if (!details.start) return null

  try {
    const composio = getComposio()
    const SLUGS = ['GOOGLECALENDAR_EVENTS_CREATE', 'GOOGLECALENDAR_CREATE_EVENT']

    const endTime = details.end || new Date(new Date(details.start).getTime() + 60 * 60 * 1000).toISOString()

    for (const slug of SLUGS) {
      try {
        return await composio.tools.execute(slug, {
          userId,
          dangerouslySkipVersionCheck: true,
          arguments: {
            summary: details.summary,
            description: details.description,
            location: details.location,
            start: { dateTime: details.start },
            end: { dateTime: endTime },
            colorId: '9', // Blueberry
          },
        })
      } catch { continue }
    }

    return null
  } catch {
    return null
  }
}
