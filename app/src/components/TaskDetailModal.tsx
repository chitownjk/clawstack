'use client'

import { Task, Agent, Comment } from '@/lib/mission-control'
import { useEffect, useState } from 'react'
import { getTaskComments, createComment, updateTask, updateTaskAssignees } from '@/lib/mission-control'
import { createClient } from '@/lib/supabase'
import SimpleMarkdown from '@/components/SimpleMarkdown'
import MentionInput from '@/components/MentionInput'
import CommentContent from '@/components/CommentContent'
import FileAttachments from '@/components/FileAttachments'
import { RecurrenceRule } from '@/types/views'

interface TaskDetailModalProps {
  task: Task
  agents: Agent[]
  onClose: () => void
  onDelete?: (taskId: string) => void
  onMarkDone?: (taskId: string) => void
  onOpenChat?: (task: Task) => void
  onTaskUpdated?: () => void
}

type RecurrenceFreq = 'none' | 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'monthly'

export default function TaskDetailModal({ task, agents, onClose, onDelete, onMarkDone, onOpenChat, onTaskUpdated }: TaskDetailModalProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showAttachments, setShowAttachments] = useState(true)

  // Edit mode state
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editDescription, setEditDescription] = useState(task.description || '')
  const [editPriority, setEditPriority] = useState(task.priority)
  const [editDueDate, setEditDueDate] = useState(task.due_date || '')
  const [editRecurrence, setEditRecurrence] = useState<RecurrenceFreq>(
    task.recurrence_rule?.freq || 'none'
  )
  const [editWeeklyDays, setEditWeeklyDays] = useState<number[]>(
    task.recurrence_rule?.days || []
  )
  const [saving, setSaving] = useState(false)

  // Agent assignment state
  const [showAgentPicker, setShowAgentPicker] = useState(false)
  const [assigningAgent, setAssigningAgent] = useState(false)

  useEffect(() => {
    loadComments()
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
      alert('Failed to post comment: ' + (error.message || 'Unknown error'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSaveEdits() {
    setSaving(true)
    try {
      let recurrenceRule: RecurrenceRule | null = null
      if (editRecurrence !== 'none') {
        recurrenceRule = { freq: editRecurrence }
        if (editRecurrence === 'weekly' && editWeeklyDays.length > 0) {
          recurrenceRule.days = editWeeklyDays
        }
      }

      await updateTask(task.id, {
        title: editTitle,
        description: editDescription || undefined,
        priority: editPriority as any,
        due_date: editDueDate || undefined,
        recurrence_rule: recurrenceRule,
      })
      setEditing(false)
      onTaskUpdated?.()
    } catch (error: any) {
      console.error('Failed to update task:', error)
      alert('Failed to save: ' + (error.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  async function handleAssignAgent(agentId: string) {
    setAssigningAgent(true)
    try {
      const currentIds = task.assigned_agent_ids || []
      const newIds = currentIds.includes(agentId)
        ? currentIds.filter(id => id !== agentId)
        : [...currentIds, agentId]
      await updateTaskAssignees(task.id, newIds)
      setShowAgentPicker(false)
      onTaskUpdated?.()
    } catch (error: any) {
      console.error('Failed to assign agent:', error)
      alert('Failed to assign agent: ' + (error.message || 'Unknown error'))
    } finally {
      setAssigningAgent(false)
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

  function toggleWeeklyDay(day: number) {
    setEditWeeklyDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const assignedAgents = agents.filter(a => task.assigned_agent_ids?.includes(a.id))
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
      style={{ zIndex: 10000 }}
      onPointerDown={e => e.target === e.currentTarget && e.stopPropagation()}
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-transparent dark:border-neutral-800"
        onClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-neutral-800 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {editing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="text-2xl font-semibold text-gray-900 dark:text-neutral-100 bg-transparent border-b-2 border-blue-500 outline-none w-full pb-1"
                  autoFocus
                />
              ) : (
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-neutral-100 mb-2">{task.title}</h2>
              )}
              {editing ? (
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  rows={3}
                  placeholder="Description (optional)"
                  className="mt-2 w-full text-gray-600 dark:text-neutral-400 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-2 text-sm outline-none focus:border-blue-500 resize-none"
                />
              ) : task.description ? (
                <div>
                  <div
                    className={`text-gray-600 dark:text-neutral-400 ${!descriptionExpanded ? 'line-clamp-3' : 'max-h-[40vh] overflow-y-auto'}`}
                  >
                    <SimpleMarkdown content={task.description} />
                  </div>
                  {task.description.length > 150 && (
                    <button
                      onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm mt-1"
                    >
                      {descriptionExpanded ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              ) : null}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 text-2xl leading-none ml-4 flex-shrink-0"
            >
              x
            </button>
          </div>

          {/* Edit mode: priority + due date + recurrence */}
          {editing && (
            <div className="mt-4 space-y-3">
              {/* Priority */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-neutral-300 w-20">Priority:</span>
                <div className="flex gap-1">
                  {(['now', 'soon', 'later'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setEditPriority(p)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        editPriority === p
                          ? p === 'now' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 ring-2 ring-red-400'
                            : p === 'soon' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 ring-2 ring-yellow-400'
                            : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-400'
                          : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 hover:bg-gray-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Due date */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-neutral-300 w-20">Due:</span>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={e => setEditDueDate(e.target.value)}
                  className="px-2 py-1 text-sm rounded border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 outline-none focus:border-blue-500"
                />
                {editDueDate && (
                  <button
                    onClick={() => setEditDueDate('')}
                    className="text-xs text-gray-400 dark:text-neutral-500 hover:text-red-500"
                  >
                    clear
                  </button>
                )}
              </div>

              {/* Recurrence */}
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-neutral-300 w-20 pt-1">Repeat:</span>
                <div className="flex flex-wrap gap-1">
                  {([
                    ['none', 'None'],
                    ['daily', 'Daily'],
                    ['weekdays', 'Weekdays'],
                    ['weekends', 'Weekends'],
                    ['weekly', 'Weekly'],
                    ['monthly', 'Monthly'],
                  ] as [RecurrenceFreq, string][]).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setEditRecurrence(val)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        editRecurrence === val
                          ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 ring-2 ring-purple-400'
                          : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 hover:bg-gray-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weekly day picker */}
              {editRecurrence === 'weekly' && (
                <div className="flex items-center gap-2 ml-[88px]">
                  {dayLabels.map((label, i) => (
                    <button
                      key={i}
                      onClick={() => toggleWeeklyDay(i)}
                      className={`w-8 h-8 rounded-full text-xs font-bold transition-colors ${
                        editWeeklyDays.includes(i)
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400 hover:bg-gray-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Status / Assignment / Actions row */}
          <div className="flex items-center justify-between mt-4 text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700 dark:text-neutral-300">Status:</span>
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                  {task.status}
                </span>
              </div>

              {/* Agent assignment area */}
              <div className="flex items-center gap-2 relative">
                <span className="font-medium text-gray-700 dark:text-neutral-300">Assigned:</span>
                {assignedAgents.length > 0 ? (
                  <div className="flex gap-1">
                    {assignedAgents.map(agent => (
                      <span key={agent.id} title={agent.name} className="text-gray-900 dark:text-neutral-100 text-sm">
                        {agent.emoji} {agent.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-400 dark:text-neutral-500 text-xs">None</span>
                )}
                <button
                  onClick={() => setShowAgentPicker(!showAgentPicker)}
                  className="ml-1 px-2 py-0.5 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors font-medium"
                  title="Assign or remove AI agent"
                >
                  {assignedAgents.length > 0 ? 'Edit' : '+ AI'}
                </button>

                {/* Agent picker dropdown */}
                {showAgentPicker && (
                  <div className="absolute top-full left-0 mt-1 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-lg py-1 z-50 min-w-[200px]">
                    {agents.map(agent => {
                      const isAssigned = task.assigned_agent_ids?.includes(agent.id)
                      return (
                        <button
                          key={agent.id}
                          onClick={() => handleAssignAgent(agent.id)}
                          disabled={assigningAgent}
                          className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                            isAssigned
                              ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                              : 'text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-700'
                          } ${assigningAgent ? 'opacity-50' : ''}`}
                        >
                          <span>{agent.emoji}</span>
                          <span>{agent.name}</span>
                          {isAssigned && <span className="ml-auto text-purple-500">&#10003;</span>}
                        </button>
                      )
                    })}
                    {agents.length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-400 dark:text-neutral-500">No agents available</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Edit / Save buttons */}
              {editing ? (
                <>
                  <button
                    onClick={() => {
                      setEditing(false)
                      setEditTitle(task.title)
                      setEditDescription(task.description || '')
                      setEditPriority(task.priority)
                      setEditDueDate(task.due_date || '')
                      setEditRecurrence(task.recurrence_rule?.freq || 'none')
                      setEditWeeklyDays(task.recurrence_rule?.days || [])
                    }}
                    className="px-3 py-1 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-700 dark:text-neutral-300 rounded text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdits}
                    disabled={saving || !editTitle.trim()}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </>
              ) : (
                <>
                  {/* Edit button */}
                  <button
                    onClick={() => setEditing(true)}
                    className="px-3 py-1 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-700 dark:text-neutral-300 rounded text-sm font-medium transition-colors flex items-center gap-1.5"
                    title="Edit task"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit
                  </button>

                  {/* Mark Done */}
                  {task.status !== 'done' && onMarkDone && (
                    <button
                      onClick={() => {
                        onMarkDone(task.id)
                        onClose()
                      }}
                      className="px-3 py-1 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 rounded text-sm font-medium transition-colors flex items-center gap-2"
                      title="Mark as done"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Done
                    </button>
                  )}

                  {/* Chat */}
                  {onOpenChat && (
                    <button
                      onClick={() => onOpenChat(task)}
                      className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-sm font-medium transition-colors flex items-center gap-2"
                      title="Chat about this task"
                    >
                      <span>&#128172;</span>
                      Chat
                    </button>
                  )}

                  {/* Copy */}
                  <button
                    onClick={copyForChat}
                    className="px-3 py-1 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-700 dark:text-neutral-300 rounded text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-green-600 dark:text-green-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>

                  {/* Delete */}
                  {onDelete && (
                    <button
                      onClick={() => {
                        onDelete(task.id)
                        onClose()
                      }}
                      className="px-3 py-1 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded text-sm font-medium transition-colors flex items-center gap-2"
                      title="Delete task permanently"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {task.tags.map(tag => (
                <span key={tag} className="text-xs px-2 py-1 bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Recurrence indicator (read-only view) */}
          {!editing && task.recurrence_rule && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400">
              <span>&#8635;</span>
              <span>
                Repeats {task.recurrence_rule.freq}
                {task.recurrence_rule.freq === 'weekly' && task.recurrence_rule.days?.length
                  ? ` on ${task.recurrence_rule.days.map(d => dayLabels[d]).join(', ')}`
                  : ''}
              </span>
            </div>
          )}
        </div>

        {/* Comments & Attachments - scrollable area */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0 space-y-6">
          {/* Attachments Section */}
          <div>
            <button
              onClick={() => setShowAttachments(!showAttachments)}
              className="flex items-center gap-2 font-semibold text-gray-900 dark:text-neutral-100 mb-4 w-full hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
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
            <h3 className="font-semibold text-gray-900 dark:text-neutral-100 mb-4">Activity</h3>

            {loading ? (
              <div className="text-center text-gray-400 dark:text-neutral-500 py-8">Loading...</div>
            ) : comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/40 flex items-center justify-center">
                        {comment.agent?.emoji}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-neutral-100 text-sm">
                          {comment.agent?.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-neutral-500">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-neutral-300 text-sm">
                        <CommentContent content={comment.content} />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 dark:text-neutral-500 py-8">No comments yet</div>
            )}
          </div>
        </div>

        {/* Comment Input */}
        <div className="p-6 border-t border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 flex-shrink-0">
          <form onSubmit={handleSubmitComment} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              Add Comment <span className="font-normal text-gray-400 dark:text-neutral-500">-- use @name to mention</span>
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-neutral-700 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {submitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>

          <div className="text-xs text-gray-500 dark:text-neutral-500">
            Created {new Date(task.created_at).toLocaleString()}
            {task.completed_at && ` | Completed ${new Date(task.completed_at).toLocaleString()}`}
          </div>
        </div>
      </div>
    </div>
  )
}
