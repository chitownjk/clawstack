import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Remove GitHub tokens from account
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('accounts')
      .update({ github_tokens: null })
      .eq('auth_uid', session.user.id)

    if (error) {
      console.error('[GitHub] Disconnect failed:', error)
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[GitHub] Disconnect error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
