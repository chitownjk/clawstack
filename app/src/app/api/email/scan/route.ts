import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getComposio } from '@/lib/composio'
import Anthropic from '@anthropic-ai/sdk'

// POST /api/email/scan
// Scans recent Gmail messages for actionable items:
// flights, hotels, bills, invites, subscriptions, deliveries, action items.
// Stores extracted items in the extracted_items table.
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

    const body = await request.json().catch(() => ({}))
    const maxMessages = Math.min(body.limit || 20, 50)

    // Check Gmail connection via Composio
    const composio = getComposio()
    const userId = `tiker_${session.user.id}`

    const connectedAccounts = await composio.connectedAccounts.list({
      userIds: [userId],
      toolkitSlugs: ['GMAIL'],
      statuses: ['ACTIVE'],
    })

    if (!connectedAccounts.items?.[0]) {
      return NextResponse.json({
        connected: false,
        items: [],
        message: 'Gmail not connected. Connect it in Settings to enable email intelligence.',
      })
    }

    // Step 1: List recent messages
    const messages = await fetchGmailMessages(composio, userId, maxMessages)

    if (messages.length === 0) {
      return NextResponse.json({
        connected: true,
        items: [],
        scanned: 0,
        message: 'No recent messages found.',
      })
    }

    // Step 2: Get full content of each message
    const fullMessages = await Promise.all(
      messages.map(msg => fetchGmailMessage(composio, userId, msg.id))
    )

    const validMessages = fullMessages.filter(Boolean)

    if (validMessages.length === 0) {
      return NextResponse.json({
        connected: true,
        items: [],
        scanned: messages.length,
        message: 'Could not read message contents.',
      })
    }

    // Step 3: AI classification - batch messages for efficiency
    const extractedItems = await classifyMessages(validMessages, account.id)

    // Step 4: Store extracted items (deduplicate by source_id)
    const stored: any[] = []
    for (const item of extractedItems) {
      // Check if we already extracted this item
      const { data: existing } = await adminClient
        .from('extracted_items')
        .select('id')
        .eq('account_id', account.id)
        .eq('source', 'email')
        .eq('source_id', item.source_id)
        .eq('type', item.type)
        .limit(1)

      if (existing && existing.length > 0) {
        continue // Already extracted, skip
      }

      const { data: inserted, error } = await adminClient
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
        .select()
        .single()

      if (!error && inserted) {
        stored.push(inserted)
      }
    }

    return NextResponse.json({
      connected: true,
      scanned: validMessages.length,
      extracted: extractedItems.length,
      stored: stored.length,
      items: extractedItems,
    })
  } catch (error) {
    console.error('[EmailScan] Error:', error)
    return NextResponse.json({ error: 'Failed to scan emails' }, { status: 500 })
  }
}

// ---- Gmail via Composio ----

async function fetchGmailMessages(
  composio: any,
  userId: string,
  maxResults: number
): Promise<Array<{ id: string; threadId?: string }>> {
  const TOOL_SLUGS = [
    'GMAIL_LIST_MESSAGES',
    'GMAIL_FETCH_EMAILS',
    'GMAIL_GET_MESSAGES',
  ]

  for (const slug of TOOL_SLUGS) {
    try {
      const result = await composio.tools.execute(slug, {
        userId,
        dangerouslySkipVersionCheck: true,
        arguments: {
          maxResults,
          // Only scan last 3 days of inbox
          q: 'in:inbox newer_than:3d',
          labelIds: ['INBOX'],
        },
      })

      // Walk response tree to find messages array
      const messages = findArray(result, ['messages', 'items', 'data'])
      if (messages.length > 0) {
        console.log(`[EmailScan] Found ${messages.length} messages with slug: ${slug}`)
        return messages.slice(0, maxResults)
      }
    } catch (slugError: any) {
      if (slugError?.message?.includes('Unable to retrieve tool')) {
        console.log(`[EmailScan] Slug ${slug} not found, trying next...`)
        continue
      }
      throw slugError
    }
  }

  console.log('[EmailScan] No valid Gmail list slug found')
  return []
}

async function fetchGmailMessage(
  composio: any,
  userId: string,
  messageId: string
): Promise<any | null> {
  const TOOL_SLUGS = [
    'GMAIL_GET_MESSAGE',
    'GMAIL_FETCH_MESSAGE',
    'GMAIL_READ_MESSAGE',
  ]

  for (const slug of TOOL_SLUGS) {
    try {
      const result = await composio.tools.execute(slug, {
        userId,
        dangerouslySkipVersionCheck: true,
        arguments: {
          messageId,
          id: messageId,
          format: 'full',
        },
      })

      if (!result) continue

      // Extract useful fields from the message
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
    } catch (slugError: any) {
      if (slugError?.message?.includes('Unable to retrieve tool')) continue
      console.error(`[EmailScan] Error reading message ${messageId}:`, slugError?.message)
      return null
    }
  }

  return null
}

