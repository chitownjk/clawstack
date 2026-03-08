'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'

interface ConsumerModeState {
  isConsumer: boolean
  isAdvanced: boolean
  firstName: string | null
  useCase: string | null
  defaultView: string
  loading: boolean
  toggleMode: () => Promise<void>
  updateProfile: (updates: { first_name?: string; use_case?: string; default_view?: string }) => Promise<void>
}

// Helper to call the server-side preferences API
async function patchPreferences(updates: Record<string, any>): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/account/preferences', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { success: false, error: data.error || `HTTP ${res.status}` }
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

export function useConsumerMode(): ConsumerModeState {
  const [isAdvanced, setIsAdvanced] = useState(false)
  const [firstName, setFirstName] = useState<string | null>(null)
  const [useCase, setUseCase] = useState<string | null>(null)
  const [defaultView, setDefaultView] = useState('briefing')
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    async function load() {
      const supabase = supabaseRef.current
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        // SELECT is fine with RLS, only UPDATE triggers the users table issue
        const { data: account, error } = await supabase
          .from('accounts')
          .select('*')
          .eq('auth_uid', user.id)
          .single()

        if (error) {
          console.error('Failed to load account:', error.message)
        }

        if (account) {
          setIsAdvanced(account.is_advanced_mode || false)
          setFirstName(account.first_name || null)
          setUseCase(account.use_case || null)
          setDefaultView(account.default_view || 'briefing')
        }
      } catch (err) {
        console.error('Failed to load consumer mode:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const toggleMode = useCallback(async () => {
    const newMode = !isAdvanced
    setIsAdvanced(newMode) // optimistic

    const result = await patchPreferences({ is_advanced_mode: newMode })
    if (!result.success) {
      console.error('Failed to toggle mode:', result.error)
      setIsAdvanced(!newMode) // revert
    }
  }, [isAdvanced])

  const updateProfile = useCallback(async (updates: { first_name?: string; use_case?: string; default_view?: string }) => {
    // Optimistic local updates
    if (updates.first_name !== undefined) setFirstName(updates.first_name)
    if (updates.use_case !== undefined) setUseCase(updates.use_case)
    if (updates.default_view !== undefined) setDefaultView(updates.default_view)

    const result = await patchPreferences(updates)
    if (!result.success) {
      console.error('Failed to update profile:', result.error)
    }
  }, [])

  return {
    isConsumer: !isAdvanced,
    isAdvanced,
    firstName,
    useCase,
    defaultView,
    loading,
    toggleMode,
    updateProfile,
  }
}
