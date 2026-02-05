import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/auth/google/callback'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')

  // Check for OAuth errors
  if (error) {
    console.error('[Google OAuth] Error:', error)
    return NextResponse.redirect(new URL('/settings?google_error=' + error, request.url))
  }

  if (!code) {
    return NextResponse.json({ error: 'No authorization code' }, { status: 400 })
  }

  // Verify state token to prevent CSRF
  const cookieStore = await cookies()
  const savedState = cookieStore.get('google_oauth_state')?.value
  
  if (!savedState || savedState !== state) {
    console.error('[Google OAuth] State mismatch:', { savedState, receivedState: state })
    return NextResponse.redirect(new URL('/settings?google_error=state_mismatch', request.url))
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('[Google OAuth] Token exchange failed:', errorText)
      return NextResponse.redirect(new URL('/settings?google_error=token_exchange_failed', request.url))
    }

    const tokens = await tokenResponse.json()

    // Calculate expiration timestamp
    const expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in

    // Get current user
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.redirect(new URL('/login?next=/settings', request.url))
    }

    // Update account with Google tokens
    const adminClient = createAdminClient()
    const { error: updateError } = await adminClient
      .from('accounts')
      .update({
        google_tokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt,
          scope: tokens.scope,
        },
      })
      .eq('auth_uid', session.user.id)

    if (updateError) {
      console.error('[Google OAuth] Failed to save tokens:', updateError)
      return NextResponse.redirect(new URL('/settings?google_error=save_failed', request.url))
    }

    // Clear state cookie
    cookieStore.delete('google_oauth_state')

    // Redirect back to settings with success
    return NextResponse.redirect(new URL('/settings?google_connected=true', request.url))
  } catch (error) {
    console.error('[Google OAuth] Unexpected error:', error)
    return NextResponse.redirect(new URL('/settings?google_error=unexpected', request.url))
  }
}
