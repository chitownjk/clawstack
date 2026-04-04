/**
 * Tests for GET /api/tasks/recent
 * Verifies auth gating, account lookup, and title decryption.
 */

process.env.ENCRYPTION_KEY = 'test-encryption-key-for-jest-tests'

jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) =>
      new Response(JSON.stringify(data), {
        status: init?.status ?? 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  },
}))

const mockGetUser = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/lib/supabase-server', () => ({
  createRealSupabaseClient: jest.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

import { GET } from '@/app/api/tasks/recent/route'
import { encrypt } from '@/lib/crypto'

async function parseResponse(res: Response) {
  return { status: res.status, body: await res.json() }
}

describe('GET /api/tasks/recent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const res = await GET()
    const { status, body } = await parseResponse(res)

    expect(status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 404 when account not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    // First from() call: accounts query
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null }),
    })

    const res = await GET()
    const { status, body } = await parseResponse(res)

    expect(status).toBe(404)
    expect(body.error).toBe('Account not found')
  })

  it('returns tasks with decrypted titles', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    const encryptedTitle1 = encrypt('Schedule dentist appointment')
    const encryptedTitle2 = encrypt('Review Q1 expenses')

    const mockTasks = [
      { id: 'task-1', title: encryptedTitle1, status: 'inbox', created_at: '2026-04-04T10:00:00Z' },
      { id: 'task-2', title: encryptedTitle2, status: 'done', created_at: '2026-04-03T09:00:00Z' },
    ]

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // accounts query
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { id: 'account-1' } }),
        }
      }
      // mc_tasks query
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: mockTasks }),
      }
    })

    const res = await GET()
    const { status, body } = await parseResponse(res)

    expect(status).toBe(200)
    expect(body).toHaveLength(2)
    expect(body[0].title).toBe('Schedule dentist appointment')
    expect(body[1].title).toBe('Review Q1 expenses')
  })

  it('handles null task title gracefully', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { id: 'account-1' } }),
        }
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [{ id: 'task-3', title: null, status: 'inbox', created_at: '2026-04-04T10:00:00Z' }],
        }),
      }
    })

    const res = await GET()
    const { status, body } = await parseResponse(res)

    expect(status).toBe(200)
    expect(body[0].title).toBe('Untitled')
  })

  it('returns 500 on unexpected error', async () => {
    mockGetUser.mockRejectedValue(new Error('Network error'))

    const res = await GET()
    const { status, body } = await parseResponse(res)

    expect(status).toBe(500)
    expect(body.error).toBe('Failed to load tasks')
  })
})
