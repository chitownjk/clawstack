'use client'

import { useState } from 'react'

interface DeleteConfirmModalProps {
  taskTitle: string
  commentCount: number
  onConfirm: () => Promise<void>
  onCancel: () => void
}

export default function DeleteConfirmModal({ 
  taskTitle, 
  commentCount, 
  onConfirm, 
  onCancel 
}: DeleteConfirmModalProps) {
  const [deleting, setDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  async function handleDelete() {
    setDeleting(true)
    try {
      await onConfirm()
    } catch (error) {
      console.error('Delete failed:', error)
      setDeleting(false)
    }
  }

  const requiresTyping = commentCount > 0
  const canDelete = !requiresTyping || confirmText.toLowerCase() === 'delete'

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" 
      style={{ zIndex: 10001 }}
      onClick={onCancel}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Delete Task</h3>
            <p className="text-sm text-gray-500">This action cannot be undone</p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-800 font-medium mb-2">
            You are about to permanently delete:
          </p>
          <ul className="text-sm text-red-700 space-y-1">
            <li className="flex items-center gap-2">
              <span className="text-red-400">•</span>
              <span className="font-medium truncate">{taskTitle}</span>
            </li>
            {commentCount > 0 && (
              <li className="flex items-center gap-2">
                <span className="text-red-400">•</span>
                <span>{commentCount} comment{commentCount !== 1 ? 's' : ''} and all context</span>
              </li>
            )}
            <li className="flex items-center gap-2">
              <span className="text-red-400">•</span>
              <span>All associated activity history</span>
            </li>
          </ul>
        </div>

        {requiresTyping && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <span className="font-mono bg-gray-100 px-1 rounded">delete</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="delete"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              autoFocus
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!canDelete || deleting}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {deleting ? 'Deleting...' : 'Delete Forever'}
          </button>
        </div>
      </div>
    </div>
  )
}
