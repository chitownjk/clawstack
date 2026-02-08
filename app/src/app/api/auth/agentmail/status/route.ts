import { createRealSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get account with AgentMail credentials
    const { data: account } = await supabase
      .from('accounts')
      .select('agentmail_credentials')
      .eq('auth_uid', session.user.id)
      .single()

    const connected = !!account?.agentmail_credentials?.api_key
    
    return NextResponse.json({ 
      connected,
      inboxes: connected ? account.agentmail_credentials.inboxes : [],
      connected_at: connected ? account.agentmail_credentials.connected_at : null
    })
  } catch (error) {
    console.error('[AgentMail] Status error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
