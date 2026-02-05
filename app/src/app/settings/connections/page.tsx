'use client';

import { useState, useEffect } from 'react';
import SettingsNav from '@/components/SettingsNav';
import { createClient } from '@/lib/supabase';

interface Connection {
  id: string;
  name: string;
  description: string;
  icon: string;
  scopes: string[];
  comingSoon: boolean;
  connected?: boolean;
  connectUrl?: string;
}

const CONNECTIONS: Connection[] = [
  {
    id: 'google',
    name: 'Google (Gmail, Calendar & Drive)',
    description: 'Send emails, manage calendar, access Google Drive files',
    icon: '🔐',
    scopes: ['gmail.send', 'gmail.readonly', 'calendar', 'calendar.events', 'drive.file', 'drive.readonly'],
    comingSoon: false,
    connectUrl: '/api/auth/google/initiate',
  },
  {
    id: 'agentmail',
    name: 'AgentMail',
    description: 'Give each agent their own email inbox for async coordination',
    icon: '📧',
    scopes: ['send', 'read', 'inbox.manage'],
    comingSoon: false,
  },
  {
    id: 'microsoft-outlook',
    name: 'Microsoft Outlook',
    description: 'Send emails and manage your Outlook calendar',
    icon: '📨',
    scopes: ['Mail.Send', 'Mail.Read', 'Calendars.ReadWrite'],
    comingSoon: true,
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send messages, read channels, manage workspace',
    icon: '💬',
    scopes: ['chat:write', 'channels:read', 'users:read'],
    comingSoon: true,
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Send messages, manage servers, read channels',
    icon: '🎮',
    scopes: ['bot', 'messages.read', 'messages.write'],
    comingSoon: true,
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Manage repos, issues, PRs, and code reviews',
    icon: '🐙',
    scopes: ['repo', 'user', 'read:org'],
    comingSoon: false,
    connectUrl: '/api/auth/github/initiate',
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'Create issues, update status, manage projects',
    icon: '📐',
    scopes: ['read', 'write', 'issues:create'],
    comingSoon: true,
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Read and write pages, manage databases',
    icon: '📝',
    scopes: ['read_content', 'update_content', 'insert_content'],
    comingSoon: true,
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Upload files, manage folders, share documents',
    icon: '📁',
    scopes: ['drive.file', 'drive.readonly'],
    comingSoon: true,
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    description: 'Upload and manage files in your Dropbox',
    icon: '📦',
    scopes: ['files.content.write', 'files.content.read'],
    comingSoon: true,
  },
];

