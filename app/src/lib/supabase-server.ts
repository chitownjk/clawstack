import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getAuthMode, hasLocalSession, getLocalUser, getLocalAccountId } from '@/lib/local-auth'

type CookieToSet = {
  name: string
  value: string
  options?: Record<string, unknown>
}

/**
 * Check if we're in local auth mode (no Supabase)
 */
export function isLocalMode(): boolean {
  return getAuthMode() !== 'supabase'
}

/**
 * Get session for local auth modes
 * Returns a mock session object compatible with Supabase session structure
 */
export async function getLocalSession() {
  const hasSession = await hasLocalSession()
  if (!hasSession) return null
  
  const user = getLocalUser()
  return {
    user: {
      id: user.id,
      email: user.email,
      user_metadata: { full_name: user.name }
    }
  }
}

export async function createServerSupabaseClient() {
  // In local mode, return a mock client
  if (isLocalMode()) {
    return createLocalMockClient()
  }

  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component - ignore
          }
        },
      },
    }
  )
}

/**
 * Create a mock Supabase client for local auth mode
 * Only implements auth.getSession() - DB operations use direct Postgres
 */
function createLocalMockClient() {
  return {
    auth: {
      async getSession() {
        const session = await getLocalSession()
        return { data: { session }, error: null }
      },
      async getUser() {
        const session = await getLocalSession()
        return { data: { user: session?.user || null }, error: null }
      }
    }
  } as any
}

/**
 * Create a REAL Supabase client (never mock)
 * Use this for OAuth callbacks that must use Supabase Auth
 */
export async function createRealSupabaseClient() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  
  // Log cookie names (not values for security)
  console.log('[Supabase] createRealSupabaseClient cookies:', allCookies.map(c => c.name))

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return allCookies
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component - ignore
          }
        },
      },
    }
  )
}

// Admin client with service role (use sparingly, server-side only)
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Support both env var names (old: SUPABASE_SECRET_KEY, new: SUPABASE_SERVICE_ROLE_KEY)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  
  if (!url || !key) {
    console.error('[Supabase] Missing env vars:', { 
      hasUrl: !!url, 
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasSecretKey: !!process.env.SUPABASE_SECRET_KEY
    })
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) environment variable')
  }
  
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
