/**
 * Tests for GET /api/account/me
 * Mocks Supabase clients to avoid real DB calls.
 */

// Mock next/server before importing the route
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) =>
      new Response(JSON.stringify(data), {
        status: init?.status ?? 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  },
}))

const mockGetSession = jest.fn()
const mockAdminFrom = jest.fn()

jest.mock('@/lib/supabase-server', () => ({
  createRealSupabaseClient: jest.fn().mockResolvedValue({
    auth: { getSession: mockGetSession },
  }),
  createAdminClient: jest.fn().mockReturnValue({
    from: mockAdminFrom,
  }),
}))

import { GET } from '@/app/api/account/me/route'

async function parseResponse(res: Response) {
  return { status: res.status, body: await res.json() }
}

describe('GET /api/account/me', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    const res = await GET()
    const { status, body } = await parseResponse(res)

    expect(status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns account data for authenticated user', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-123' } } },
    })

    const mockAccount = {
      id: 'account-abc',
      execution_mode: 'cloud-our-keys',
      plan_tier: 'pro',
      first_name: 'Alice',
      onboarding_completed: true,
    }

    mockAdminFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockAccount, error: null }),
    })

    const res = await GET()
    const { status, body } = await parseResponse(res)

    expect(status).toBe(200)
    expect(body.id).toBe('account-abc')
    expect(body.first_name).toBe('Alice')
  })

  it('returns 404 when account not found', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-xyz' } } },
    })

    mockAdminFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    })

    const res = await GET()
    const { status, body } = await parseResponse(res)

    expect(status).toBe(404)
    expect(body.error).toBe('Account not found')
  })

  it('returns 500 on unexpected error', async () => {
    mockGetSession.mockRejectedValue(new Error('DB connection failed'))

    const res = await GET()
    const { status, body } = await parseResponse(res)

    expect(status).toBe(500)
    expect(body.error).toBe('Internal server error')
  })
})
