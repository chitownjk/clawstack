import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getComposio } from '@/lib/composio'
import { decrypt } from '@/lib/crypto'
import Anthropic from '@anthropic-ai/sdk'

// POST /api/meeting-prep
// Generates a meeting prep briefing for a specific calendar event.
// Looks up attendees (LinkedIn via Composio if available, web search fallback),
// searches prior tasks/activities for context, then synthesizes with Claude.
//
// Body: { event_id, event_title, attendees: [{ email, name }], start, description }
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
    const { event_id, event_title, attendees, start, description, location } = body

    if (!event_title) {
      return NextResponse.json({ error: 'event_title is required' }, { status: 400 })
    }

    const attendeeList: Array<{ email?: string; name?: string }> = attendees || []

    // Gather data in parallel
    const [attendeeProfiles, priorContext] = await Promise.all([
      lookupAttendees(session.user.id, attendeeList),
      searchPriorContext(adminClient, account.id, attendeeList, event_title),
    ])

    // Synthesize with Claude
    const prep = await generateMeetingPrep({
      event_title,
      start,
      description,
      location,
      attendeeProfiles,
      priorContext,
    })

    return NextResponse.json({
      event_id,
      event_title,
      prep,
      attendees: attendeeProfiles,
      context: priorContext,
    })
  } catch (error) {
    console.error('[MeetingPrep] Error:', error)
    return NextResponse.json({ error: 'Failed to generate meeting prep' }, { status: 500 })
  }
}

// ---- Attendee Lookup ----

interface AttendeeProfile {
  email?: string;
  name?: string;
  title?: string;
  company?: string;
  linkedin_url?: string;
  headline?: string;
  location?: string;
  source: 'composio' | 'email_parse' | 'none';
}

async function lookupAttendees(
  authUid: string,
  attendees: Array<{ email?: string; name?: string }>
): Promise<AttendeeProfile[]> {
  if (attendees.length === 0) return []

  const composio = getComposio()
  const userId = `tiker_${authUid}`

  // Check if LinkedIn is connected
  let linkedinConnected = false
  try {
    const connections = await composio.connectedAccounts.list({
      userIds: [userId],
      toolkitSlugs: ['LINKEDIN'],
      statuses: ['ACTIVE'],
    })
    linkedinConnected = !!connections.items?.[0]
  } catch {
    // LinkedIn not connected
  }

  const profiles: AttendeeProfile[] = []

  for (const attendee of attendees) {
    // Skip the user's own email
    if (!attendee.email && !attendee.name) {
      continue
    }

    let profile: AttendeeProfile = {
      email: attendee.email,
      name: attendee.name || extractNameFromEmail(attendee.email || ''),
      source: 'none',
    }

    // Try LinkedIn lookup if connected
    if (linkedinConnected && attendee.email) {
      try {
        const linkedinProfile = await lookupLinkedIn(composio, userId, attendee)
        if (linkedinProfile) {
          profile = { ...profile, ...linkedinProfile, source: 'composio' }
        }
      } catch (err) {
        console.log('[MeetingPrep] LinkedIn lookup failed for attendee:', err instanceof Error ? err.message : 'Unknown error')
      }
    }

    // If no LinkedIn, try to parse info from email domain
    if (profile.source === 'none' && attendee.email) {
      const domain = attendee.email.split('@')[1]
      if (domain && !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'].includes(domain)) {
        profile.company = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1)
        profile.source = 'email_parse'
      }
    }

    profiles.push(profile)
  }

  return profiles
}

