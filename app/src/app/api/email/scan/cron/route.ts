import { createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getComposio } from '@/lib/composio'
import Anthropic from '@anthropic-ai/sdk'

// GET /api/email/scan/cron
// Vercel Cron: scans Gmail for ALL accounts with active Gmail connections.
// Runs 30 min before briefing cron so extracted_items are fresh for the briefing.
//
// vercel.json: { "path": "/api/email/scan/cron", "schedule": "30 9 * * *" }
// (9:30 UTC = 5:30 AM ET during EDT)
export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('[EmailScanCron] CRON_SECRET not configured')
      return NextResponse.json({ error: 'Cron not configured' }, { status: 503 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get ALL accounts (no tier gate -- email scan is the core value)
    const { data: accounts, error: accountsError } = await adminClient
      .from('accounts')
      .select('id, auth_uid')

    if (accountsError || !accounts) {
      console.error('[EmailScanCron] Failed to fetch accounts:', accountsError)
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
    }

    const composio = getComposio()
    const anthropic = new Anthropic()
    const results: Array<{ account_id: string; status: string; scanned?: number; extracted?: number; error?: string }> = []

    for (const account of accounts) {
      try {
        const userId = `tiker_${account.auth_uid}`

        // Check Gmail connection
        const connectedAccounts = await composio.connectedAccounts.list({
          userIds: [userId],
          toolkitSlugs: ['GMAIL'],
          statuses: ['ACTIVE'],
        })

        if (!connectedAccounts.items?.[0]) {
          results.push({ account_id: account.id, status: 'no_gmail' })
          continue
        }

        // Fetch recent messages (last 3 days, max 30)
        const messages = await fetchGmailMessages(composio, userId, 30)
        if (messages.length === 0) {
          results.push({ account_id: account.id, status: 'no_messages', scanned: 0 })
          continue
        }

        // Get full content
        const fullMessages = await Promise.all(
          messages.map(msg => fetchGmailMessage(composio, userId, msg.id))
        )
        const validMessages = fullMessages.filter(Boolean)

        if (validMessages.length === 0) {
          results.push({ account_id: account.id, status: 'no_readable', scanned: messages.length })
          continue
        }

        // AI classification
        const extractedItems = await classifyMessages(anthropic, validMessages)

        // Store (deduplicate)
        let stored = 0
        for (const item of extractedItems) {
          const { data: existing } = await adminClient
            .from('extracted_items')
            .select('id')
            .eq('account_id', account.id)
            .eq('source', 'email')
            .eq('source_id', item.source_id)
            .eq('type', item.type)
            .limit(1)

          if (existing && existing.length > 0) continue

          const { error } = await adminClient
            .from('extracted_items')
            .insert({
              account_id: account.id,
              source: 'email',
              source_id: item.source_id,
              type: item.type,
              title: item.title,
              data: item.data,
              expires_at: item.expires_at || null,
            })

          if (!error) stored++
        }

        // Auto-process: add flights/hotels/invites to calendar automatically
        await autoProcessItems(composio, adminClient, account, userId)

        results.push({
          account_id: account.id,
          status: 'scanned',
          scanned: validMessages.length,
          extracted: stored,
        })
      } catch (accountError: any) {
        console.error(`[EmailScanCron] Error for ${account.id}:`, accountError?.message)
        results.push({
          account_id: account.id,
          status: 'error',
          error: accountError?.message || 'Unknown error',
        })
      }
    }

    const scanned = results.filter(r => r.status === 'scanned').length
    const noGmail = results.filter(r => r.status === 'no_gmail').length
    const errors = results.filter(r => r.status === 'error').length
    const totalExtracted = results.reduce((sum, r) => sum + (r.extracted || 0), 0)

    console.log(`[EmailScanCron] Complete: ${scanned} scanned, ${totalExtracted} new items, ${noGmail} no Gmail, ${errors} errors`)

    return NextResponse.json({
      success: true,
      total: accounts.length,
      scanned,
      noGmail,
      errors,
      totalExtracted,
      results,
    })
  } catch (error) {
    console.error('[EmailScanCron] Fatal error:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}

// Auto-process: flights, hotels, and invites get added to Google Calendar automatically.
// Bills get a reminder created. User can always dismiss from the app.
async function autoProcessItems(
  composio: any,
  adminClient: any,
  account: { id: string; auth_uid: string },
  userId: string,
) {
  try {
    // Get unprocessed calendar-able items
    const { data: items } = await adminClient
      .from('extracted_items')
      .select('*')
      .eq('account_id', account.id)
      .eq('processed', false)
      .eq('dismissed', false)
      .in('type', ['flight', 'hotel', 'invite'])
      .limit(10)

    if (!items || items.length === 0) return

    // Check Google Calendar connection
    const calAccounts = await composio.connectedAccounts.list({
      userIds: [userId],
      toolkitSlugs: ['GOOGLECALENDAR'],
      statuses: ['ACTIVE'],
    })

    if (!calAccounts.items?.[0]) return

    for (const item of items) {
      try {
        const eventDetails = buildEventFromExtraction(item)

        const TOOL_SLUGS = [
          'GOOGLECALENDAR_EVENTS_CREATE',
          'GOOGLECALENDAR_CREATE_EVENT',
          'GOOGLECALENDAR_INSERT_EVENT',
        ]

        let created = false
        for (const slug of TOOL_SLUGS) {
          try {
            const result = await composio.tools.execute(slug, {
              userId,
              dangerouslySkipVersionCheck: true,
              arguments: eventDetails,
            })
            const eventId = result?.data?.id || result?.id || 'created'

            await adminClient
              .from('extracted_items')
              .update({
                processed: true,
                data: {
                  ...item.data,
                  calendar_event_id: eventId,
                  auto_processed: true,
                  processed_at: new Date().toISOString(),
                },
              })
              .eq('id', item.id)

            console.log(`[EmailScanCron] Auto-added ${item.type} to calendar: ${item.title}`)
            created = true
            break
          } catch (slugError: any) {
            if (slugError?.message?.includes('Unable to retrieve tool')) continue
            throw slugError
          }
        }

        if (!created) {
          console.warn(`[EmailScanCron] Could not auto-add ${item.type} to calendar`)
        }
      } catch (itemError) {
        console.error(`[EmailScanCron] Auto-process error for item ${item.id}:`, itemError)
      }
    }
  } catch (error) {
    console.error('[EmailScanCron] Auto-process error:', error)
  }
}

// ---- Event builder (same logic as /api/email/extract) ----

function buildEventFromExtraction(item: any): Record<string, any> {
  const data = item.data || {}

  switch (item.type) {
    case 'flight': {
      const departure = data.date || data.departure_date
      const summary = `${data.airline || 'Flight'} ${data.flight_number || ''} - ${data.departure_airport || data.departure || ''} to ${data.arrival_airport || data.arrival || ''}`.trim()
      const description = [
        data.confirmation_number ? `Confirmation: ${data.confirmation_number}` : '',
        data.airline ? `Airline: ${data.airline}` : '',
        data.flight_number ? `Flight: ${data.flight_number}` : '',
        'Auto-added by Tiker from your email',
      ].filter(Boolean).join('\n')

      return {
        summary,
        description,
        start: {
          dateTime: departure ? new Date(departure).toISOString() : new Date().toISOString(),
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: departure
            ? new Date(new Date(departure).getTime() + 3 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          timeZone: 'America/New_York',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 24 * 60 },
            { method: 'popup', minutes: 3 * 60 },
          ],
        },
      }
    }

    case 'hotel': {
      return {
        summary: `Hotel: ${data.hotel_name || 'Hotel Stay'}`,
        description: [
          data.confirmation_number ? `Confirmation: ${data.confirmation_number}` : '',
          data.address ? `Address: ${data.address}` : '',
          'Auto-added by Tiker from your email',
        ].filter(Boolean).join('\n'),
        start: { date: data.check_in || new Date().toISOString().split('T')[0] },
        end: { date: data.check_out || new Date(Date.now() + 86400000).toISOString().split('T')[0] },
      }
    }

    case 'invite': {
      const eventDate = data.date
      const description = [
        data.organizer ? `Organizer: ${data.organizer}` : '',
        data.location ? `Location: ${data.location}` : '',
        'Auto-added by Tiker from your email',
      ].filter(Boolean).join('\n')

      if (data.time && eventDate) {
        const dateTimeStr = `${eventDate}T${data.time}`
        return {
          summary: data.event_name || item.title || 'Event',
          description,
          location: data.location,
          start: { dateTime: new Date(dateTimeStr).toISOString(), timeZone: 'America/New_York' },
          end: { dateTime: new Date(new Date(dateTimeStr).getTime() + 60 * 60 * 1000).toISOString(), timeZone: 'America/New_York' },
        }
      }

      return {
        summary: data.event_name || item.title || 'Event',
        description,
        location: data.location,
        start: { date: eventDate || new Date().toISOString().split('T')[0] },
        end: { date: eventDate || new Date().toISOString().split('T')[0] },
      }
    }

    default:
      return {
        summary: item.title,
        description: `Auto-added by Tiker\nType: ${item.type}`,
        start: { date: new Date().toISOString().split('T')[0] },
        end: { date: new Date().toISOString().split('T')[0] },
      }
  }
}

// ---- Gmail helpers (duplicated from scan route for cron isolation) ----

async function fetchGmailMessages(composio: any, userId: string, maxResults: number): Promise<Array<{ id: string }>> {
  const TOOL_SLUGS = ['GMAIL_LIST_MESSAGES', 'GMAIL_FETCH_EMAILS', 'GMAIL_GET_MESSAGES']
  for (const slug of TOOL_SLUGS) {
    try {
      const result = await composio.tools.execute(slug, {
        userId,
        dangerouslySkipVersionCheck: true,
        arguments: { maxResults, q: 'in:inbox newer_than:3d', labelIds: ['INBOX'] },
      })
      const messages = findArray(result, ['messages', 'items', 'data'])
      if (messages.length > 0) return messages.slice(0, maxResults)
    } catch (e: any) {
      if (e?.message?.includes('Unable to retrieve tool')) continue
      throw e
    }
  }
  return []
}

async function fetchGmailMessage(composio: any, userId: string, messageId: string): Promise<any | null> {
  const TOOL_SLUGS = ['GMAIL_GET_MESSAGE', 'GMAIL_FETCH_MESSAGE', 'GMAIL_READ_MESSAGE']
  for (const slug of TOOL_SLUGS) {
    try {
      const result = await composio.tools.execute(slug, {
        userId,
        dangerouslySkipVersionCheck: true,
        arguments: { messageId, id: messageId, format: 'full' },
      })
      if (!result) continue
      const msg = unwrapResult(result)
      if (msg) {
        return {
          id: messageId,
          subject: extractHeader(msg, 'Subject') || msg.subject || '',
          from: extractHeader(msg, 'From') || msg.from || '',
          to: extractHeader(msg, 'To') || msg.to || '',
          date: extractHeader(msg, 'Date') || msg.date || msg.internalDate || '',
          snippet: msg.snippet || '',
          body: extractBody(msg),
        }
      }
    } catch (e: any) {
      if (e?.message?.includes('Unable to retrieve tool')) continue
      return null
    }
  }
  return null
}

async function classifyMessages(anthropic: Anthropic, messages: any[]): Promise<Array<{ source_id: string; type: string; title: string; data: any; expires_at?: string }>> {
  const chunks = chunkArray(messages, 10)
  const allItems: any[] = []

  for (const chunk of chunks) {
    const messagesSummary = chunk.map((msg, i) => {
      const bodyPreview = (msg.body || msg.snippet || '').slice(0, 1000)
      return `MESSAGE ${i + 1} (id: ${msg.id}):\nFrom: ${msg.from}\nSubject: ${msg.subject}\nDate: ${msg.date}\nBody: ${bodyPreview}`
    }).join('\n\n---\n\n')

    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: `You are an email intelligence extractor for a family life management app. Analyze emails and extract actionable items. Be especially attentive to:
- Flight/travel confirmations (airlines, hotels, car rentals)
- Kid-related items (school emails, sports signups, pediatric appointments)
- Bills and payment reminders (utilities, insurance, subscriptions)
- Package deliveries and tracking
- Event invitations and RSVPs
- Action items that need follow-up

Categories: flight, hotel, bill, invite, delivery, subscription, action_item.
Only extract items you are confident about. Output valid JSON array.`,
        messages: [{
          role: 'user',
          content: `Extract actionable items from these emails. Return a JSON array of objects with: message_id, type, title, data (structured), expires_at (ISO date or null).\n\n${messagesSummary}\n\nReturn ONLY a valid JSON array. If no items, return [].`,
        }],
      })

      const aiText = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')
      try {
        const cleaned = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const items = JSON.parse(cleaned)
        if (Array.isArray(items)) {
          allItems.push(...items.map((item: any) => ({
            source_id: item.message_id,
            type: item.type,
            title: item.title,
            data: item.data || {},
            expires_at: item.expires_at || null,
          })))
        }
      } catch { /* parse error, skip chunk */ }
    } catch { /* AI error, skip chunk */ }
  }

  return allItems
}

