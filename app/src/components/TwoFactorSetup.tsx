'use client'

import { useState } from 'react'

interface SetupData {
  secret: string
  qrCode: string
  backupCodes: string[]
  manualEntry: string
}

interface TwoFactorSetupProps {
  onComplete: () => void
}

export default function TwoFactorSetup({ onComplete }: TwoFactorSetupProps) {
  const [step, setStep] = useState<'intro' | 'scan' | 'verify' | 'backup' | 'done'>('intro')
  const [setupData, setSetupData] = useState<SetupData | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedBackup, setCopiedBackup] = useState(false)

  async function startSetup() {
    setLoading(true)
    setError('')
    
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' })
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Failed to start setup')
        setLoading(false)
        return
      }
      
      setSetupData(data)
      setStep('scan')
    } catch (error) {
      setError('Failed to start setup')
    } finally {
      setLoading(false)
    }
  }

  async function verifyCode() {
    if (!setupData || code.length < 6) return
    
    setLoading(true)
    setError('')
    
    try {
      const res = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: setupData.secret,
          code: code.trim(),
          backupCodes: setupData.backupCodes,
        }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Invalid code')
        setLoading(false)
        return
      }
      
      setStep('backup')
    } catch (error) {
      setError('Failed to verify code')
    } finally {
      setLoading(false)
    }
  }

  function copyBackupCodes() {
    if (!setupData) return
    navigator.clipboard.writeText(setupData.backupCodes.join('\n'))
    setCopiedBackup(true)
    setTimeout(() => setCopiedBackup(false), 2000)
  }

  if (step === 'intro') {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Enable Two-Factor Authentication
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Protect your Command with an authenticator app. Write access requires 2FA verification (valid for 30 days).
            </p>
            <button
              onClick={startSetup}
              disabled={loading}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-sm font-medium"
            >
              {loading ? 'Setting up...' : 'Enable 2FA'}
            </button>
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          </div>
        </div>
      </div>
    )
  }

  if (step === 'scan' && setupData) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          Scan QR Code
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
          Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
        </p>
        
        <div className="flex justify-center mb-4">
          <img src={setupData.qrCode} alt="2FA QR Code" className="w-48 h-48 rounded-lg" />
        </div>
        
        <details className="mb-4">
          <summary className="text-sm text-neutral-500 cursor-pointer hover:text-neutral-700">
            Can't scan? Enter manually
          </summary>
          <div className="mt-2 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
            <code className="text-sm font-mono break-all">{setupData.manualEntry}</code>
          </div>
        </details>
        
        <button
          onClick={() => setStep('verify')}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          I've scanned the code
        </button>
      </div>
    )
  }

  if (step === 'verify') {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          Verify Setup
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
          Enter the 6-digit code from your authenticator app to confirm setup.
        </p>
        
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 mb-4"
          autoFocus
        />
        
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        
        <div className="flex gap-3">
          <button
            onClick={() => setStep('scan')}
            className="flex-1 px-4 py-2 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition text-sm"
          >
            Back
          </button>
          <button
            onClick={verifyCode}
            disabled={loading || code.length < 6}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-sm font-medium"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      </div>
    )
  }

  if (step === 'backup' && setupData) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
        <div className="text-center mb-4">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            2FA Enabled!
          </h3>
        </div>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            ⚠️ Save your backup codes
          </h4>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
            If you lose access to your authenticator, you can use these codes. Each code works once.
          </p>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {setupData.backupCodes.map((code, i) => (
              <div key={i} className="bg-white dark:bg-neutral-800 px-3 py-2 rounded border border-yellow-200 dark:border-yellow-700">
                {code}
              </div>
            ))}
          </div>
          <button
            onClick={copyBackupCodes}
            className="mt-3 text-sm text-yellow-700 dark:text-yellow-300 hover:underline"
          >
            {copiedBackup ? '✓ Copied!' : 'Copy all codes'}
          </button>
        </div>
        
        <button
          onClick={onComplete}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          Done
        </button>
      </div>
    )
  }

  return null
}
