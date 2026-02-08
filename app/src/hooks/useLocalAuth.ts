'use client'

import { useState, useEffect } from 'react'

interface LocalAuthState {
  isLocalMode: boolean
  authMode: 'supabase' | 'local' | 'password'
  isAuthenticated: boolean
  loading: boolean
}

/**
 * Hook to check local auth status on the client
 * Fetches auth mode from server and checks session
 */
export function useLocalAuth(): LocalAuthState {
  const [state, setState] = useState<LocalAuthState>({
    isLocalMode: false,
    authMode: 'supabase',
    isAuthenticated: false,
    loading: true,
  })

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/status')
        if (res.ok) {
          const data = await res.json()
          setState({
            isLocalMode: data.authMode !== 'supabase',
            authMode: data.authMode,
            isAuthenticated: data.authenticated,
            loading: false,
          })
        } else {
          setState(prev => ({ ...prev, loading: false }))
        }
      } catch {
        setState(prev => ({ ...prev, loading: false }))
      }
    }
    checkAuth()
  }, [])

  return state
}

/**
 * Logout from local auth
 */
export async function localLogout() {
  await fetch('/api/auth/local', { method: 'DELETE' })
  window.location.href = '/auth/local'
}
