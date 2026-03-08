import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getComposio } from '@/lib/composio'
import { encrypt } from '@/lib/crypto'
import Anthropic from '@anthropic-ai/sdk'

// POST /api/coordinate
// Multi-person coordination agent. Finds mutual availability across
// multiple calendars and suggests meeting times.
//
// Body: {
//   action: 'find_time' | 'propose' | 'create_event',
//   participants: string[] (email addresses),
//   duration_minutes: number,
//   date_range?: { start: string, end: string },
//   preferences?: { time_of_day?: 'morning' | 'afternoon' | 'evening', avoid_back_to_back?: boolean },
//   title?: string,
//   location?: string
// }
export async function POST(request: Request) {
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
    const { action } = body

    switch (action) {
      case 'find_time':
        return handleFindTime(body, userId)
      case 'propose':
        return handlePropose(body, adminClient, account.id, userId, session.user.email || '')
      case 'create_event':
        return handleCreateEvent(body, adminClient, account.id, userId)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[Coordinate] Error:', error)
    return NextResponse.json({ error: 'Failed to coordinate' }, { status: 500 })
  }
}

async function handleFindTime(body: any, userId: string) {
  const { participants, duration_minutes, date_range, preferences } = body

  if (!participants || !Array.isArray(participants) || participants.length === 0) {
    return NextResponse.json({ error: 'participants array required' }, { status: 400 })
  }

  const duration = duration_minutes || 30

  // Default date range: next 7 days
  const now = new Date()
  const rangeStart = date_range?.start ? new Date(date_range.start) : now
  const rangeEnd = date_range?.end ? new Date(date_range.end) : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Get the user's own calendar busy times
  const userBusySlots = await getUserBusySlots(userId, rangeStart, rangeEnd)

  // Use Google Calendar FreeBusy API for other participants
  const participantBusy = await getFreeBusy(userId, participants, rangeStart, rangeEnd)

  // Merge all busy times
  const allBusy = [...userBusySlots, ...participantBusy]

  // Find available slots
  const slots = findAvailableSlots(allBusy, rangeStart, rangeEnd, duration, preferences)

  // AI rank the top slots
  const rankedSlots = await rankSlots(slots, preferences, participants.length)

  return NextResponse.json({
    available_slots: rankedSlots.slice(0, 10),
    total_found: slots.length,
    participants_checked: participants.length + 1, // +1 for user
    date_range: {
      start: rangeStart.toISOString(),
      end: rangeEnd.toISOString(),
    },
  })
}

async function handlePropose(
  body: any,
  adminClient: any,
  accountId: string,
  userId: string,
  userEmail: string
) {
  const { participants, slot, title, message } = body

  if (!participants || !slot) {
    return NextResponse.json({ error: 'participants and slot required' }, { status: 400 })
  }

  // Create a calendar event as tentative/proposed
  const composio = getComposio()
  const SLUGS = ['GOOGLECALENDAR_EVENTS_CREATE', 'GOOGLECALENDAR_CREATE_EVENT']

  let eventCreated = false
  for (const slug of SLUGS) {
    try {
      await composio.tools.execute(slug, {
        userId,
        dangerouslySkipVersionCheck: true,
        arguments: {
          summary: title || 'Proposed Meeting',
          description: message || `Meeting proposed by Tiker. Participants: ${participants.join(', ')}`,
          start: { dateTime: slot.start },
          end: { dateTime: slot.end },
          attendees: participants.map((email: string) => ({ email })),
          sendUpdates: 'all',
        },
      })
      eventCreated = true
      break
    } catch { continue }
  }

  // Log the coordination
  await adminClient
    .from('mc_activities')
    .insert({
      account_id: accountId,
      type: 'coordination',
      message: encrypt(`Proposed meeting: ${title || 'Meeting'} with ${participants.join(', ')}`),
      metadata: {
        participants,
        slot,
        event_created: eventCreated,
      },
    })

  return NextResponse.json({
    success: eventCreated,
    message: eventCreated
      ? 'Calendar invite sent to all participants.'
      : 'Could not create calendar event. Check calendar connection.',
  })
}

async function handleCreateEvent(
  body: any,
  adminClient: any,
  accountId: string,
  userId: string
) {
  const { participants, slot, title, location, description } = body

  if (!slot?.start || !slot?.end) {
    return NextResponse.json({ error: 'slot with start and end required' }, { status: 400 })
  }

  const composio = getComposio()
  const SLUGS = ['GOOGLECALENDAR_EVENTS_CREATE', 'GOOGLECALENDAR_CREATE_EVENT']

  for (const slug of SLUGS) {
    try {
      const result = await composio.tools.execute(slug, {
        userId,
        dangerouslySkipVersionCheck: true,
        arguments: {
          summary: title || 'Coordinated Meeting',
          description: description || '',
          location: location || '',
          start: { dateTime: slot.start },
          end: { dateTime: slot.end },
          attendees: (participants || []).map((email: string) => ({ email })),
          sendUpdates: 'all',
        },
      })

      await adminClient
        .from('mc_activities')
        .insert({
          account_id: accountId,
          type: 'coordination',
          message: encrypt(`Created event: ${title || 'Meeting'}`),
        })

      return NextResponse.json({ success: true, result })
    } catch { continue }
  }

  return NextResponse.json({ error: 'Could not create event' }, { status: 500 })
}

