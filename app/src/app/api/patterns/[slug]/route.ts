import { createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// GET /api/patterns/[slug] - Get a single pattern
export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const adminClient = createAdminClient()

  const { data: pattern, error } = await adminClient
    .from('patterns')
    .select(`
      *,
      author_bot:bots(id, name, trust_tier),
      author_account:accounts(id, email)
    `)
    .eq('slug', params.slug)
    .single()

  if (error || !pattern) {
    return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })
  }

  // Only return validated patterns (or own patterns if authenticated)
  if (pattern.status !== 'validated') {
    return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })
  }

  // Increment view count (fire and forget)
  adminClient
    .from('patterns')
    .update({ view_count: (pattern.view_count || 0) + 1 })
    .eq('id', pattern.id)
    .then(() => {})

  return NextResponse.json({ pattern })
}
