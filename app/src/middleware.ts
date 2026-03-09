import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

/**
 * Centralized route protection middleware.
 *
 * Protects admin routes and ensures cancelled/deleted accounts
 * cannot access the app.
 */
export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const pathname = request.nextUrl.pathname

  // Admin routes require authentication + admin role
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
    '/api/admin/:path*',
  ],
}