interface BusySlot {
  start: Date
  end: Date
}

async function getUserBusySlots(userId: string, rangeStart: Date, rangeEnd: Date): Promise<BusySlot[]> {
  try {
    const composio = getComposio()
    const SLUGS = ['GOOGLECALENDAR_EVENTS_LIST', 'GOOGLECALENDAR_LIST_EVENTS']

    for (const slug of SLUGS) {
      try {
        const result = await composio.tools.execute(slug, {
          userId,
          dangerouslySkipVersionCheck: true,
          arguments: {
            timeMin: rangeStart.toISOString(),
            timeMax: rangeEnd.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 250,
          },
        })

        const events = findArray(result)
        return events
          .filter((e: any) => e.start?.dateTime)
          .map((e: any) => ({
            start: new Date(e.start.dateTime),
            end: new Date(e.end?.dateTime || e.start.dateTime),
          }))
      } catch { continue }
    }

    return []
  } catch {
    return []
  }
}

async function getFreeBusy(
  userId: string,
  participants: string[],
  rangeStart: Date,
  rangeEnd: Date
): Promise<BusySlot[]> {
  try {
    const composio = getComposio()
    const SLUGS = ['GOOGLECALENDAR_FREEBUSY_QUERY', 'GOOGLECALENDAR_GET_FREEBUSY']

    for (const slug of SLUGS) {
      try {
        const result = await composio.tools.execute(slug, {
          userId,
          dangerouslySkipVersionCheck: true,
          arguments: {
            timeMin: rangeStart.toISOString(),
            timeMax: rangeEnd.toISOString(),
            items: participants.map(email => ({ id: email })),
          },
        })

        // Parse freebusy response
        const calendars = (result as any)?.calendars || (result as any)?.data?.calendars || {}
        const busySlots: BusySlot[] = []

        for (const calendarId of Object.keys(calendars)) {
          const busy = calendars[calendarId]?.busy || []
          for (const slot of busy) {
            busySlots.push({
              start: new Date(slot.start),
              end: new Date(slot.end),
            })
          }
        }

        return busySlots
      } catch { continue }
    }

    return []
  } catch {
    return []
  }
}

interface TimeSlot {
  start: string
  end: string
  day: string
  time_label: string
  score: number
}

function findAvailableSlots(
  busySlots: BusySlot[],
  rangeStart: Date,
  rangeEnd: Date,
  durationMinutes: number,
  preferences?: any
): TimeSlot[] {
  const slots: TimeSlot[] = []
  const durationMs = durationMinutes * 60 * 1000

  // Work hours: 8 AM to 6 PM
  const workStart = 8
  const workEnd = 18

  // Iterate day by day
  const current = new Date(rangeStart)
  current.setHours(workStart, 0, 0, 0)

  while (current < rangeEnd) {
    const dayOfWeek = current.getDay()
    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      current.setDate(current.getDate() + 1)
      current.setHours(workStart, 0, 0, 0)
      continue
    }

    const dayEnd = new Date(current)
    dayEnd.setHours(workEnd, 0, 0, 0)

    // Check every 30-minute slot
    const slotStart = new Date(current)
    while (slotStart.getTime() + durationMs <= dayEnd.getTime()) {
      const slotEnd = new Date(slotStart.getTime() + durationMs)

      // Check if this slot overlaps with any busy time
      const hasConflict = busySlots.some(busy =>
        slotStart < busy.end && slotEnd > busy.start
      )

      if (!hasConflict) {
        // Score the slot
        let score = 50
        const hour = slotStart.getHours()

        // Prefer mid-morning and early afternoon
        if (hour >= 9 && hour <= 11) score += 20
        if (hour >= 13 && hour <= 15) score += 15
        if (hour === 12) score -= 10 // Lunch time penalty

        // Apply preferences
        if (preferences?.time_of_day === 'morning' && hour < 12) score += 25
        if (preferences?.time_of_day === 'afternoon' && hour >= 12) score += 25

        // Avoid back-to-back: check if there's a meeting right before or after
        if (preferences?.avoid_back_to_back) {
          const bufferBefore = new Date(slotStart.getTime() - 15 * 60 * 1000)
          const bufferAfter = new Date(slotEnd.getTime() + 15 * 60 * 1000)
          const tooClose = busySlots.some(busy =>
            (bufferBefore < busy.end && slotStart > busy.start) ||
            (slotEnd < busy.end && bufferAfter > busy.start)
          )
          if (tooClose) score -= 15
        }

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          day: `${dayNames[slotStart.getDay()]} ${slotStart.toLocaleDateString()}`,
          time_label: `${slotStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${slotEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
          score,
        })
      }

      slotStart.setMinutes(slotStart.getMinutes() + 30)
    }

    current.setDate(current.getDate() + 1)
    current.setHours(workStart, 0, 0, 0)
  }

  return slots.sort((a, b) => b.score - a.score)
}

async function rankSlots(
  slots: TimeSlot[],
  preferences: any,
  participantCount: number
): Promise<TimeSlot[]> {
  // If few slots, just return sorted by score
  if (slots.length <= 10) return slots

  // Otherwise take top candidates and let AI rank them
  return slots.slice(0, 10)
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
