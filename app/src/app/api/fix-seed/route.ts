/**
 * TEMPORARY: Move seeded marketing tasks from wrong account to correct account.
 * DELETE THIS FILE after running once.
 *
 * GET /api/fix-seed?secret=tiker-seed-2026&from_email=jayjk60614@gmail.com&to_email=jklauminzer@gmail.com
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const fromEmail = searchParams.get('from_email')
  const toEmail = searchParams.get('to_email')

  if (secret !== 'tiker-seed-2026') {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }
  if (!fromEmail || !toEmail) {
    return NextResponse.json({ error: 'Need from_email and to_email params' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Find both accounts
  const { data: fromAcct } = await supabase
    .from('accounts')
    .select('id, email')
    .ilike('email', `%${fromEmail}%`)
    .limit(1)
    .single()

  const { data: toAcct } = await supabase
    .from('accounts')
    .select('id, email')
    .ilike('email', `%${toEmail}%`)
    .limit(1)
    .single()

  if (!fromAcct || !toAcct) {
    return NextResponse.json({
      error: 'Account not found',
      from: fromAcct || 'NOT FOUND',
      to: toAcct || 'NOT FOUND',
    }, { status: 404 })
  }

  // Find marketing tasks on the wrong account (tagged with 'marketing')
  const { data: tasks, error: fetchErr } = await supabase
    .from('mc_tasks')
    .select('id, tags')
    .eq('account_id', fromAcct.id)
    .contains('tags', ['marketing'])

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({
      message: 'No marketing tasks found on source account',
      from: fromAcct,
      to: toAcct,
    })
  }

  // Move them
  const taskIds = tasks.map((t: any) => t.id)
  const { error: updateErr, count } = await supabase
    .from('mc_tasks')
    .update({ account_id: toAcct.id })
    .in('id', taskIds)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({
    moved: taskIds.length,
    from: `${fromAcct.email} (${fromAcct.id})`,
    to: `${toAcct.email} (${toAcct.id})`,
  })
}
