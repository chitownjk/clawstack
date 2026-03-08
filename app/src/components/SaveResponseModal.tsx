'use client'

import { useState } from 'react'

interface SaveResponseModalProps {
  taskId: string
  commentId: string
  taskTitle: string
  onClose: () => void
  onSaved: (fileId: string) => void
}

export default function SaveResponseModal({
  taskId,
  commentId,
  taskTitle,
  onClose,
  onSaved,
}: SaveResponseModalProps) {
  const dateStr = new Date().toISOString().split('T')[0]
  const suggestedName = sanitizeForDisplay(taskTitle)

  const [fileName, setFileName] = useState(suggestedName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [savedFileId, setSavedFileId] = useState<string | null>(null)

  async function handleSave() {
    if (!fileName.trim()) {
      setError('Please enter a file name')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/files/save-response', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          taskId,
          fileName: fileName.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save')
      }

      const data = await response.json()
      setSaved(true)
      setSavedFileId(data.file?.id || null)
      onSaved(data.file?.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save response')
    } finally {
      setSaving(false)
    }
  }

  // Preview the final filename
  const previewName = `${fileName.trim() || 'Untitled'} - ${dateStr}.md`

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">
            {saved ? 'Saved to Library' : 'Save Response'}
          </h3>
          {!saved && (
            <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">
              Save this AI response as a named file for easy access later.
            </p>
          )}
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {saved ? (
            // Success state
            <div className="text-center py-4">
              <div className="text-4xl mb-3">&#10003;</div>
              <p className="text-gray-700 dark:text-neutral-300 mb-1 font-medium">
                {previewName}
              </p>
              <p className="text-sm text-gray-500 dark:text-neutral-400">
                You can find this in your Library anytime.
              </p>
            </div>
          ) : (
            // Input state
            <>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                File name
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => {
                  setFileName(e.target.value)
                  setError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !saving) handleSave()
                }}
                placeholder="Enter a name for this response..."
                maxLength={200}
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
              />

              {/* Preview */}
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-400 dark:text-neutral-500">
                <span>Will save as:</span>
                <span className="font-mono bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 rounded truncate">
                  {previewName}
                </span>
              </div>

              {/* Character count */}
              <div className="mt-1 text-xs text-gray-400 dark:text-neutral-500 text-right">
                {fileName.length}/200
              </div>

              {error && (
                <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex justify-end gap-3">
          {saved ? (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-100 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !fileName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-neutral-700 disabled:cursor-not-allowed transition-colors text-sm font-medium min-w-[80px]"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function sanitizeForDisplay(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200)
    || 'Untitled'
}
