import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// GET /api/subscriptions
// Returns all subscription and recurring bill extracted items for the user,
// grouped by service/company with renewal tracking.
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

    // Fetch subscription and bill items
    const { data: items } = await adminClient
      .from('extracted_items')
      .select('*')
      .eq('account_id', account.id)
      .in('type', ['subscription', 'bill'])
      .eq('dismissed', false)
      .order('created_at', { ascending: false })

    if (!items || items.length === 0) {
      return NextResponse.json({
        subscriptions: [],
        total_monthly: 0,
        upcoming_renewals: [],
      })
    }

    // Group by service/company name
    const grouped = new Map<string, any>()

    for (const item of items) {
      const key = (
        item.data?.service ||
        item.data?.company ||
        item.title ||
        'Unknown'
      ).toLowerCase().trim()

      if (!grouped.has(key)) {
        grouped.set(key, {
          name: item.data?.service || item.data?.company || item.title,
          type: item.type,
          amount: item.data?.amount || null,
          renewal_date: item.data?.renewal_date || item.data?.due_date || null,
          plan: item.data?.plan || null,
          is_trial: item.data?.is_trial || false,
          is_recurring: item.data?.is_recurring || item.type === 'subscription',
          category: item.data?.category || 'other',
          items: [],
          last_seen: item.created_at,
        })
      }

      const group = grouped.get(key)!
      group.items.push({
        id: item.id,
        title: item.title,
        created_at: item.created_at,
        data: item.data,
      })

      // Update with most recent data
      if (item.data?.amount) group.amount = item.data.amount
      if (item.data?.renewal_date) group.renewal_date = item.data.renewal_date
      if (item.data?.due_date && !group.renewal_date) group.renewal_date = item.data.due_date
      group.last_seen = item.created_at
    }

    const subscriptions = Array.from(grouped.values())

    // Calculate total monthly estimate
    const totalMonthly = subscriptions.reduce((sum, sub) => {
      if (!sub.amount) return sum
      const amount = parseFloat(String(sub.amount).replace(/[^0-9.]/g, ''))
      return isNaN(amount) ? sum : sum + amount
    }, 0)

    // Find upcoming renewals (next 30 days)
    const now = new Date()
    const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const upcomingRenewals = subscriptions
      .filter((sub) => {
        if (!sub.renewal_date) return false
        const date = new Date(sub.renewal_date)
        return date >= now && date <= thirtyDaysOut
      })
      .sort((a, b) => new Date(a.renewal_date).getTime() - new Date(b.renewal_date).getTime())

    // Find trials ending soon
    const trialsEnding = subscriptions.filter((sub) => sub.is_trial)

    return NextResponse.json({
      subscriptions,
      total_monthly: Math.round(totalMonthly * 100) / 100,
      upcoming_renewals: upcomingRenewals,
      trials_ending: trialsEnding,
      total_tracked: subscriptions.length,
    })
  } catch (error) {
    console.error('[Subscriptions] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
  }
}
