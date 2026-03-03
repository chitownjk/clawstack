import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase-server'

/**
 * Validate an API key and return the associated account
 * Use this in API routes that need authentication
 */
export async function validateApiKey(apiKey: string) {
  if (!apiKey || !apiKey.startsWith('mc_')) {
    return { valid: false, error: 'Invalid API key format' }
  }

  // Hash the provided key
  const keyHash = createHash('sha256').update(apiKey).digest('hex')

  // Look up the account by hash
  const adminClient = createAdminClient()
  const { data: account, error } = await adminClient
    .from('accounts')
    .select('id, email, tier, max_bots, max_tasks, can_invite_guests')
    .eq('api_key_hash', keyHash)
    .single()

  if (error || !account) {
    return { valid: false, error: 'Invalid API key' }
  }

  return { valid: true, account }
}

/**
 * Extract API key from request headers
 * Supports both Bearer token and X-API-Key header
 */
export function extractApiKey(request: Request): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Check X-API-Key header
  const apiKeyHeader = request.headers.get('x-api-key')
  if (apiKeyHeader) {
    return apiKeyHeader
  }

  return null
}

/**
 * Middleware helper for API routes
 * Returns account if valid, or throws an error response
 */
export async function requireApiKey(request: Request) {
  const apiKey = extractApiKey(request)

  if (!apiKey) {
    return {
      valid: false,
      error: 'API key required. Use Authorization: Bearer <key> or X-API-Key header.',
    }
  }

  return validateApiKey(apiKey)
}
