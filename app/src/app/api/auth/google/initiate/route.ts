import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/auth/google/callback'

// Scopes needed for calendar and email
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.modify',
].join(' ')

export async function GET() {
  // Generate state token for CSRF protection
  const state = crypto.randomBytes(32).toString('hex')

  // Store state in cookie
  const cookieStore = await cookies()
  cookieStore.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  // Build Google OAuth URL
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
  authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', SCOPES)
  authUrl.searchParams.set('access_type', 'offline') // Get refresh token
  authUrl.searchParams.set('prompt', 'consent') // Force consent to get refresh token
  authUrl.searchParams.set('state', state)

  // Redirect to Google OAuth
  return NextResponse.redirect(authUrl.toString())
}
