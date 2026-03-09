import { NextRequest, NextResponse } from 'next/server'
import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { deleteAccountSchema, validateBody } from '@/lib/validation'

// Rate limiter: 3 delete attempts per hour per user
const ratelimit = process.env.UPSTASH_REDIS_REST_URL
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(3, '1 h'),
      prefix: 'ratelimit:delete-account',
    })
  : null

export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createRealSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Rate limit
    if (ratelimit) {
      const { success } = await ratelimit.limit(user.id)
      if (!success) {
        return NextResponse.json(
          { error: 'Too many delete attempts. Try again later.' },
          { status: 429 }
        )
      }
    }

    // Require confirmation with email match
    const body = await request.json().catch(() => ({}))
    const parsed = validateBody(deleteAccountSchema, body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Confirmation required. Send { "confirm": "DELETE", "email": "your@email.com" }' },
        { status: 400 }
      )
    }
    if (parsed.data.email !== user.email) {
      return NextResponse.json(
        { error: 'Email does not match your account' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Get account
    const { data: account } = await adminClient
      .from('accounts')
      .select('id, deleted_at')
      .eq('auth_uid', user.id)
      .single()

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Soft-delete: mark for deletion, actual purge after 24 hours
    // If already marked, check if 24h have passed
    if (account.deleted_at) {
      const deletedAt = new Date(account.deleted_at)
      const hoursSince = (Date.now() - deletedAt.getTime()) / (1000 * 60 * 60)

      if (hoursSince < 24) {
        const hoursLeft = Math.ceil(24 - hoursSince)
        return NextResponse.json({
          success: true,
          message: `Account scheduled for deletion. ${hoursLeft} hours remaining. Log in to cancel.`,
          scheduled_deletion: account.deleted_at,
        })
      }

      // 24h passed -- proceed with hard delete
      // Delete in order (respecting foreign keys)
      await adminClient.from('mc_activities').delete().eq('account_id', account.id)
      await adminClient.from('mc_comments').delete().eq('account_id', account.id)
      await adminClient.from('mc_tasks').delete().eq('account_id', account.id)
      await adminClient.from('mc_agents').delete().eq('account_id', account.id)
      await adminClient.from('bots').delete().eq('account_id', account.id)
      try {
        await adminClient.from('service_purchases').delete().eq('account_id', account.id)
      } catch { /* table may not exist */ }
      await adminClient.from('accounts').delete().eq('id', account.id)
      await supabase.auth.signOut()

      return NextResponse.json({
        success: true,
        message: 'Account and all data permanently deleted.',
      })
    }

    // First request: mark for deletion (soft-delete)
    await adminClient
      .from('accounts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', account.id)

    // Sign out immediately
    await supabase.auth.signOut()

    return NextResponse.json({
      success: true,
      message: 'Account scheduled for deletion in 24 hours. Log back in within 24 hours to cancel.',
    })
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}
