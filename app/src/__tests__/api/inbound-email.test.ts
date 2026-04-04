/**
 * Tests for POST /api/inbound-email
 *
 * Two routing modes:
 *   - task-{uuid}@tiker.com  → add comment to existing task
 *   - {username}@tiker.com   → create a new task in personal inbox
 */

import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Infrastructure mocks
// ---------------------------------------------------------------------------

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) =>
      new Response(JSON.stringify(data), {
        status: init?.status ?? 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  },
}));

// Upstash Redis / rate limiter — always pass
jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: jest.fn().mockImplementation(() => ({
    limit: jest.fn().mockResolvedValue({ success: true }),
  })),
}));
(require('@upstash/ratelimit') as any).Ratelimit.slidingWindow = jest.fn();

jest.mock('@upstash/redis', () => ({
  Redis: { fromEnv: jest.fn().mockReturnValue({}) },
}));

// mailparser — return a minimal parsed object
jest.mock('mailparser', () => ({
  simpleParser: jest.fn().mockResolvedValue({
    text: 'Hello from the test',
    html: null,
    from: { text: 'Sender Name <sender@example.com>' },
  }),
}));

// crypto (lib)
jest.mock('@/lib/crypto', () => ({
  encrypt: (s: string) => `encrypted:${s}`,
}));

// Supabase createClient
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockMaybeSingle = jest.fn();
const mockFrom = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

// ---------------------------------------------------------------------------
// Helper: build a signed fake NextRequest
// ---------------------------------------------------------------------------

const WEBHOOK_SECRET = 'test-secret-1234';
process.env.CLOUDFLARE_WEBHOOK_SECRET = WEBHOOK_SECRET;
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-role-key';

function signBody(body: string): string {
  return crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
}

function makeRequest(payload: Record<string, unknown>): Request {
  const body = JSON.stringify(payload);
  const signature = signBody(body);
  const timestamp = String(Date.now());

  return new Request('http://localhost/api/inbound-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Timestamp': timestamp,
      'x-forwarded-for': '127.0.0.1', // localhost → skip real rate-limit
    },
    body,
  }) as unknown as Request;
}

// Import after mocks are set up
import { POST } from '@/app/api/inbound-email/route';

async function parseResponse(res: Response) {
  return { status: res.status, body: await res.json() };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const TASK_UUID = 'aaaabbbb-0000-1111-2222-333344445555';

describe('POST /api/inbound-email', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---- Auth / validation -----

  it('returns 401 with bad signature', async () => {
    const body = JSON.stringify({ from: 'a@b.com', rawEmail: 'raw' });
    const req = new Request('http://localhost/api/inbound-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': 'bad-sig',
        'X-Webhook-Timestamp': String(Date.now()),
        'x-forwarded-for': '127.0.0.1',
      },
      body,
    }) as unknown as Request;

    const res = await POST(req as any);
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it('returns 400 when from is missing', async () => {
    const req = makeRequest({ rawEmail: 'raw', to: `${TASK_UUID}@tiker.com` });
    const res = await POST(req as any);
    const { status, body } = await parseResponse(res);
    expect(status).toBe(400);
    expect(body.error).toMatch(/from/);
  });

  // ---- Task threading (task-{uuid}@tiker.com) -----

  it('threads email as comment on an existing task', async () => {
    const recipientTask = `task-${TASK_UUID}@tiker.com`;

    mockFrom.mockImplementation((table: string) => {
      if (table === 'mc_tasks') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: TASK_UUID, account_id: 'acc-1' },
            error: null,
          }),
        };
      }
      // mc_comments insert
      return {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'comment-xyz' },
          error: null,
        }),
      };
    });

    const req = makeRequest({
      from: 'sender@example.com',
      rawEmail: 'raw-mime-content',
      to: recipientTask,
    });

    const res = await POST(req as any);
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.mode).toBe('task_thread');
    expect(body.taskId).toBe(TASK_UUID);
  });

  it('returns 404 when task-uuid does not exist', async () => {
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    }));

    const req = makeRequest({
      from: 'sender@example.com',
      rawEmail: 'raw',
      to: `task-${TASK_UUID}@tiker.com`,
    });

    const res = await POST(req as any);
    const { status, body } = await parseResponse(res);
    expect(status).toBe(404);
    expect(body.error).toBe('Task not found');
  });

  // ---- Personal inbox ({username}@tiker.com) -----

  it('creates a task for a known tiker username', async () => {
    const newTaskId = 'task-new-111';

    mockFrom.mockImplementation((table: string) => {
      if (table === 'accounts') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 'acc-99' },
            error: null,
          }),
        };
      }
      // mc_tasks insert
      return {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: newTaskId },
          error: null,
        }),
      };
    });

    const req = makeRequest({
      from: 'friend@gmail.com',
      subject: 'Hey check this out',
      rawEmail: 'raw-mime',
      to: 'johndoe@tiker.com',
    });

    const res = await POST(req as any);
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.mode).toBe('personal_inbox');
    expect(body.taskId).toBe(newTaskId);
  });

  it('returns 200 unknown_recipient for a username with no account', async () => {
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    }));

    const req = makeRequest({
      from: 'someone@gmail.com',
      rawEmail: 'raw',
      to: 'nobody@tiker.com',
    });

    const res = await POST(req as any);
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.success).toBe(false);
    expect(body.reason).toBe('unknown_recipient');
  });

  it('returns 422 when recipient is unrecognizable', async () => {
    const req = makeRequest({
      from: 'a@b.com',
      rawEmail: 'raw',
      to: 'someone@otherdomain.com',
    });

    const res = await POST(req as any);
    const { status } = await parseResponse(res);
    expect(status).toBe(422);
  });
});
