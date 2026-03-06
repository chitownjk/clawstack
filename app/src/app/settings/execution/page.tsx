'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { isCloudMode } from '@/lib/product-mode';
import SettingsNav from '@/components/SettingsNav';

type ExecutionMode = 'openclaw' | 'cloud-user-keys' | 'cloud-our-keys';

export default function ExecutionSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<ExecutionMode>('openclaw');
  const [planTier, setPlanTier] = useState<string>('solo');
  const [gatewayUrl, setGatewayUrl] = useState('');
  const [gatewayToken, setGatewayToken] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [kimiKey, setKimiKey] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const supabase = createClient();
  const isCloud = isCloudMode();

  // Get task limit based on plan tier
  const getTaskLimit = () => {
    switch (planTier) {
      case 'solo': return 100;
      case 'developer': return 400;
      case 'team': return 1000;
      default: return 100;
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: account } = await supabase
        .from('accounts')
        .select('execution_mode, gateway_url, gateway_connected, plan_tier')
        .eq('auth_uid', user.id)
        .single();

      if (account) {
        setMode((account.execution_mode as ExecutionMode) || 'openclaw');
        setGatewayUrl(account.gateway_url || '');
        setPlanTier(account.plan_tier || 'solo');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function testGatewayConnection() {
    if (!gatewayUrl || !gatewayToken) return;

    setTestingConnection(true);
    setConnectionStatus('idle');

    try {
      const response = await fetch(`${gatewayUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${gatewayToken}`
        }
      });

      if (response.ok) {
        setConnectionStatus('success');
      } else {
        setConnectionStatus('error');
      }
    } catch (error) {
      setConnectionStatus('error');
    } finally {
      setTestingConnection(false);
    }
  }

  async function saveSettings() {
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates: any = {
        execution_mode: mode,
        updated_at: new Date().toISOString()
      };

      if (mode === 'openclaw') {
        updates.gateway_url = gatewayUrl;
        // Encrypt gateway token before storing
        if (gatewayToken) {
          const encryptRes = await fetch('/api/encrypt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: gatewayToken })
          });
          const { encrypted } = await encryptRes.json();
          updates.gateway_token = encrypted;
        }
        updates.gateway_connected = connectionStatus === 'success';
      } else if (mode === 'cloud-user-keys') {
        // Encrypt API keys before storing
        const keysToEncrypt: Record<string, string> = {};
        if (anthropicKey) keysToEncrypt.anthropic = anthropicKey;
        if (openaiKey) keysToEncrypt.openai = openaiKey;
        if (googleKey) keysToEncrypt.google = googleKey;
        if (kimiKey) keysToEncrypt.kimi = kimiKey;
        
        const encryptRes = await fetch('/api/encrypt-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keys: keysToEncrypt })
        });
        const { encrypted } = await encryptRes.json();
        updates.api_keys = encrypted;
      }

      const { error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('auth_uid', user.id);

      if (error) throw error;

      alert('Settings saved!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          Settings
        </h1>
        
        <SettingsNav />

        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Execution Settings</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mt-2">
              Choose how your agents execute tasks
            </p>
          </div>

      {/* Execution Mode Selection */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Execution Mode</h2>

        <div className="space-y-3">
          {/* OpenClaw (Self-Hosted) */}
          <label className="flex items-start p-4 border-2 border-neutral-200 dark:border-neutral-800 rounded-xl cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
            <input
              type="radio"
              name="execution_mode"
              value="openclaw"
              checked={mode === 'openclaw'}
              onChange={(e) => setMode(e.target.value as ExecutionMode)}
              className="mt-1"
            />
            <div className="ml-3">
              <div className="font-medium text-neutral-900 dark:text-neutral-100">OpenClaw Gateway (Free)</div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Connect your own OpenClaw instance. You manage everything.
              </div>
            </div>
          </label>

          {/* Cloud with User Keys */}
          {isCloud && (
            <label className="flex items-start p-4 border-2 border-neutral-200 dark:border-neutral-800 rounded-xl cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
              <input
                type="radio"
                name="execution_mode"
                value="cloud-user-keys"
                checked={mode === 'cloud-user-keys'}
                onChange={(e) => setMode(e.target.value as ExecutionMode)}
                className="mt-1"
              />
              <div className="ml-3">
                <div className="font-medium text-neutral-900 dark:text-neutral-100">Cloud Execution - Your Keys ($7/mo)</div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  We run the agents, you provide API keys. No limits.
                </div>
              </div>
            </label>
          )}

          {/* Cloud with Our Keys */}
          {isCloud && (
            <label className="flex items-start p-4 border-2 border-neutral-200 dark:border-neutral-800 rounded-xl cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
              <input
                type="radio"
                name="execution_mode"
                value="cloud-our-keys"
                checked={mode === 'cloud-our-keys'}
                onChange={(e) => setMode(e.target.value as ExecutionMode)}
                className="mt-1"
              />
              <div className="ml-3">
                <div className="font-medium text-neutral-900 dark:text-neutral-100">Cloud Execution - Fully Managed ($19/mo)</div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  Everything included. {getTaskLimit()} tasks/month, no setup required.
                </div>
              </div>
            </label>
          )}
        </div>
      </div>

      {/* OpenClaw Configuration */}
      {mode === 'openclaw' && (
        <div className="space-y-4 p-6 bg-neutral-50 dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800 rounded-xl">
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">OpenClaw Gateway Configuration</h3>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Gateway URL</label>
            <input
              type="url"
              value={gatewayUrl}
              onChange={(e) => setGatewayUrl(e.target.value)}
              placeholder="http://localhost:18789"
              className="w-full px-3 py-2 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">API Token</label>
            <input
              type="password"
              value={gatewayToken}
              onChange={(e) => setGatewayToken(e.target.value)}
              placeholder="Your OpenClaw API token"
              className="w-full px-3 py-2 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600"
            />
          </div>

          <button
            onClick={testGatewayConnection}
            disabled={testingConnection || !gatewayUrl || !gatewayToken}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium text-sm"
          >
            {testingConnection ? 'Testing...' : 'Test Connection'}
          </button>

          {connectionStatus === 'success' && (
            <div className="text-green-600 dark:text-green-400 text-sm font-medium">✓ Connection successful!</div>
          )}
          {connectionStatus === 'error' && (
            <div className="text-red-600 dark:text-red-400 text-sm font-medium">✗ Connection failed. Check URL and token.</div>
          )}
        </div>
      )}

      {/* Cloud User Keys Configuration */}
      {mode === 'cloud-user-keys' && (
        <div className="space-y-4 p-6 bg-neutral-50 dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800 rounded-xl">
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Your API Keys</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Your keys are encrypted and never shared. You pay the model providers directly.
          </p>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Anthropic API Key (Claude)
            </label>
            <input
              type="password"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-3 py-2 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono text-sm focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
              For Claude Sonnet, Opus, and Haiku models
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              OpenAI API Key (Optional)
            </label>
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono text-sm focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
              For GPT-4, GPT-4 Turbo models
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Google API Key (Optional)
            </label>
            <input
              type="password"
              value={googleKey}
              onChange={(e) => setGoogleKey(e.target.value)}
              placeholder="AIza..."
              className="w-full px-3 py-2 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono text-sm focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
              For Gemini 2.0 Flash, Gemini Pro models
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Kimi API Key (Optional)
            </label>
            <input
              type="password"
              value={kimiKey}
              onChange={(e) => setKimiKey(e.target.value)}
              placeholder="..."
              className="w-full px-3 py-2 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono text-sm focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
              For Kimi K2.5 (Moonshot AI)
            </p>
          </div>

          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700 mt-6">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              🔒 All API keys are encrypted with AES-256-GCM before storage. We never see your keys in plain text.
            </p>
          </div>
        </div>
      )}

      {/* Cloud Our Keys Info */}
      {mode === 'cloud-our-keys' && (
        <div className="p-6 bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-900 rounded-xl">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">Fully Managed Execution</h3>
          <p className="text-sm text-blue-800 dark:text-blue-200 mt-2">
            No setup required! We handle everything. Your plan includes {getTaskLimit()} tasks per month.
          </p>
          <a href="/pricing" className="text-blue-600 dark:text-blue-400 text-sm hover:underline font-medium">
            View pricing details →
          </a>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-6 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50 transition-colors font-medium"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
        </div>
      </div>
    </main>
  );
}