// ---- AI Classification ----

async function classifyMessages(
  messages: any[],
  accountId: string
): Promise<Array<{
  source_id: string;
  type: string;
  title: string;
  data: any;
  expires_at?: string;
}>> {
  const anthropic = new Anthropic()

  // Batch messages into chunks of 10 for API efficiency
  const chunks = chunkArray(messages, 10)
  const allItems: any[] = []

  for (const chunk of chunks) {
    const messagesSummary = chunk.map((msg, i) => {
      const bodyPreview = (msg.body || msg.snippet || '').slice(0, 1000)
      return `MESSAGE ${i + 1} (id: ${msg.id}):
From: ${msg.from}
Subject: ${msg.subject}
Date: ${msg.date}
Body: ${bodyPreview}`
    }).join('\n\n---\n\n')

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 2000,
        system: `You are an email intelligence extractor. Analyze emails and extract actionable items. Only extract items you are confident about. Output valid JSON array.

Categories:
- "flight": Flight bookings, confirmations, itineraries. Extract: airline, flight_number, departure, arrival, date, confirmation_number.
- "hotel": Hotel reservations. Extract: hotel_name, check_in, check_out, confirmation_number, address.
- "bill": Bills, invoices, payment due. Extract: company, amount, due_date, account_number (last 4 only).
- "invite": Meeting invitations, event RSVPs. Extract: event_name, date, time, location, organizer.
- "delivery": Package tracking, shipping confirmations. Extract: retailer, tracking_number, carrier, expected_date.
- "subscription": Subscription confirmations, renewals, trials. Extract: service, amount, renewal_date, plan.
- "action_item": Explicit requests or commitments. Extract: description, deadline, from_person.

If a message contains no extractable items, skip it entirely. Do NOT force extraction.`,
        messages: [
          {
            role: 'user',
            content: `Extract actionable items from these emails. Return a JSON array of objects with fields: message_id, type, title, data (structured extraction per category), expires_at (ISO date if applicable, null otherwise).

${messagesSummary}

Return ONLY a valid JSON array. If no items found, return [].`,
          },
        ],
      })

      const aiText = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('')

      try {
        // Handle potential markdown code blocks in response
        const cleaned = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const items = JSON.parse(cleaned)

        if (Array.isArray(items)) {
          allItems.push(
            ...items.map((item: any) => ({
              source_id: item.message_id,
              type: item.type,
              title: item.title,
              data: item.data || {},
              expires_at: item.expires_at || null,
            }))
          )
        }
      } catch (parseError) {
        console.error('[EmailScan] Failed to parse AI classification:', parseError)
      }
    } catch (aiError) {
      console.error('[EmailScan] AI classification error:', aiError)
    }
  }

  return allItems
}

// ---- Utility Functions ----

function findArray(obj: any, keys: string[], depth = 0): any[] {
  if (!obj || depth > 5) return []
  if (Array.isArray(obj)) return obj
  for (const key of keys) {
    if (Array.isArray(obj[key])) return obj[key]
  }
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
  // If it has typical message fields, return it
  if (obj.payload || obj.snippet || obj.headers || obj.subject) return obj
  for (const key of ['data', 'response_data', 'result', 'body', 'output', 'message']) {
    if (obj[key] && typeof obj[key] === 'object') {
      const found = unwrapResult(obj[key], depth + 1)
      if (found) return found
    }
  }
  return obj
}

function extractHeader(msg: any, headerName: string): string {
  if (!msg?.payload?.headers && !msg?.headers) return ''
  const headers = msg.payload?.headers || msg.headers || []
  if (!Array.isArray(headers)) return ''
  const header = headers.find((h: any) =>
    h.name?.toLowerCase() === headerName.toLowerCase()
  )
  return header?.value || ''
}

function extractBody(msg: any): string {
  // Try to get plain text body from Gmail's structure
  const payload = msg.payload || msg

  // Simple text body
  if (payload.body?.data) {
    try {
      return Buffer.from(payload.body.data, 'base64url').toString('utf-8')
    } catch {
      return payload.body.data
    }
  }

  // Multipart - find text/plain
  if (Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        try {
          return Buffer.from(part.body.data, 'base64url').toString('utf-8')
        } catch {
          return part.body.data
        }
      }
    }
    // Fallback to first part with data
    for (const part of payload.parts) {
      if (part.body?.data) {
        try {
          return Buffer.from(part.body.data, 'base64url').toString('utf-8').slice(0, 2000)
        } catch {
          return part.body.data.slice(0, 2000)
        }
      }
    }
  }

  // Last resort: snippet
  return msg.snippet || ''
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}
