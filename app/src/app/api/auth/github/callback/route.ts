import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Force dynamic rendering (don't pre-render at build time)
export const dynamic = 'force-dynamic'

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    if (error) {
      console.error('[GitHub OAuth] Error from GitHub:', error)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/connections?github_error=${error}`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/connections?github_error=missing_params`)
    }

    // Verify state cookie
    const cookieStore = await cookies()
    const savedState = cookieStore.get('github_oauth_state')?.value

    if (!savedState || savedState !== state) {
      console.error('[GitHub OAuth] State mismatch')
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/connections?github_error=invalid_state`)
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.statusText}`)
    }

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      throw new Error(`GitHub error: ${tokenData.error_description || tokenData.error}`)
    }

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    })

    if (!userResponse.ok) {
      throw new Error('Failed to get GitHub user info')
    }

    const githubUser = await userResponse.json()

    // Get Supabase session
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/connections?github_error=session_expired`)
    }

    // Save GitHub tokens
    const adminClient = createAdminClient()
    const { error: updateError } = await adminClient
      .from('accounts')
      .update({
        github_tokens: {
          access_token: tokenData.access_token,
          scope: tokenData.scope,
          token_type: tokenData.token_type,
          github_user: {
            login: githubUser.login,
            id: githubUser.id,
            avatar_url: githubUser.avatar_url,
          },
          connected_at: Math.floor(Date.now() / 1000),
        },
      })
      .eq('auth_uid', session.user.id)

    if (updateError) {
      console.error('[GitHub OAuth] Failed to save tokens:', updateError)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/connections?github_error=save_failed`)
    }

    // Clear state cookie
    const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/connections?github_connected=true`)
    response.cookies.delete('github_oauth_state')

    return response
  } catch (error) {
    console.error('[GitHub OAuth] Callback error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/connections?github_error=unknown`)
  }
}
