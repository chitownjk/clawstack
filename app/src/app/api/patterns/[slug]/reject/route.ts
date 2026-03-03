/**
 * PATCH /api/patterns/[slug]/reject
 * 
 * Admin-only endpoint to reject a pending pattern.
 * Sets pattern status to 'rejected'.
 * Author can resubmit with changes.
 * 
 * WHY: Manual approval during seed stage ensures quality. Scale removes friction.
 */

import { createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// Verify user is admin/owner
async function verifyAdmin(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || ''
    const adminClient = createAdminClient()
    
    // Extract the access token from cookies
    const accessTokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/)
    if (!accessTokenMatch) return null
    
    const accessToken = decodeURIComponent(accessTokenMatch[1])
    
    // Verify the token
    const { data: { user }, error } = await adminClient.auth.getUser(accessToken)
    if (error || !user) return null
    
    // Get account and verify admin role
    const { data: account } = await adminClient
      .from('accounts')
      .select('*')
      .eq('auth_uid', user.id)
      .single()
    
    if (!account || (account.role !== 'owner' && account.role !== 'mc_admin')) {
      return null
    }
    
    return { user, account }
  } catch (e) {
    console.error('Admin verification error:', e)
    return null
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { slug: string } }
) {
  // Verify admin access
  const adminAuth = await verifyAdmin(request)
  if (!adminAuth) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    )
  }

  const adminClient = createAdminClient()

  try {
    // Get rejection reason from body (optional)
    let rejectionReason: string | null = null
    try {
      const body = await request.json()
      rejectionReason = body.reason || null
    } catch {
      // No body provided, continue without reason
    }

    // Get the pattern by slug first
    const { data: pattern, error: patternError } = await adminClient
      .from('patterns')
      .select('*')
      .eq('slug', params.slug)
      .single()

    if (patternError || !pattern) {
      return NextResponse.json(
        { error: 'Pattern not found' },
        { status: 404 }
      )
    }

    // Only reject patterns that are pending_review
    if (pattern.status !== 'pending_review') {
      return NextResponse.json(
        { error: `Pattern is already ${pattern.status}` },
        { status: 400 }
      )
    }

    // Update pattern to rejected
    const { data: updatedPattern, error: updateError } = await adminClient
      .from('patterns')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        rejected_at: new Date().toISOString(),
        rejected_by: adminAuth.account.id,
      })
      .eq('id', pattern.id)
      .select()
      .single()

    if (updateError) {
      console.error('Pattern rejection error:', updateError)
      return NextResponse.json(
        { error: 'Failed to reject pattern' },
        { status: 500 }
      )
    }

    // Update the Command task status to done (if exists)
    await adminClient
      .from('mc_tasks')
      .update({ status: 'done' })
      .eq('metadata->>pattern_id', pattern.id)
      .eq('tags', ['pattern-review'])

    return NextResponse.json({
      success: true,
      pattern: {
        id: updatedPattern.id,
        slug: updatedPattern.slug,
        title: updatedPattern.title,
        status: updatedPattern.status,
        rejection_reason: updatedPattern.rejection_reason,
        rejected_at: updatedPattern.rejected_at,
      },
      message: rejectionReason 
        ? `Pattern rejected: ${rejectionReason}`
        : 'Pattern rejected',
    })
  } catch (error) {
    console.error('Pattern rejection error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
