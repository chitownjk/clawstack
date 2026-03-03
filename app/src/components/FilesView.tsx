'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

interface File {
  id: string
  name: string
  size_bytes: number
  mime_type: string
  description: string | null
  created_at: string
  uploaded_by_agent_id: string | null
  task_id: string | null
}

interface FilesViewProps {
  onFileClick?: (fileId: string) => void
}

export default function FilesView({ onFileClick }: FilesViewProps) {
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [usageBytes, setUsageBytes] = useState(0)
  const [quotaBytes, setQuotaBytes] = useState(104857600) // Default 100MB

  useEffect(() => {
    loadFiles()
    setupRealtimeSubscription()
  }, [])

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (search) {
        loadFiles()
      }
    }, 300)
    return () => clearTimeout(debounce)
  }, [search])

  async function loadFiles() {
    try {
      const url = search 
        ? `/api/files?search=${encodeURIComponent(search)}&limit=100`
        : `/api/files?limit=100`
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch files')
      
      const data = await response.json()
      setFiles(data.files || [])
      setUsageBytes(data.usage_bytes || 0)
      
      // Get quota from account info (TODO: fetch from API)
      // For now, hardcode based on common tiers
    } catch (error) {
      console.error('Failed to load files:', error)
    } finally {
      setLoading(false)
    }
  }

  function setupRealtimeSubscription() {
    const supabase = createClient()
    const channel = supabase
      .channel('all_files')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'mc_files' },
        () => loadFiles()
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
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

  const usagePercent = (usageBytes / quotaBytes) * 100

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Files</h2>
            <p className="text-sm text-gray-500 mt-1">
              {formatBytes(usageBytes)} of {formatBytes(quotaBytes)} used
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              {files.length} file{files.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Usage bar */}
        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${
                usagePercent > 90 ? 'bg-red-600' : 
                usagePercent > 75 ? 'bg-orange-600' : 
                'bg-blue-600'
              }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
          {usagePercent > 90 && (
            <p className="text-xs text-red-600 mt-1">
              Storage quota almost full. Delete files or upgrade plan.
            </p>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
          />
          <svg 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            Loading files...
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {search ? 'No files match your search' : 'No files yet'}
          </div>
        ) : (
          <div className="space-y-3">
            {files.map(file => (
              <div
                key={file.id}
                className="flex items-start gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                onClick={() => onFileClick?.(file.id)}
              >
                <div className="text-3xl flex-shrink-0">
                  {getFileIcon(file.mime_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        downloadFile(file.id)
                      }}
                      className="font-medium text-gray-900 hover:text-blue-600 text-sm truncate"
                    >
                      {file.name}
                    </button>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {formatBytes(file.size_bytes)}
                    </span>
                  </div>
                  {file.description && (
                    <p className="text-xs text-gray-600 mb-1 truncate">
                      {file.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{new Date(file.created_at).toLocaleString()}</span>
                    {file.uploaded_by_agent_id && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Agent-created
                      </span>
                    )}
                    {file.task_id && (
                      <span className="text-blue-600 hover:underline">
                        From task
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteFile(file.id, file.name)
                  }}
                  className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                  title="Delete file"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
