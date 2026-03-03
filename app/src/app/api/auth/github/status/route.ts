import { createRealSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get account with GitHub tokens
    const { data: account } = await supabase
      .from('accounts')
      .select('github_tokens')
      .eq('auth_uid', session.user.id)
      .single()

    const connected = !!account?.github_tokens?.access_token
    
    return NextResponse.json({ 
      connected,
      githubUser: connected ? account.github_tokens.github_user : null,
      connected_at: connected ? account.github_tokens.connected_at : null,
    })
  } catch (error) {
    console.error('[GitHub] Status error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
