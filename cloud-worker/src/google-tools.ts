import { SupabaseClient } from '@supabase/supabase-js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope: string;
}

/**
 * Refresh Google OAuth tokens if expired
 */
async function refreshGoogleTokens(
  supabase: SupabaseClient,
  accountId: string
): Promise<string | null> {
  const { data: account } = await supabase
    .from('accounts')
    .select('google_tokens')
    .eq('id', accountId)
    .single();

  if (!account?.google_tokens) {
    return null;
  }

  const tokens = account.google_tokens as GoogleTokens;
  const now = Math.floor(Date.now() / 1000);

  // Check if token is still valid (with 5 min buffer)
  if (tokens.expires_at > now + 300) {
    return tokens.access_token;
  }

  // Refresh the token
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: tokens.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      console.error('[Google] Token refresh failed');
      return null;
    }

    const newTokens = await response.json();
    const expiresAt = now + newTokens.expires_in;

    // Update tokens in database
    const updatedTokens: GoogleTokens = {
      access_token: newTokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      scope: tokens.scope,
    };

    await supabase
      .from('accounts')
      .update({ google_tokens: updatedTokens })
      .eq('id', accountId);

    return newTokens.access_token;
  } catch (error) {
    console.error('[Google] Token refresh error:', error);
    return null;
  }
}

/**
 * Send email via Gmail API
 */
export async function sendEmail(
  supabase: SupabaseClient,
  accountId: string,
  args: { to: string; subject: string; body: string; cc?: string; bcc?: string }
): Promise<string> {
  const accessToken = await refreshGoogleTokens(supabase, accountId);
  if (!accessToken) {
    throw new Error('No valid Google OAuth token. Please reconnect Google in Settings.');
  }

  // Fetch email signature
  const { data: account } = await supabase
    .from('accounts')
    .select('email_signature')
    .eq('id', accountId)
    .single();

  const signature = account?.email_signature || '\n\n---\nSent by my Tiker assistant';
  const bodyWithSignature = args.body + signature;

  // Build email in RFC 2822 format
  const lines = [
    `To: ${args.to}`,
    args.cc ? `Cc: ${args.cc}` : null,
    args.bcc ? `Bcc: ${args.bcc}` : null,
    `Subject: ${args.subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    bodyWithSignature,
  ].filter(Boolean);

  const email = lines.join('\r\n');
  const encodedEmail = Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedEmail }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return 'Email sent successfully';
}

/**
 * List recent emails
 */
export async function listEmails(
  supabase: SupabaseClient,
  accountId: string,
  args: { maxResults?: number; query?: string }
): Promise<string> {
  const accessToken = await refreshGoogleTokens(supabase, accountId);
  if (!accessToken) {
    throw new Error('No valid Google OAuth token. Please reconnect Google in Settings.');
  }

  const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  url.searchParams.set('maxResults', String(args.maxResults || 10));
  if (args.query) {
    url.searchParams.set('q', args.query);
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list emails: ${error}`);
  }

  const data = await response.json();
  const messages = data.messages || [];

  if (messages.length === 0) {
    return 'No emails found';
  }

  // Fetch details for each message
  const details = await Promise.all(
    messages.slice(0, 5).map(async (msg: any) => {
      const msgResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      return msgResponse.json();
    })
  );

  const formatted = details.map((msg: any) => {
    const headers = msg.payload.headers;
    const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(no subject)';
    const date = headers.find((h: any) => h.name === 'Date')?.value || '';
    return `From: ${from}\nSubject: ${subject}\nDate: ${date}\n`;
  });

  return formatted.join('\n---\n\n');
}

/**
 * Create calendar event
 */
export async function createCalendarEvent(
  supabase: SupabaseClient,
  accountId: string,
  args: {
    summary: string;
    startTime: string;
    endTime: string;
    description?: string;
    attendees?: string[];
  }
): Promise<string> {
  const accessToken = await refreshGoogleTokens(supabase, accountId);
  if (!accessToken) {
    throw new Error('No valid Google OAuth token. Please reconnect Google in Settings.');
  }

  const event = {
    summary: args.summary,
    description: args.description,
    start: { dateTime: args.startTime, timeZone: 'America/Chicago' },
    end: { dateTime: args.endTime, timeZone: 'America/Chicago' },
    attendees: args.attendees?.map((email) => ({ email })),
  };

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create event: ${error}`);
  }

  const created = await response.json();
  return `Event created: ${created.htmlLink}`;
}

/**
 * List upcoming calendar events
 */
export async function listCalendarEvents(
  supabase: SupabaseClient,
  accountId: string,
  args: { maxResults?: number; timeMin?: string }
): Promise<string> {
  const accessToken = await refreshGoogleTokens(supabase, accountId);
  if (!accessToken) {
    throw new Error('No valid Google OAuth token. Please reconnect Google in Settings.');
  }

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('maxResults', String(args.maxResults || 10));
  url.searchParams.set('timeMin', args.timeMin || new Date().toISOString());
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('singleEvents', 'true');

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list events: ${error}`);
  }

  const data = await response.json();
  const events = data.items || [];

  if (events.length === 0) {
    return 'No upcoming events';
  }

  const formatted = events.map((event: any) => {
    const start = event.start.dateTime || event.start.date;
    return `${event.summary} - ${start}`;
  });

  return formatted.join('\n');
}

/**
 * Execute Google tool
 */
export async function executeGoogleTool(
  toolName: string,
  args: any,
  supabase: SupabaseClient,
  accountId: string
): Promise<string> {
  switch (toolName) {
    case 'send_email':
      return await sendEmail(supabase, accountId, args);
    case 'list_emails':
      return await listEmails(supabase, accountId, args);
    case 'create_calendar_event':
      return await createCalendarEvent(supabase, accountId, args);
    case 'list_calendar_events':
      return await listCalendarEvents(supabase, accountId, args);
    default:
      throw new Error(`Unknown Google tool: ${toolName}`);
  }
}
