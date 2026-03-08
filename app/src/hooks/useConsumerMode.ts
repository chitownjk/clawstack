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

export function useConsumerMode(): ConsumerModeState {
  const [isAdvanced, setIsAdvanced] = useState(false)
  const [firstName, setFirstName] = useState<string | null>(null)
  const [useCase, setUseCase] = useState<string | null>(null)
  const [defaultView, setDefaultView] = useState('briefing')
  const [loading, setLoading] = useState(true)
  const accountIdRef = useRef<string | null>(null)
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

        const { data: account, error } = await supabase
          .from('accounts')
          .select('*')
          .eq('auth_uid', user.id)
          .single()

        if (error) {
          console.error('Failed to load account:', error.message)
        }

        if (account) {
          accountIdRef.current = account.id
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
    const accountId = accountIdRef.current
    if (!accountId) return

    const newMode = !isAdvanced
    setIsAdvanced(newMode)

    try {
      const { error } = await supabaseRef.current
        .from('accounts')
        .update({ is_advanced_mode: newMode })
        .eq('id', accountId)

      if (error) {
        console.error('Failed to toggle mode:', error.message)
        setIsAdvanced(!newMode) // revert on failure
      }
    } catch (err) {
      console.error('Failed to toggle mode:', err)
      setIsAdvanced(!newMode) // revert on failure
    }
  }, [isAdvanced])

  const updateProfile = useCallback(async (updates: { first_name?: string; use_case?: string; default_view?: string }) => {
    const accountId = accountIdRef.current
    if (!accountId) return

    if (updates.first_name !== undefined) setFirstName(updates.first_name)
    if (updates.use_case !== undefined) setUseCase(updates.use_case)
    if (updates.default_view !== undefined) setDefaultView(updates.default_view)

    try {
      const { error } = await supabaseRef.current
        .from('accounts')
        .update(updates)
        .eq('id', accountId)

      if (error) {
        console.error('Failed to update profile:', error.message)
      }
    } catch (err) {
      console.error('Failed to update profile:', err)
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
