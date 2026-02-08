'use client'

import { useState, useEffect, useCallback } from 'react'

interface WriteAccessStatus {
  hasWriteAccess: boolean
  requires2FA: boolean
  needs2FASetup?: boolean
  expiresAt?: string
  loading: boolean
}

export function use2FA() {
  const [status, setStatus] = useState<WriteAccessStatus>({
    hasWriteAccess: false,
    requires2FA: false,
    loading: true,
  })
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [showSetupModal, setShowSetupModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null)

  const checkWriteAccess = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/2fa/verify')
      const data = await res.json()
      setStatus({ ...data, loading: false })
      return data
    } catch (error) {
      console.error('Failed to check write access:', error)
      setStatus(prev => ({ ...prev, loading: false }))
      return { hasWriteAccess: false, requires2FA: false }
    }
  }, [])

  useEffect(() => {
    checkWriteAccess()
  }, [checkWriteAccess])

  // Wrap a write action with 2FA check
  const withWriteAccess = useCallback(async (action: () => Promise<void>) => {
    const currentStatus = await checkWriteAccess()
    
    if (currentStatus.hasWriteAccess) {
      // Has write access, execute action
      await action()
    } else if (currentStatus.needs2FASetup) {
      // Needs to set up 2FA first - show setup modal with explanation
      setPendingAction(() => action)
      setShowSetupModal(true)
    } else if (currentStatus.requires2FA) {
      // Has 2FA but needs to verify
      setPendingAction(() => action)
      setShowVerifyModal(true)
    } else {
      // Fallback - shouldn't happen
      await action()
    }
  }, [checkWriteAccess])

  const onVerifySuccess = useCallback(async () => {
    setShowVerifyModal(false)
    await checkWriteAccess()
    
    if (pendingAction) {
      await pendingAction()
      setPendingAction(null)
    }
  }, [pendingAction, checkWriteAccess])

  const onVerifyCancel = useCallback(() => {
    setShowVerifyModal(false)
    setPendingAction(null)
  }, [])

  const onSetupComplete = useCallback(async () => {
    setShowSetupModal(false)
    await checkWriteAccess()
    
    // After setup, they still need to verify
    if (pendingAction) {
      setShowVerifyModal(true)
    }
  }, [pendingAction, checkWriteAccess])

  const onSetupCancel = useCallback(() => {
    setShowSetupModal(false)
    setPendingAction(null)
  }, [])

  return {
    ...status,
    checkWriteAccess,
    withWriteAccess,
    showVerifyModal,
    showSetupModal,
    onVerifySuccess,
    onVerifyCancel,
    onSetupComplete,
    onSetupCancel,
  }
}
