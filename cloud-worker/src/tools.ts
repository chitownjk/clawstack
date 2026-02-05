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
  {
    name: 'agentmail_send',
    description: 'Send an email via AgentMail. Each agent can have their own inbox for async coordination.',
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
        text: {
          type: 'string',
          description: 'Email body (plain text)',
        },
      },
      required: ['to', 'subject', 'text'],
    },
  },
  {
    name: 'agentmail_list',
    description: 'List recent emails from your AgentMail inbox',
    input_schema: {
      type: 'object',
      properties: {
        inbox: {
          type: 'string',
          description: 'Inbox ID to list messages from (if you have multiple)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of messages to return (default: 20)',
        },
      },
      required: [],
    },
  },
  {
    name: 'agentmail_read',
    description: 'Read a specific email message from AgentMail by ID',
    input_schema: {
      type: 'object',
      properties: {
        message_id: {
          type: 'string',
          description: 'ID of the message to read',
        },
      },
      required: ['message_id'],
    },
  },
  {
    name: 'drive_list_files',
    description: 'List files in Google Drive. Search by name or filter by folder.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (e.g., "name contains report", "mimeType = application/pdf"). Leave empty for recent files.',
        },
        folderId: {
          type: 'string',
          description: 'Folder ID to list contents of specific folder',
        },
        pageSize: {
          type: 'number',
          description: 'Number of results (default: 20, max: 100)',
        },
      },
      required: [],
    },
  },
  {
    name: 'drive_search',
    description: 'Search for files in Google Drive by name, type, or content',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Full-text search query (e.g., "quarterly report 2024", "project proposal")',
        },
        fileType: {
          type: 'string',
          description: 'Filter by file type: document, spreadsheet, presentation, pdf, folder',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum results (default: 20)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'drive_read_document',
    description: 'Read the contents of a Google Docs, Sheets, or Slides file by ID',
    input_schema: {
      type: 'object',
      properties: {
        fileId: {
          type: 'string',
          description: 'Google Drive file ID',
        },
        format: {
          type: 'string',
          description: 'Export format: text, html, markdown (for Docs), csv (for Sheets). Default: text',
        },
      },
      required: ['fileId'],
    },
  },
  {
    name: 'save_file',
    description: 'Save content to a file attached to the current task. Use for outputs that are too large for comments (reports, code, data, images). File will be accessible to the user in their Files section.',
    input_schema: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: 'Name of the file (e.g., "report.pdf", "data.csv", "output.json")',
        },
        content: {
          type: 'string',
          description: 'File content (text) or base64-encoded binary data',
        },
        mime_type: {
          type: 'string',
          description: 'MIME type (e.g., "text/plain", "application/pdf", "text/csv"). If not provided, inferred from filename.',
        },
        description: {
          type: 'string',
          description: 'Optional description of what this file contains',
        },
      },
      required: ['filename', 'content'],
    },
  },
  {
    name: 'list_files',
    description: 'List files attached to the current task or search across all your files',
    input_schema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'Filter to files for specific task (default: current task)',
        },
        search: {
          type: 'string',
          description: 'Search query to filter files by name or description',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of files to return (default: 20)',
        },
      },
      required: [],
    },
  },
  {
    name: 'read_file',
    description: 'Read the contents of a previously saved file by ID',
    input_schema: {
      type: 'object',
      properties: {
        file_id: {
          type: 'string',
          description: 'UUID of the file to read',
        },
      },
      required: ['file_id'],
    },
  },
];

/**
 * Execute a tool call with user's credentials and Supabase client
 */
