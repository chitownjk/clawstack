'use client'

import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SERVICES, formatPrice } from '@/lib/services'

interface ServicePurchase {
  id: string
  account_id: string
  service_type: string
  amount_cents: number
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | 'quote_requested'
  fulfillment_status: 'pending' | 'in_progress' | 'completed' | 'canceled'
  fulfillment_notes: string | null
  created_at: string
  updated_at: string
  account?: {
    email: string
  }
}

function StatusBadge({ status, type }: { status: string; type: 'payment' | 'fulfillment' }) {
  const colors: Record<string, string> = {
    // Payment statuses
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    refunded: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400',
    quote_requested: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    // Fulfillment statuses
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    canceled: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400',
  }

  const labels: Record<string, string> = {
    pending: 'Pending',
    paid: 'Paid',
    failed: 'Failed',
    refunded: 'Refunded',
    quote_requested: 'Quote',
    in_progress: 'In Progress',
    completed: 'Completed',
    canceled: 'Canceled',
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors.pending}`}>
      {labels[status] || status}
    </span>
  )
}

function PurchaseRow({ 
  purchase, 
  onUpdateStatus,
  onUpdateNotes,
}: { 
  purchase: ServicePurchase
  onUpdateStatus: (id: string, field: 'payment_status' | 'fulfillment_status', value: string) => void
  onUpdateNotes: (id: string, notes: string) => void
}) {
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState(purchase.fulfillment_notes || '')
  const service = SERVICES[purchase.service_type]

  return (
    <tr className="border-b border-neutral-100 dark:border-neutral-800">
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{service?.icon || '📦'}</span>
          <div>
            <div className="font-medium text-neutral-900 dark:text-neutral-100">
              {service?.name || purchase.service_type}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              {purchase.account?.email || purchase.account_id.slice(0, 8)}
            </div>
          </div>
        </div>
      </td>
      <td className="py-4 px-4 text-neutral-900 dark:text-neutral-100">
        {formatPrice(purchase.amount_cents)}
      </td>
      <td className="py-4 px-4">
        <select
          value={purchase.payment_status}
          onChange={(e) => onUpdateStatus(purchase.id, 'payment_status', e.target.value)}
          className="text-xs bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 text-neutral-900 dark:text-neutral-100"
        >
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
          <option value="quote_requested">Quote</option>
        </select>
      </td>
      <td className="py-4 px-4">
        <select
          value={purchase.fulfillment_status}
          onChange={(e) => onUpdateStatus(purchase.id, 'fulfillment_status', e.target.value)}
          className="text-xs bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 text-neutral-900 dark:text-neutral-100"
        >
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="canceled">Canceled</option>
        </select>
      </td>
      <td className="py-4 px-4">
        {editingNotes ? (
          <div className="flex items-center gap-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 w-full min-h-[60px] text-neutral-900 dark:text-neutral-100"
              placeholder="Add notes..."
            />
            <div className="flex flex-col gap-1">
              <button
                onClick={() => {
                  onUpdateNotes(purchase.id, notes)
                  setEditingNotes(false)
                }}
                className="text-xs text-green-600 dark:text-green-400 hover:underline"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setNotes(purchase.fulfillment_notes || '')
                  setEditingNotes(false)
                }}
                className="text-xs text-neutral-500 hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditingNotes(true)}
            className="text-xs text-left text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            {purchase.fulfillment_notes || 'Add notes...'}
          </button>
        )}
      </td>
      <td className="py-4 px-4 text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
        {new Date(purchase.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </td>
    </tr>
  )
}

export default function AdminServicesPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [purchases, setPurchases] = useState<ServicePurchase[]>([])
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress'>('pending')

  useEffect(() => {
    async function loadData() {
      // Check if user is admin
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: account } = await supabase
        .from('accounts')
        .select('role')
        .eq('auth_uid', user.id)
        .single()

      if (account?.role !== 'mc_admin') {
        router.push('/dashboard')
        return
      }

      // Fetch purchases with account info
      const { data, error: fetchError } = await supabase
        .from('service_purchases')
        .select(`
          *,
          account:accounts(email)
        `)
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('Error fetching purchases:', fetchError)
        setError('Failed to load purchases')
      } else {
        setPurchases(data || [])
      }

      setLoading(false)
    }

    loadData()
  }, [router, supabase])

  const handleUpdateStatus = async (id: string, field: 'payment_status' | 'fulfillment_status', value: string) => {
    const { error: updateError } = await supabase
      .from('service_purchases')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) {
      setError('Failed to update status')
    } else {
      setPurchases(prev => prev.map(p => 
        p.id === id ? { ...p, [field]: value } : p
      ))
    }
  }

  const handleUpdateNotes = async (id: string, notes: string) => {
    const { error: updateError } = await supabase
      .from('service_purchases')
      .update({ fulfillment_notes: notes, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) {
      setError('Failed to update notes')
    } else {
      setPurchases(prev => prev.map(p => 
        p.id === id ? { ...p, fulfillment_notes: notes } : p
      ))
    }
  }

  const filteredPurchases = purchases.filter(p => {
    if (filter === 'all') return true
    if (filter === 'pending') return p.fulfillment_status === 'pending'
    if (filter === 'in_progress') return p.fulfillment_status === 'in_progress'
    return true
  })

  // Stats
  const stats = {
    total: purchases.length,
    pending: purchases.filter(p => p.fulfillment_status === 'pending').length,
    inProgress: purchases.filter(p => p.fulfillment_status === 'in_progress').length,
    completed: purchases.filter(p => p.fulfillment_status === 'completed').length,
    revenue: purchases
      .filter(p => p.payment_status === 'paid')
      .reduce((sum, p) => sum + p.amount_cents, 0),
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-1/4" />
          <div className="h-48 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
            Service Fulfillment
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Manage service purchases and fulfillment
          </p>
        </div>
        <Link 
          href="/command" 
          className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Command
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button onClick={() => setError(null)} className="text-sm text-red-500 hover:underline mt-1">
            Dismiss
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="card p-4">
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.total}</div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400">Total</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400">Pending</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400">In Progress</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400">Completed</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {formatPrice(stats.revenue)}
          </div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400">Revenue</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'pending', 'in_progress'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm rounded-lg transition ${
              filter === f 
                ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900' 
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : 'In Progress'}
            {f !== 'all' && (
              <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400">
                {f === 'pending' ? stats.pending : stats.inProgress}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">
                  Service
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">
                  Amount
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">
                  Payment
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">
                  Fulfillment
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">
                  Notes
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-500 dark:text-neutral-400">
                    No purchases found
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => (
                  <PurchaseRow
                    key={purchase.id}
                    purchase={purchase}
                    onUpdateStatus={handleUpdateStatus}
                    onUpdateNotes={handleUpdateNotes}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
