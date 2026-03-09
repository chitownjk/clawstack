/**
 * Voice Briefing via ElevenLabs TTS
 * Generates an audio version of the daily briefing.
 * Users can listen while getting kids ready, commuting, etc.
 *
 * Requires: ELEVENLABS_API_KEY
 * Optional: ELEVENLABS_VOICE_ID (defaults to a warm female voice)
 */

interface VoiceBriefingOptions {
  userName: string
  briefing: {
    summary?: string
    schedule?: Array<{ time: string; title: string; note?: string }>
    attention_items?: Array<{ text: string; priority: string }>
    tasks_summary?: string
    suggestions?: string[]
  }
  extractedItems?: Array<{ type: string; title: string; data?: any }>
}

/**
 * Generate an audio briefing and return it as a Buffer.
 * The caller can store it, stream it, or attach it to an email.
 */
export async function generateVoiceBriefing(
  options: VoiceBriefingOptions
): Promise<{ audio: Buffer; script: string } | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    console.warn('[VoiceBriefing] ELEVENLABS_API_KEY not configured')
    return null
  }

  try {
    const script = buildVoiceScript(options)

    // Default to "Rachel" -- warm, clear, natural-sounding
    const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: script,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      console.error('[VoiceBriefing] ElevenLabs error:', response.status, errText)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const audio = Buffer.from(arrayBuffer)

    console.log(`[VoiceBriefing] Generated ${(audio.length / 1024).toFixed(0)}KB audio`)
    return { audio, script }
  } catch (error) {
    console.error('[VoiceBriefing] Generation failed:', error)
    return null
  }
}

/**
 * Build a natural-sounding spoken script from the briefing data.
 * Written for TTS -- short sentences, natural pauses, conversational tone.
 */
function buildVoiceScript(options: VoiceBriefingOptions): string {
  const { userName, briefing, extractedItems } = options
  const firstName = userName.split(' ')[0] || 'there'
  const parts: string[] = []

  // Greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  parts.push(`${greeting}, ${firstName}. Here's your day.`)

  // Summary
  if (briefing.summary) {
    parts.push(briefing.summary)
  }

  // Extracted items (travel, bills)
  if (extractedItems && extractedItems.length > 0) {
    const flights = extractedItems.filter(i => i.type === 'flight')
    const bills = extractedItems.filter(i => i.type === 'bill')
    const deliveries = extractedItems.filter(i => i.type === 'delivery')

    if (flights.length > 0) {
      parts.push(`Quick heads up on travel: ${flights.map(f => f.title).join('. ')}.`)
    }
    if (bills.length > 0) {
      parts.push(`You have ${bills.length} bill${bills.length > 1 ? 's' : ''} to keep an eye on: ${bills.map(b => b.title).join(', ')}.`)
    }
    if (deliveries.length > 0) {
      parts.push(`${deliveries.length === 1 ? 'A package is' : `${deliveries.length} packages are`} expected: ${deliveries.map(d => d.title).join(', ')}.`)
    }
  }

  // High-priority attention items
  const highPri = (briefing.attention_items || []).filter(a => a.priority === 'high')
  if (highPri.length > 0) {
    parts.push(`Important: ${highPri.map(a => a.text).join('. ')}.`)
  }

  // Schedule
  const schedule = briefing.schedule || []
  if (schedule.length > 0) {
    parts.push(`Your schedule today:`)
    for (const event of schedule.slice(0, 6)) {
      const note = event.note ? `, ${event.note}` : ''
      parts.push(`At ${event.time}, ${event.title}${note}.`)
    }
    if (schedule.length > 6) {
      parts.push(`Plus ${schedule.length - 6} more.`)
    }
  } else {
    parts.push('Your calendar is clear today.')
  }

  // Tasks
  if (briefing.tasks_summary) {
    parts.push(typeof briefing.tasks_summary === 'string'
      ? briefing.tasks_summary
      : '')
  }

  // Suggestions (just the first one)
  const suggestions = briefing.suggestions || []
  if (suggestions.length > 0) {
    parts.push(`One suggestion: ${suggestions[0]}`)
  }

  // Sign off
  parts.push('Have a great day.')

  return parts.filter(Boolean).join(' ')
}
