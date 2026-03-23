import { getAuthenticatedAdmin } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { encrypt } from '@/lib/crypto'
import { z } from 'zod'

const createJobSchema = z.object({
  type: z.enum(['flight', 'hotel', 'shopping', 'restaurant', 'general']),
  search_params: z.record(z.string(), z.unknown()),
  source_url: z.string().optional(),
})

// POST /api/agents/jobs/create
// Creates a new agent job. The extension handles the actual search
// via browser automation, then POSTs results to /options.
export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedAdmin()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createJobSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { type, search_params, source_url } = parsed.data

    // Encrypt sensitive search params
    const encryptedParams = encrypt(JSON.stringify(search_params))

    // Set expiry: flight options typically valid 15-30 min
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

    const { data: job, error } = await auth.adminClient
      .from('agent_jobs')
      .insert({
        account_id: auth.account.id,
        job_type: type,
        status: 'searching',
        search_params: encryptedParams,
        source_url: source_url || null,
        expires_at: expiresAt,
      })
      .select('id, status, created_at, expires_at')
      .single()

    if (error) {
      console.error('[AgentJobs] Create error:', error)
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
    }

    return NextResponse.json({ job })
  } catch (err) {
    console.error('[AgentJobs] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
