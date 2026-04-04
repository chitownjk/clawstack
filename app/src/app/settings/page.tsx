'use client'

import { createClient } from '@/lib/supabase'
import { getTierDisplayName } from '@/lib/stripe'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import TwoFactorSetup from '@/components/TwoFactorSetup'
import SettingsNav from '@/components/SettingsNav'
import { useConsumerMode } from '@/hooks/useConsumerMode'
import { AVAILABLE_VIEWS, getViewsForMode, getViewDisplayName } from '@/types/views'

export default function SettingsPage() {
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: Record<string, string> } | null>(null)
  const [account, setAccount] = useState<{ id: string; plan_tier?: string; email_signature?: string; two_factor_enabled?: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [contributionEnabled, setContributionEnabled] = useState(true)
  const [manualAgentSelection, setManualAgentSelection] = useState(false)
  const [emailSignature, setEmailSignature] = useState('\n\n---\nSent by my Tiker assistant')
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  const supabase = createClient()
  const router = useRouter()
  const { isConsumer, isAdvanced, defaultView, toggleMode, updateProfile, loading: modeLoading } = useConsumerMode()

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }
      
      setUser(user)
      
      // Load account data
      const { data: accountData } = await supabase
        .from('accounts')
        .select('*')
        .eq('auth_uid', user.id)
        .single()
      
      if (accountData) {
        setAccount(accountData)
        // Load email signature if it exists
        if (accountData.email_signature) {
          setEmailSignature(accountData.email_signature)
        }
      }
      
      // Load contribution preference (default to true)
      const savedContribution = localStorage.getItem('tiker_contribution_enabled')
      setContributionEnabled(savedContribution !== 'false')

      // Load manual agent selection preference (default to false)
      const savedManualAgent = localStorage.getItem('tiker_manual_agent_selection')
      setManualAgentSelection(savedManualAgent === 'true')
      
      setLoading(false)
    }
    
    loadUser()
  }, [])

  const handleSavePreferences = async () => {
    setSaving(true)
    setMessage(null)

    try {
      // Save to localStorage (no DB column yet for these)
      localStorage.setItem('tiker_contribution_enabled', contributionEnabled.toString())
      localStorage.setItem('tiker_manual_agent_selection', manualAgentSelection.toString())

      // Save email signature to database (best-effort, column may not exist yet)
      try {
        const { error } = await supabase
          .from('accounts')
          .update({ email_signature: emailSignature })
          .eq('auth_uid', user?.id)

        if (error) {
          console.warn('Could not save email signature to DB:', error.message)
        }
      } catch (dbError) {
        console.warn('Email signature DB save skipped:', dbError)
      }

      setMessage({ type: 'success', text: 'Preferences saved' })
    } catch (error) {
      console.error('Save error:', error)
      setMessage({ type: 'error', text: 'Failed to save preferences' })
    }

    setSaving(false)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/account/export', {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('Export failed')
      }
      // Trigger download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tiker-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      setMessage({ type: 'success', text: 'Data exported successfully' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to export data' })
    }
    setExporting(false)
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirm: 'DELETE', email: user?.email })
      })
      if (!response.ok) {
        throw new Error('Delete failed')
      }
      // Redirect to home after deletion
      await supabase.auth.signOut()
      window.location.href = '/'
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete account' })
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-800 rounded mb-8"></div>
          <div className="h-64 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          Settings
        </h1>
        
        <SettingsNav />

        {/* Account Info */}
        <section className="card p-6 mb-8">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            Account
          </h2>
          
          <div className="flex items-center gap-4 mb-6">
            {user.user_metadata?.avatar_url && (
              <img 
                src={user.user_metadata.avatar_url} 
                alt="Profile" 
                className="w-16 h-16 rounded-full"
              />
            )}
            <div>
              <p className="font-medium text-neutral-900 dark:text-neutral-100">
                {user.user_metadata?.full_name || user.email}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {user.email}
              </p>
              {account?.plan_tier && (
                <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                  getTierDisplayName(account.plan_tier) === 'Team'
                    ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                    : getTierDisplayName(account.plan_tier) !== 'Free'
                    ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}>
                  {getTierDisplayName(account.plan_tier)} Plan
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Mode Toggle */}
        <section className="card p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                Mode
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                {isConsumer
                  ? 'Simple mode keeps things clean and easy. Switch to Advanced for full control.'
                  : 'Advanced mode shows all features. Switch to Simple for a cleaner experience.'}
              </p>
            </div>
            <button
              onClick={toggleMode}
              disabled={modeLoading}
              className={`relative inline-flex h-8 w-[140px] items-center rounded-full transition-colors ${
                isAdvanced
                  ? 'bg-purple-600'
                  : 'bg-blue-600'
              }`}
            >
              <span className={`absolute left-2 text-xs font-medium transition-opacity ${
                isConsumer ? 'text-white opacity-100' : 'text-blue-200 opacity-50'
              }`}>
                Simple
              </span>
              <span className={`absolute right-2 text-xs font-medium transition-opacity ${
                isAdvanced ? 'text-white opacity-100' : 'text-purple-200 opacity-50'
              }`}>
                Advanced
              </span>
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                  isAdvanced ? 'translate-x-[108px]' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Preferences */}
        <section className="card p-6 mb-8">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            Preferences
          </h2>

          <div className="space-y-4">
            {/* Default View */}
            <div className="flex items-start gap-3">
              <div className="w-5 flex-shrink-0" /> {/* spacer to align with checkboxes */}
              <div className="flex-1">
                <p className="font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                  Default view
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">
                  Which view to show when you open {isConsumer ? 'Home' : 'Command'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {getViewsForMode(isConsumer).map((view) => {
                    const displayName = getViewDisplayName(view, isConsumer)
                    const isSelected = defaultView === view.id
                    return (
                      <button
                        key={view.id}
                        onClick={() => updateProfile({ default_view: view.id })}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                        }`}
                      >
                        {displayName}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {isAdvanced && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contributionEnabled}
                  onChange={(e) => setContributionEnabled(e.target.checked)}
                  className="w-5 h-5 rounded border-neutral-300 text-blue-600 mt-0.5"
                />
                <div>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">
                    Enable pattern contribution suggestions
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Agents will suggest sharing valuable patterns back to the Tiker Hub after completing tasks. You review and approve each suggestion.
                  </p>
                </div>
              </label>
            )}

            {isAdvanced && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualAgentSelection}
                  onChange={(e) => setManualAgentSelection(e.target.checked)}
                  className="w-5 h-5 rounded border-neutral-300 text-blue-600 mt-0.5"
                />
                <div>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">
                    Manual agent selection
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Show the "+ Add Agent" button in Command and choose which agent skill handles each task. When off, tagging "AI help needed" auto-selects the best agent.
                  </p>
                </div>
              </label>
            )}

            {isAdvanced && (
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <label className="block">
                  <p className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                    Email Signature
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
                    This signature will be appended to all emails sent by your agents via Gmail. Recipients will know it was sent by your AI assistant.
                  </p>
                  <textarea
                    value={emailSignature}
                    onChange={(e) => setEmailSignature(e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="---&#10;Sent by my Tiker assistant"
                  />
                </label>
              </div>
            )}
          </div>
          
          {message && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              message.type === 'success' 
                ? 'bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300'
            }`}>
              {message.text}
            </div>
          )}
          
          <button
            onClick={handleSavePreferences}
            disabled={saving}
            className="btn btn-primary mt-4"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </section>

        {/* Security / 2FA - Advanced only */}
        {isAdvanced && (
          <section className="card p-6 mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Security
            </h2>

            {account?.two_factor_enabled ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Two-factor authentication enabled
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Write access is protected by your authenticator app
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg mb-6">
                  <svg className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      Two-factor authentication not enabled
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Enable 2FA to unlock write access in Command. Until then, you're in read-only mode.
                    </p>
                  </div>
                </div>

                <TwoFactorSetup
                  onComplete={() => {
                    // Refresh account data
                    window.location.reload()
                  }}
                />
              </div>
            )}
          </section>
        )}

        {/* Danger Zone */}
        <section className="card p-6 border-red-200 dark:border-red-900">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">
            Danger Zone
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                  Export your data
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Download all your tasks, agents, and settings
                </p>
              </div>
              <button 
                onClick={handleExport}
                disabled={exporting}
                className="btn btn-secondary text-sm"
              >
                {exporting ? 'Exporting...' : 'Export'}
              </button>
            </div>
            
            <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
              {!showDeleteConfirm ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">
                      Delete account
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Permanently delete your account and all data
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="btn bg-red-600 hover:bg-red-700 text-white text-sm"
                  >
                    Delete Account
                  </button>
                </div>
              ) : (
                <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4">
                  <p className="font-medium text-red-800 dark:text-red-200 mb-2">
                    Are you sure? This cannot be undone.
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                    All your tasks, agents, comments, and settings will be permanently deleted.
                  </p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                      className="btn btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      className="btn bg-red-600 hover:bg-red-700 text-white text-sm"
                    >
                      {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Back link */}
        <div className="mt-8">
          <Link href="/command" className="text-blue-600 dark:text-blue-400 hover:underline">
            {isConsumer ? '← Back to Home' : '← Back to Command'}
          </Link>
        </div>
      </div>
    </main>
  )
}
