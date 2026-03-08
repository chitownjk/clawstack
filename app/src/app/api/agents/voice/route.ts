import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { encrypt } from '@/lib/crypto'
import Anthropic from '@anthropic-ai/sdk'

// POST /api/agents/voice
// AI Voice Agent -- initiates phone calls on the user's behalf.
// Uses ElevenLabs for voice synthesis and Twilio for telephony.
// Always requires explicit user approval before dialing.
//
// Body: {
//   action: 'prepare' | 'initiate' | 'status',
//   call_type: 'appointment' | 'reservation' | 'inquiry' | 'followup' | 'cancel',
//   business_name?: string,
//   phone_number?: string,
//   objective: string,
//   context?: string,
//   call_id?: string (for status checks)
// }
//
// Flow:
// 1. User sends 'prepare' with objective -> AI generates call script
// 2. User reviews script, sends 'initiate' -> call is placed
// 3. User checks 'status' -> get call progress/transcript
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
    const { action } = body

    switch (action) {
      case 'prepare':
        return handlePrepare(body, adminClient, account.id)
      case 'initiate':
        return handleInitiate(body, adminClient, account.id)
      case 'status':
        return handleStatus(body, adminClient, account.id)
      default:
        return NextResponse.json({ error: 'Invalid action. Use: prepare, initiate, status' }, { status: 400 })
    }
  } catch (error) {
    console.error('[VoiceAgent] Error:', error)
    return NextResponse.json({ error: 'Failed to process voice agent request' }, { status: 500 })
  }
}

async function handlePrepare(
  body: any,
  adminClient: any,
  accountId: string
) {
  const { call_type, business_name, phone_number, objective, context } = body

  if (!objective) {
    return NextResponse.json({ error: 'objective is required' }, { status: 400 })
  }

  // Generate call script via AI
  const script = await generateCallScript(call_type || 'inquiry', objective, business_name, context)

  // Store the call preparation
  const { data: callRecord } = await adminClient
    .from('mc_activities')
    .insert({
      account_id: accountId,
      type: 'voice_call_prep',
      message: encrypt(`Call prep: ${business_name || 'Unknown'} - ${objective}`),
      metadata: {
        call_type: call_type || 'inquiry',
        business_name,
        phone_number,
        objective,
        status: 'prepared',
        script: script,
      },
    })
    .select('id')
    .single()

  return NextResponse.json({
    call_id: callRecord?.id,
    status: 'prepared',
    script,
    requires_approval: true,
    message: 'Review the call script above. Send action: "initiate" with the call_id to place the call.',
    config_required: {
      elevenlabs: !process.env.ELEVENLABS_API_KEY,
      twilio: !process.env.TWILIO_ACCOUNT_SID,
    },
  })
}

async function handleInitiate(
  body: any,
  adminClient: any,
  accountId: string
) {
  const { call_id, phone_number } = body

  if (!call_id) {
    return NextResponse.json({ error: 'call_id is required' }, { status: 400 })
  }

  // Check that we have the required API keys
  const hasTwilio = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER)
  const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY

  if (!hasTwilio || !hasElevenLabs) {
    return NextResponse.json({
      error: 'Voice agent not fully configured',
      missing: {
        twilio: !hasTwilio ? 'TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER' : null,
        elevenlabs: !hasElevenLabs ? 'ELEVENLABS_API_KEY' : null,
      },
      status: 'config_required',
    }, { status: 503 })
  }

  // Verify the call record exists
  const { data: activity } = await adminClient
    .from('mc_activities')
    .select('metadata')
    .eq('id', call_id)
    .eq('account_id', accountId)
    .single()

  if (!activity) {
    return NextResponse.json({ error: 'Call record not found' }, { status: 404 })
  }

  const targetNumber = phone_number || activity.metadata?.phone_number
  if (!targetNumber) {
    return NextResponse.json({ error: 'No phone number provided' }, { status: 400 })
  }

  // Initiate the call via Twilio
  try {
    const twilioResult = await initiateCall(targetNumber, activity.metadata?.script)

    await adminClient
      .from('mc_activities')
      .update({
        metadata: {
          ...activity.metadata,
          status: 'initiated',
          twilio_sid: twilioResult.sid,
          initiated_at: new Date().toISOString(),
        },
      })
      .eq('id', call_id)
      .eq('account_id', accountId)

    return NextResponse.json({
      call_id,
      status: 'initiated',
      twilio_sid: twilioResult.sid,
      message: 'Call is being placed. Check status with action: "status".',
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to initiate call',
      details: String(error),
    }, { status: 500 })
  }
}

