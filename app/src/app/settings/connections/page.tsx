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
    name: 'Google (Gmail & Calendar)',
    description: 'Send emails, create calendar events, manage your schedule',
    icon: '🔐',
    scopes: ['gmail.send', 'gmail.readonly', 'calendar', 'calendar.events'],
    comingSoon: false,
    connectUrl: '/api/auth/google/initiate',
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
    scopes: ['repo', 'user', 'workflow'],
    comingSoon: true,
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkGoogleConnection();
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

  const handleConnect = async (connection: Connection) => {
    if (connection.comingSoon) {
      alert('Coming soon!');
      return;
    }

    if (connection.id === 'google' && connection.connectUrl) {
      // Redirect to Google OAuth
      window.location.href = connection.connectUrl;
      return;
    }

    setConnecting(connection.id);
    setTimeout(() => {
      setConnecting(null);
    }, 500);
  };

  const handleDisconnect = async (connectionId: string) => {
    if (connectionId === 'google') {
      if (!confirm('Disconnect Google? Agents will lose access to Gmail and Calendar.')) {
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
          const isConnected = connection.id === 'google' ? googleConnected : connection.connected;
          
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
      </div>
    </main>
  );
}
