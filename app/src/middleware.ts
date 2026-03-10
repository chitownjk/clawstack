import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

const ALLOWED_ORIGINS = new Set([
  process.env.NEXT_PUBLIC_APP_URL || 'https://tiker.com',
  'https://tiker.com',
  'https://www.tiker.com',
])

// Methods that modify state and need CSRF protection
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * Check if request is from our Chrome extension.
 * Extension sends X-Tiker-Extension: 1 header and X-Extension-Cookies
 * with the actual cookie values (read via chrome.cookies API).
 */
function isExtensionRequest(request: NextRequest): boolean {
  return request.headers.get('x-tiker-extension') === '1'
}

/**
 * Centralized middleware:
 * 1. Chrome extension cookie forwarding
 * 2. CSRF protection via Origin header on mutating API requests
 * 3. Admin route authentication
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const extRequest = isExtensionRequest(request)

  // --- Extension cookie forwarding ---
  // The Chrome extension reads cookies via chrome.cookies.getAll() (which can
  // access HttpOnly and SameSite=Lax cookies for domains in host_permissions)
  // and sends them via X-Extension-Cookies header because SameSite=Lax cookies
  // won't be attached automatically on cross-origin fetch from chrome-extension://.
  // We inject them into the actual Cookie header so downstream handlers work normally.
  if (extRequest) {
    const extCookies = request.headers.get('x-extension-cookies')
    if (extCookies) {
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('cookie', extCookies)
      // Keep x-extension-cookies available as fallback for route handlers
      // where cookies() from next/headers may not see the injected Cookie header.
      // Only remove x-tiker-extension since it's just a boolean flag.
      requestHeaders.delete('x-tiker-extension')

      const res = NextResponse.next({
        request: { headers: requestHeaders },
      })

      // Continue to CSRF / admin checks below with the modified response
      // But since we've already handled extension auth, skip CSRF for extension
      // (the extension authenticates via cookie-based session, not Origin header)

      // Admin route check for extension requests
      if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
        return await checkAdminAuth(request, extCookies, res)
      }

      return res
    }
  }

  const res = NextResponse.next()

  // --- CSRF: Origin header validation on mutating API requests ---
  // Skip for extension requests -- they authenticate via cookie session, and
  // their Origin header (chrome-extension://...) will never be in ALLOWED_ORIGINS.
  if (!extRequest && pathname.startsWith('/api/') && MUTATING_METHODS.has(request.method)) {
    const origin = request.headers.get('origin')
    // Allow requests with API key auth (external agents) -- they don't send Origin
    const hasApiKey = request.headers.get('authorization')?.startsWith('Bearer sk_') ||
                      request.headers.get('x-api-key')?.startsWith('sk_')

    if (!hasApiKey) {
      // Browser requests must have a valid Origin header
      if (origin && !ALLOWED_ORIGINS.has(origin)) {
        return NextResponse.json(
          { error: 'Forbidden: invalid origin' },
          { status: 403 }
        )
      }
    }
  }

  // --- Admin routes require authentication ---
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
              cookiesToSet.forEach(({ name, value, options }) => {
                res.cookies.set(name, value, options as any)
              })
            },
          },
        }
      )
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        return NextResponse.redirect(new URL('/auth/login', request.url))
      }
    } catch {
      return NextResponse.json({ error: 'Authentication error' }, { status: 500 })
    }
  }

  return res
}

/**
 * Check admin auth using extension-forwarded cookies
 */
async function checkAdminAuth(request: NextRequest, cookieString: string, res: NextResponse) {
  try {
    // Parse cookie string into array format
    const parsedCookies = cookieString.split('; ').map(pair => {
      const [name, ...rest] = pair.split('=')
      return { name: name.trim(), value: rest.join('=') }
    }).filter(c => c.name)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return parsedCookies
          },
          setAll() {
            // Extension requests don't set cookies
          },
        },
      }
    )
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } catch {
    return NextResponse.json({ error: 'Authentication error' }, { status: 500 })
  }

  return res
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/:path*',
  ],
}
