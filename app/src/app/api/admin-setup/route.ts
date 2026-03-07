import { createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

/**
 * TEMPORARY route to set up admin account.
 * DELETE THIS FILE after use.
 *
 * Usage: GET /api/admin-setup?secret=tiker-admin-2026&email=jklauminzer@gmail.com
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const email = searchParams.get('email')

  if (secret !== 'tiker-admin-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Find the user by email
  const { data: users, error: userError } = await adminClient.auth.admin.listUsers()
  if (userError) {
    return NextResponse.json({ error: 'Failed to list users', details: userError.message }, { status: 500 })
  }

  const user = users.users.find(u => u.email === email)
  if (!user) {
    return NextResponse.json({ error: `User not found: ${email}` }, { status: 404 })
  }

  // Update account to Pro tier
  const { data: account, error: accountError } = await adminClient
    .from('accounts')
    .update({
      plan_tier: 'cloud',
      execution_mode: 'cloud-our-keys',
    })
    .eq('auth_uid', user.id)
    .select('id, plan_tier, execution_mode, email')
    .single()

  if (accountError) {
    return NextResponse.json({ error: 'Failed to update account', details: accountError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: `Account updated to Pro (cloud) tier`,
    account: {
      id: account.id,
      email: account.email,
      plan_tier: account.plan_tier,
      execution_mode: account.execution_mode,
    },
    note: 'Admin email bypass is hardcoded in chat route. DELETE this file after use.'
  })
}