async function lookupLinkedIn(
  composio: any,
  userId: string,
  attendee: { email?: string; name?: string }
): Promise<Partial<AttendeeProfile> | null> {
  const TOOL_SLUGS = [
    'LINKEDIN_GET_PROFILE',
    'LINKEDIN_SEARCH_PEOPLE',
    'LINKEDIN_FIND_PERSON',
  ]

  for (const slug of TOOL_SLUGS) {
    try {
      const result = await composio.tools.execute(slug, {
        userId,
        dangerouslySkipVersionCheck: true,
        arguments: {
          email: attendee.email,
          name: attendee.name,
          keywords: attendee.name || attendee.email,
        },
      })

      if (!result) continue

      // Unwrap result
      const data = unwrapResult(result)
      if (data) {
        return {
          name: data.firstName
            ? `${data.firstName} ${data.lastName || ''}`
            : data.name || data.displayName || attendee.name,
          title: data.headline || data.title || data.currentPosition,
          company: data.company?.name || data.companyName || data.currentCompany,
          linkedin_url: data.profileUrl || data.linkedinUrl || data.publicProfileUrl,
          headline: data.headline || data.summary,
          location: data.location?.name || data.locationName || data.location,
        }
      }
    } catch (slugError: any) {
      if (slugError?.message?.includes('Unable to retrieve tool')) continue
      throw slugError
    }
  }

  return null
}

// ---- Prior Context Search ----

interface PriorContext {
  related_tasks: Array<{ id: string; title: string; status: string; created_at: string }>;
  related_activities: Array<{ message: string; type: string; created_at: string }>;
  mention_count: number;
}

async function searchPriorContext(
  adminClient: any,
  accountId: string,
  attendees: Array<{ email?: string; name?: string }>,
  eventTitle: string
): Promise<PriorContext> {
  const context: PriorContext = {
    related_tasks: [],
    related_activities: [],
    mention_count: 0,
  }

  // Build search terms from attendee names, emails, and event title
  const searchTerms = new Set<string>()
  for (const a of attendees) {
    if (a.name) searchTerms.add(a.name.toLowerCase())
    if (a.email) {
      searchTerms.add(a.email.toLowerCase())
      // Also add the name part of the email
      const emailName = a.email.split('@')[0].replace(/[._]/g, ' ')
      if (emailName.length > 2) searchTerms.add(emailName.toLowerCase())
    }
  }
  // Add key words from event title
  const titleWords = eventTitle.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  titleWords.forEach(w => searchTerms.add(w))

  if (searchTerms.size === 0) return context

  // Search tasks (title and description) for mentions
  try {
    const { data: tasks } = await adminClient
      .from('mc_tasks')
      .select('id, title, description, status, created_at, tags')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(200)

    for (const task of (tasks || [])) {
      const decryptedTitle = task.title ? decrypt(task.title) : ''
      const decryptedDesc = task.description ? decrypt(task.description) : ''
      const combined = `${decryptedTitle} ${decryptedDesc}`.toLowerCase()

      for (const term of Array.from(searchTerms)) {
        if (combined.includes(term)) {
          context.related_tasks.push({
            id: task.id,
            title: decryptedTitle,
            status: task.status,
            created_at: task.created_at,
          })
          context.mention_count++
          break // Don't double-count
        }
      }
    }

    // Limit to most recent 10
    context.related_tasks = context.related_tasks.slice(0, 10)
  } catch (err) {
    console.error('[MeetingPrep] Task search error:', err)
  }

  // Search activities for mentions
  try {
    const { data: activities } = await adminClient
      .from('mc_activities')
      .select('id, type, message, created_at')
      .eq('account_id', accountId)
      .neq('type', 'heartbeat')
      .order('created_at', { ascending: false })
      .limit(100)

    for (const activity of (activities || [])) {
      const msg = activity.message ? decrypt(activity.message) : ''
      const msgLower = msg.toLowerCase()

      for (const term of Array.from(searchTerms)) {
        if (msgLower.includes(term)) {
          context.related_activities.push({
            message: msg,
            type: activity.type,
            created_at: activity.created_at,
          })
          context.mention_count++
          break
        }
      }
    }

    context.related_activities = context.related_activities.slice(0, 10)
  } catch (err) {
    console.error('[MeetingPrep] Activity search error:', err)
  }

  return context
}