function findArray(obj: any, keys: string[], depth = 0): any[] {
  if (!obj || depth > 5) return []
  if (Array.isArray(obj)) return obj
  for (const key of keys) { if (Array.isArray(obj[key])) return obj[key] }
  for (const key of ['data', 'response_data', 'result', 'body', 'output']) {
    if (obj[key] && typeof obj[key] === 'object') {
      const found = findArray(obj[key], keys, depth + 1)
      if (found.length > 0) return found
    }
  }
  return []
}

function unwrapResult(obj: any, depth = 0): any {
  if (!obj || depth > 5) return null
  if (obj.payload || obj.snippet || obj.headers || obj.subject) return obj
  for (const key of ['data', 'response_data', 'result', 'body', 'output', 'message']) {
    if (obj[key] && typeof obj[key] === 'object') {
      const found = unwrapResult(obj[key], depth + 1)
      if (found) return found
    }
  }
  return obj
}

function extractHeader(msg: any, name: string): string {
  const headers = msg?.payload?.headers || msg?.headers || []
  if (!Array.isArray(headers)) return ''
  const h = headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())
  return h?.value || ''
}

function extractBody(msg: any): string {
  const payload = msg.payload || msg
  if (payload.body?.data) {
    try { return Buffer.from(payload.body.data, 'base64url').toString('utf-8') } catch { return payload.body.data }
  }
  if (Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        try { return Buffer.from(part.body.data, 'base64url').toString('utf-8') } catch { return part.body.data }
      }
    }
    for (const part of payload.parts) {
      if (part.body?.data) {
        try { return Buffer.from(part.body.data, 'base64url').toString('utf-8').slice(0, 2000) } catch { return part.body.data.slice(0, 2000) }
      }
    }
  }
  return msg.snippet || ''
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}