export async function executeTool(
  toolName: string,
  params: any,
  googleAccessToken: string,
  supabase?: any,
  taskId?: string,
  accountId?: string,
  agentmailApiKey?: string
): Promise<string> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: googleAccessToken });

  switch (toolName) {
    case 'gmail_send':
      return await sendGmail(params, auth, supabase, accountId);
    
    case 'gmail_read':
      return await readGmail(params, auth);
    
    case 'calendar_create_event':
      return await createCalendarEvent(params, auth);
    
    case 'calendar_list_events':
      return await listCalendarEvents(params, auth);

    case 'drive_list_files':
      return await driveListFiles(params, auth);

    case 'drive_search':
      return await driveSearchFiles(params, auth);

    case 'drive_read_document':
      return await driveReadDocument(params, auth);

    case 'agentmail_send':
      if (!agentmailApiKey) throw new Error('AgentMail not connected');
      return await sendAgentmail(params, agentmailApiKey);
    
    case 'agentmail_list':
      if (!agentmailApiKey) throw new Error('AgentMail not connected');
      return await listAgentmail(params, agentmailApiKey);
    
    case 'agentmail_read':
      if (!agentmailApiKey) throw new Error('AgentMail not connected');
      return await readAgentmail(params, agentmailApiKey);
    
    case 'save_file':
      if (!supabase || !taskId || !accountId) {
        throw new Error('save_file requires supabase, taskId, and accountId');
      }
      return await saveFile(params, supabase, taskId, accountId);
    
    case 'list_files':
      if (!supabase || !accountId) {
        throw new Error('list_files requires supabase and accountId');
      }
      return await listFiles(params, supabase, taskId, accountId);
    
    case 'read_file':
      if (!supabase || !accountId) {
        throw new Error('read_file requires supabase and accountId');
      }
      return await readFile(params, supabase, accountId);
    
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

/**
 * Send email via Gmail API
 */
async function sendGmail(
  params: { to: string; subject: string; body: string; cc?: string },
  auth: any,
  supabase?: any,
  accountId?: string
): Promise<string> {
  const gmail = google.gmail({ version: 'v1', auth });

  // Fetch and append email signature
  let bodyWithSignature = params.body;
  if (supabase && accountId) {
    try {
      const { data: account } = await supabase
        .from('accounts')
        .select('email_signature')
        .eq('id', accountId)
        .single();
      
      const signature = account?.email_signature || '\n\n---\nSent by my Tiker assistant';
      bodyWithSignature = params.body + signature;
    } catch (error) {
      console.error('[Gmail] Failed to fetch signature:', error);
      // Continue with original body
    }
  }

  const message = [
    `To: ${params.to}`,
    params.cc ? `Cc: ${params.cc}` : '',
    `Subject: ${params.subject}`,
    '',
    bodyWithSignature,
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
    sendUpdates: 'all', // Send email invites to attendees
  });

  return `Calendar event created: "${params.title}" (ID: ${res.data.id})\nInvitations sent to: ${params.attendees?.join(', ') || 'none'}`;
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

/**
 * File storage tools
 */

const BUCKET_NAME = 'mc-files';

/**
 * Save file to Supabase Storage
 */
async function saveFile(
  params: {
    filename: string;
    content: string;
    mime_type?: string;
    description?: string;
  },
  supabase: any,
  taskId: string,
  accountId: string
): Promise<string> {
  // Infer MIME type from filename if not provided
  const mimeType = params.mime_type || inferMimeType(params.filename);
  
  // Generate storage path
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const sanitizedFilename = params.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  const storagePath = `${accountId}/${year}/${month}/${taskId}/${sanitizedFilename}`;
  
  // Check if content is base64
  const isBase64 = /^[A-Za-z0-9+/]+=*$/.test(params.content);
  const buffer = isBase64 
    ? Buffer.from(params.content, 'base64')
    : Buffer.from(params.content, 'utf-8');
  
  // Upload to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });
  
  if (uploadError) {
    throw new Error(`Failed to upload file: ${uploadError.message}`);
  }
  
  // Save metadata
  const { data: fileRecord, error: dbError } = await supabase
    .from('mc_files')
    .insert({
      account_id: accountId,
      task_id: taskId,
      name: params.filename,
      path: storagePath,
      size_bytes: buffer.length,
      mime_type: mimeType,
      description: params.description || null,
    })
    .select()
    .single();
  
  if (dbError) {
    // Clean up uploaded file
    await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
    throw new Error(`Failed to save file metadata: ${dbError.message}`);
  }
  
  // Generate viewer URL (not direct Supabase link)
  const viewerUrl = process.env.APP_URL || 'https://testcloud.tiker.com';
  const fileUrl = `${viewerUrl}/files/${fileRecord.id}`;
  
  return `File saved successfully: ${params.filename} (${formatBytes(buffer.length)})\nFile ID: ${fileRecord.id}\nView: ${fileUrl}`;
}

/**
 * List files
 */
async function listFiles(
  params: {
    task_id?: string;
    search?: string;
    limit?: number;
  },
  supabase: any,
  currentTaskId: string | undefined,
  accountId: string
): Promise<string> {
  let query = supabase
    .from('mc_files')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(params.limit || 20);
  
  const taskId = params.task_id || currentTaskId;
  if (taskId) {
    query = query.eq('task_id', taskId);
  }
  
  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`);
  }
  
  const { data: files, error } = await query;
  
  if (error) {
    throw new Error(`Failed to list files: ${error.message}`);
  }
  
  if (!files || files.length === 0) {
    return 'No files found matching criteria.';
  }
  
  const fileList = files.map((f: any) => 
    `- ${f.name} (${formatBytes(f.size_bytes)}) - ID: ${f.id}${f.description ? `\n  ${f.description}` : ''}`
  ).join('\n');
  
  return `Found ${files.length} file(s):\n${fileList}`;
}

/**
 * Read file contents
 */
async function readFile(
  params: { file_id: string },
  supabase: any,
  accountId: string
): Promise<string> {
  // Get file metadata
  const { data: file, error: metaError } = await supabase
    .from('mc_files')
    .select('*')
    .eq('id', params.file_id)
    .eq('account_id', accountId)
    .single();
  
  if (metaError || !file) {
    throw new Error(`File not found: ${params.file_id}`);
  }
  
  // Download file from storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from(BUCKET_NAME)
    .download(file.path);
  
  if (downloadError) {
    throw new Error(`Failed to download file: ${downloadError.message}`);
  }
  
  // Convert to text or base64
  const buffer = Buffer.from(await fileData.arrayBuffer());
  
  // If text-based MIME type, return as text
  if (file.mime_type?.startsWith('text/') || 
      file.mime_type === 'application/json' ||
      file.mime_type === 'application/xml') {
    return `File: ${file.name}\nContent:\n${buffer.toString('utf-8')}`;
  }
  
  // Otherwise return base64
  return `File: ${file.name}\nMIME: ${file.mime_type}\nContent (base64):\n${buffer.toString('base64')}`;
}

/**
 * Helper: Infer MIME type from filename extension
 */
function inferMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json',
    csv: 'text/csv',
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    html: 'text/html',
    xml: 'application/xml',
    zip: 'application/zip',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Helper: Format bytes to human-readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
}

/**
 * AgentMail: Send email
 */
async function sendAgentmail(params: { to: string; subject: string; text: string }, apiKey: string): Promise<string> {
  try {
    // Get inboxes first to find the default one
    const inboxResponse = await fetch('https://api.agentmail.to/v0/inboxes', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!inboxResponse.ok) {
      throw new Error(`Failed to get inboxes: ${inboxResponse.statusText}`);
    }

    const inboxes = await inboxResponse.json();
    if (!inboxes || inboxes.length === 0) {
      throw new Error('No AgentMail inboxes found');
    }

    const defaultInbox = inboxes[0].id;

    // Send the message
    const response = await fetch(`https://api.agentmail.to/v0/inboxes/${defaultInbox}/messages/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: params.to,
        subject: params.subject,
        text: params.text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AgentMail send failed: ${errorText}`);
    }

    const result = await response.json();
    return `✅ Email sent to ${params.to} from ${defaultInbox}@agentmail.to`;
  } catch (error: any) {
    return `❌ Failed to send email: ${error.message}`;
  }
}

/**
 * AgentMail: List messages
 */
async function listAgentmail(params: { inbox?: string; limit?: number }, apiKey: string): Promise<string> {
  try {
    // Get inboxes first
    const inboxResponse = await fetch('https://api.agentmail.to/v0/inboxes', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!inboxResponse.ok) {
      throw new Error(`Failed to get inboxes: ${inboxResponse.statusText}`);
    }

    const inboxes = await inboxResponse.json();
    if (!inboxes || inboxes.length === 0) {
      return 'No AgentMail inboxes found';
    }

    const inboxId = params.inbox || inboxes[0].id;
    const limit = params.limit || 20;

    // List messages
    const response = await fetch(`https://api.agentmail.to/v0/inboxes/${inboxId}/messages?limit=${limit}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to list messages: ${response.statusText}`);
    }

    const messages = await response.json();
    
    if (!messages || messages.length === 0) {
      return 'No messages found';
    }

    const formatted = messages.map((msg: any) => 
      `ID: ${msg.id}\nFrom: ${msg.from}\nSubject: ${msg.subject}\nReceived: ${new Date(msg.created_at).toLocaleString()}`
    ).join('\n\n---\n\n');

    return `Found ${messages.length} message(s):\n\n${formatted}`;
  } catch (error: any) {
    return `❌ Failed to list messages: ${error.message}`;
  }
}

