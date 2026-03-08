import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// GET /api/finance
// Financial awareness endpoint. Aggregates bill tracking, subscription costs,
// and spending patterns from extracted email data.
// This is the first step before full Plaid integration -- it works with
// what we already have from email scanning (bills, subscriptions).
//
// Future: Plaid link for bank account connections, real-time balance tracking,
// and automated bill pay status checking.
export async function GET() {
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

    // Gather financial data from extracted items
    const [bills, subscriptions, financialInsights] = await Promise.all([
      fetchBills(adminClient, account.id),
      fetchSubscriptions(adminClient, account.id),
      fetchFinancialInsights(adminClient, account.id),
    ])

    // Calculate summaries
    const monthlyBillTotal = bills.reduce((sum: number, b: any) => {
      const amt = parseFloat(String(b.data?.amount || '0').replace(/[^0-9.]/g, ''))
      return isNaN(amt) ? sum : sum + amt
    }, 0)

    const monthlySubTotal = subscriptions.reduce((sum: number, s: any) => {
      const amt = parseFloat(String(s.data?.amount || '0').replace(/[^0-9.]/g, ''))
      return isNaN(amt) ? sum : sum + amt
    }, 0)

    // Upcoming bills (next 30 days)
    const now = new Date()
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const upcoming = bills.filter((b: any) => {
      const dueDate = b.data?.due_date ? new Date(b.data.due_date) : null
      return dueDate && dueDate >= now && dueDate <= thirtyDays
    })

    // Overdue bills
    const overdue = bills.filter((b: any) => {
      const dueDate = b.data?.due_date ? new Date(b.data.due_date) : null
      return dueDate && dueDate < now && !b.processed
    })

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {}
    for (const b of [...bills, ...subscriptions] as any[]) {
      const category = b.data?.category || 'other'
      const amt = parseFloat(String(b.data?.amount || '0').replace(/[^0-9.]/g, ''))
      if (!isNaN(amt)) {
        categoryBreakdown[category] = (categoryBreakdown[category] || 0) + amt
      }
    }

    return NextResponse.json({
      summary: {
        monthly_bills: monthlyBillTotal,
        monthly_subscriptions: monthlySubTotal,
        total_monthly: monthlyBillTotal + monthlySubTotal,
        upcoming_count: upcoming.length,
        overdue_count: overdue.length,
      },
      upcoming_bills: upcoming.map((b: any) => ({
        title: b.title,
        amount: b.data?.amount,
        due_date: b.data?.due_date,
        category: b.data?.category,
        is_recurring: b.data?.is_recurring,
      })),
      overdue_bills: overdue.map((b: any) => ({
        title: b.title,
        amount: b.data?.amount,
        due_date: b.data?.due_date,
        category: b.data?.category,
      })),
      subscriptions: subscriptions.map((s: any) => ({
        title: s.title,
        amount: s.data?.amount,
        frequency: s.data?.frequency || 'monthly',
        is_trial: s.data?.is_trial,
        trial_end: s.data?.trial_end,
      })),
      category_breakdown: categoryBreakdown,
      insights: financialInsights,
      plaid_status: 'not_connected', // Future: Plaid integration status
    })
  } catch (error) {
    console.error('[Finance] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch financial data' }, { status: 500 })
  }
}

// POST /api/finance
// Mark a bill as paid, dismiss, or add a manual entry.
// Body: { action: 'mark_paid' | 'dismiss' | 'add_manual', item_id?, data? }
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
    const { action, item_id, data } = body

    if (action === 'mark_paid' && item_id) {
      await adminClient
        .from('extracted_items')
        .update({ processed: true, data: { ...(data || {}), paid: true, paid_at: new Date().toISOString() } })
        .eq('id', item_id)
        .eq('account_id', account.id)

      return NextResponse.json({ success: true })
    }

    if (action === 'dismiss' && item_id) {
      await adminClient
        .from('extracted_items')
        .update({ dismissed: true })
        .eq('id', item_id)
        .eq('account_id', account.id)

      return NextResponse.json({ success: true })
    }

    if (action === 'add_manual' && data) {
      await adminClient
        .from('extracted_items')
        .insert({
          account_id: account.id,
          type: data.type || 'bill',
          title: data.title,
          data: {
            amount: data.amount,
            due_date: data.due_date,
            category: data.category || 'other',
            is_recurring: data.is_recurring || false,
            source: 'manual',
          },
          source: 'manual',
          processed: false,
          dismissed: false,
        })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[Finance] Action error:', error)
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 })
  }
}

async function fetchBills(adminClient: any, accountId: string) {
  try {
    const { data } = await adminClient
      .from('extracted_items')
      .select('id, title, data, created_at, processed, dismissed')
      .eq('account_id', accountId)
      .eq('type', 'bill')
      .eq('dismissed', false)
      .order('created_at', { ascending: false })
      .limit(50)
    return data || []
  } catch {
    return []
  }
}

async function fetchSubscriptions(adminClient: any, accountId: string) {
  try {
    const { data } = await adminClient
      .from('extracted_items')
      .select('id, title, data, created_at, processed, dismissed')
      .eq('account_id', accountId)
      .eq('type', 'subscription')
      .eq('dismissed', false)
      .order('created_at', { ascending: false })
      .limit(50)
    return data || []
  } catch {
    return []
  }
}

async function fetchFinancialInsights(adminClient: any, accountId: string): Promise<string[]> {
  const insights: string[] = []

  try {
    // Check for trial ending soon
    const { data: trials } = await adminClient
      .from('extracted_items')
      .select('title, data')
      .eq('account_id', accountId)
      .eq('type', 'subscription')
      .eq('dismissed', false)

    if (trials) {
      const now = new Date()
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const endingSoon = trials.filter((t: any) => {
        const trialEnd = t.data?.trial_end ? new Date(t.data.trial_end) : null
        return trialEnd && trialEnd >= now && trialEnd <= weekFromNow
      })
      if (endingSoon.length > 0) {
        insights.push(`${endingSoon.length} trial(s) ending this week: ${endingSoon.map((t: any) => t.title).join(', ')}`)
      }
    }

    // Check for high-value upcoming bills
    const { data: bills } = await adminClient
      .from('extracted_items')
      .select('title, data')
      .eq('account_id', accountId)
      .eq('type', 'bill')
      .eq('dismissed', false)
      .eq('processed', false)

    if (bills) {
      const highValue = bills.filter((b: any) => {
        const amt = parseFloat(String(b.data?.amount || '0').replace(/[^0-9.]/g, ''))
        return amt > 500
      })
      if (highValue.length > 0) {
        insights.push(`${highValue.length} high-value bill(s) pending: ${highValue.map((b: any) => `${b.title} (${b.data?.amount})`).join(', ')}`)
      }
    }
  } catch {
    // Tables may not exist
  }

  return insights
}
