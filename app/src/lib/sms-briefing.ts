/**
 * SMS Briefing via Twilio
 * Sends a condensed daily briefing as a text message.
 * Perfect for busy parents who scan their phone at 6 AM.
 *
 * Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 */

interface SmsBriefingOptions {
  to: string // User's phone number (E.164 format)
  userName: string
  briefing: {
    summary?: string
    schedule?: Array<{ time: string; title: string }>
    attention_items?: Array<{ text: string; priority: string }>
    tasks_summary?: string
  }
  extractedItems?: Array<{ type: string; title: string; data?: any }>
}

const TYPE_EMOJI: Record<string, string> = {
  flight: '✈️',
  hotel: '🏨',
  bill: '💳',
  delivery: '📦',
  invite: '📅',
  subscription: '🔄',
  action_item: '⚡',
}

export async function sendSmsBriefing(options: SmsBriefingOptions): Promise<boolean> {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.warn('[SMS] Twilio not configured, skipping SMS briefing')
    return false
  }

  try {
    const message = buildSmsBody(options)

    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
    const params = new URLSearchParams({
      To: options.to,
      From: TWILIO_PHONE_NUMBER,
      Body: message,
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('[SMS] Twilio error:', response.status, errText)
      return false
    }

    console.log(`[SMS] Briefing sent to ${options.to.slice(0, 6)}***`)
    return true
  } catch (error) {
    console.error('[SMS] Send failed:', error)
    return false
  }
}

function buildSmsBody(options: SmsBriefingOptions): string {
  const { userName, briefing, extractedItems } = options
  const firstName = userName.split(' ')[0] || 'Hey'
  const lines: string[] = []

  // Greeting + summary
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : 'Good afternoon'
  lines.push(`${greeting} ${firstName}!`)

  if (briefing.summary) {
    // Truncate summary to ~100 chars for SMS
    const summary = briefing.summary.length > 120
      ? briefing.summary.slice(0, 117) + '...'
      : briefing.summary
    lines.push(summary)
  }

  // High-priority extracted items (flights, bills due)
  if (extractedItems && extractedItems.length > 0) {
    const urgent = extractedItems.filter(i => ['flight', 'bill'].includes(i.type))
    for (const item of urgent.slice(0, 3)) {
      const emoji = TYPE_EMOJI[item.type] || '📌'
      lines.push(`${emoji} ${item.title}`)
    }
  }

  // High-priority attention items
  const highPri = (briefing.attention_items || []).filter(a => a.priority === 'high')
  for (const item of highPri.slice(0, 2)) {
    lines.push(`⚠️ ${item.text}`)
  }

  // Today's schedule (top 4 events)
  const schedule = (briefing.schedule || []).slice(0, 4)
  if (schedule.length > 0) {
    lines.push('')
    for (const event of schedule) {
      lines.push(`${event.time} ${event.title}`)
    }
  }

  // Tasks summary
  if (briefing.tasks_summary) {
    lines.push('')
    lines.push(typeof briefing.tasks_summary === 'string'
      ? briefing.tasks_summary
      : `${(briefing.tasks_summary as any).active || 0} tasks active`)
  }

  // Footer
  lines.push('')
  lines.push(`Full briefing: ${process.env.NEXT_PUBLIC_APP_URL || 'https://tiker.io'}/command`)

  // SMS limit is 1600 chars (10 segments). Target under 480 (3 segments).
  const body = lines.join('\n')
  return body.length > 480 ? body.slice(0, 477) + '...' : body
}