// ---- AI Synthesis ----

async function generateMeetingPrep(data: {
  event_title: string;
  start?: string;
  description?: string;
  location?: string;
  attendeeProfiles: AttendeeProfile[];
  priorContext: PriorContext;
}): Promise<{
  summary: string;
  talking_points: string[];
  questions: string[];
  attendee_notes: Array<{ name: string; note: string }>;
}> {
  const { event_title, start, description, location, attendeeProfiles, priorContext } = data

  const attendeeSection = attendeeProfiles.length > 0
    ? `ATTENDEES:\n${attendeeProfiles.map(a => {
        const parts = [a.name || a.email || 'Unknown']
        if (a.title) parts.push(`Title: ${a.title}`)
        if (a.company) parts.push(`Company: ${a.company}`)
        if (a.headline) parts.push(`About: ${a.headline}`)
        if (a.location) parts.push(`Location: ${a.location}`)
        return `- ${parts.join(' | ')}`
      }).join('\n')}`
    : 'ATTENDEES: None listed'

  const contextSection = priorContext.related_tasks.length > 0
    ? `PRIOR CONTEXT (${priorContext.mention_count} mentions found):\nRelated Tasks:\n${priorContext.related_tasks.map(t =>
        `- [${t.status}] ${t.title} (${new Date(t.created_at).toLocaleDateString()})`
      ).join('\n')}${priorContext.related_activities.length > 0
        ? `\nRelated Activity:\n${priorContext.related_activities.slice(0, 5).map(a =>
            `- [${a.type}] ${a.message}`
          ).join('\n')}`
        : ''}`
    : 'PRIOR CONTEXT: No previous mentions found.'

  const prompt = `Prepare a meeting brief for:
MEETING: ${event_title}
TIME: ${start ? new Date(start).toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit' }) : 'Not specified'}
${location ? `LOCATION: ${location}` : ''}
${description ? `DESCRIPTION: ${description}` : ''}

${attendeeSection}

${contextSection}

Output JSON:
{
  "summary": "2-3 sentence overview: what this meeting is about, who's attending, key context",
  "talking_points": ["point 1", "point 2", "point 3"],
  "questions": ["question to ask 1", "question to ask 2"],
  "attendee_notes": [{ "name": "Person Name", "note": "What to know about them" }]
}`

  try {
    const anthropic = new Anthropic()
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: 'You are Tiker, a personal life operator. Generate concise, actionable meeting prep. Be specific and practical. Output valid JSON.',
      messages: [{ role: 'user', content: prompt }],
    })

    const aiText = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('')

    const cleaned = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch (error) {
    console.error('[MeetingPrep] AI synthesis error:', error)
    return {
      summary: `Meeting: ${event_title} with ${attendeeProfiles.length} attendees.`,
      talking_points: ['Review agenda before the meeting', 'Prepare any follow-up items from prior discussions'],
      questions: [],
      attendee_notes: attendeeProfiles.map(a => ({
        name: a.name || a.email || 'Unknown',
        note: a.title ? `${a.title} at ${a.company || 'unknown company'}` : 'No additional info available',
      })),
    }
  }
}

// ---- Helpers ----

function extractNameFromEmail(email: string): string {
  const local = email.split('@')[0]
  return local
    .replace(/[._]/g, ' ')
    .replace(/\d+/g, '')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .trim()
}

function unwrapResult(obj: any, depth = 0): any {
  if (!obj || depth > 5) return null
  if (obj.firstName || obj.name || obj.displayName || obj.headline) return obj
  for (const key of ['data', 'response_data', 'result', 'body', 'output', 'person', 'profile']) {
    if (obj[key] && typeof obj[key] === 'object') {
      const found = unwrapResult(obj[key], depth + 1)
      if (found) return found
    }
  }
  return obj
}
