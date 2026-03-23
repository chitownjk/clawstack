import { getAuthenticatedAdmin } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { encrypt } from '@/lib/crypto'
import { z } from 'zod'

const optionSchema = z.object({
  provider: z.string(),
  option_data: z.record(z.string(), z.unknown()),
  display_summary: z.string(),
  price_cents: z.number().int().positive(),
  currency: z.string().default('USD'),
  booking_url: z.string().url(),
  ranking: z.number().int().min(1),
  ranking_reason: z.string().optional(),
})

const postOptionsSchema = z.object({
  options: z.array(optionSchema).min(1).max(10),
})

// POST /api/agents/jobs/[jobId]/options
// Extension submits scraped search results as job options.
// This is called after the background tab extracts flight data.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const auth = await getAuthenticatedAdmin()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { jobId } = await params

    // Verify job belongs to user and is in searching state
    const { data: job } = await auth.adminClient
      .from('agent_jobs')
      .select('id, status, account_id')
      .eq('id', jobId)
      .eq('account_id', auth.account.id)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.status !== 'searching') {
      return NextResponse.json(
        { error: `Job is ${job.status}, cannot add options` },
        { status: 409 }
      )
    }

    const body = await request.json()
    const parsed = postOptionsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid options', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Encrypt sensitive fields and insert
    const rows = parsed.data.options.map(opt => ({
      job_id: jobId,
      provider: opt.provider,
      option_data: encrypt(JSON.stringify(opt.option_data)),
      display_summary: encrypt(opt.display_summary),
      price_cents: opt.price_cents,
      currency: opt.currency,
      booking_url: encrypt(opt.booking_url),
      ranking: opt.ranking,
      ranking_reason: opt.ranking_reason || null,
    }))

    const { error: insertError } = await auth.adminClient
      .from('agent_job_options')
      .insert(rows)

    if (insertError) {
      console.error('[AgentJobs] Insert options error:', insertError)
      return NextResponse.json({ error: 'Failed to save options' }, { status: 500 })
    }

    // Update job status to options_ready
    await auth.adminClient
      .from('agent_jobs')
      .update({ status: 'options_ready', updated_at: new Date().toISOString() })
      .eq('id', jobId)

    return NextResponse.json({
      success: true,
      count: rows.length,
    })
  } catch (err) {
    console.error('[AgentJobs] POST options error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
