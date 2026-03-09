import { createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getComposio } from '@/lib/composio'
import Anthropic from '@anthropic-ai/sdk'
import { sendBriefingEmail } from '@/lib/briefing-email'
import { sendSmsBriefing } from '@/lib/sms-briefing'
import { generateVoiceBriefing } from '@/lib/voice-briefing'
import { decrypt } from '@/lib/crypto'
import { isPlaidConfigured, syncRecurringToExtractedItems } from '@/lib/plaid'

// GET /api/briefing/cron
// Vercel Cron handler: generates daily briefings for all users.
// Scheduled to run at 6 AM ET (configurable per user via briefing_time).
// Uses CRON_SECRET env var for authentication.
//
// vercel.json crons config:
// { "crons": [{ "path": "/api/briefing/cron", "schedule": "0 10 * * *" }] }
// (10 UTC = 6 AM ET during EDT, 5 AM during EST)
export async function GET(request: Request) {
  try {
    // Verify cron secret (Vercel sends this header for cron jobs)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('[Cron] CRON_SECRET not configured - endpoint disabled')
      return NextResponse.json({ error: 'Cron endpoint not configured' }, { status: 503 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get ALL accounts -- briefing is the core value prop, no tier gate
    const { data: accounts, error: accountsError } = await adminClient
      .from('accounts')
      .select(`
        id,
        auth_uid,
        plan_tier,
        plaid_access_token
      `)

    if (accountsError || !accounts) {
      console.error('[Cron] Failed to fetch accounts:', accountsError)
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
    }

    // Get user preferences for briefing settings
    const { data: preferences } = await adminClient
      .from('mc_user_preferences')
      .select('account_id, briefing_time, briefing_email, briefing_sms, briefing_voice, briefing_phone, briefing_sections, timezone')

    const prefMap = new Map(
      (preferences || []).map(p => [p.account_id, p])
    )

    const now = new Date()
    const results: Array<{ account_id: string; status: string; error?: string }> = []

    for (const account of accounts) {
      try {
        const prefs = prefMap.get(account.id)
        const userTimezone = prefs?.timezone || 'America/New_York'

        // Check if it's the right time for this user's briefing
        const userTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }))
        const userHour = userTime.getHours()
        const briefingHour = parseInt((prefs?.briefing_time || '06:00').split(':')[0])

        // Only generate if we're within the briefing hour window (allow 1 hour tolerance)
        if (Math.abs(userHour - briefingHour) > 1) {
          results.push({
            account_id: account.id,
            status: 'skipped',
            error: `Not briefing time (user hour: ${userHour}, briefing hour: ${briefingHour})`,
          })
          continue
        }

        // Sync Plaid recurring transactions if connected
        if (account.plaid_access_token && isPlaidConfigured()) {
          try {
            const accessToken = decrypt(account.plaid_access_token)
            const synced = await syncRecurringToExtractedItems(adminClient, account.id, accessToken)
            if (synced > 0) console.log(`[Cron] Plaid synced ${synced} items for ${account.id}`)
          } catch (plaidErr) {
            console.error(`[Cron] Plaid sync failed for ${account.id}:`, plaidErr)
          }
        }

        // Generate briefing
        const todayStr = userTime.toISOString().split('T')[0]

        // Check if briefing already exists for today
        const { data: existing } = await adminClient
          .from('briefings')
          .select('id')
          .eq('account_id', account.id)
          .eq('date', todayStr)
          .single()

        if (existing) {
          results.push({ account_id: account.id, status: 'exists' })
          continue
        }

        // Generate the briefing data
        const briefingData = await generateBriefingForAccount(
          adminClient,
          account,
          todayStr,
          prefs
        )

        if (briefingData) {
          // Store the briefing
          await adminClient
            .from('briefings')
            .upsert(
              {
                account_id: account.id,
                date: todayStr,
                content: briefingData.content,
                sections: briefingData.sections,
                metadata: briefingData.metadata,
              },
              { onConflict: 'account_id,date' }
            )

          results.push({ account_id: account.id, status: 'generated' })

          // Send briefing email -- default to ON unless user explicitly disabled
          const emailEnabled = prefs?.briefing_email !== false
          if (emailEnabled) {
            try {
              // Get user email from Supabase auth
              const { data: authData } = await adminClient.auth.admin.getUserById(account.auth_uid)
              const userEmail = authData?.user?.email
              const userName = authData?.user?.user_metadata?.full_name || authData?.user?.email?.split('@')[0] || 'there'

              if (userEmail && process.env.SMTP_HOST) {
                // Fetch extracted items for the email
                let extractedItems: any[] = []
                try {
                  const { data: items } = await adminClient
                    .from('extracted_items')
                    .select('type, title, data')
                    .eq('account_id', account.id)
                    .eq('dismissed', false)
                    .eq('processed', false)
                    .limit(5)
                  extractedItems = items || []
                } catch { /* table may not exist */ }

                const emailSent = await sendBriefingEmail({
                  to: userEmail,
                  userName,
                  date: todayStr,
                  briefing: briefingData.sections as any,
                  extractedItems,
                })

                if (emailSent) {
                  console.log(`[Cron] Briefing email sent to ${userEmail}`)
                }
              }
            } catch (emailError) {
              console.error(`[Cron] Email send failed for ${account.id}:`, emailError)
            }
          }

          // SMS briefing -- send if user has a phone number configured
          if (prefs?.briefing_sms !== false && prefs?.briefing_phone) {
            try {
              let smsExtractedItems: any[] = []
              try {
                const { data: items } = await adminClient
                  .from('extracted_items')
                  .select('type, title, data')
                  .eq('account_id', account.id)
                  .eq('dismissed', false)
                  .eq('processed', false)
                  .limit(5)
                smsExtractedItems = items || []
              } catch { /* table may not exist */ }

              const { data: authData2 } = await adminClient.auth.admin.getUserById(account.auth_uid)
              const smsUserName = authData2?.user?.user_metadata?.full_name || 'there'

              await sendSmsBriefing({
                to: prefs.briefing_phone,
                userName: smsUserName,
                briefing: briefingData.sections as any,
                extractedItems: smsExtractedItems,
              })
            } catch (smsError) {
              console.error(`[Cron] SMS send failed for ${account.id}:`, smsError)
            }
          }

          // Voice briefing -- generate audio and store URL
          if (prefs?.briefing_voice === true) {
            try {
              let voiceExtractedItems: any[] = []
              try {
                const { data: items } = await adminClient
                  .from('extracted_items')
                  .select('type, title, data')
                  .eq('account_id', account.id)
                  .eq('dismissed', false)
                  .eq('processed', false)
                  .limit(5)
                voiceExtractedItems = items || []
              } catch { /* table may not exist */ }

              const { data: authData3 } = await adminClient.auth.admin.getUserById(account.auth_uid)
              const voiceUserName = authData3?.user?.user_metadata?.full_name || 'there'

              const voiceResult = await generateVoiceBriefing({
                userName: voiceUserName,
                briefing: briefingData.sections as any,
                extractedItems: voiceExtractedItems,
              })

              if (voiceResult) {
                // Store audio as base64 in the briefing metadata for playback
                await adminClient
                  .from('briefings')
                  .update({
                    metadata: {
                      ...briefingData.metadata,
                      voice_audio_size: voiceResult.audio.length,
                      voice_script: voiceResult.script,
                      has_voice: true,
                    },
                  })
                  .eq('account_id', account.id)
                  .eq('date', todayStr)

                console.log(`[Cron] Voice briefing generated for ${account.id}`)
              }
            } catch (voiceError) {
              console.error(`[Cron] Voice generation failed for ${account.id}:`, voiceError)
            }
          }
        } else {
          results.push({ account_id: account.id, status: 'failed', error: 'Generation returned null' })
        }
      } catch (accountError: any) {
        console.error(`[Cron] Error for account ${account.id}:`, accountError)
        results.push({
          account_id: account.id,
          status: 'error',
          error: accountError?.message || 'Unknown error',
        })
      }
    }

    const generated = results.filter(r => r.status === 'generated').length
    const skipped = results.filter(r => r.status === 'skipped').length
    const existing = results.filter(r => r.status === 'exists').length
    const errors = results.filter(r => r.status === 'error').length

    console.log(`[Cron] Briefing generation complete: ${generated} generated, ${skipped} skipped, ${existing} existing, ${errors} errors`)

    return NextResponse.json({
      success: true,
      total: accounts.length,
      generated,
      skipped,
      existing,
      errors,
      results,
    })
  } catch (error) {
    console.error('[Cron] Fatal error:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}

// Generate briefing for a specific account (server-side, no auth needed)
async function generateBriefingForAccount(
  adminClient: any,
  account: { id: string; auth_uid: string; plan_tier: string },
  dateStr: string,
  prefs: any
): Promise<{ content: any; sections: any; metadata: any } | null> {
  try {
    // Fetch calendar events
    const calendarEvents = await fetchCalendarForUser(account.auth_uid, dateStr)

    // Fetch tasks
    const { data: tasks } = await adminClient
      .from('mc_tasks')
      .select('id, title, status, priority, due_date, assigned_agent_ids, completed_at')
      .eq('account_id', account.id)
      .order('created_at', { ascending: false })
      .limit(100)

    const allTasks = tasks || []
    const active = allTasks.filter((t: any) => t.status !== 'done')
    const review = active.filter((t: any) => t.status === 'review')
    const blocked = active.filter((t: any) => t.status === 'blocked')
    const dueToday = active.filter((t: any) => t.due_date?.startsWith(dateStr))

    // Fetch recent activities
    const { data: activities } = await adminClient
      .from('mc_activities')
      .select('id, type, message, created_at')
      .eq('account_id', account.id)
      .neq('type', 'heartbeat')
      .order('created_at', { ascending: false })
      .limit(15)

    // Fetch unprocessed extracted items
    let extractedItems: any[] = []
    try {
      const { data } = await adminClient
        .from('extracted_items')
        .select('type, title, data')
        .eq('account_id', account.id)
        .eq('dismissed', false)
        .eq('processed', false)
        .limit(20)
      extractedItems = data || []
    } catch {
      // Table may not exist yet
    }

    // Build prompt
    const calSection = calendarEvents.length > 0
      ? `CALENDAR (${calendarEvents.length} events):\n${calendarEvents.map((e: any) => {
          const time = e.allDay ? 'All day' : new Date(e.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          return `- ${time}: ${e.title}${e.location ? ` @ ${e.location}` : ''}`
        }).join('\n')}`
      : 'CALENDAR: No events.'

    const taskSection = `TASKS: ${active.length} active, ${review.length} review, ${blocked.length} blocked, ${dueToday.length} due today`

    const extractSection = extractedItems.length > 0
      ? `EXTRACTED: ${extractedItems.map((e: any) => `[${e.type}] ${e.title}`).join(', ')}`
      : ''

    const prompt = `Generate a daily briefing for ${dateStr}.

${calSection}

${taskSection}

${extractSection}

Output JSON:
{
  "summary": "2-3 sentence overview. Lead with the most important thing: an upcoming flight, a bill due today, a packed schedule, or a calm day. Be specific and actionable, not generic. Mention people and events by name.",
  "schedule": [{ "time": "9:00 AM", "title": "...", "type": "meeting|event|task|travel|personal", "note": "optional 1-line context" }],
  "attention_items": [{ "text": "specific actionable item", "priority": "high|medium|low" }],
  "tasks_summary": "1 sentence on task load",
  "suggestions": ["1-3 short, specific suggestions based on the day's context"]
}`

    const anthropic = new Anthropic()
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: `You are Tiker, a personal life operator for busy people managing family, work, and everything in between.

Your briefing should feel like a smart friend who already read your email and calendar. Be warm but concise.

Rules:
- Lead with what matters most today (travel, deadlines, school events, bills due)
- If there's a flight or trip coming up, mention it prominently with confirmation details
- Flag logistics conflicts ("soccer pickup is 15 min after your meeting ends")
- Bills and payments due within 3 days are always high-priority attention items
- Deliveries expected today go in the schedule
- Be specific: "Your Southwest flight to Denver departs at 2:15 PM" not "You have travel today"
- Keep suggestions actionable and contextual, not generic productivity advice
- If the day looks light, say so -- "clear afternoon" is useful info`,
      messages: [{ role: 'user', content: prompt }],
    })

    const aiText = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('')

    let sections = {}
    try {
      sections = JSON.parse(aiText)
    } catch {
      sections = { summary: aiText }
    }

    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

    return {
      content: {
        greeting,
        date: dateStr,
        generated_at: new Date().toISOString(),
        raw_data: {
          calendar_count: calendarEvents.length,
          active_tasks: active.length,
          review_tasks: review.length,
          extracted_items: extractedItems.length,
          recent_activities: (activities || []).length,
        },
      },
      sections,
      metadata: {
        model: 'claude-haiku-4-5-20251001',
        tokens_used: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
        source: 'cron',
      },
    }
  } catch (error) {
    console.error(`[Cron] Briefing generation failed for ${account.id}:`, error)
    return null
  }
}

