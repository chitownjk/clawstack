/**
 * Tool definitions and execution for cloud agents
 * Integrates with Google services (Gmail, Calendar) via OAuth tokens
 */

import { google } from 'googleapis';

// Tool definitions for Anthropic/OpenAI
export const TOOLS = [
  {
    name: 'gmail_send',
    description: 'Send an email via Gmail. Use for sending emails, notifications, or messages.',
    input_schema: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Recipient email address',
        },
        subject: {
          type: 'string',
          description: 'Email subject line',
        },
        body: {
          type: 'string',
          description: 'Email body (plain text or HTML)',
        },
        cc: {
          type: 'string',
          description: 'CC email addresses (comma-separated)',
        },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'gmail_read',
    description: 'Read recent emails from Gmail inbox. Returns last 10 emails by default.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Gmail search query (e.g., "from:someone@example.com", "is:unread")',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of emails to return (default: 10, max: 50)',
        },
      },
      required: [],
    },
  },
  {
    name: 'calendar_create_event',
    description: 'Create a new Google Calendar event',
    input_schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Event title/summary',
        },
        start: {
          type: 'string',
          description: 'Start time in ISO 8601 format (e.g., "2024-02-05T14:00:00-06:00")',
        },
        end: {
          type: 'string',
          description: 'End time in ISO 8601 format',
        },
        description: {
          type: 'string',
          description: 'Event description/notes',
        },
        attendees: {
          type: 'array',
          items: { type: 'string' },
          description: 'Attendee email addresses',
        },
        location: {
          type: 'string',
          description: 'Event location',
        },
      },
      required: ['title', 'start', 'end'],
    },
  },
  {
    name: 'calendar_list_events',
    description: 'List upcoming Google Calendar events',
    input_schema: {
      type: 'object',
      properties: {
        timeMin: {
          type: 'string',
          description: 'Start time (ISO 8601). Default: now',
        },
        timeMax: {
          type: 'string',
          description: 'End time (ISO 8601). Default: 7 days from now',
        },
        maxResults: {
          type: 'number',
          description: 'Max events to return (default: 10)',
        },
      },
      required: [],
    },
  },
];

/**
 * Execute a tool call with user's Google OAuth token
 */
export async function executeTool(
  toolName: string,
  params: any,
  googleAccessToken: string
): Promise<string> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: googleAccessToken });

  switch (toolName) {
    case 'gmail_send':
      return await sendGmail(params, auth);
    
    case 'gmail_read':
      return await readGmail(params, auth);
    
    case 'calendar_create_event':
      return await createCalendarEvent(params, auth);
    
    case 'calendar_list_events':
      return await listCalendarEvents(params, auth);
    
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

/**
 * Send email via Gmail API
 */
async function sendGmail(
  params: { to: string; subject: string; body: string; cc?: string },
  auth: any
): Promise<string> {
  const gmail = google.gmail({ version: 'v1', auth });

  const message = [
    `To: ${params.to}`,
    params.cc ? `Cc: ${params.cc}` : '',
    `Subject: ${params.subject}`,
    '',
    params.body,
  ]
    .filter(Boolean)
    .join('\n');

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });

  return `Email sent successfully (ID: ${res.data.id})`;
}

/**
 * Read emails from Gmail
 */
async function readGmail(
  params: { query?: string; maxResults?: number },
  auth: any
): Promise<string> {
  const gmail = google.gmail({ version: 'v1', auth });

  const res = await gmail.users.messages.list({
    userId: 'me',
    q: params.query || '',
    maxResults: Math.min(params.maxResults || 10, 50),
  });

  if (!res.data.messages || res.data.messages.length === 0) {
    return 'No emails found matching criteria.';
  }

  const emails = await Promise.all(
    res.data.messages.slice(0, 10).map(async (msg) => {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date'],
      });

      const headers = detail.data.payload?.headers || [];
      const from = headers.find((h) => h.name === 'From')?.value || 'Unknown';
      const subject = headers.find((h) => h.name === 'Subject')?.value || '(no subject)';
      const date = headers.find((h) => h.name === 'Date')?.value || '';

      return `From: ${from}\nSubject: ${subject}\nDate: ${date}\n`;
    })
  );

  return `Found ${emails.length} emails:\n\n${emails.join('\n---\n')}`;
}

/**
 * Create Google Calendar event
 */
async function createCalendarEvent(
  params: {
    title: string;
    start: string;
    end: string;
    description?: string;
    attendees?: string[];
    location?: string;
  },
  auth: any
): Promise<string> {
  const calendar = google.calendar({ version: 'v3', auth });

  const event = {
    summary: params.title,
    description: params.description,
    location: params.location,
    start: {
      dateTime: params.start,
      timeZone: 'America/Chicago', // TODO: Get from user preferences
    },
    end: {
      dateTime: params.end,
      timeZone: 'America/Chicago',
    },
    attendees: params.attendees?.map((email) => ({ email })),
  };

  const res = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
  });

  return `Calendar event created: "${params.title}" (ID: ${res.data.id})`;
}

/**
 * List upcoming calendar events
 */
async function listCalendarEvents(
  params: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
  },
  auth: any
): Promise<string> {
  const calendar = google.calendar({ version: 'v3', auth });

  const now = new Date();
  const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: params.timeMin || now.toISOString(),
    timeMax: params.timeMax || oneWeekLater.toISOString(),
    maxResults: params.maxResults || 10,
    singleEvents: true,
    orderBy: 'startTime',
  });

  if (!res.data.items || res.data.items.length === 0) {
    return 'No upcoming events found.';
  }

  const events = res.data.items.map((event) => {
    const start = event.start?.dateTime || event.start?.date;
    return `${event.summary} - ${start}${event.location ? ` at ${event.location}` : ''}`;
  });

  return `Upcoming events:\n${events.join('\n')}`;
}
