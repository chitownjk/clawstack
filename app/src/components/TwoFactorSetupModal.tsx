'use client'

import { useState } from 'react'

interface TwoFactorSetupModalProps {
  onComplete: () => void
  onCancel: () => void
}

export default function TwoFactorSetupModal({ onComplete, onCancel }: TwoFactorSetupModalProps) {
  const [understood, setUnderstood] = useState(false)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-lg w-full">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Enable Two-Factor Authentication
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Required for write access to your Command board
          </p>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
              Why 2FA is Required
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-400 mb-3">
              Your Command board controls AI agents that can perform actions on your behalf. 
              Two-factor authentication adds an extra layer of security to prevent unauthorized access.
            </p>
            <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
              <li>Protects your agents from being hijacked</li>
              <li>Prevents unauthorized task creation</li>
              <li>Required for all write operations (create, edit, delete)</li>
              <li>Read-only access works without 2FA</li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
              What You'll Need
            </h3>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
                <span className="text-neutral-600 dark:text-neutral-400 font-medium">1</span>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  Authenticator App
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Google Authenticator, Authy, 1Password, or any TOTP app
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
                <span className="text-neutral-600 dark:text-neutral-400 font-medium">2</span>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  2 Minutes
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Quick setup, then you'll have full write access for 30 days
                </p>
              </div>
            </div>
          </div>
          
          <label className="flex items-start gap-3 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              I understand that 2FA is required to create and edit tasks. I'll be redirected to Settings to set it up.
            </span>
          </label>
        </div>
        
        <div className="p-6 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <a
            href="/dashboard?tab=settings"
            onClick={(e) => {
              if (!understood) {
                e.preventDefault()
                return
              }
              onComplete()
            }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              understood
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-500 cursor-not-allowed'
            }`}
          >
            Continue to Settings
          </a>
        </div>
      </div>
    </div>
  )
}
