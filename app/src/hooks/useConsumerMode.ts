'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

interface ConsumerModeState {
  isConsumer: boolean
  isAdvanced: boolean
  firstName: string | null
  useCase: string | null
  loading: boolean
  toggleMode: () => Promise<void>
  updateProfile: (updates: { first_name?: string; use_case?: string }) => Promise<void>
}

export function useConsumerMode(): ConsumerModeState {
  const [isAdvanced, setIsAdvanced] = useState(false)
  const [firstName, setFirstName] = useState<string | null>(null)
  const [useCase, setUseCase] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [accountId, setAccountId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        const { data: account } = await supabase
          .from('accounts')
          .select('id, is_advanced_mode, first_name, use_case')
          .eq('auth_uid', user.id)
          .single()

        if (account) {
          setAccountId(account.id)
          setIsAdvanced(account.is_advanced_mode || false)
          setFirstName(account.first_name || null)
          setUseCase(account.use_case || null)
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
    if (!accountId) return

    const newMode = !isAdvanced
    setIsAdvanced(newMode)

    try {
      await supabase
        .from('accounts')
        .update({ is_advanced_mode: newMode })
        .eq('id', accountId)
    } catch (err) {
      console.error('Failed to toggle mode:', err)
      setIsAdvanced(!newMode) // revert on failure
    }
  }, [accountId, isAdvanced, supabase])

  const updateProfile = useCallback(async (updates: { first_name?: string; use_case?: string }) => {
    if (!accountId) return

    if (updates.first_name !== undefined) setFirstName(updates.first_name)
    if (updates.use_case !== undefined) setUseCase(updates.use_case)

    try {
      await supabase
        .from('accounts')
        .update(updates)
        .eq('id', accountId)
    } catch (err) {
      console.error('Failed to update profile:', err)
    }
  }, [accountId, supabase])

  return {
    isConsumer: !isAdvanced,
    isAdvanced,
    firstName,
    useCase,
    loading,
    toggleMode,
    updateProfile,
  }
}