async function handleStatus(
  body: any,
  adminClient: any,
  accountId: string
) {
  const { call_id } = body

  if (!call_id) {
    return NextResponse.json({ error: 'call_id is required' }, { status: 400 })
  }

  const { data: activity } = await adminClient
    .from('mc_activities')
    .select('metadata, created_at')
    .eq('id', call_id)
    .eq('account_id', accountId)
    .single()

  if (!activity) {
    return NextResponse.json({ error: 'Call record not found' }, { status: 404 })
  }

  // If Twilio SID exists, check call status
  if (activity.metadata?.twilio_sid) {
    try {
      const callStatus = await getCallStatus(activity.metadata.twilio_sid)
      return NextResponse.json({
        call_id,
        status: callStatus.status,
        duration: callStatus.duration,
        transcript: callStatus.transcript || null,
        created_at: activity.created_at,
      })
    } catch {
      return NextResponse.json({
        call_id,
        status: activity.metadata?.status || 'unknown',
        created_at: activity.created_at,
      })
    }
  }

  return NextResponse.json({
    call_id,
    status: activity.metadata?.status || 'prepared',
    script: activity.metadata?.script,
    created_at: activity.created_at,
  })
}

interface CallScript {
  greeting: string
  objective_statement: string
  key_points: string[]
  questions: string[]
  closing: string
  fallback_responses: Record<string, string>
}

async function generateCallScript(
  callType: string,
  objective: string,
  businessName?: string,
  context?: string
): Promise<CallScript> {
  try {
    const anthropic = new Anthropic()

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      system: `You are Tiker's voice agent script writer. Generate a natural, polite phone call script.
The script should sound human, not robotic. Include fallback responses for common scenarios.

Return a JSON object:
{
  "greeting": "Hello, my name is... I'm calling about...",
  "objective_statement": "Clear statement of what we need",
  "key_points": ["Point 1", "Point 2"],
  "questions": ["Question to ask"],
  "closing": "Thank you for...",
  "fallback_responses": {
    "on_hold": "Sure, I'll wait.",
    "not_available": "When would be a good time to call back?",
    "transfer": "That would be great, thank you.",
    "need_info": "Let me check on that and call back."
  }
}`,
      messages: [{
        role: 'user',
        content: `Generate a ${callType} call script.\nBusiness: ${businessName || 'Unknown'}\nObjective: ${objective}\n${context ? `Context: ${context}` : ''}\n\nReturn ONLY JSON.`,
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
      greeting: `Hello, I'm calling on behalf of a Tiker user regarding ${objective}.`,
      objective_statement: objective,
      key_points: [],
      questions: [],
      closing: 'Thank you for your time.',
      fallback_responses: {
        on_hold: "Sure, I'll wait.",
        not_available: 'When would be a good time to call back?',
      },
    }
  }
}

async function initiateCall(phoneNumber: string, script: any) {
  // Twilio integration
  const accountSid = process.env.TWILIO_ACCOUNT_SID!
  const authToken = process.env.TWILIO_AUTH_TOKEN!
  const fromNumber = process.env.TWILIO_PHONE_NUMBER!

  // TwiML that connects to ElevenLabs conversational AI
  // The actual voice synthesis happens through ElevenLabs WebSocket
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${process.env.ELEVENLABS_AGENT_URL || 'api.elevenlabs.io/v1/convai/conversation'}" />
  </Connect>
</Response>`

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`

  const params = new URLSearchParams({
    To: phoneNumber,
    From: fromNumber,
    Twiml: twiml,
    StatusCallback: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/agents/voice/webhook`,
    StatusCallbackEvent: 'initiated ringing answered completed',
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!response.ok) {
    throw new Error(`Twilio error: ${response.status} ${await response.text()}`)
  }

  return response.json()
}

async function getCallStatus(sid: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!
  const authToken = process.env.TWILIO_AUTH_TOKEN!

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${sid}.json`

  const response = await fetch(url, {
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
    },
  })

  if (!response.ok) {
    throw new Error(`Twilio status error: ${response.status}`)
  }

  const data = await response.json()
  return {
    status: data.status,
    duration: data.duration,
    transcript: null, // Would come from ElevenLabs callback
  }
}