/**
 * AgentMail: Read message
 */
async function readAgentmail(params: { message_id: string }, apiKey: string): Promise<string> {
  try {
    // Get inboxes to construct proper URL
    const inboxResponse = await fetch('https://api.agentmail.to/v0/inboxes', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!inboxResponse.ok) {
      throw new Error(`Failed to get inboxes: ${inboxResponse.statusText}`);
    }

    const inboxes = await inboxResponse.json();
    if (!inboxes || inboxes.length === 0) {
      return 'No AgentMail inboxes found';
    }

    const inboxId = inboxes[0].id;

    // Get message
    const response = await fetch(`https://api.agentmail.to/v0/inboxes/${inboxId}/messages/${params.message_id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to read message: ${response.statusText}`);
    }

    const message = await response.json();
    
    return `From: ${message.from}\nTo: ${message.to}\nSubject: ${message.subject}\nDate: ${new Date(message.created_at).toLocaleString()}\n\n${message.text || message.html || '(no body)'}`;
  } catch (error: any) {
    return `❌ Failed to read message: ${error.message}`;
  }
}

/**
 * Google Drive: List files
 */
async function driveListFiles(params: { query?: string; folderId?: string; pageSize?: number }, auth: any): Promise<string> {
  try {
    const drive = google.drive({ version: 'v3', auth });
    
    let q = params.query || '';
    if (params.folderId) {
      q = q ? `${q} and '${params.folderId}' in parents` : `'${params.folderId}' in parents`;
    }
    
    const response = await drive.files.list({
      q: q || undefined,
      pageSize: params.pageSize || 20,
      fields: 'files(id, name, mimeType, modifiedTime, size, webViewLink)',
      orderBy: 'modifiedTime desc',
    });

    const files = response.data.files;
    if (!files || files.length === 0) {
      return 'No files found';
    }

    const formatted = files.map((f: any) => {
      const type = f.mimeType === 'application/vnd.google-apps.folder' ? '📁' : '📄';
      const size = f.size ? ` (${formatBytes(parseInt(f.size))})` : '';
      return `${type} ${f.name}${size}\n   ID: ${f.id} | Modified: ${new Date(f.modifiedTime!).toLocaleDateString()}`;
    }).join('\n\n');

    return `Found ${files.length} file(s):\n\n${formatted}`;
  } catch (error: any) {
    return `❌ Failed to list files: ${error.message}`;
  }
}

