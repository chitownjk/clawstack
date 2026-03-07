'use client'

import { useEffect, useState } from 'react'
import { Agent, Task, Activity, TaskStatus, getAgents, getTasks, getActivities, updateTaskStatus, deleteTask, getTaskComments } from '@/lib/mission-control'
import AgentCard from '@/components/AgentCard'
import KanbanColumn from '@/components/KanbanColumn'
import TaskDetailModal from '@/components/TaskDetailModal'
import SimpleCreateTaskModal from '@/components/SimpleCreateTaskModal'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'
import FilesView from '@/components/FilesView'
import ViewSwitcher from '@/components/ViewSwitcher'
import ListView from '@/components/ListView'
import TimeView from '@/components/TimeView'
import CalendarView from '@/components/CalendarView'
import ChatPanel from '@/components/ChatPanel'
import DailyBriefing from '@/components/DailyBriefing'
import { ViewType } from '@/types/views'
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
  const [currentView, setCurrentView] = useState<ViewType>('briefing') // Default to daily briefing
  const [view, setView] = useState<'board' | 'files'>('board')
  const [manualAgentSelection, setManualAgentSelection] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatTask, setChatTask] = useState<Task | null>(null)

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
    performTaskUpdate(taskId, 'done', task.title)
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
    
    try {
      await deleteTask(task.id)
      setDeleteModal(null)
      // Remove from local state
      setTasks(prev => prev.filter(t => t.id !== task.id))
    } catch (error: any) {
      console.error('Failed to delete task:', error)
      alert('Failed to delete task: ' + error.message)
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
                onClick={() => setShowCreateTask(true)}
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
              onClick={() => { setChatTask(null); setChatOpen(true); }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center gap-1.5"
            >
              <span>💬</span> Chat
            </button>

            <button
              onClick={() => setShowCreateTask(true)}
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

        {currentView === 'briefing' && (
          <DailyBriefing
            tasks={filteredTasks}
            agents={agents}
            activities={activities}
            onTaskClick={setSelectedTask}
            onOpenChat={() => { setChatTask(null); setChatOpen(true); }}
          />
        )}

        {/* AI Activity History - Shows completed AI work */}
        {(() => {
          const reviewTasks = tasks.filter(t => t.status === 'review');
          const recentlyDone = tasks.filter(t => t.status === 'done' && t.updated_at && Date.now() - new Date(t.updated_at).getTime() < 7 * 24 * 60 * 60 * 1000);
          const aiWorkTasks = [...reviewTasks, ...recentlyDone].sort((a, b) =>
            new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
          );
          if (aiWorkTasks.length === 0) return null;
          return (
            <div className="mt-6">
              <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-gray-200 dark:border-neutral-700">
                <h2 className="font-semibold text-gray-900 dark:text-neutral-100 mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    AI Activity
                    {reviewTasks.length > 0 && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-full">
                        {reviewTasks.length} needs review
                      </span>
                    )}
                  </span>
                </h2>
                <div className="space-y-2">
                  {aiWorkTasks.slice(0, 10).map(task => (
                    <button
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors group"
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        task.status === 'review' ? 'bg-purple-500 animate-pulse' : 'bg-green-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-800 dark:text-neutral-200 group-hover:text-gray-900 dark:group-hover:text-white truncate block">
                          {task.title}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-neutral-500">
                          {task.status === 'review' ? 'Completed by AI - needs review' : 'Done'}
                          {task.updated_at && ` \u00B7 ${new Date(task.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                        </span>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 dark:text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
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
          onOpenChat={(task) => { setChatTask(task); setChatOpen(true); }}
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

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <DeleteConfirmModal
          taskTitle={deleteModal.task.title}
          commentCount={deleteModal.commentCount}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteModal(null)}
        />
      )}

      {/* Chat Panel */}
      <ChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        task={chatTask}
        agents={agents}
      />
    </div>
  )
}
