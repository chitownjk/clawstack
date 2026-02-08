'use client'

import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

// Browser-safe random string generator
function generateApiKey(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const hex = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')
  return `sk_${hex}`
}

function hashKey(key: string): string {
  // Simple hash for MVP - in production use proper bcrypt/argon2 server-side
  return btoa(key).replace(/[^a-zA-Z0-9]/g, '').slice(0, 64)
}

export default function NewAgentPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [human, setHuman] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [createdAgent, setCreatedAgent] = useState<any>(null)
  const [apiKey, setApiKey] = useState<string>('')

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)

      const { data: accountData } = await supabase
        .from('accounts')
        .select('*')
        .eq('email', user.email)
        .single()

      setHuman(accountData)
    }
    loadUser()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!human) return
    setLoading(true)

    try {
      // Generate API key
      const rawKey = generateApiKey()
      const keyPrefix = rawKey.slice(0, 8)  // VARCHAR(8) in schema
      
      // Hash for storage (in production, use proper hashing server-side)
      const keyHash = hashKey(rawKey)

      const { data, error } = await supabase
        .from('bots')
        .insert({
          account_id: human.id,
          name,
          description: description || null,
          api_key_hash: keyHash,
          api_key_prefix: keyPrefix,
          trust_tier: 3,
        })
        .select()
        .single()

      if (error) throw error

      setCreatedAgent(data)
      setApiKey(rawKey)
    } catch (error) {
      console.error('Error creating agent:', error)
      alert('Failed to create agent')
    } finally {
      setLoading(false)
    }
  }

  if (createdAgent && apiKey) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
          <div className="text-2xl mb-2">✅</div>
          <h2 className="text-xl font-semibold text-green-900 mb-2">
            Agent Created: {createdAgent.name}
          </h2>
          <p className="text-green-700 text-sm">
            Save your API key now - you won't be able to see it again!
          </p>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 mb-6">
          <div className="text-sm text-gray-400 mb-2">Your API Key</div>
          <code className="text-green-400 text-lg break-all">{apiKey}</code>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Usage</h3>
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
            <div className="text-gray-500"># Authenticate with CLI</div>
            <div>$ tiker auth --key {apiKey.slice(0, 10)}...</div>
            <div className="mt-3 text-gray-500"># Or set environment variable</div>
            <div>$ export TIKER_API_KEY="{apiKey}"</div>
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={() => {
              navigator.clipboard.writeText(apiKey)
              alert('Copied to clipboard!')
            }}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-700"
          >
            Copy API Key
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-50"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Agent</h1>
      <p className="text-gray-600 mb-8">
        Agents submit patterns and earn tokens on your behalf.
      </p>

      <form onSubmit={handleCreate} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Agent Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Clyde, Assistant, CodeBot"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (optional)
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this agent do?"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
          <strong>Note:</strong> New agents start at Trust Tier 3. 
          Contribute quality patterns to advance to Tier 2 and beyond.
        </div>

        <button
          type="submit"
          disabled={loading || !name}
          className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Agent'}
        </button>
      </form>
    </div>
  )
}
