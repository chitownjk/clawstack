'use client';

import { useState, useMemo } from 'react';
import { ActionDefinition, WorkflowDefinition } from '@/lib/action-registry';
import Link from 'next/link';

interface ActionCenterProps {
  isOpen: boolean;
  onClose: () => void;
  quickActions: ActionDefinition[];
  workflows: WorkflowDefinition[];
  suggestedQuickActions: (ActionDefinition & { needsConnection?: boolean })[];
  suggestedWorkflows: (WorkflowDefinition & { needsConnection?: boolean })[];
  onActionSelect: (action: ActionDefinition) => void;
  onManualTask: () => void;
}

type Tab = 'actions' | 'templates' | 'task';

export default function ActionCenter({
  isOpen,
  onClose,
  quickActions,
  workflows,
  suggestedQuickActions,
  suggestedWorkflows,
  onActionSelect,
  onManualTask,
}: ActionCenterProps) {
  const [tab, setTab] = useState<Tab>('actions');
  const [search, setSearch] = useState('');

  const filteredQuickActions = useMemo(() => {
    if (!search) return quickActions;
    const q = search.toLowerCase();
    return quickActions.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.service.toLowerCase().includes(q)
    );
  }, [quickActions, search]);

  const filteredSuggested = useMemo(() => {
    if (!search) return suggestedQuickActions;
    const q = search.toLowerCase();
    return suggestedQuickActions.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.service.toLowerCase().includes(q)
    );
  }, [suggestedQuickActions, search]);

  const filteredWorkflows = useMemo(() => {
    if (!search) return workflows;
    const q = search.toLowerCase();
    return workflows.filter(w =>
      w.name.toLowerCase().includes(q) ||
      w.description.toLowerCase().includes(q)
    );
  }, [workflows, search]);

  const filteredSuggestedWorkflows = useMemo(() => {
    if (!search) return suggestedWorkflows;
    const q = search.toLowerCase();
    return suggestedWorkflows.filter(w =>
      w.name.toLowerCase().includes(q) ||
      w.description.toLowerCase().includes(q)
    );
  }, [suggestedWorkflows, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl mx-4 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Search bar */}
        <div className="px-5 pt-5 pb-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search actions..."
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pb-3">
          {[
            { key: 'actions' as Tab, label: 'Quick Actions', count: quickActions.length },
            { key: 'templates' as Tab, label: 'Templates', count: workflows.length },
            { key: 'task' as Tab, label: 'Manual Task' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                tab === t.key
                  ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                  : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {t.label}
              {t.count !== undefined && (
                <span className="ml-1 text-xs opacity-60">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {tab === 'actions' && (
            <div className="space-y-6">
              {/* Available quick actions */}
              {filteredQuickActions.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
                    Available
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {filteredQuickActions.map(action => (
                      <ActionCard
                        key={action.id}
                        action={action}
                        onClick={() => { onActionSelect(action); onClose(); }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested (needs connection) */}
              {filteredSuggested.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
                    Connect to unlock
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {filteredSuggested.map(action => (
                      <Link
                        key={action.id}
                        href="/settings/connections"
                        className="flex items-start gap-3 p-3 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700 opacity-60 hover:opacity-80 transition group"
                      >
                        <span className="text-lg leading-none mt-0.5">{action.icon}</span>
                        <div>
                          <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            {action.name}
                          </div>
                          <div className="text-xs text-blue-500 mt-0.5 group-hover:underline">
                            Connect {action.service}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {filteredQuickActions.length === 0 && filteredSuggested.length === 0 && (
                <EmptyState search={search} />
              )}
            </div>
          )}

          {tab === 'templates' && (
            <div className="space-y-6">
              {filteredWorkflows.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
                    Available workflows
                  </h3>
                  <div className="space-y-2">
                    {filteredWorkflows.map(wf => (
                      <WorkflowCard
                        key={wf.id}
                        workflow={wf}
                        onClick={() => { onActionSelect(wf); onClose(); }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {filteredSuggestedWorkflows.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
                    Connect to unlock
                  </h3>
                  <div className="space-y-2">
                    {filteredSuggestedWorkflows.map(wf => (
                      <Link
                        key={wf.id}
                        href="/settings/connections"
                        className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700 opacity-60 hover:opacity-80 transition"
                      >
                        <span className="text-lg">{wf.icon}</span>
                        <div>
                          <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{wf.name}</div>
                          <div className="text-xs text-blue-500">Connect {wf.service}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {filteredWorkflows.length === 0 && filteredSuggestedWorkflows.length === 0 && (
                <EmptyState search={search} />
              )}
            </div>
          )}

          {tab === 'task' && (
            <div className="text-center py-8">
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                Create a regular task with optional AI assistance.
              </p>
              <button
                onClick={() => { onManualTask(); onClose(); }}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
              >
                Create Task
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────

function ActionCard({ action, onClick }: { action: ActionDefinition; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 transition text-left w-full active:scale-[0.98]"
    >
      <span className="text-lg leading-none mt-0.5">{action.icon}</span>
      <div>
        <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          {action.name}
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          {action.description}
        </div>
        {action.aiDraft && (
          <div className="inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400">
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            AI writes it
          </div>
        )}
      </div>
    </button>
  );
}

function WorkflowCard({ workflow, onClick }: { workflow: WorkflowDefinition; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 transition text-left w-full active:scale-[0.99]"
    >
      <span className="text-2xl">{workflow.icon}</span>
      <div className="flex-1">
        <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          {workflow.name}
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          {workflow.description}
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-neutral-400">
          <span>{workflow.workflowConfig.defaultStepCount} steps</span>
          <span>{workflow.workflowConfig.delayBetweenSteps} between each</span>
        </div>
      </div>
      <svg className="w-4 h-4 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

function EmptyState({ search }: { search: string }) {
  return (
    <div className="text-center py-8">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        {search
          ? `No actions match "${search}"`
          : 'No actions available. Connect a service to get started.'}
      </p>
      {!search && (
        <Link
          href="/settings/connections"
          className="inline-block mt-3 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
        >
          Connect a service
        </Link>
      )}
    </div>
  );
}
