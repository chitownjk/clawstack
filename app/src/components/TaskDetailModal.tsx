'use client'

import { Task, Agent, Comment } from '@/lib/mission-control'
import { useEffect, useState } from 'react'
import { getTaskComments, createComment } from '@/lib/mission-control'
import { createClient } from '@/lib/supabase'
import SimpleMarkdown from '@/components/SimpleMarkdown'
import MentionInput from '@/components/MentionInput'
import CommentContent from '@/components/CommentContent'
import FileAttachments from '@/components/FileAttachments'

interface TaskDetailModalProps {
  task: Task
  agents: Agent[]
  onClose: () => void
  onDelete?: (taskId: string) => void
  onMarkDone?: (taskId: string) => void
}

export default function TaskDetailModal({ task, agents, onClose, onDelete, onMarkDone }: TaskDetailModalProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showAttachments, setShowAttachments] = useState(true)

  useEffect(() => {
    loadComments()
    // Set up realtime subscription for comments
    const supabase = createClient()
    const channel = supabase
      .channel(`task_${task.id}_comments`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'mc_comments', filter: `task_id=eq.${task.id}` },
        () => loadComments()
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [task.id])

  async function loadComments() {
    try {
      const data = await getTaskComments(task.id)
      setComments(data)
    } catch (error) {
      console.error('Failed to load comments:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim() || submitting) return

    setSubmitting(true)
    try {
      await createComment(task.id, newComment)
      setNewComment('')
      await loadComments()
    } catch (error: any) {
      console.error('Failed to create comment:', error)
      // Check for 2FA error
      if (error.message?.includes('2FA') || error.message?.includes('2FA_REQUIRED')) {
        alert('2FA Required: Please enable and verify 2FA in Settings to post comments.')
      } else {
        alert('Failed to post comment: ' + (error.message || 'Unknown error'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  function copyForChat() {
    const assignedAgents = agents.filter(a => task.assigned_agent_ids?.includes(a.id))
    const agentNames = assignedAgents.map(a => a.name).join(', ') || 'Unassigned'
    const text = `Task: ${task.title}\nID: ${task.id}\nStatus: ${task.status}\nAssigned to: ${agentNames}\n\nLet's discuss this task.`
    
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const assignedAgents = agents.filter(a => task.assigned_agent_ids?.includes(a.id))

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" 
      onClick={onClose} 
      style={{ zIndex: 10000 }}
      onPointerDown={e => e.target === e.currentTarget && e.stopPropagation()}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">{task.title}</h2>
              {task.description && (
                <div>
                  <div 
                    className={`text-gray-600 ${!descriptionExpanded ? 'line-clamp-3' : 'max-h-[40vh] overflow-y-auto'}`}
                  >
                    <SimpleMarkdown content={task.description} />
                  </div>
                  {task.description.length > 150 && (
                    <button
                      onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                      className="text-blue-600 hover:text-blue-700 text-sm mt-1"
                    >
                      {descriptionExpanded ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              )}
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-4 flex-shrink-0"
            >
              ×
            </button>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700">Status:</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  {task.status}
                </span>
              </div>

              {assignedAgents.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">Assigned:</span>
                  <div className="flex gap-1">
                    {assignedAgents.map(agent => (
                      <span key={agent.id} title={agent.name}>
                        {agent.emoji} {agent.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Mark Done button - only show if not done */}
              {task.status !== 'done' && onMarkDone && (
                <button
                  onClick={() => {
                    onMarkDone(task.id)
                    onClose()
                  }}
                  className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-sm font-medium transition-colors flex items-center gap-2"
                  title="Mark as done"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Done</span>
                </button>
              )}
              
              <button
                onClick={copyForChat}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium transition-colors flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Copy</span>
                  </>
                )}
              </button>

              {/* Delete button */}
              {onDelete && (
                <button
                  onClick={() => {
                    onDelete(task.id)
                    onClose()
                  }}
                  className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm font-medium transition-colors flex items-center gap-2"
                  title="Delete task permanently"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>

          {task.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {task.tags.map(tag => (
                <span key={tag} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Comments & Attachments - scrollable area */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0 space-y-6">
          {/* Attachments Section */}
          <div>
            <button
              onClick={() => setShowAttachments(!showAttachments)}
              className="flex items-center gap-2 font-semibold text-gray-900 mb-4 sticky top-0 bg-white pb-2 w-full hover:text-blue-600 transition-colors"
            >
              <svg 
                className={`w-4 h-4 transition-transform ${showAttachments ? 'rotate-90' : ''}`}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span>Attachments</span>
            </button>
            {showAttachments && (
              <FileAttachments taskId={task.id} />
            )}
          </div>

          {/* Activity/Comments Section */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 sticky top-0 bg-white pb-2">Activity</h3>
            
            {loading ? (
              <div className="text-center text-gray-400 py-8">Loading...</div>
            ) : comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                        {comment.agent?.emoji}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-medium text-gray-900 text-sm">
                          {comment.agent?.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm">
                        <CommentContent content={comment.content} />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">No comments yet</div>
            )}
          </div>
        </div>

        {/* Comment Input */}
        <div className="p-6 border-t bg-gray-50 flex-shrink-0">
          <form onSubmit={handleSubmitComment} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Comment <span className="font-normal text-gray-400">— use @name to mention</span>
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <MentionInput
                  value={newComment}
                  onChange={setNewComment}
                  onSubmit={() => handleSubmitComment({ preventDefault: () => {} } as React.FormEvent)}
                  agents={agents}
                  placeholder="Type your comment..."
                  disabled={submitting}
                  submitting={submitting}
                />
              </div>
              <button
                type="submit"
                disabled={!newComment.trim() || submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {submitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
          
          <div className="text-xs text-gray-500">
            Created {new Date(task.created_at).toLocaleString()}
            {task.completed_at && ` • Completed ${new Date(task.completed_at).toLocaleString()}`}
          </div>
        </div>
      </div>
    </div>
  )
}
