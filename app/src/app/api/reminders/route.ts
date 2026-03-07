import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// GET /api/reminders - List active reminders for current user
// POST /api/reminders - Create a new reminder
// PATCH /api/reminders - Update reminder (snooze, complete, dismiss, escalate)
export async function GET(request: Request) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data: account } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'active'
    const includeSnoozed = searchParams.get('include_snoozed') === '1'

    let query = adminClient
      .from('reminders')
      .select('*')
      .eq('account_id', account.id)
      .order('next_remind_at', { ascending: true })
      .limit(50)

    if (status === 'active') {
      if (includeSnoozed) {
        query = query.in('status', ['active', 'snoozed'])
      } else {
        query = query.eq('status', 'active')
      }
    } else {
      query = query.eq('status', status)
    }

    const { data: reminders, error } = await query

    if (error) {
      console.error('[Reminders] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 })
    }

    // Check for snoozed reminders that should be reactivated
    const now = new Date()
    const reactivated: string[] = []
    for (const reminder of (reminders || [])) {
      if (reminder.status === 'snoozed' && reminder.snoozed_until && new Date(reminder.snoozed_until) <= now) {
        await adminClient
          .from('reminders')
          .update({ status: 'active', snoozed_until: null })
          .eq('id', reminder.id)
        reminder.status = 'active'
        reminder.snoozed_until = null
        reactivated.push(reminder.id)
      }
    }

    return NextResponse.json({
      reminders: reminders || [],
      reactivated: reactivated.length,
    })
  } catch (error) {
    console.error('[Reminders] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data: account } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const body = await request.json()
    const { title, body: reminderBody, type, due_at, task_id, extracted_item_id } = body

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    // Calculate first remind time
    const dueDate = due_at ? new Date(due_at) : null
    const nextRemindAt = dueDate || new Date() // Remind immediately if no due date

    const { data: reminder, error } = await adminClient
      .from('reminders')
      .insert({
        account_id: account.id,
        title,
        body: reminderBody,
        type: type || 'custom',
        due_at: dueDate?.toISOString(),
        task_id,
        extracted_item_id,
        next_remind_at: nextRemindAt.toISOString(),
        escalation_level: 0,
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      console.error('[Reminders] Create error:', error)
      return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 })
    }

    return NextResponse.json({ reminder })
  } catch (error) {
    console.error('[Reminders] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data: account } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const body = await request.json()
    const { id, action, snooze_hours } = body

    if (!id || !action) {
      return NextResponse.json({ error: 'id and action are required' }, { status: 400 })
    }

    // Verify ownership
    const { data: reminder } = await adminClient
      .from('reminders')
      .select('*')
      .eq('id', id)
      .eq('account_id', account.id)
      .single()

    if (!reminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 })
    }

    const now = new Date()
    let update: Record<string, any> = { updated_at: now.toISOString() }

    switch (action) {
      case 'complete':
        update.status = 'completed'
        update.completed_at = now.toISOString()
        break

      case 'dismiss':
        update.status = 'dismissed'
        update.dismissed_at = now.toISOString()
        break

      case 'snooze': {
        const hours = snooze_hours || 4
        const snoozedUntil = new Date(now.getTime() + hours * 60 * 60 * 1000)
        update.status = 'snoozed'
        update.snoozed_until = snoozedUntil.toISOString()
        break
      }

      case 'escalate': {
        // Escalation schedule: level 0 -> +1d, level 1 -> +3d, level 2 -> +7d
        const escalationDays = [1, 3, 7]
        const nextLevel = Math.min(reminder.escalation_level + 1, escalationDays.length - 1)
        const daysToAdd = escalationDays[nextLevel] || 7
        const nextRemind = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000)

        update.escalation_level = nextLevel
        update.last_reminded_at = now.toISOString()
        update.next_remind_at = nextRemind.toISOString()
        break
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    const { data: updated, error } = await adminClient
      .from('reminders')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[Reminders] Update error:', error)
      return NextResponse.json({ error: 'Failed to update reminder' }, { status: 500 })
    }

    return NextResponse.json({ reminder: updated })
  } catch (error) {
    console.error('[Reminders] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