export default function ConnectionsPage() {
  const [connecting, setConnecting] = useState<string | null>(null);
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  const [githubConnected, setGithubConnected] = useState<boolean | null>(null);
  const [agentmailConnected, setAgentmailConnected] = useState<boolean | null>(null);
  const [showAgentmailModal, setShowAgentmailModal] = useState(false);
  const [agentmailApiKey, setAgentmailApiKey] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkGoogleConnection();
    checkGithubConnection();
    checkAgentmailConnection();
    
    // Check if redirected back from OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_connected') === 'true') {
      window.history.replaceState({}, '', '/settings/connections');
      setTimeout(() => checkGoogleConnection(), 500);
    }
    if (params.get('github_connected') === 'true') {
      window.history.replaceState({}, '', '/settings/connections');
      setTimeout(() => checkGithubConnection(), 500);
    }
  }, []);

  const checkGoogleConnection = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setGoogleConnected(false);
        setLoading(false);
        return;
      }

      const { data: account } = await supabase
        .from('accounts')
        .select('google_tokens')
        .eq('auth_uid', user.id)
        .single();

      setGoogleConnected(!!account?.google_tokens);
    } catch (error) {
      console.error('Error checking connection:', error);
      setGoogleConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const checkAgentmailConnection = async () => {
    try {
      const response = await fetch('/api/auth/agentmail/status');
      const data = await response.json();
      setAgentmailConnected(data.connected);
    } catch (error) {
      console.error('Error checking AgentMail:', error);
      setAgentmailConnected(false);
    }
  };

  const checkGithubConnection = async () => {
    try {
      const response = await fetch('/api/auth/github/status');
      const data = await response.json();
      setGithubConnected(data.connected);
    } catch (error) {
      console.error('Error checking GitHub:', error);
      setGithubConnected(false);
    }
  };

  const handleConnect = async (connection: Connection) => {
    if (connection.comingSoon) {
      alert('Coming soon!');
      return;
    }

    if (connection.id === 'google' && connection.connectUrl) {
      window.location.href = connection.connectUrl;
      return;
    }

    if (connection.id === 'github' && connection.connectUrl) {
      window.location.href = connection.connectUrl;
      return;
    }

    if (connection.id === 'agentmail') {
      setShowAgentmailModal(true);
      return;
    }

    setConnecting(connection.id);
    setTimeout(() => {
      setConnecting(null);
    }, 500);
  };

  const handleAgentmailConnect = async () => {
    if (!agentmailApiKey.trim()) {
      alert('Please enter an API key');
      return;
    }

    setTestingConnection(true);

    try {
      const response = await fetch('/api/auth/agentmail/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: agentmailApiKey }),
      });

      const data = await response.json();

      if (response.ok) {
        setAgentmailConnected(true);
        setShowAgentmailModal(false);
        setAgentmailApiKey('');
        alert(`✅ Connected! Found ${data.inboxes?.length || 0} inbox(es)`);
      } else {
        alert(`❌ ${data.error || 'Connection failed'}`);
      }
    } catch (error) {
      console.error('AgentMail connect error:', error);
      alert('❌ Connection error');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (connectionId === 'google') {
      if (!confirm('Disconnect Google? Agents will lose access to Gmail, Calendar, and Drive.')) {
        return;
      }

      try {
        const response = await fetch('/api/auth/google/disconnect', {
          method: 'POST',
        });

        if (response.ok) {
          setGoogleConnected(false);
          alert('Google disconnected');
        } else {
          alert('Failed to disconnect');
        }
      } catch (error) {
        console.error('Disconnect error:', error);
        alert('Error disconnecting');
      }
    }

    if (connectionId === 'github') {
      if (!confirm('Disconnect GitHub? Agents will lose access to repositories.')) {
        return;
      }

      try {
        const response = await fetch('/api/auth/github/disconnect', {
          method: 'POST',
        });

        if (response.ok) {
          setGithubConnected(false);
          alert('GitHub disconnected');
        } else {
          alert('Failed to disconnect');
        }
      } catch (error) {
        console.error('Disconnect error:', error);
        alert('Error disconnecting');
      }
    }

    if (connectionId === 'agentmail') {
      if (!confirm('Disconnect AgentMail? Agents will lose email access.')) {
        return;
      }

      try {
        const response = await fetch('/api/auth/agentmail/disconnect', {
          method: 'POST',
        });

        if (response.ok) {
          setAgentmailConnected(false);
          alert('AgentMail disconnected');
        } else {
          alert('Failed to disconnect');
        }
      } catch (error) {
        console.error('Disconnect error:', error);
        alert('Error disconnecting');
      }
    }
  };

  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          Settings
        </h1>
        
        <SettingsNav />

        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Connections
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            Connect third-party services to give your AI agents access to tools and data.
          </p>
        </div>

      <div className="space-y-4">
        {CONNECTIONS.map((connection) => {
          const isConnected = connection.id === 'google' ? googleConnected : 
                             connection.id === 'github' ? githubConnected :
                             connection.id === 'agentmail' ? agentmailConnected :
                             connection.connected;
          
          return (
            <div
              key={connection.id}
              className="p-6 border-2 border-neutral-200 dark:border-neutral-800 rounded-xl"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="text-4xl">{connection.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                        {connection.name}
                      </h3>
                      {connection.comingSoon && (
                        <span className="text-xs bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded-full font-medium">
                          Coming Soon
                        </span>
                      )}
                      {isConnected && (
                        <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                          Connected
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                      {connection.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {connection.scopes.map((scope) => (
                        <span
                          key={scope}
                          className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-2 py-1 rounded font-mono"
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="ml-4">
                  {loading && connection.id === 'google' ? (
                    <div className="px-4 py-2 text-neutral-500 text-sm">Checking...</div>
                  ) : isConnected ? (
                    <button
                      onClick={() => handleDisconnect(connection.id)}
                      className="px-4 py-2 border-2 border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors font-medium text-sm"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnect(connection)}
                      disabled={connection.comingSoon || connecting === connection.id}
                      className="px-4 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {connecting === connection.id ? 'Connecting...' : 'Connect'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-900 rounded-xl">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
          🔐 Your data is encrypted
        </h3>
        <p className="text-sm text-blue-800 dark:text-blue-200">
          All OAuth tokens and API keys are encrypted at rest using AES-256-GCM. 
          Only your AI agents can decrypt them when executing tasks. We never store tokens in plaintext.
        </p>
      </div>

      <div className="mt-6 p-6 border-2 border-neutral-200 dark:border-neutral-800 rounded-xl">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          Need a custom integration?
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
          We can build custom OAuth integrations for enterprise customers. Contact us to discuss your needs.
        </p>
        <a
          href="/services#contact"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          Contact Sales →
        </a>
      </div>

      {/* AgentMail Modal */}
      {showAgentmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-md w-full p-6 border-2 border-neutral-200 dark:border-neutral-800">
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Connect AgentMail
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              Get your API key from AgentMail to enable email for your agents.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                1. Get your API key
              </label>
              <a
                href="https://agentmail.to"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-sm font-medium"
              >
                Open AgentMail Portal →
              </a>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                2. Paste your API key
              </label>
              <input
                type="password"
                value={agentmailApiKey}
                onChange={(e) => setAgentmailApiKey(e.target.value)}
                placeholder="am_..."
                className="w-full px-3 py-2 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 font-mono text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !testingConnection) {
                    handleAgentmailConnect();
                  }
                }}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAgentmailModal(false);
                  setAgentmailApiKey('');
                }}
                disabled={testingConnection}
                className="flex-1 px-4 py-2 border-2 border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleAgentmailConnect}
                disabled={testingConnection || !agentmailApiKey.trim()}
                className="flex-1 px-4 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testingConnection ? 'Testing...' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}
