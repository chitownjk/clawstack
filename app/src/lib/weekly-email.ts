import { getTransporter } from './briefing-email'

interface WeeklyDigest {
  headline?: string
  days?: Array<{ day: string; date: string; highlights: string[] }>
  travel?: string | null
  bills_due?: string[]
  prep_suggestions?: string[]
  heads_up?: string | null
}

interface ExtractedItem {
  type: string
  title: string
  data: any
}

interface WeeklyEmailOptions {
  to: string
  userName: string
  weekStart: string
  weekEnd: string
  digest: WeeklyDigest
  extractedItems?: ExtractedItem[]
}

export async function sendWeeklyEmail(options: WeeklyEmailOptions): Promise<boolean> {
  try {
    const transporter = getTransporter()
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'briefing@tiker.io'

    const html = buildWeeklyHtml(options)
    const subject = buildWeeklySubject(options)

    await transporter.sendMail({
      from: `Tiker <${from}>`,
      to: options.to,
      subject,
      html,
    })

    console.log(`[WeeklyEmail] Sent to ${options.to}`)
    return true
  } catch (error) {
    console.error('[WeeklyEmail] Send failed:', error)
    return false
  }
}

function buildWeeklySubject(options: WeeklyEmailOptions): string {
  const { digest, extractedItems } = options
  const travel = extractedItems?.find(i => ['flight', 'hotel'].includes(i.type))
  if (travel) return `Your week ahead: ${travel.title}`
  if (digest.headline && digest.headline.length < 60) return digest.headline
  return `Your week at a glance`
}

function buildWeeklyHtml(options: WeeklyEmailOptions): string {
  const { userName, weekStart, weekEnd, digest, extractedItems } = options
  const firstName = userName.split(' ')[0] || 'there'

  // Format date range
  const startFormatted = new Date(weekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endFormatted = new Date(weekEnd + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  // Days
  const daysHtml = (digest.days || []).map(day => {
    const highlights = day.highlights?.map(h =>
      `<li style="margin-bottom: 4px; color: #374151; font-size: 14px;">${h}</li>`
    ).join('') || ''

    return `
      <div style="margin-bottom: 16px;">
        <div style="font-size: 14px; font-weight: 600; color: #1e40af; margin-bottom: 4px;">${day.day}</div>
        <ul style="margin: 0; padding-left: 16px; list-style: disc;">${highlights}</ul>
      </div>`
  }).join('')

  // Travel
  const travelHtml = digest.travel ? `
    <div style="background: #ecfdf5; padding: 14px 20px; border-radius: 8px; margin-bottom: 16px;">
      <div style="font-size: 13px; font-weight: 600; color: #065f46; margin-bottom: 4px;">&#x2708; Travel This Week</div>
      <p style="color: #047857; font-size: 14px; margin: 0;">${digest.travel}</p>
    </div>` : ''

  // Bills
  const billsHtml = (digest.bills_due || []).length > 0 ? `
    <div style="background: #fef3c7; padding: 14px 20px; border-radius: 8px; margin-bottom: 16px;">
      <div style="font-size: 13px; font-weight: 600; color: #92400e; margin-bottom: 4px;">&#x1f4b3; Bills Due</div>
      <ul style="margin: 0; padding-left: 16px;">
        ${(digest.bills_due || []).map(b => `<li style="color: #78350f; font-size: 14px; margin-bottom: 4px;">${b}</li>`).join('')}
      </ul>
    </div>` : ''

  // Prep suggestions
  const prepHtml = (digest.prep_suggestions || []).length > 0 ? `
    <div style="background: #eff6ff; padding: 14px 20px; border-radius: 8px; margin-bottom: 16px;">
      <div style="font-size: 13px; font-weight: 600; color: #1e40af; margin-bottom: 4px;">&#x1f4a1; Prep for the Week</div>
      <ul style="margin: 0; padding-left: 16px;">
        ${(digest.prep_suggestions || []).map(s => `<li style="color: #1e3a5f; font-size: 14px; margin-bottom: 4px;">${s}</li>`).join('')}
      </ul>
    </div>` : ''

  // Heads up
  const headsUpHtml = digest.heads_up ? `
    <div style="background: #f9fafb; padding: 14px 20px; border-radius: 8px; margin-bottom: 16px;">
      <div style="font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 4px;">&#x1f440; Heads Up</div>
      <p style="color: #4b5563; font-size: 14px; margin: 0;">${digest.heads_up}</p>
    </div>` : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px 16px;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e40af, #7c3aed); border-radius: 12px 12px 0 0; padding: 24px 24px 20px; color: white;">
      <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; margin-bottom: 4px;">Weekly Look-Ahead</div>
      <div style="font-size: 22px; font-weight: 600;">Hey ${firstName}, here's your week</div>
      <div style="font-size: 14px; opacity: 0.8; margin-top: 4px;">${startFormatted} - ${endFormatted}</div>
    </div>

    <!-- Headline -->
    <div style="background: white; padding: 20px 24px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0; font-weight: 500;">
        ${digest.headline || 'Here\'s what you\'ve got coming up.'}
      </p>
    </div>

    <!-- Content -->
    <div style="background: white; padding: 16px 24px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
      ${travelHtml}
      ${billsHtml}
      ${daysHtml}
      ${headsUpHtml}
      ${prepHtml}
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; border-radius: 0 0 12px 12px; padding: 16px 24px; border: 1px solid #e5e7eb; border-top: none; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://tiker.io'}/command" style="display: inline-block; padding: 10px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">
        Open Tiker
      </a>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 12px;">
        Manage email preferences in <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://tiker.io'}/settings/briefing" style="color: #6b7280;">Settings</a>
      </p>
    </div>

  </div>
</body>
</html>`
}
