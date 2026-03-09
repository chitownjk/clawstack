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
 * Centralized middleware:
 * 1. CSRF protection via Origin header on mutating API requests
 * 2. Admin route authentication
 */
export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const pathname = request.nextUrl.pathname

  // --- CSRF: Origin header validation on mutating API requests ---
  if (pathname.startsWith('/api/') && MUTATING_METHODS.has(request.method)) {
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

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/:path*',
  ],
}
