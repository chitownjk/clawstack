'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SetupKeysPage() {
  const [provider, setProvider] = useState<'anthropic' | 'openai' | 'google' | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const testAndSave = async () => {
    if (!provider || !apiKey) return;

    setTesting(true);
    setError('');

    try {
      // Encrypt and save the API key
      const encryptRes = await fetch('/api/encrypt-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: { [provider]: apiKey } }),
      });

      if (!encryptRes.ok) {
        throw new Error('Failed to encrypt API key');
      }

      const { encrypted } = await encryptRes.json();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await supabase
        .from('accounts')
        .update({
          execution_mode: 'cloud-user-keys',
          api_keys: encrypted,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      // Success! Go to tutorial
      router.push('/onboarding/tutorial');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-950 dark:to-neutral-900 py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            Connect Your AI Provider
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Based on your answers, we recommend <strong>Cloud (Your API Keys)</strong> — unlimited AI tasks with your own keys.
          </p>
        </div>

        {/* Provider Selection */}
        {!provider ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Which model do you want to use?
            </h2>

            <button
              onClick={() => setProvider('anthropic')}
              className="w-full p-6 border-2 border-neutral-200 dark:border-neutral-800 rounded-xl text-left hover:border-blue-400 transition"
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl">🤖</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">Claude (Anthropic)</h3>
                    <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Recommended</span>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                    Best all-around performance for most tasks
                  </p>
                  <a
                    href="https://console.anthropic.com/settings/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Get API key from Anthropic →
                  </a>
                </div>
              </div>
            </button>

            <button
              onClick={() => setProvider('openai')}
              className="w-full p-6 border-2 border-neutral-200 dark:border-neutral-800 rounded-xl text-left hover:border-blue-400 transition"
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl">🔷</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">GPT-4 (OpenAI)</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                    Great for coding and technical tasks
                  </p>
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Get API key from OpenAI →
                  </a>
                </div>
              </div>
            </button>

            <button
              onClick={() => setProvider('google')}
              className="w-full p-6 border-2 border-neutral-200 dark:border-neutral-800 rounded-xl text-left hover:border-blue-400 transition"
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl">🔮</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">Gemini (Google)</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                    Fast and affordable for high-volume tasks
                  </p>
                  <a
                    href="https://makersuite.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Get API key from Google →
                  </a>
                </div>
              </div>
            </button>

            <div className="mt-8 p-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                <strong>Don't have an API key?</strong> You can{' '}
                <Link href="/onboarding/tutorial" className="text-blue-600 hover:underline">
                  skip this step
                </Link>{' '}
                and add it later in Settings.
              </p>
            </div>
          </div>
        ) : (
          // API Key Input
          <div className="space-y-6">
            <button
              onClick={() => {
                setProvider(null);
                setApiKey('');
                setError('');
              }}
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:underline"
            >
              ← Change provider
            </button>

            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                {provider === 'anthropic' && 'Anthropic API Key'}
                {provider === 'openai' && 'OpenAI API Key'}
                {provider === 'google' && 'Google API Key'}
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  provider === 'anthropic' ? 'sk-ant-...' :
                  provider === 'openai' ? 'sk-...' :
                  'AIza...'
                }
                className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono text-sm"
              />
              <p className="text-xs text-neutral-500 mt-2">
                🔒 Your key is encrypted and stored securely. We never see it in plain text.
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg text-red-900 dark:text-red-100 text-sm">
                {error}
              </div>
            )}

            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                What you'll pay
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                With your own API key, you pay the model provider directly (typically ~$0.06 per task).
                Tiker is free unlimited.
              </p>
            </div>

            <button
              onClick={testAndSave}
              disabled={!apiKey || testing}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? 'Saving...' : 'Save & Continue →'}
            </button>

            <div className="text-center">
              <Link
                href="/onboarding/tutorial"
                className="text-sm text-neutral-600 dark:text-neutral-400 hover:underline"
              >
                Skip for now
              </Link>
            </div>
          </div>
        )}

        {/* Alternative Options */}
        <div className="mt-12 p-6 border-t border-neutral-200 dark:border-neutral-800">
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            Or choose a different option:
          </h3>
          <div className="space-y-2 text-sm">
            <Link href="/onboarding/setup-openclaw" className="block text-blue-600 hover:underline">
              → Self-Hosted (OpenClaw) - Maximum control
            </Link>
            <Link href="/onboarding/trial" className="block text-blue-600 hover:underline">
              → Cloud (Managed) - Zero setup, 7-day trial
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
