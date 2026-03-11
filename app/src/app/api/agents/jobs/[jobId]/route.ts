import { getAuthenticatedAdmin } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { decrypt } from '@/lib/crypto'

// GET /api/agents/jobs/[jobId]
// Returns job status and options (if ready)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const auth = await getAuthenticatedAdmin()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { jobId } = await params

    const { data: job, error } = await auth.adminClient
      .from('agent_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('account_id', auth.account.id)
      .single()

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Decrypt search params
    let searchParams = null
    try {
      if (job.search_params) {
        searchParams = JSON.parse(decrypt(job.search_params as string))
      }
    } catch { /* leave null if decrypt fails */ }

    // Fetch options if available
    let options: any[] = []
    if (['options_ready', 'selected', 'completed'].includes(job.status)) {
      const { data: rawOptions } = await auth.adminClient
        .from('agent_job_options')
        .select('*')
        .eq('job_id', jobId)
        .order('ranking', { ascending: true })

      options = (rawOptions || []).map(opt => {
        let optionData = null
        let displaySummary = opt.display_summary
        let bookingUrl = null

        try {
          if (opt.option_data) optionData = JSON.parse(decrypt(opt.option_data as string))
        } catch { /* leave null */ }
        try {
          if (opt.display_summary) displaySummary = decrypt(opt.display_summary as string)
        } catch { /* leave raw */ }
        try {
          if (opt.booking_url) bookingUrl = decrypt(opt.booking_url as string)
        } catch { /* leave null */ }

        return {
          id: opt.id,
          provider: opt.provider,
          option_data: optionData,
          display_summary: displaySummary,
          price_cents: opt.price_cents,
          currency: opt.currency,
          booking_url: bookingUrl,
          ranking: opt.ranking,
          ranking_reason: opt.ranking_reason,
        }
      })
    }

    return NextResponse.json({
      job: {
        id: job.id,
        type: job.job_type,
        status: job.status,
        search_params: searchParams,
        source_url: job.source_url,
        error_message: job.error_message,
        created_at: job.created_at,
        expires_at: job.expires_at,
      },
      options,
    })
  } catch (err) {
    console.error('[AgentJobs] GET error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// PATCH /api/agents/jobs/[jobId]
// Update job status (e.g., selected, declined, expired)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const auth = await getAuthenticatedAdmin()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { jobId } = await params
    const body = await request.json()
    const { status, error_message } = body

    const validStatuses = [
      'searching', 'options_ready', 'selected', 'completed', 'failed', 'expired', 'declined'
    ]
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (status) update.status = status
    if (error_message) update.error_message = error_message

    const { data: job, error } = await auth.adminClient
      .from('agent_jobs')
      .update(update)
      .eq('id', jobId)
      .eq('account_id', auth.account.id)
      .select('id, status, updated_at')
      .single()

    if (error || !job) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    return NextResponse.json({ job })
  } catch (err) {
    console.error('[AgentJobs] PATCH error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
