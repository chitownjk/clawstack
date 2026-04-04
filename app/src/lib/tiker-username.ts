/**
 * Tiker username utilities
 *
 * Derives and deduplicates the slug used for a user's personal
 * @tiker.com email address.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

const MAX_ATTEMPTS = 10

/**
 * Derive a clean slug candidate from an email address or display name.
 *
 * Rules:
 * - Lowercase
 * - Only alphanumeric and hyphens
 * - No leading/trailing hyphens
 * - Max 30 characters
 */
export function deriveUsernameCandidate(email: string, displayName?: string | null): string {
  // Prefer the local part of the email (before @)
  const base = email.split('@')[0]
  const cleaned = base
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30)

  return cleaned || 'user'
}

/**
 * Find a unique tiker_username for a new account.
 *
 * Tries the candidate as-is, then candidate-2, candidate-3, …
 * Returns the first available slug.
 */
export async function generateUniqueTikerUsername(
  adminClient: SupabaseClient,
  email: string,
  displayName?: string | null
): Promise<string> {
  const base = deriveUsernameCandidate(email, displayName)

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`

    const { data } = await adminClient
      .from('accounts')
      .select('id')
      .eq('tiker_username', candidate)
      .maybeSingle()

    if (!data) {
      return candidate
    }
  }

  // Fallback: base + random 4-char suffix
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${base}-${suffix}`.slice(0, 35)
}
