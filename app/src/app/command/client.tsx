'use client'

import { useEffect, useState } from 'react'
import { Agent, Task, Activity, TaskStatus, getAgents, getTasks, getActivities, updateTaskStatus, deleteTask, getTaskComments } from '@/lib/mission-control'
import AgentCard from '@/components/AgentCard'
import KanbanColumn from '@/components/KanbanColumn'
import ActivityFeed from '@/components/ActivityFeed'
import TaskDetailModal from '@/components/TaskDetailModal'
import SimpleCreateTaskModal from '@/components/SimpleCreateTaskModal'
import TwoFactorVerifyModal from '@/components/TwoFactorVerifyModal'
import TwoFactorSetupModal from '@/components/TwoFactorSetupModal'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'
import FilesView from '@/components/FilesView'
import ViewSwitcher from '@/components/ViewSwitcher'
import ListView from '@/components/ListView'
import TimeView from '@/components/TimeView'
import CalendarView from '@/components/CalendarView'
import { ViewType } from '@/types/views'
import { use2FA } from '@/hooks/use2FA'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter, DragOverlay, DragStartEvent } from '@dnd-kit/core'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

const COLUMNS: { status: TaskStatus; title: string }[] = [
  { status: 'inbox', title: 'Inbox' },
  { status: 'assigned', title: 'Assigned' },
  { status: 'in_progress', title: 'In Progress' },
  { status: 'blocked', title: 'Blocked' },
  { status: 'review', title: 'Review' },
  { status: 'done', title: 'Done' },
  { status: 'error', title: 'Error' }
]

