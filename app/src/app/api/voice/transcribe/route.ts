import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// POST /api/voice/transcribe
// Voice interface -- accepts audio transcription text (from browser Web Speech API
// or Whisper) and routes to the appropriate Tiker action.
//
// Body: {
//   transcript: string (the spoken command),
//   source?: 'web_speech' | 'whisper' | 'manual'
// }
//
// Returns the interpreted intent and action result.
// Examples:
//   "What's my day look like?" -> briefing summary
//   "Add a task to call the dentist" -> create task
//   "Remind me to buy groceries tomorrow at 5pm" -> create reminder
//   "When am I free this week?" -> schedule analysis
//   "Book a restaurant for Friday night" -> booking agent
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
    const { transcript, source } = body

    if (!transcript) {
      return NextResponse.json({ error: 'transcript required' }, { status: 400 })
    }

    // Parse intent from natural language
    const intent = await parseVoiceIntent(transcript)

    // Route to the appropriate handler
    const result = await routeIntent(intent, transcript, adminClient, account.id, session.user.id)

    return NextResponse.json({
      transcript,
      source: source || 'manual',
      intent,
      result,
    })
  } catch (error) {
    console.error('[Voice] Error:', error)
    return NextResponse.json({ error: 'Failed to process voice command' }, { status: 500 })
  }
}

interface VoiceIntent {
  action: string
  confidence: number
  entities: Record<string, string>
  spoken_response: string
}

async function parseVoiceIntent(transcript: string): Promise<VoiceIntent> {
  try {
    const anthropic = new Anthropic()

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: `You are Tiker's voice command parser. Interpret spoken commands and extract intent.

Available actions:
- "briefing": User wants their daily briefing or schedule summary
- "create_task": User wants to add a task
- "create_reminder": User wants to set a reminder
- "check_schedule": User wants to know their availability
- "book": User wants to book something (restaurant, flight, appointment)
- "research": User wants to research a topic
- "list": User wants to create or manage a list
- "finance": User wants financial/bill info
- "coordinate": User wants to schedule with others
- "unknown": Cannot determine intent

Extract entities: title, date, time, location, person, amount, duration.

Return JSON: {
  "action": "create_task",
  "confidence": 0.95,
  "entities": { "title": "Call the dentist", "date": "tomorrow" },
  "spoken_response": "Got it. I'll add 'Call the dentist' to your tasks."
}

The spoken_response should be natural, conversational, and brief (1-2 sentences).`,
      messages: [{
        role: 'user',
        content: `Parse this voice command: "${transcript}"\n\nReturn ONLY JSON.`,
      }],
    })

    const aiText = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('')

    const cleaned = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return {
      action: 'unknown',
      confidence: 0,
      entities: {},
      spoken_response: "I didn't quite catch that. Could you try again?",
    }
  }
}

async function routeIntent(
  intent: VoiceIntent,
  transcript: string,
  adminClient: any,
  accountId: string,
  authUid: string
): Promise<any> {
  const userId = `tiker_${authUid}`

  switch (intent.action) {
    case 'create_task': {
      const title = intent.entities.title || transcript
      const { encrypt } = await import('@/lib/crypto')
      const dueDate = intent.entities.date ? parseDateEntity(intent.entities.date) : null

      await adminClient
        .from('mc_tasks')
        .insert({
          account_id: accountId,
          title: encrypt(title),
          status: 'todo',
          priority: 'medium',
          due_date: dueDate,
          source: 'voice',
        })

      return { created: 'task', title, due_date: dueDate }
    }

    case 'create_reminder': {
      const title = intent.entities.title || transcript
      const remindAt = intent.entities.date || intent.entities.time
        ? parseDateTimeEntity(intent.entities.date, intent.entities.time)
        : new Date(Date.now() + 60 * 60 * 1000).toISOString()

      await adminClient
        .from('reminders')
        .insert({
          account_id: accountId,
          title,
          status: 'active',
          escalation_level: 0,
          next_remind_at: remindAt,
        })

      return { created: 'reminder', title, remind_at: remindAt }
    }

    case 'briefing': {
      // Fetch today's briefing
      const todayStr = new Date().toISOString().split('T')[0]
      const { data: briefing } = await adminClient
        .from('briefings')
        .select('content, sections')
        .eq('account_id', accountId)
        .eq('date', todayStr)
        .single()

      if (briefing) {
        return {
          type: 'briefing',
          summary: briefing.sections?.ai_summary || briefing.content?.substring(0, 200) || 'Briefing available.',
        }
      }

      return { type: 'briefing', summary: 'No briefing generated yet today. Opening your briefing now.' }
    }

    case 'check_schedule': {
      return {
        type: 'schedule',
        message: 'Checking your calendar. Use /api/schedule/optimize for detailed analysis.',
        redirect: '/api/schedule/optimize',
      }
    }

    case 'book': {
      return {
        type: 'booking',
        message: intent.spoken_response,
        redirect: '/api/agents/booking',
        params: {
          type: guessBookingType(transcript),
          query: transcript,
          constraints: intent.entities,
        },
      }
    }

    case 'list': {
      const listName = intent.entities.title || 'New List'
      return {
        type: 'list',
        message: `Creating list: ${listName}`,
        redirect: '/api/smart-lists',
        params: { name: listName, auto_generate: true },
      }
    }

    case 'finance': {
      return {
        type: 'finance',
        message: 'Checking your financial summary.',
        redirect: '/api/finance',
      }
    }

    case 'coordinate': {
      return {
        type: 'coordinate',
        message: intent.spoken_response,
        redirect: '/api/coordinate',
        params: {
          action: 'find_time',
          participants: intent.entities.person ? [intent.entities.person] : [],
          duration_minutes: parseInt(intent.entities.duration || '30'),
        },
      }
    }

    default:
      return {
        type: 'unknown',
        message: intent.spoken_response,
        transcript,
      }
  }
}

function parseDateEntity(dateStr: string): string | null {
  const now = new Date()
  const lower = dateStr.toLowerCase()

  if (lower === 'today') return now.toISOString().split('T')[0]
  if (lower === 'tomorrow') {
    const d = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    return d.toISOString().split('T')[0]
  }
  if (lower.includes('next week')) {
    const d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    return d.toISOString().split('T')[0]
  }

  // Try to parse as date
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0]

  return null
}

function parseDateTimeEntity(dateStr?: string, timeStr?: string): string {
  const now = new Date()
  let date = now

  if (dateStr) {
    const lower = dateStr.toLowerCase()
    if (lower === 'tomorrow') date = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    else {
      const parsed = new Date(dateStr)
      if (!isNaN(parsed.getTime())) date = parsed
    }
  }

  if (timeStr) {
    const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i)
    if (match) {
      let hours = parseInt(match[1])
      const minutes = parseInt(match[2] || '0')
      const ampm = match[3]?.toLowerCase()
      if (ampm === 'pm' && hours < 12) hours += 12
      if (ampm === 'am' && hours === 12) hours = 0
      date.setHours(hours, minutes, 0, 0)
    }
  }

  return date.toISOString()
}

function guessBookingType(transcript: string): string {
  const lower = transcript.toLowerCase()
  if (lower.includes('restaurant') || lower.includes('dinner') || lower.includes('lunch') || lower.includes('reservation')) return 'restaurant'
  if (lower.includes('flight') || lower.includes('plane') || lower.includes('fly')) return 'flight'
  if (lower.includes('hotel') || lower.includes('stay') || lower.includes('accommodation')) return 'hotel'
  if (lower.includes('doctor') || lower.includes('dentist') || lower.includes('appointment')) return 'appointment'
  return 'service'
}
