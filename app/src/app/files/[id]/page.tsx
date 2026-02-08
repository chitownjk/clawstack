'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

export default function FileViewer() {
  const params = useParams()
  const router = useRouter()
  const fileId = params.id as string

  const [file, setFile] = useState<any>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadFile()
  }, [fileId])

  async function loadFile() {
    try {
      // Fetch file metadata
      const metaResponse = await fetch(`/api/files/${fileId}`)
      if (!metaResponse.ok) {
        throw new Error('File not found')
      }
      const fileData = await metaResponse.json()
      setFile(fileData)

      // Fetch file content from storage
      const contentResponse = await fetch(`/api/files/${fileId}/download`)
      if (!contentResponse.ok) {
        throw new Error('Failed to load content')
      }
      const text = await contentResponse.text()
      setContent(text)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleDownload() {
    window.location.href = `/api/files/${fileId}/download?attachment=true`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading file...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 font-semibold mb-2">Error</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button
            onClick={() => router.push('/command')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Command
          </button>
        </div>
      </div>
    )
  }

  const isMarkdown = file?.mime_type === 'text/markdown' || file?.name?.endsWith('.md')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{file?.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(file?.created_at).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/command')}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
            >
              Back
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Download
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          {isMarkdown ? (
            <div className="prose prose-slate max-w-none">
              <ReactMarkdown
                components={{
                  code(props) {
                    const { children, className, node, ...rest } = props
                    const match = /language-(\w+)/.exec(className || '')
                    return match ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...rest}>
                        {children}
                      </code>
                    )
                  },
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