export default function MissionControlClient() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [hideDone, setHideDone] = useState(true) // Hide completed by default
  const [deleteModal, setDeleteModal] = useState<{ task: Task; commentCount: number } | null>(null)
  const [executionMode, setExecutionMode] = useState<string | null>(null)
  const [currentView, setCurrentView] = useState<ViewType>('kanban') // New: task view type
  const [view, setView] = useState<'board' | 'files'>('board')
  const [manualAgentSelection, setManualAgentSelection] = useState(false)
  
  // 2FA for write access
  const { 
    hasWriteAccess, 
    requires2FA, 
    needs2FASetup,
    withWriteAccess,
    showVerifyModal,
    showSetupModal,
    onVerifySuccess,
    onVerifyCancel,
    onSetupComplete,
    onSetupCancel,
    checkWriteAccess,
    loading: twoFALoading 
  } = use2FA()

  // Refresh 2FA status when modal closes to ensure banner updates
  useEffect(() => {
    if (!showVerifyModal && !twoFALoading) {
      checkWriteAccess()
    }
  }, [showVerifyModal, twoFALoading, checkWriteAccess])

  // Configure drag sensors with proper activation constraints
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before activating drag
      },
    })
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  useEffect(() => {
    loadData()
    setupRealtimeSubscriptions()
  }, [])

  // Update tab title when tasks need attention
  useEffect(() => {
    const reviewCount = tasks.filter(t => t.status === 'review').length
    if (reviewCount > 0) {
      document.title = `(${reviewCount}) Command - Needs Review`
    } else {
      document.title = 'Command - Tiker'
    }
  }, [tasks])

  async function loadData() {
    try {
      const [botsData, tasksData, activitiesData] = await Promise.all([
        getAgents(),
        getTasks(),
        getActivities()
      ])
      setAgents(botsData)
      setTasks(tasksData)
      setActivities(activitiesData)
      
      // Get execution mode to determine if user is cloud or self-hosted
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: account } = await supabase
          .from('accounts')
          .select('execution_mode')
          .eq('auth_uid', user.id)
          .single()
        if (account) {
          setExecutionMode(account.execution_mode)
        }
      }

      // Load manual agent selection preference
      const savedManualAgent = localStorage.getItem('tiker_manual_agent_selection')
      setManualAgentSelection(savedManualAgent === 'true')
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  function setupRealtimeSubscriptions() {
    const supabase = createClient()

    // Subscribe to agent updates
    const agentsSub = supabase
      .channel('mc_agents_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mc_agents' }, (payload) => {
        console.log('Agent change:', payload)
        loadData()
      })
      .subscribe()

    // Subscribe to task updates
    const tasksSub = supabase
      .channel('mc_tasks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mc_tasks' }, (payload) => {
        console.log('Task change via realtime:', payload)
        // Small delay to avoid race condition with optimistic update
        setTimeout(() => loadData(), 100)
      })
      .subscribe()

    // Subscribe to activity updates
    const activitiesSub = supabase
      .channel('mc_activities_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mc_activities' }, (payload) => {
        console.log('Activity change:', payload)
        loadData()
      })
      .subscribe()

    return () => {
      agentsSub.unsubscribe()
      tasksSub.unsubscribe()
      activitiesSub.unsubscribe()
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    console.log('Drag end:', { activeId: active.id, overId: over?.id, overData: over })
    setActiveId(null)
    
    if (!over) {
      console.log('No drop target detected')
      return
    }
    
    // Check if over.id is a valid TaskStatus
    const validStatuses: TaskStatus[] = ['inbox', 'assigned', 'in_progress', 'review', 'error', 'done', 'blocked']
    if (!validStatuses.includes(over.id as TaskStatus)) {
      console.log('Invalid drop target:', over.id)
      return
    }

    const taskId = active.id as string
    const task = tasks.find(t => t.id === taskId)
    const newStatus = over.id as TaskStatus
    
    if (task?.status === newStatus) {
      console.log('Dropped on same column, ignoring')
      return
    }
    
    // Check write access - if no access, prompt for 2FA
    if (requires2FA && !hasWriteAccess) {
      withWriteAccess(async () => {
        await performTaskUpdate(taskId, newStatus, task?.title)
      })
      return
    }
    
    await performTaskUpdate(taskId, newStatus, task?.title)
  }

  async function performTaskUpdate(taskId: string, newStatus: TaskStatus, taskTitle?: string) {
    console.log(`Updating task "${taskTitle}" to ${newStatus}`)

    // Optimistically update UI first
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: newStatus } : t
    ))

    try {
      await updateTaskStatus(taskId, newStatus)
      console.log('✓ Task updated successfully in database')
    } catch (error) {
      console.error('✗ Failed to update task:', error)
      alert(`Failed to update task: ${error}`)
      loadData() // Reload on error to revert
    }
  }

  // Mark task as done (quick action)
  function handleMarkDone(taskId: string) {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    
    if (requires2FA && !hasWriteAccess) {
      withWriteAccess(async () => {
        await performTaskUpdate(taskId, 'done', task.title)
      })
    } else {
      performTaskUpdate(taskId, 'done', task.title)
    }
  }

  // Initiate delete flow (shows confirmation modal)
  async function handleDeleteClick(taskId: string) {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    
    // Get comment count for the warning
    try {
      const comments = await getTaskComments(taskId)
      setDeleteModal({ task, commentCount: comments.length })
    } catch {
      // If we can't get comments, show modal anyway
      setDeleteModal({ task, commentCount: 0 })
    }
  }

  // Actually delete the task
  async function handleDeleteConfirm() {
    if (!deleteModal) return
    
    const { task } = deleteModal
    
    const doDelete = async () => {
      try {
        await deleteTask(task.id)
        setDeleteModal(null)
        // Remove from local state
        setTasks(prev => prev.filter(t => t.id !== task.id))
      } catch (error: any) {
        console.error('Failed to delete task:', error)
        if (error.message?.includes('2FA')) {
          alert('2FA Required: Please verify 2FA to delete tasks.')
        } else {
          alert('Failed to delete task: ' + error.message)
        }
        throw error
      }
    }
    
    if (requires2FA && !hasWriteAccess) {
      setDeleteModal(null) // Close first to avoid stacking modals
      withWriteAccess(doDelete)
    } else {
      await doDelete()
    }
  }

  function handleDragCancel() {
    setActiveId(null)
  }

  const totalAgents = agents.length
  const tasksInQueue = tasks.filter(t => t.status !== 'done').length
  const reviewCount = tasks.filter(t => t.status === 'review').length
  
  // Filter tasks by selected agent
  const filteredTasks = selectedAgent 
    ? tasks.filter(t => {
        if (selectedAgent === 'Jay') {
          // Jay's tasks are ones not assigned to agents, or assigned to Jay
          const jayAgent = agents.find(a => a.name === 'Jay')
          return t.assigned_agent_ids?.length === 0 || (jayAgent && t.assigned_agent_ids?.includes(jayAgent.id))
        }
        const bot = agents.find(a => a.name === selectedAgent)
        return bot && t.assigned_agent_ids?.includes(bot.id)
      })
    : tasks

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading Command...</div>
      </div>
    )
  }

  const hasNoData = tasks.length === 0 && agents.length === 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">COMMAND CENTER</h1>
              <span className="text-sm text-gray-500">Made with ❤️ by two AI agents and a human</span>
            </div>

            <div className="flex items-center gap-8 text-sm">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{totalAgents}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Agents</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{tasksInQueue}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Tasks in Queue</div>
              </div>
              {reviewCount > 0 && (
                <div className="text-center">
                  <div className="relative inline-block">
                    <div className="text-3xl font-bold text-orange-600">{reviewCount}</div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                  </div>
                  <div className="text-xs text-orange-600 uppercase tracking-wide font-semibold">Needs Review</div>
                </div>
              )}
              <div className="text-center">
                <div className="text-lg font-mono text-gray-900">
                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Write Access Banner */}
      {requires2FA && !hasWriteAccess && !twoFALoading && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-[1800px] mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-sm text-yellow-800">
                {needs2FASetup ? (
                  <><strong>Read-only mode.</strong> Enable 2FA to create or edit tasks.</>
                ) : (
                  <><strong>Read-only mode.</strong> Verify 2FA to create or edit tasks.</>
                )}
              </span>
            </div>
            {needs2FASetup ? (
              <a
                href="/dashboard?tab=settings"
                className="px-3 py-1 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition"
              >
                Enable 2FA
              </a>
            ) : (
              <button
                onClick={() => withWriteAccess(async () => {})}
                className="px-3 py-1 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition"
              >
                Verify Now
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-[2000px] mx-auto px-6 py-6">
        {/* Empty State - New User */}
        {hasNoData && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center mb-8">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Command!</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Start by adding an agent to your team. Agents help you automate tasks, manage workflows, and get things done.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/hub?type=agents"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Browse Agents
              </Link>
              <button
                onClick={() => {
                  if (requires2FA && !hasWriteAccess) {
                    withWriteAccess(async () => setShowCreateTask(true))
                  } else {
                    setShowCreateTask(true)
                  }
                }}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Create your first task
              </button>
            </div>
          </div>
        )}
        {/* Filter and Controls Bar */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold text-gray-900 text-lg">MISSION QUEUE</h2>
            
            {/* Agent Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Filter:</span>
              <button
                onClick={() => setSelectedAgent(null)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedAgent === null 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {agents.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.name)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                    selectedAgent === agent.name
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{agent.emoji}</span>
                  <span>{agent.name}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Hide Done toggle */}
            <button
              onClick={() => setHideDone(!hideDone)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                hideDone 
                  ? 'bg-gray-200 text-gray-600' 
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {hideDone ? 'Show Done' : 'Hide Done'}
              {!hideDone && ` (${tasks.filter(t => t.status === 'done').length})`}
            </button>
            
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setView('board')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  view === 'board'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Board
              </button>
              <button
                onClick={() => setView('files')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  view === 'files'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Files
              </button>
            </div>

            {manualAgentSelection && (
              <Link
                href={executionMode === 'openclaw' ? '/hub?type=agents' : '/agents'}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                + Add Agent
              </Link>
            )}

            <button
              onClick={() => {
                if (requires2FA && !hasWriteAccess) {
                  withWriteAccess(async () => setShowCreateTask(true))
                } else {
                  setShowCreateTask(true)
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              + Create Task
            </button>
          </div>
        </div>

        {/* Board View */}
        {view === 'board' && (
          <>
        {/* View Switcher */}
        <ViewSwitcher currentView={currentView} onViewChange={setCurrentView} />
        
        {/* Kanban/List/Time Views - Conditional Rendering */}
        {currentView === 'kanban' && (
          <>
        {/* Kanban Board - Horizontal Scroll */}
        <div className="relative">
          {/* Scroll indicator */}
          <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none z-10 md:hidden"></div>
          
          <DndContext 
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            sensors={sensors}
            collisionDetection={closestCenter}
          >
            <div className="flex gap-4 pb-4 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent snap-x">
              {COLUMNS.filter(col => {
                // Hide "done" if toggle is on
                if (hideDone && col.status === 'done') return false;
                
                // Hide "blocked" and "error" columns if no tasks have those statuses
                if (col.status === 'blocked' || col.status === 'error') {
                  return filteredTasks.some(t => t.status === col.status);
                }
                
                return true;
              }).map(column => (
                <div key={column.status} className="snap-start">
                  <KanbanColumn
                    status={column.status}
                    title={column.title}
                    tasks={filteredTasks.filter(t => t.status === column.status)}
                    agents={agents}
                    onTaskClick={setSelectedTask}
                    onMarkDone={handleMarkDone}
                    onDelete={handleDeleteClick}
                  />
                </div>
              ))}
            </div>
            <DragOverlay>
              {activeId ? (
                <div className="bg-white border-l-4 border-l-blue-400 rounded-lg p-3 shadow-xl opacity-90">
                  <h3 className="font-medium text-gray-900 text-sm">
                    {tasks.find(t => t.id === activeId)?.title}
                  </h3>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
          </>
        )}
        
        {currentView === 'list' && (
          <ListView 
            tasks={filteredTasks} 
            onTaskClick={setSelectedTask}
            onTaskComplete={handleMarkDone}
          />
        )}
        
        {currentView === 'time' && (
          <TimeView 
            tasks={filteredTasks} 
            onTaskClick={setSelectedTask}
          />
        )}

        {currentView === 'calendar' && (
          <CalendarView
            tasks={filteredTasks}
            onTaskClick={setSelectedTask}
          />
        )}

        {/* Activity Feed - Below Board */}
        <div className="mt-6">
          <div className="bg-white rounded-lg p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                LIVE FEED
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </span>
              <span className="text-sm font-normal text-gray-500">{activities.length} recent</span>
            </h2>
            <ActivityFeed activities={activities} />
          </div>
        </div>
          </>
        )}

        {/* Files View */}
        {view === 'files' && (
          <div className="bg-white rounded-lg min-h-[600px]">
            <FilesView />
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          agents={agents}
          onClose={() => setSelectedTask(null)}
          onMarkDone={handleMarkDone}
          onDelete={handleDeleteClick}
        />
      )}

      {/* Simple Create Task Modal */}
      {showCreateTask && (
        <SimpleCreateTaskModal
          isOpen={showCreateTask}
          onClose={() => setShowCreateTask(false)}
          onTaskCreated={loadData}
        />
      )}

      {/* 2FA Verify Modal */}
      {showVerifyModal && (
        <TwoFactorVerifyModal
          onSuccess={onVerifySuccess}
          onCancel={onVerifyCancel}
        />
      )}

      {/* 2FA Setup Modal */}
      {showSetupModal && (
        <TwoFactorSetupModal
          onComplete={onSetupComplete}
          onCancel={onSetupCancel}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <DeleteConfirmModal
          taskTitle={deleteModal.task.title}
          commentCount={deleteModal.commentCount}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteModal(null)}
        />
      )}
    </div>
  )
}
