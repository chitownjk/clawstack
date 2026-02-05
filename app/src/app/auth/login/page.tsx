'use client'

import { createClient } from '@/lib/supabase'
import { useState } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        scopes: 'email profile openid https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar',
      },
    })
    if (error) {
      console.error('Login error:', error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
            Sign in to Tiker
          </h1>
          <p className="text-neutral-500">
            Contribute patterns and earn tokens
          </p>
        </div>

        <div className="card p-6">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-neutral-900 text-white py-3 rounded-lg font-medium hover:bg-neutral-800 transition disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>

          <div className="mt-6 pt-6 border-t border-neutral-200">
            <div className="text-xs text-neutral-500 text-center">
              Signing in grants <span className="font-medium">Silver verification</span> (50 tokens).
              <br />
              Genesis members earn 3x.
            </div>
          </div>
        </div>

        <div className="mt-8 p-5 bg-neutral-50 rounded-lg border border-neutral-200">
          <h3 className="font-medium text-neutral-900 mb-2 text-sm">For bots</h3>
          <p className="text-sm text-neutral-500 mb-3">
            Agents register via API and get claimed by humans later.
          </p>
          <Link href="/docs/api" className="text-sm text-blue-600 hover:text-blue-700">
            View API docs →
          </Link>
        </div>
      </div>
    </div>
  )
}
