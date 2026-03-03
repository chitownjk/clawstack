/**
 * Local authentication for self-hosted installs without Supabase/Google
 * 
 * AUTH_MODE options:
 * - 'supabase' (default): Use Supabase Auth with Google SSO
 * - 'local': No auth required (single user, localhost assumed)
 * - 'password': Simple password auth with LOCAL_ADMIN_PASSWORD
 */

import { cookies } from 'next/headers'
import crypto from 'crypto'

export type AuthMode = 'supabase' | 'local' | 'password'

export function getAuthMode(): AuthMode {
  const mode = process.env.AUTH_MODE as AuthMode
  if (mode === 'local' || mode === 'password') return mode
  return 'supabase' // default
}

export function isLocalAuthEnabled(): boolean {
  return getAuthMode() !== 'supabase'
}

const LOCAL_SESSION_COOKIE = 'tiker_local_session'
const SESSION_SECRET = process.env.NEXTAUTH_SECRET || 'local-dev-secret'

/**
 * Generate a session token
 */
function generateSessionToken(): string {
  const token = crypto.randomBytes(32).toString('hex')
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(token)
    .digest('hex')
  return `${token}.${signature}`
}

/**
 * Verify a session token
 */
function verifySessionToken(sessionToken: string): boolean {
  const [token, signature] = sessionToken.split('.')
  if (!token || !signature) return false
  
  const expectedSignature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(token)
    .digest('hex')
  
  return signature === expectedSignature
}

/**
 * Verify password against LOCAL_ADMIN_PASSWORD env var
 */
export function verifyPassword(password: string): boolean {
  const storedPassword = process.env.LOCAL_ADMIN_PASSWORD
  if (!storedPassword) {
    console.warn('LOCAL_ADMIN_PASSWORD not set - using default "admin"')
    return password === 'admin'
  }
  return password === storedPassword
}

/**
 * Create a local session (sets cookie)
 */
export async function createLocalSession(): Promise<string> {
  const token = generateSessionToken()
  const cookieStore = await cookies()
  
  cookieStore.set(LOCAL_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })
  
  return token
}

/**
 * Check if user has a valid local session
 */
export async function hasLocalSession(): Promise<boolean> {
  const mode = getAuthMode()
  
  // In 'local' mode, always authenticated
  if (mode === 'local') return true
  
  // In 'password' mode, check for valid session cookie
  if (mode === 'password') {
    const cookieStore = await cookies()
    const session = cookieStore.get(LOCAL_SESSION_COOKIE)
    if (!session?.value) return false
    return verifySessionToken(session.value)
  }
  
  // Supabase mode - defer to Supabase auth
  return false
}

/**
 * Clear local session
 */
export async function clearLocalSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(LOCAL_SESSION_COOKIE)
}

/**
 * Get a mock user for local auth modes
 */
export function getLocalUser() {
  return {
    id: 'local-admin',
    email: 'admin@localhost',
    name: 'Local Admin',
  }
}

/**
 * Get or create a local account ID (deterministic for local installs)
 */
export function getLocalAccountId(): string {
  // Use a deterministic ID based on a secret so it's stable across restarts
  const secret = process.env.NEXTAUTH_SECRET || 'local'
  return crypto.createHash('sha256').update(`local-account-${secret}`).digest('hex').slice(0, 36)
}
