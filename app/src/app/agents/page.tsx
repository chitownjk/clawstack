'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  required_tier: string;
  required_models: string[];
  tags: string[];
  enabled: boolean;
  can_enable: boolean;
  requires_upgrade: boolean;
  required_tier_name: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'enabled'>('all');
  const [togglingAgent, setTogglingAgent] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadAgents();
  }, []);

  async function loadAgents() {
    try {
      const response = await fetch('/api/agents');
      const data = await response.json();

      if (response.ok) {
        setAgents(data.agents || []);
      } else {
        console.error('Failed to load agents:', data.error);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleAgent(agentId: string, currentlyEnabled: boolean) {
    setTogglingAgent(agentId);

    try {
      const method = currentlyEnabled ? 'DELETE' : 'POST';
      const response = await fetch(`/api/agents/${agentId}/enable`, {
        method,
      });

      const data = await response.json();

      if (response.ok) {
        // Update local state
        setAgents(agents.map(agent =>
          agent.id === agentId
            ? { ...agent, enabled: data.enabled }
            : agent
        ));
      } else {
        if (data.required_tier) {
          alert(`This agent requires ${data.required_tier} tier or higher. Please upgrade your plan.`);
        } else {
          alert(data.error || 'Failed to toggle agent');
        }
      }
    } catch (error) {
      console.error('Error toggling agent:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setTogglingAgent(null);
    }
  }

  const filteredAgents = filter === 'enabled'
    ? agents.filter(a => a.enabled)
    : agents;

  const enabledCount = agents.filter(a => a.enabled).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neutral-500 dark:text-neutral-400">
          Loading agents...
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Your Agents
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Enable the agents you want to use. They'll be available when creating tasks.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-4 mb-6 border-b border-neutral-200 dark:border-neutral-800">
          <button
            onClick={() => setFilter('all')}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              filter === 'all'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-medium'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            All Agents
          </button>
          <button
            onClick={() => setFilter('enabled')}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              filter === 'enabled'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-medium'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            Enabled ({enabledCount})
          </button>
        </div>

        {/* Agents Grid */}
        <div className="grid gap-4">
          {filteredAgents.map((agent) => (
            <div
              key={agent.id}
              className="p-6 bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800 rounded-xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="text-4xl">{agent.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                        {agent.name}
                      </h3>
                      {agent.enabled && (
                        <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                          Enabled
                        </span>
                      )}
                      {agent.requires_upgrade && (
                        <span className="text-xs bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded-full font-medium">
                          Requires {agent.required_tier_name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                      {agent.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {agent.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-2 py-1 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-500">
                      Models: {agent.required_models.join(', ')}
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {agent.can_enable ? (
                    <button
                      onClick={() => toggleAgent(agent.id, agent.enabled)}
                      disabled={togglingAgent === agent.id}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm disabled:opacity-50 ${
                        agent.enabled
                          ? 'border-2 border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {togglingAgent === agent.id
                        ? 'Updating...'
                        : agent.enabled
                        ? 'Enabled'
                        : 'Enable Agent'}
                    </button>
                  ) : (
                    <Link
                      href="/#pricing"
                      className="px-4 py-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors font-medium text-sm inline-block"
                    >
                      Upgrade to Enable
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredAgents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-neutral-500 dark:text-neutral-400">
              {filter === 'enabled'
                ? 'No agents enabled yet. Enable an agent above to get started!'
                : 'No agents available.'}
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-900 rounded-xl">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            💡 How agents work
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
            Agents are specialized capabilities your AI can use when working on tasks. Enable the
            agents you need, then assign tasks to them from Command.
          </p>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Some agents require higher plan tiers or specific model access. Check your{' '}
            <Link href="/settings/usage" className="underline font-medium">
              usage dashboard
            </Link>{' '}
            to see your current plan.
          </p>
        </div>
      </div>
    </main>
  );
}
