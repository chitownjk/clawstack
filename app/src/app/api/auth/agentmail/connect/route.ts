import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { apiKey } = await request.json()

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ error: 'API key required' }, { status: 400 })
    }

    // Test the API key by fetching inboxes
    const testResponse = await fetch('https://api.agentmail.to/v0/inboxes', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (!testResponse.ok) {
      return NextResponse.json({ 
        error: 'Invalid API key or connection failed',
        details: await testResponse.text()
      }, { status: 400 })
    }

    const inboxes = await testResponse.json()

    // Save credentials (API key will be encrypted by Supabase RLS)
    const credentials = {
      api_key: apiKey,
      inboxes: inboxes,
      connected_at: Math.floor(Date.now() / 1000)
    }

    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('accounts')
      .update({ agentmail_credentials: credentials })
      .eq('auth_uid', session.user.id)

    if (error) {
      console.error('[AgentMail] Save credentials failed:', error)
      return NextResponse.json({ error: 'Failed to save credentials' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      inboxes: inboxes
    })
  } catch (error) {
    console.error('[AgentMail] Connect error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