/**
 * Google Drive: Search files
 */
async function driveSearchFiles(params: { query: string; fileType?: string; maxResults?: number }, auth: any): Promise<string> {
  try {
    const drive = google.drive({ version: 'v3', auth });
    
    let q = `fullText contains '${params.query.replace(/'/g, "\\'")}'`;
    
    if (params.fileType) {
      const mimeTypes: Record<string, string> = {
        document: 'application/vnd.google-apps.document',
        spreadsheet: 'application/vnd.google-apps.spreadsheet',
        presentation: 'application/vnd.google-apps.presentation',
        pdf: 'application/pdf',
        folder: 'application/vnd.google-apps.folder',
      };
      if (mimeTypes[params.fileType]) {
        q += ` and mimeType = '${mimeTypes[params.fileType]}'`;
      }
    }
    
    const response = await drive.files.list({
      q,
      pageSize: params.maxResults || 20,
      fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
    });

    const files = response.data.files;
    if (!files || files.length === 0) {
      return `No files found matching "${params.query}"`;
    }

    const formatted = files.map((f: any) => {
      const type = f.mimeType === 'application/vnd.google-apps.folder' ? '📁' : '📄';
      return `${type} ${f.name}\n   ID: ${f.id} | Open: ${f.webViewLink}`;
    }).join('\n\n');

    return `Found ${files.length} result(s) for "${params.query}":\n\n${formatted}`;
  } catch (error: any) {
    return `❌ Search failed: ${error.message}`;
  }
}

/**
 * Google Drive: Read document content
 */
async function driveReadDocument(params: { fileId: string; format?: string }, auth: any): Promise<string> {
  try {
    const drive = google.drive({ version: 'v3', auth });
    
    // Get file metadata first
    const metadata = await drive.files.get({
      fileId: params.fileId,
      fields: 'name, mimeType, size',
    });

    const mimeType = metadata.data.mimeType;
    const name = metadata.data.name;

    // For Google Docs/Sheets/Slides, export to requested format
    if (mimeType?.startsWith('application/vnd.google-apps.')) {
      const exportFormats: Record<string, string> = {
        'application/vnd.google-apps.document': params.format === 'markdown' ? 'text/markdown' : 'text/plain',
        'application/vnd.google-apps.spreadsheet': params.format === 'csv' ? 'text/csv' : 'text/csv',
        'application/vnd.google-apps.presentation': 'text/plain',
      };

      const exportMime = exportFormats[mimeType] || 'text/plain';
      
      const response = await drive.files.export({
        fileId: params.fileId,
        mimeType: exportMime,
      }, { responseType: 'text' });

      const content = response.data as string;
      const preview = content.substring(0, 3000);
      const truncated = content.length > 3000 ? '\n\n...[content truncated]' : '';
      
      return `📄 ${name}\n\n${preview}${truncated}`;
    }

    // For other files, download and return base64 or text
    const response = await drive.files.get({
      fileId: params.fileId,
      alt: 'media',
    }, { responseType: 'text' });

    const content = response.data as string;
    const preview = content.substring(0, 3000);
    const truncated = content.length > 3000 ? '\n\n...[content truncated]' : '';

    return `📄 ${name}\n\n${preview}${truncated}`;
  } catch (error: any) {
    return `❌ Failed to read document: ${error.message}`;
  }
}