async function fetchCalendarForUser(authUid: string, dateStr: string): Promise<any[]> {
  try {
    const composio = getComposio()
    const userId = `tiker_${authUid}`

    const connectedAccounts = await composio.connectedAccounts.list({
      userIds: [userId],
      toolkitSlugs: ['GOOGLECALENDAR'],
      statuses: ['ACTIVE'],
    })

    if (!connectedAccounts.items?.[0]) return []

    const timeMin = new Date(dateStr).toISOString()
    const timeMax = new Date(dateStr + 'T23:59:59').toISOString()

    const SLUGS = ['GOOGLECALENDAR_EVENTS_LIST', 'GOOGLECALENDAR_LIST_EVENTS']

    for (const slug of SLUGS) {
      try {
        const result = await composio.tools.execute(slug, {
          userId,
          dangerouslySkipVersionCheck: true,
          arguments: { timeMin, timeMax, singleEvents: true, orderBy: 'startTime', maxResults: 50 },
        })

        const events = findEventsInResult(result)
        if (events.length > 0) {
          return events.map((e: any) => ({
            title: e.summary || e.title || 'Untitled',
            start: e.start?.dateTime || e.start?.date || e.start,
            end: e.end?.dateTime || e.end?.date || e.end,
            allDay: !e.start?.dateTime,
            location: e.location,
            attendees: e.attendees?.length || 0,
          }))
        }
      } catch (err: any) {
        if (err?.message?.includes('Unable to retrieve tool')) continue
        throw err
      }
    }

    return []
  } catch {
    return []
  }
}

function findEventsInResult(obj: any, depth = 0): any[] {
  if (!obj || depth > 5) return []
  if (Array.isArray(obj)) return obj
  if (Array.isArray(obj.items)) return obj.items
  if (Array.isArray(obj.events)) return obj.events
  for (const key of ['data', 'response_data', 'result', 'body', 'output']) {
    if (obj[key] && typeof obj[key] === 'object') {
      const found = findEventsInResult(obj[key], depth + 1)
      if (found.length > 0) return found
    }
  }
  return []
}
