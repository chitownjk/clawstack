'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { isCloudMode } from '../../../lib/product-mode';

type ExecutionMode = 'openclaw' | 'cloud-user-keys' | 'cloud-our-keys';

export default function ExecutionSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<ExecutionMode>('openclaw');
  const [gatewayUrl, setGatewayUrl] = useState('');
  const [gatewayToken, setGatewayToken] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const supabase = createClient();
  const isCloud = isCloudMode();

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: account } = await supabase
        .from('accounts')
        .select('execution_mode, gateway_url, gateway_connected')
        .eq('id', user.id)
        .single();

      if (account) {
        setMode((account.execution_mode as ExecutionMode) || 'openclaw');
        setGatewayUrl(account.gateway_url || '');
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
        .eq('id', user.id);

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
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Execution Settings</h1>
        <p className="text-gray-600 mt-2">
          Choose how your agents execute tasks
        </p>
      </div>

      {/* Execution Mode Selection */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Execution Mode</h2>

        <div className="space-y-3">
          {/* OpenClaw (Self-Hosted) */}
          <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="execution_mode"
              value="openclaw"
              checked={mode === 'openclaw'}
              onChange={(e) => setMode(e.target.value as ExecutionMode)}
              className="mt-1"
            />
            <div className="ml-3">
              <div className="font-medium">OpenClaw Gateway (Free)</div>
              <div className="text-sm text-gray-600">
                Connect your own OpenClaw instance. You manage everything.
              </div>
            </div>
          </label>

          {/* Cloud with User Keys */}
          {isCloud && (
            <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="execution_mode"
                value="cloud-user-keys"
                checked={mode === 'cloud-user-keys'}
                onChange={(e) => setMode(e.target.value as ExecutionMode)}
                className="mt-1"
              />
              <div className="ml-3">
                <div className="font-medium">Cloud Execution - Your Keys ($7/mo)</div>
                <div className="text-sm text-gray-600">
                  We run the agents, you provide API keys. No limits.
                </div>
              </div>
            </label>
          )}

          {/* Cloud with Our Keys */}
          {isCloud && (
            <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="execution_mode"
                value="cloud-our-keys"
                checked={mode === 'cloud-our-keys'}
                onChange={(e) => setMode(e.target.value as ExecutionMode)}
                className="mt-1"
              />
              <div className="ml-3">
                <div className="font-medium">Cloud Execution - Fully Managed ($19/mo)</div>
                <div className="text-sm text-gray-600">
                  Everything included. 500 tasks/month, no setup required.
                </div>
              </div>
            </label>
          )}
        </div>
      </div>

      {/* OpenClaw Configuration */}
      {mode === 'openclaw' && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold">OpenClaw Gateway Configuration</h3>
          
          <div>
            <label className="block text-sm font-medium mb-1">Gateway URL</label>
            <input
              type="url"
              value={gatewayUrl}
              onChange={(e) => setGatewayUrl(e.target.value)}
              placeholder="http://localhost:18789"
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">API Token</label>
            <input
              type="password"
              value={gatewayToken}
              onChange={(e) => setGatewayToken(e.target.value)}
              placeholder="Your OpenClaw API token"
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <button
            onClick={testGatewayConnection}
            disabled={testingConnection || !gatewayUrl || !gatewayToken}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {testingConnection ? 'Testing...' : 'Test Connection'}
          </button>

          {connectionStatus === 'success' && (
            <div className="text-green-600">✓ Connection successful!</div>
          )}
          {connectionStatus === 'error' && (
            <div className="text-red-600">✗ Connection failed. Check URL and token.</div>
          )}
        </div>
      )}

      {/* Cloud User Keys Configuration */}
      {mode === 'cloud-user-keys' && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold">Your API Keys</h3>
          <p className="text-sm text-gray-600">
            Your keys are encrypted and never shared. You pay the model providers directly.
          </p>

          <div>
            <label className="block text-sm font-medium mb-1">Anthropic API Key</label>
            <input
              type="password"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">OpenAI API Key (Optional)</label>
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>
      )}

      {/* Cloud Our Keys Info */}
      {mode === 'cloud-our-keys' && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold">Fully Managed Execution</h3>
          <p className="text-sm text-gray-600 mt-2">
            No setup required! We handle everything. Your plan includes 500 tasks per month.
          </p>
          <a href="/pricing" className="text-blue-600 text-sm hover:underline">
            View pricing details →
          </a>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
