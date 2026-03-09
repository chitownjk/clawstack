/**
 * Plaid integration for real financial data.
 * Supplements email-scraped bill detection with actual bank transactions,
 * recurring charges, and balance data.
 *
 * Requires: PLAID_CLIENT_ID, PLAID_SECRET
 * Optional: PLAID_ENV (defaults to 'sandbox', use 'production' for real data)
 */

const PLAID_BASE_URL = process.env.PLAID_ENV === 'production'
  ? 'https://production.plaid.com'
  : process.env.PLAID_ENV === 'development'
  ? 'https://development.plaid.com'
  : 'https://sandbox.plaid.com'

function getPlaidHeaders() {
  return {
    'Content-Type': 'application/json',
    'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID || '',
    'PLAID-SECRET': process.env.PLAID_SECRET || '',
  }
}

export function isPlaidConfigured(): boolean {
  return !!(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET)
}

/**
 * Create a Link token for the frontend to initialize Plaid Link.
 * The user connects their bank through Plaid's UI.
 */
export async function createLinkToken(userId: string): Promise<string | null> {
  try {
    const response = await fetch(`${PLAID_BASE_URL}/link/token/create`, {
      method: 'POST',
      headers: getPlaidHeaders(),
      body: JSON.stringify({
        user: { client_user_id: userId },
        client_name: 'Tiker',
        products: ['transactions'],
        country_codes: ['US'],
        language: 'en',
        // Recurring transactions for bill detection
        optional_products: ['recurring_transactions'],
      }),
    })

    if (!response.ok) {
      console.error('[Plaid] Link token error:', response.status, await response.text())
      return null
    }

    const data = await response.json()
    return data.link_token
  } catch (error) {
    console.error('[Plaid] Link token failed:', error)
    return null
  }
}

/**
 * Exchange a public token (from Plaid Link) for an access token.
 * Store the access token securely (encrypted) in the database.
 */
export async function exchangePublicToken(publicToken: string): Promise<{ accessToken: string; itemId: string } | null> {
  try {
    const response = await fetch(`${PLAID_BASE_URL}/item/public_token/exchange`, {
      method: 'POST',
      headers: getPlaidHeaders(),
      body: JSON.stringify({ public_token: publicToken }),
    })

    if (!response.ok) {
      console.error('[Plaid] Token exchange error:', response.status)
      return null
    }

    const data = await response.json()
    return { accessToken: data.access_token, itemId: data.item_id }
  } catch (error) {
    console.error('[Plaid] Token exchange failed:', error)
    return null
  }
}

/**
 * Get recurring transactions (bills, subscriptions) from Plaid.
 * This is the gold: real recurring charges with amounts, dates, and merchants.
 */
export async function getRecurringTransactions(accessToken: string): Promise<{
  inflow: RecurringTransaction[]
  outflow: RecurringTransaction[]
} | null> {
  try {
    const response = await fetch(`${PLAID_BASE_URL}/transactions/recurring/get`, {
      method: 'POST',
      headers: getPlaidHeaders(),
      body: JSON.stringify({
        access_token: accessToken,
        options: { include_personal_finance_category: true },
      }),
    })

    if (!response.ok) {
      console.error('[Plaid] Recurring transactions error:', response.status)
      return null
    }

    const data = await response.json()

    const mapTx = (streams: any[]): RecurringTransaction[] =>
      (streams || []).map(s => ({
        id: s.stream_id,
        merchant: s.merchant_name || s.description || 'Unknown',
        amount: Math.abs(s.last_amount?.amount || s.average_amount?.amount || 0),
        frequency: s.frequency,
        lastDate: s.last_date,
        nextDate: s.predicted_next_date,
        category: s.personal_finance_category?.primary || 'other',
        isActive: s.is_active,
        status: s.status,
      }))

    return {
      inflow: mapTx(data.inflow_streams),
      outflow: mapTx(data.outflow_streams),
    }
  } catch (error) {
    console.error('[Plaid] Recurring transactions failed:', error)
    return null
  }
}

export interface RecurringTransaction {
  id: string
  merchant: string
  amount: number
  frequency: string // WEEKLY, BIWEEKLY, SEMI_MONTHLY, MONTHLY, ANNUALLY
  lastDate: string
  nextDate: string | null
  category: string
  isActive: boolean
  status: string
}

/**
 * Get account balances for a quick financial snapshot.
 */
export async function getBalances(accessToken: string): Promise<AccountBalance[] | null> {
  try {
    const response = await fetch(`${PLAID_BASE_URL}/accounts/balance/get`, {
      method: 'POST',
      headers: getPlaidHeaders(),
      body: JSON.stringify({ access_token: accessToken }),
    })

    if (!response.ok) {
      console.error('[Plaid] Balance error:', response.status)
      return null
    }

    const data = await response.json()
    return (data.accounts || []).map((a: any) => ({
      id: a.account_id,
      name: a.name || a.official_name || 'Account',
      type: a.type,
      subtype: a.subtype,
      currentBalance: a.balances?.current || 0,
      availableBalance: a.balances?.available || null,
      lastFour: a.mask || null,
    }))
  } catch (error) {
    console.error('[Plaid] Balance failed:', error)
    return null
  }
}

export interface AccountBalance {
  id: string
  name: string
  type: string
  subtype: string
  currentBalance: number
  availableBalance: number | null
  lastFour: string | null
}

/**
 * Sync Plaid recurring transactions into extracted_items table.
 * Merges with email-scraped bills to avoid duplicates.
 */
export async function syncRecurringToExtractedItems(
  adminClient: any,
  accountId: string,
  accessToken: string
): Promise<number> {
  const recurring = await getRecurringTransactions(accessToken)
  if (!recurring) return 0

  let synced = 0

  for (const tx of recurring.outflow.filter(t => t.isActive)) {
    // Check if we already have this from email or a previous sync
    const { data: existing } = await adminClient
      .from('extracted_items')
      .select('id')
      .eq('account_id', accountId)
      .eq('source', 'plaid')
      .eq('source_id', tx.id)
      .limit(1)

    if (existing && existing.length > 0) continue

    // Also check for email-detected duplicates (fuzzy match on merchant name)
    const { data: emailDupes } = await adminClient
      .from('extracted_items')
      .select('id')
      .eq('account_id', accountId)
      .eq('source', 'email')
      .in('type', ['bill', 'subscription'])
      .ilike('title', `%${tx.merchant.split(' ')[0]}%`)
      .limit(1)

    if (emailDupes && emailDupes.length > 0) continue

    const type = ['SUBSCRIPTION', 'RENT', 'LOAN_PAYMENTS', 'INSURANCE']
      .some(c => tx.category.toUpperCase().includes(c))
      ? 'subscription'
      : 'bill'

    await adminClient
      .from('extracted_items')
      .insert({
        account_id: accountId,
        source: 'plaid',
        source_id: tx.id,
        type,
        title: `${tx.merchant} - $${tx.amount.toFixed(2)}`,
        data: {
          company: tx.merchant,
          amount: tx.amount,
          due_date: tx.nextDate,
          category: tx.category,
          frequency: tx.frequency,
          is_recurring: true,
          last_charged: tx.lastDate,
        },
        expires_at: tx.nextDate || null,
      })

    synced++
  }

  return synced
}
