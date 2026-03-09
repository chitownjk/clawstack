import nodemailer from 'nodemailer'

// Briefing email delivery via SMTP (Nodemailer)
// Configure via env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM

interface BriefingData {
  summary: string
  schedule: Array<{ time: string; title: string; location?: string }>
  attention_items: Array<{ text: string; priority: string }>
  tasks_summary: string
  suggestions: string[]
}

interface ExtractedItem {
  type: string
  title: string
  data: any
}

interface EmailBriefingOptions {
  to: string
  userName: string
  date: string
  briefing: BriefingData
  extractedItems?: ExtractedItem[]
  calendarConflicts?: Array<{ event1: string; event2: string; time: string }>
}

export function getTransporter() {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    throw new Error('SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS env vars.')
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

export async function sendBriefingEmail(options: EmailBriefingOptions): Promise<boolean> {
  try {
    const transporter = getTransporter()
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'briefing@tiker.io'

    const html = buildBriefingHtml(options)

    await transporter.sendMail({
      from: `Tiker <${from}>`,
      to: options.to,
      subject: buildSubjectLine(options),
      html,
    })

    console.log(`[BriefingEmail] Sent to ${options.to}`)
    return true
  } catch (error) {
    console.error('[BriefingEmail] Send failed:', error)
    return false
  }
}

function buildSubjectLine(options: EmailBriefingOptions): string {
  const { extractedItems, briefing } = options
  // Make the subject line pop with the most important item
  const flight = extractedItems?.find(i => i.type === 'flight')
  if (flight) return `Your ${flight.title} + today's plan`

  const bill = extractedItems?.find(i => i.type === 'bill')
  if (bill) return `Bill due: ${bill.title} + your day`

  const delivery = extractedItems?.find(i => i.type === 'delivery')
  if (delivery) return `Package arriving + today's schedule`

  const events = briefing?.schedule?.length || 0
  if (events > 3) return `Busy day ahead: ${events} things on your plate`

  return `Your day at a glance`
}

function buildBriefingHtml(options: EmailBriefingOptions): string {
  const { userName, date, briefing, extractedItems, calendarConflicts } = options

  const firstName = userName.split(' ')[0] || 'there'

  // Build schedule rows
  const scheduleRows = (briefing.schedule || [])
    .map(
      (event) => `
        <tr>
          <td style="padding: 8px 12px; color: #6b7280; font-size: 13px; white-space: nowrap; vertical-align: top;">${event.time}</td>
          <td style="padding: 8px 12px; color: #1f2937; font-size: 14px;">${event.title}${
            event.location ? `<br><span style="color: #9ca3af; font-size: 12px;">${event.location}</span>` : ''
          }</td>
        </tr>`
    )
    .join('')

  // Build attention items
  const attentionHtml = (briefing.attention_items || [])
    .map((item) => {
      const color =
        item.priority === 'high'
          ? '#ef4444'
          : item.priority === 'medium'
          ? '#f59e0b'
          : '#3b82f6'
      return `<li style="margin-bottom: 8px; padding-left: 4px;">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${color}; margin-right: 8px;"></span>
        ${item.text}
      </li>`
    })
    .join('')

  // Build extracted items
  const extractedHtml = (extractedItems || [])
    .slice(0, 5)
    .map((item) => {
      const icon =
        item.type === 'flight' ? '&#x2708;' :
        item.type === 'hotel' ? '&#x1f3e8;' :
        item.type === 'bill' ? '&#x1f4b3;' :
        item.type === 'delivery' ? '&#x1f4e6;' :
        item.type === 'invite' ? '&#x1f4c5;' :
        '&#x1f4cb;'
      return `<tr>
        <td style="padding: 6px 12px; font-size: 18px; vertical-align: middle;">${icon}</td>
        <td style="padding: 6px 12px; color: #1f2937; font-size: 14px;">${item.title}</td>
      </tr>`
    })
    .join('')

  // Build conflicts
  const conflictsHtml = (calendarConflicts || [])
    .map(
      (c) => `<li style="margin-bottom: 6px; color: #dc2626; font-size: 13px;">
        ${c.event1} overlaps with ${c.event2} at ${c.time}
      </li>`
    )
    .join('')

  // Build suggestions
  const suggestionsHtml = (briefing.suggestions || [])
    .map(
      (s) => `<li style="margin-bottom: 6px; color: #374151; font-size: 13px;">${s}</li>`
    )
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px 16px;">

    <!-- Header -->
    <div style="background: #1e40af; border-radius: 12px 12px 0 0; padding: 24px 24px 20px; color: white;">
      <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; margin-bottom: 4px;">Daily Briefing</div>
      <div style="font-size: 22px; font-weight: 600;">Good morning, ${firstName}</div>
      <div style="font-size: 14px; opacity: 0.8; margin-top: 4px;">${date}</div>
    </div>

    <!-- Summary -->
    <div style="background: white; padding: 20px 24px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0;">
        ${briefing.summary || 'No summary available.'}
      </p>
    </div>

    ${conflictsHtml ? `
    <!-- Conflicts -->
    <div style="background: #fef2f2; padding: 16px 24px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
      <div style="font-size: 13px; font-weight: 600; color: #dc2626; margin-bottom: 8px;">&#x26a0; Calendar Conflicts</div>
      <ul style="margin: 0; padding-left: 16px;">
        ${conflictsHtml}
      </ul>
    </div>
    ` : ''}

    ${attentionHtml ? `
    <!-- Attention Items -->
    <div style="background: #fffbeb; padding: 16px 24px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
      <div style="font-size: 13px; font-weight: 600; color: #92400e; margin-bottom: 8px;">Needs Your Attention</div>
      <ul style="margin: 0; padding-left: 8px; list-style: none;">
        ${attentionHtml}
      </ul>
    </div>
    ` : ''}

    ${scheduleRows ? `
    <!-- Schedule -->
    <div style="background: white; padding: 16px 24px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
      <div style="font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 12px;">Today's Schedule</div>
      <table style="width: 100%; border-collapse: collapse;">
        ${scheduleRows}
      </table>
    </div>
    ` : ''}

    ${briefing.tasks_summary ? `
    <!-- Tasks -->
    <div style="background: #f9fafb; padding: 16px 24px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
      <div style="font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 8px;">Tasks</div>
      <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin: 0;">
        ${briefing.tasks_summary}
      </p>
    </div>
    ` : ''}

    ${extractedHtml ? `
    <!-- Extracted Items -->
    <div style="background: white; padding: 16px 24px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
      <div style="font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 8px;">From Your Inbox</div>
      <table style="width: 100%; border-collapse: collapse;">
        ${extractedHtml}
      </table>
    </div>
    ` : ''}

    ${suggestionsHtml ? `
    <!-- Suggestions -->
    <div style="background: #eff6ff; padding: 16px 24px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
      <div style="font-size: 13px; font-weight: 600; color: #1e40af; margin-bottom: 8px;">Suggestions</div>
      <ul style="margin: 0; padding-left: 16px; list-style: disc;">
        ${suggestionsHtml}
      </ul>
    </div>
    ` : ''}

    <!-- Footer -->
    <div style="background: #f9fafb; border-radius: 0 0 12px 12px; padding: 16px 24px; border: 1px solid #e5e7eb; border-top: none; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://tiker.io'}/command" style="display: inline-block; padding: 10px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">
        Open Tiker
      </a>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 12px;">
        Manage your briefing preferences in <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://tiker.io'}/settings/briefing" style="color: #6b7280;">Settings</a>
      </p>
    </div>

  </div>
</body>
</html>`
}
