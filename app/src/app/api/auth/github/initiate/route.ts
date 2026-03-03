import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET

export async function GET() {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!GITHUB_CLIENT_ID) {
      return NextResponse.json({ error: 'GitHub OAuth not configured' }, { status: 500 })
    }

    // Generate state parameter for CSRF protection
    const state = Buffer.from(JSON.stringify({
      userId: session.user.id,
      nonce: Math.random().toString(36).substring(2),
    })).toString('base64')

    // Store state in cookie
    const redirectUrl = new URL('https://github.com/login/oauth/authorize')
    redirectUrl.searchParams.set('client_id', GITHUB_CLIENT_ID)
    redirectUrl.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`)
    redirectUrl.searchParams.set('scope', 'repo user read:org')
    redirectUrl.searchParams.set('state', state)

    const response = NextResponse.redirect(redirectUrl.toString())
    
    // Set state cookie
    response.cookies.set('github_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[GitHub OAuth] Initiate error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
