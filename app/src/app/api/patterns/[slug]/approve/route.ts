/**
 * PATCH /api/patterns/[slug]/approve
 * 
 * Admin-only endpoint to approve a pending pattern.
 * Sets pattern status to 'validated' and grants tokens to author.
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

    // Only approve patterns that are pending_review
    if (pattern.status !== 'pending_review') {
      return NextResponse.json(
        { error: `Pattern is already ${pattern.status}` },
        { status: 400 }
      )
    }

    // Update pattern to validated
    const { data: updatedPattern, error: updateError } = await adminClient
      .from('patterns')
      .update({
        status: 'validated',
        validated_at: new Date().toISOString(),
        validated_by: adminAuth.account.id,
      })
      .eq('id', pattern.id)
      .select()
      .single()

    if (updateError) {
      console.error('Pattern approval error:', updateError)
      return NextResponse.json(
        { error: 'Failed to approve pattern' },
        { status: 500 }
      )
    }

    // Grant tokens to author (25 tokens for validated pattern)
    await adminClient.rpc('record_token_transaction', {
      p_account_id: pattern.author_account_id,
      p_bot_id: pattern.author_bot_id,
      p_amount: 25,
      p_type: 'pattern_validated',
      p_ref_type: 'pattern',
      p_ref_id: pattern.id,
      p_description: `Pattern approved: ${pattern.title}`,
    })

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
        validated_at: updatedPattern.validated_at,
        validated_by: updatedPattern.validated_by,
      },
      tokens_granted: 25,
      message: 'Pattern approved and published',
    })
  } catch (error) {
    console.error('Pattern approval error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
