'use client'

import { useEffect, useState } from 'react'
import { Agent, Task, Activity, TaskStatus, getAgents, getTasks, getActivities, updateTaskStatus, updateTask, deleteTask, getTaskComments } from '@/lib/mission-control'
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
import ActionBar from '@/components/ActionBar'
import ActionSheet from '@/components/ActionSheet'
import ActionCenter from '@/components/ActionCenter'
import { ViewType } from '@/types/views'
import { useConsumerMode } from '@/hooks/useConsumerMode'
import { getStatusLabel } from '@/lib/consumer-labels'
import { ActionDefinition, WorkflowDefinition } from '@/lib/action-registry'
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
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false)
  const [createTaskDate, setCreateTaskDate] = useState<string | null>(null)

  // Consumer mode
  const { isConsumer, firstName } = useConsumerMode()

  // Action system state
  const [actionBarActions, setActionBarActions] = useState<ActionDefinition[]>([])
  const [actionBarLoading, setActionBarLoading] = useState(true)
  const [activeAction, setActiveAction] = useState<ActionDefinition | null>(null)
  const [showActionCenter, setShowActionCenter] = useState(false)
  const [actionCenterData, setActionCenterData] = useState<{
    quickActions: ActionDefinition[];
    workflows: WorkflowDefinition[];
    suggestedQuick: (ActionDefinition & { needsConnection?: boolean })[];
    suggestedWorkflows: (WorkflowDefinition & { needsConnection?: boolean })[];
  }>({ quickActions: [], workflows: [], suggestedQuick: [], suggestedWorkflows: [] })

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
    loadAvailableActions()
    setupRealtimeSubscriptions()
  }, [])

  async function loadAvailableActions() {
    try {
      setActionBarLoading(true)
      const res = await fetch('/api/actions/available')
      if (!res.ok) throw new Error('Failed to load actions')
      const data = await res.json()
      setActionBarActions(data.quick_actions || [])
      setActionCenterData({
        quickActions: data.quick_actions || [],
        workflows: data.workflows || [],
        suggestedQuick: data.suggested?.quick_actions || [],
        suggestedWorkflows: data.suggested?.workflows || [],
      })
    } catch (err) {
      console.error('Failed to load available actions:', err)
      setActionBarActions([])
    } finally {
      setActionBarLoading(false)
    }
  }

  // Update tab title when tasks need attention
  useEffect(() => {
    const reviewCount = tasks.filter(t => t.status === 'review').length
    if (reviewCount > 0) {
      document.title = isConsumer
        ? `(${reviewCount}) Tiker - Ready for you`
        : `(${reviewCount}) Command - Needs Review`
    } else {
      document.title = isConsumer ? 'Tiker' : 'Command - Tiker'
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
      console.log('Task updated successfully in database')
    } catch (error) {
      console.error('Failed to update task:', error)
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
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-gray-500 dark:text-neutral-400">Loading Command...</div>
      </div>
    )
  }

  const hasNoData = tasks.length === 0 && agents.length === 0

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-[1800px] mx-auto px-6 py-3">
          {/* Top row: title + stats */}
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
              {isConsumer ? (firstName ? `Hi, ${firstName}` : 'Home') : 'Command'}
            </h1>

            <div className="flex items-center gap-5">
              {/* Stat pills */}
              <div className="flex items-center gap-3">
                {!isConsumer && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    <span className="text-neutral-900 dark:text-neutral-100 font-semibold">{totalAgents}</span> agents
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  <span className="text-neutral-900 dark:text-neutral-100 font-semibold">{tasksInQueue}</span> tasks
                </span>
                {reviewCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-xs font-medium text-orange-700 dark:text-orange-300">
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                    <span className="font-semibold">{reviewCount}</span> {isConsumer ? 'ready for you' : 'review'}
                  </span>
                )}
              </div>

              {/* Clock with timezone */}
              <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                <span className="font-mono text-sm text-neutral-700 dark:text-neutral-300">
                  {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </span>
                <span className="text-neutral-400 dark:text-neutral-500">
                  {new Date().toLocaleDateString('en-US', { timeZoneName: 'short' }).split(', ').pop()}
                </span>
                <span className="flex items-center gap-1 ml-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                </span>
              </div>

              {/* Settings */}
              <Link
                href="/settings"
                className="p-1.5 rounded-lg text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                title="Settings"
              >
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              {/* Agent filter dropdown - advanced only */}
              {!isConsumer && (
                <div className="relative">
                  <button
                    onClick={() => setAgentDropdownOpen(!agentDropdownOpen)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                  >
                    {selectedAgent ? (
                      <>
                        <span>{agents.find(a => a.name === selectedAgent)?.emoji || '👤'}</span>
                        <span>{selectedAgent}</span>
                      </>
                    ) : (
                      <span>All agents</span>
                    )}
                    <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {agentDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setAgentDropdownOpen(false)} />
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-30 py-1">
                        <button
                          onClick={() => { setSelectedAgent(null); setAgentDropdownOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                            selectedAgent === null
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                              : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                          }`}
                        >
                          All agents
                        </button>
                        {agents.map(agent => (
                          <button
                            key={agent.id}
                            onClick={() => { setSelectedAgent(agent.name); setAgentDropdownOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                              selectedAgent === agent.name
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                            }`}
                          >
                            <span>{agent.emoji}</span>
                            <span>{agent.name}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Hide Done toggle */}
              <button
                onClick={() => setHideDone(!hideDone)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  hideDone
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                }`}
              >
                {hideDone ? `Show Done (${tasks.filter(t => t.status === 'done').length})` : 'Hide Done'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Board / Files toggle - advanced only */}
              {!isConsumer && (
                <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5">
                  <button
                    onClick={() => setView('board')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      view === 'board'
                        ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                    }`}
                  >
                    Board
                  </button>
                  <button
                    onClick={() => setView('files')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      view === 'files'
                        ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                    }`}
                  >
                    Library
                  </button>
                </div>
              )}

              <button
                onClick={() => { setChatTask(null); setChatOpen(true); }}
                className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-sm font-medium flex items-center gap-1.5"
              >
                Chat
              </button>

              <button
                onClick={() => setShowCreateTask(true)}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                {isConsumer ? '+ Add' : '+ New Task'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar - always visible quick actions based on connections */}
      <div className="max-w-[2000px] mx-auto px-6 pt-2">
        <ActionBar
          actions={actionBarActions}
          loading={actionBarLoading}
          onActionClick={(action) => setActiveAction(action)}
          onMoreClick={() => setShowActionCenter(true)}
        />
      </div>

      {/* Main Content */}
      <div className="max-w-[2000px] mx-auto px-6 py-6">
        {/* Empty State - New User */}
        {hasNoData && (
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-12 text-center mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              {isConsumer ? `Welcome${firstName ? `, ${firstName}` : ''}!` : 'Welcome to Command'}
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-md mx-auto">
              {isConsumer
                ? "Let's get started! Add your first task and let AI help you get things done."
                : 'Start by adding an agent to your team. Agents help you automate tasks, manage workflows, and get things done.'}
            </p>
            <div className="flex items-center justify-center gap-4">
              {!isConsumer && (
                <Link
                  href="/hub?type=agents"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Browse Agents
                </Link>
              )}
              <button
                onClick={() => setShowCreateTask(true)}
                className={`px-6 py-3 rounded-lg transition-colors font-medium ${
                  isConsumer
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                Create your first task
              </button>
            </div>
          </div>
        )}

        {/* Board View */}
        {view === 'board' && (
          <>
        {/* View Switcher */}
        <ViewSwitcher currentView={currentView} onViewChange={setCurrentView} isConsumer={isConsumer} />

        {/* Kanban/List/Time Views - Conditional Rendering */}
        {currentView === 'kanban' && (
          <>
        {/* Kanban Board - Horizontal Scroll */}
        <div className="relative">
          {/* Scroll indicator */}
          <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-gray-50 dark:from-neutral-950 to-transparent pointer-events-none z-10 md:hidden"></div>

          <DndContext
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            sensors={sensors}
            collisionDetection={closestCenter}
          >
            <div className="flex gap-4 pb-4 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-neutral-600 scrollbar-track-transparent snap-x">
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
                <div className="bg-white dark:bg-neutral-800 border-l-4 border-l-blue-400 rounded-lg p-3 shadow-xl opacity-90">
                  <h3 className="font-medium text-gray-900 dark:text-neutral-100 text-sm">
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
            onDayClick={(date) => {
              const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
              setCreateTaskDate(key);
              setShowCreateTask(true);
            }}
          />
        )}

        {currentView === 'briefing' && (
          <DailyBriefing
            tasks={filteredTasks}
            agents={agents}
            activities={activities}
            onTaskClick={setSelectedTask}
            onOpenChat={() => { setChatTask(null); setChatOpen(true); }}
            isConsumer={isConsumer}
            firstName={firstName}
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
              <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-gray-200 dark:border-neutral-800">
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
          <div className="bg-white dark:bg-neutral-900 rounded-lg min-h-[600px]">
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
          onTaskUpdated={() => { loadData(); setSelectedTask(null); }}
        />
      )}

      {/* Simple Create Task Modal */}
      {showCreateTask && (
        <SimpleCreateTaskModal
          isOpen={showCreateTask}
          onClose={() => { setShowCreateTask(false); setCreateTaskDate(null); }}
          onTaskCreated={loadData}
          initialDate={createTaskDate || undefined}
          isConsumer={isConsumer}
        />
      )}

      {/* Action Sheet - 3-tap execution flow */}
      <ActionSheet
        action={activeAction}
        isOpen={!!activeAction}
        onClose={() => setActiveAction(null)}
        onExecuted={() => { loadData(); loadAvailableActions(); }}
      />

      {/* Action Center - full modal with all actions + templates */}
      <ActionCenter
        isOpen={showActionCenter}
        onClose={() => setShowActionCenter(false)}
        quickActions={actionCenterData.quickActions}
        workflows={actionCenterData.workflows as WorkflowDefinition[]}
        suggestedQuickActions={actionCenterData.suggestedQuick}
        suggestedWorkflows={actionCenterData.suggestedWorkflows as (WorkflowDefinition & { needsConnection?: boolean })[]}
        onActionSelect={(action) => setActiveAction(action)}
        onManualTask={() => setShowCreateTask(true)}
      />

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
