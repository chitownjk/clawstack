import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Remove AgentMail credentials from account
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('accounts')
      .update({ agentmail_credentials: null })
      .eq('auth_uid', session.user.id)

    if (error) {
      console.error('[AgentMail] Disconnect failed:', error)
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[AgentMail] Disconnect error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
