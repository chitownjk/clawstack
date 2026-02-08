import { createAdminClient } from './supabase-server'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!

export interface GoogleTokens {
  access_token: string
  refresh_token: string
  expires_at: number
  scope: string
}

/**
 * Refresh Google OAuth tokens if expired
 */
export async function refreshGoogleTokens(accountId: string): Promise<GoogleTokens | null> {
  const supabase = createAdminClient()

  // Get current tokens
  const { data: account } = await supabase
    .from('accounts')
    .select('google_tokens')
    .eq('id', accountId)
    .single()

  if (!account?.google_tokens) {
    return null
  }

  const tokens = account.google_tokens as GoogleTokens

  // Check if token is expired (with 5 min buffer)
  const now = Math.floor(Date.now() / 1000)
  if (tokens.expires_at > now + 300) {
    // Token still valid
    return tokens
  }

  // Refresh the token
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: tokens.refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      console.error('[Google OAuth] Token refresh failed:', await response.text())
      return null
    }

    const newTokens = await response.json()

    // Calculate new expiration
    const expiresAt = now + newTokens.expires_in

    // Update in database
    const updatedTokens: GoogleTokens = {
      access_token: newTokens.access_token,
      refresh_token: tokens.refresh_token, // Keep original refresh token
      expires_at: expiresAt,
      scope: tokens.scope,
    }

    await supabase
      .from('accounts')
      .update({ google_tokens: updatedTokens })
      .eq('id', accountId)

    return updatedTokens
  } catch (error) {
    console.error('[Google OAuth] Token refresh error:', error)
    return null
  }
}

/**
 * Get valid Google access token (refreshes if needed)
 */
export async function getGoogleAccessToken(accountId: string): Promise<string | null> {
  const tokens = await refreshGoogleTokens(accountId)
  return tokens?.access_token || null
}
