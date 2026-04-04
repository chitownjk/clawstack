// Centralized Composio action slug registry.
//
// Each key maps to an ordered array of action slugs to try, most likely first.
// Composio renames slugs across SDK versions; the fallback array absorbs those
// renames so callers never need to update their own slug lists.
//
// Confirmed-working slugs are listed first. Speculative fallbacks follow.
// Update this file when you discover a new working or broken slug.

import type { Composio } from '@composio/core';

// ─── Gmail ────────────────────────────────────────────────────────────────────

export const GMAIL_SLUGS = {
  /** List message IDs in inbox */
  listMessages: [
    'GMAIL_LIST_MESSAGES',
    'GMAIL_FETCH_EMAILS',
    'GMAIL_GET_MESSAGES',
  ],
  /** Fetch full message content by ID */
  getMessage: [
    'GMAIL_GET_MESSAGE',
    'GMAIL_FETCH_MESSAGE',
    'GMAIL_READ_MESSAGE',
  ],
  /** Create a draft email */
  createDraft: [
    'GMAIL_CREATE_EMAIL_DRAFT',
    'GMAIL_CREATE_DRAFT',
    'GMAIL_DRAFT_EMAIL',
  ],
  /** Send an email immediately */
  sendEmail: [
    'GMAIL_SEND_EMAIL',
    'GMAIL_SEND_MESSAGE',
  ],
} as const;

// ─── Google Calendar ──────────────────────────────────────────────────────────

export const GCAL_SLUGS = {
  /** List calendar events in a date range */
  listEvents: [
    'GOOGLECALENDAR_EVENTS_LIST',
    'GOOGLECALENDAR_LIST_EVENTS',
    'GOOGLECALENDAR_FIND_EVENTS',
    'GOOGLECALENDAR_GET_EVENTS',
  ],
  /** Create a new calendar event */
  createEvent: [
    'GOOGLECALENDAR_EVENTS_CREATE',
    'GOOGLECALENDAR_CREATE_EVENT',
    'GOOGLECALENDAR_INSERT_EVENT',
    'GOOGLECALENDAR_QUICK_ADD',
    'GOOGLECALENDAR_CREATE_A_NEW_EVENT',
  ],
  /** Update an existing calendar event */
  updateEvent: [
    'GOOGLECALENDAR_EVENTS_UPDATE',
    'GOOGLECALENDAR_UPDATE_EVENT',
    'GOOGLECALENDAR_PATCH_EVENT',
  ],
  /** Query free/busy times */
  freeBusy: [
    'GOOGLECALENDAR_FREEBUSY_QUERY',
    'GOOGLECALENDAR_GET_FREEBUSY',
    'GOOGLECALENDAR_FREE_BUSY',
  ],
} as const;

// ─── Type helpers ─────────────────────────────────────────────────────────────

export type SlugArray = readonly string[];

// ─── Slug-not-found error detection ──────────────────────────────────────────

// Composio returns slightly different error messages depending on SDK version.
// This function returns true when an error means the slug doesn't exist and we
// should try the next one in the array. Auth/network errors should NOT be
// silently swallowed.
export function isSlugNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('Unable to retrieve tool') ||
    msg.includes('tool not found') ||
    msg.includes('action not found') ||
    msg.includes('Tool not found') ||
    msg.includes('Action not found') ||
    msg.includes('no tool') ||
    msg.includes('unknown action') ||
    msg.includes('Unknown action')
  );
}

// ─── Core execution utility ───────────────────────────────────────────────────

export interface SlugExecuteResult<T = unknown> {
  result: T;
  slugUsed: string;
}

/**
 * Execute a Composio action, trying each slug in order until one succeeds.
 *
 * - If a slug is not found, the next one in the array is tried silently.
 * - Auth/connection errors are rethrown immediately (don't try other slugs).
 * - If all slugs fail, throws an error listing every failed attempt.
 *
 * @param composio  Composio client instance
 * @param userId    Composio user identifier (e.g. `tiker_<uuid>`)
 * @param slugs     Ordered slug array from this registry
 * @param args      Action arguments
 */
export async function executeWithSlugFallback<T = unknown>(
  composio: Composio,
  userId: string,
  slugs: SlugArray,
  args: Record<string, unknown>
): Promise<SlugExecuteResult<T>> {
  const failures: string[] = [];

  for (const slug of slugs) {
    try {
      const result = await (composio.tools as any).execute(slug, {
        userId,
        dangerouslySkipVersionCheck: true,
        arguments: args,
      });
      return { result: result as T, slugUsed: slug };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);

      if (isSlugNotFoundError(err)) {
        failures.push(`${slug}: not found`);
        continue;
      }

      // Auth or connection error — don't try other slugs
      if (
        msg.includes('not connected') ||
        msg.includes('unauthorized') ||
        msg.includes('Unauthorized') ||
        msg.includes('401') ||
        msg.includes('token expired') ||
        msg.includes('invalid_grant')
      ) {
        throw new Error(`Composio auth error (slug: ${slug}): ${msg}`);
      }

      // Unknown error — record and try next slug
      failures.push(`${slug}: ${msg}`);
    }
  }

  throw new Error(
    `All Composio slugs failed. Tried: ${slugs.join(', ')}. Details: ${failures.join(' | ')}`
  );
}
