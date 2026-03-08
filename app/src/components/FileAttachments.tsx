'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'

interface File {
  id: string
  name: string
  size_bytes: number
  mime_type: string
  description: string | null
  created_at: string
  uploaded_by_agent_id: string | null
}

interface FileAttachmentsProps {
  taskId: string
  onUploadComplete?: () => void
}

export default function FileAttachments({ taskId, onUploadComplete }: FileAttachmentsProps) {
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renaming, setRenaming] = useState(false)
  const renameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadFiles()
    setupRealtimeSubscription()
  }, [taskId])

  async function loadFiles() {
    try {
      const response = await fetch(`/api/files?task_id=${taskId}`)
      if (!response.ok) throw new Error('Failed to fetch files')
      
      const data = await response.json()
      setFiles(data.files || [])
    } catch (error) {
      console.error('Failed to load files:', error)
    } finally {
      setLoading(false)
    }
  }

  function setupRealtimeSubscription() {
    const supabase = createClient()
    const channel = supabase
      .channel(`task_${taskId}_files`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'mc_files', filter: `task_id=eq.${taskId}` },
        () => loadFiles()
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('task_id', taskId)

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      setUploadProgress(100)
      await loadFiles()
      onUploadComplete?.()
      
      // Reset input
      e.target.value = ''
    } catch (error) {
      console.error('Upload error:', error)
      alert(error instanceof Error ? error.message : 'Failed to upload file')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  async function downloadFile(fileId: string) {
    try {
      const response = await fetch(`/api/files/${fileId}`)
      if (!response.ok) throw new Error('Failed to get download URL')
      
      const data = await response.json()
      if (data.url) {
        window.open(data.url, '_blank')
      }
    } catch (error) {
      console.error('Download error:', error)
      alert('Failed to download file')
    }
  }

  async function deleteFile(fileId: string, fileName: string) {
    if (!confirm(`Delete ${fileName}?`)) return

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Failed to delete file')

      await loadFiles()
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete file')
    }
  }

  function startRename(file: File) {
    // Strip extension for editing
    const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : ''
    const nameWithoutExt = ext ? file.name.substring(0, file.name.lastIndexOf('.')) : file.name
    setRenamingFileId(file.id)
    setRenameValue(nameWithoutExt)
    setTimeout(() => renameInputRef.current?.select(), 50)
  }

  async function handleRename(fileId: string) {
    if (!renameValue.trim()) {
      setRenamingFileId(null)
      return
    }
    setRenaming(true)
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: renameValue.trim() }),
      })
      if (!response.ok) throw new Error('Failed to rename file')
      await loadFiles()
      setRenamingFileId(null)
    } catch (error) {
      console.error('Rename error:', error)
      alert('Failed to rename file')
    } finally {
      setRenaming(false)
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`
  }

  function getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️'
    if (mimeType.startsWith('video/')) return '🎬'
    if (mimeType.startsWith('audio/')) return '🎵'
    if (mimeType.includes('pdf')) return '📄'
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊'
    if (mimeType.includes('document') || mimeType.includes('word')) return '📝'
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return '📦'
    if (mimeType.includes('json') || mimeType.includes('xml')) return '🔧'
    if (mimeType.startsWith('text/')) return '📃'
    return '📎'
  }

  if (loading) {
    return (
      <div className="py-4 text-center text-gray-400 text-sm">
        Loading files...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Upload button */}
      <div>
        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
        {uploading && (
          <div className="mt-2">
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* File list */}
      {files.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          No files attached yet
        </div>
      ) : (
        <div className="space-y-2">
          {files.map(file => (
            <div
              key={file.id}
              className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
            >
              <div className="text-2xl flex-shrink-0">
                {getFileIcon(file.mime_type)}
              </div>
              <div className="flex-1 min-w-0">
                {renamingFileId === file.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      ref={renameInputRef}
                      type="text"
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRename(file.id)
                        if (e.key === 'Escape') setRenamingFileId(null)
                      }}
                      disabled={renaming}
                      className="flex-1 text-sm px-2 py-1 rounded border border-blue-400 dark:border-blue-500 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 outline-none focus:ring-1 focus:ring-blue-500"
                      maxLength={200}
                      autoFocus
                    />
                    <button
                      onClick={() => handleRename(file.id)}
                      disabled={renaming}
                      className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {renaming ? '...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setRenamingFileId(null)}
                      className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadFile(file.id)}
                      className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 text-sm truncate"
                    >
                      {file.name}
                    </button>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {formatBytes(file.size_bytes)}
                    </span>
                    <button
                      onClick={() => startRename(file)}
                      className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                      title="Rename file"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                )}
                {file.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {file.description}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(file.created_at).toLocaleString()}
                  {file.uploaded_by_agent_id && ' - Created by agent'}
                </p>
              </div>
              <button
                onClick={() => deleteFile(file.id, file.name)}
                className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors flex-shrink-0"
                title="Delete file"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
