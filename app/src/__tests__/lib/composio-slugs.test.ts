// Unit tests for composio-slugs.ts — no network calls, no credentials needed.
// Integration smoke tests (require real Composio credentials) are skipped unless
// COMPOSIO_INTEGRATION_TEST=1 is set in the environment.

import {
  GMAIL_SLUGS,
  GCAL_SLUGS,
  isSlugNotFoundError,
  executeWithSlugFallback,
} from '@/lib/composio-slugs';

// ─── Slug registry shape ───────────────────────────────────────────────────

describe('GMAIL_SLUGS', () => {
  it('has at least one slug for each operation', () => {
    expect(GMAIL_SLUGS.listMessages.length).toBeGreaterThan(0);
    expect(GMAIL_SLUGS.getMessage.length).toBeGreaterThan(0);
    expect(GMAIL_SLUGS.createDraft.length).toBeGreaterThan(0);
    expect(GMAIL_SLUGS.sendEmail.length).toBeGreaterThan(0);
  });

  it('primary listMessages slug is GMAIL_LIST_MESSAGES', () => {
    expect(GMAIL_SLUGS.listMessages[0]).toBe('GMAIL_LIST_MESSAGES');
  });

  it('primary getMessage slug is GMAIL_GET_MESSAGE', () => {
    expect(GMAIL_SLUGS.getMessage[0]).toBe('GMAIL_GET_MESSAGE');
  });
});

describe('GCAL_SLUGS', () => {
  it('has at least one slug for each operation', () => {
    expect(GCAL_SLUGS.listEvents.length).toBeGreaterThan(0);
    expect(GCAL_SLUGS.createEvent.length).toBeGreaterThan(0);
    expect(GCAL_SLUGS.updateEvent.length).toBeGreaterThan(0);
    expect(GCAL_SLUGS.freeBusy.length).toBeGreaterThan(0);
  });

  it('primary listEvents slug is GOOGLECALENDAR_EVENTS_LIST', () => {
    expect(GCAL_SLUGS.listEvents[0]).toBe('GOOGLECALENDAR_EVENTS_LIST');
  });

  it('primary createEvent slug is GOOGLECALENDAR_EVENTS_CREATE', () => {
    expect(GCAL_SLUGS.createEvent[0]).toBe('GOOGLECALENDAR_EVENTS_CREATE');
  });
});

// ─── isSlugNotFoundError ───────────────────────────────────────────────────

describe('isSlugNotFoundError', () => {
  it('returns true for Composio "Unable to retrieve tool" message', () => {
    expect(isSlugNotFoundError(new Error('Unable to retrieve tool GMAIL_LIST_MESSAGES'))).toBe(true);
  });

  it('returns true for "tool not found" variants', () => {
    expect(isSlugNotFoundError(new Error('tool not found'))).toBe(true);
    expect(isSlugNotFoundError(new Error('Tool not found'))).toBe(true);
  });

  it('returns true for "action not found" variants', () => {
    expect(isSlugNotFoundError(new Error('action not found'))).toBe(true);
    expect(isSlugNotFoundError(new Error('Action not found'))).toBe(true);
  });

  it('returns false for auth errors', () => {
    expect(isSlugNotFoundError(new Error('not connected'))).toBe(false);
    expect(isSlugNotFoundError(new Error('unauthorized'))).toBe(false);
    expect(isSlugNotFoundError(new Error('401'))).toBe(false);
  });

  it('returns false for generic errors', () => {
    expect(isSlugNotFoundError(new Error('network timeout'))).toBe(false);
    expect(isSlugNotFoundError(new Error('internal server error'))).toBe(false);
  });
});

// ─── executeWithSlugFallback ───────────────────────────────────────────────

describe('executeWithSlugFallback', () => {
  const makeComposio = (executeFn: (slug: string) => Promise<unknown>) => ({
    tools: { execute: (_slug: string, opts: { arguments: Record<string, unknown> }) => executeFn(_slug) },
  });

  it('returns result from the first successful slug', async () => {
    const composio = makeComposio(async () => ({ items: [1, 2, 3] }));
    const { result, slugUsed } = await executeWithSlugFallback(
      composio as any,
      'user_1',
      ['SLUG_A', 'SLUG_B'],
      {}
    );
    expect(result).toEqual({ items: [1, 2, 3] });
    expect(slugUsed).toBe('SLUG_A');
  });

  it('skips "not found" slugs and tries next', async () => {
    let calls = 0;
    const composio = makeComposio(async (slug) => {
      calls++;
      if (slug === 'SLUG_A') throw new Error('Unable to retrieve tool SLUG_A');
      return { ok: true };
    });
    const { result, slugUsed } = await executeWithSlugFallback(
      composio as any,
      'user_1',
      ['SLUG_A', 'SLUG_B'],
      {}
    );
    expect(calls).toBe(2);
    expect(slugUsed).toBe('SLUG_B');
    expect(result).toEqual({ ok: true });
  });

  it('throws immediately on auth errors without trying next slug', async () => {
    let calls = 0;
    const composio = makeComposio(async () => {
      calls++;
      throw new Error('not connected to service');
    });
    await expect(
      executeWithSlugFallback(composio as any, 'user_1', ['SLUG_A', 'SLUG_B'], {})
    ).rejects.toThrow('Composio auth error');
    expect(calls).toBe(1);
  });

  it('throws after all slugs fail', async () => {
    const composio = makeComposio(async () => {
      throw new Error('Unable to retrieve tool');
    });
    await expect(
      executeWithSlugFallback(composio as any, 'user_1', ['SLUG_A', 'SLUG_B'], {})
    ).rejects.toThrow('All Composio slugs failed');
  });

  it('throws when slug array is empty', async () => {
    const composio = makeComposio(async () => ({ ok: true }));
    await expect(
      executeWithSlugFallback(composio as any, 'user_1', [], {})
    ).rejects.toThrow('All Composio slugs failed');
  });
});

// ─── Integration smoke tests (skipped unless COMPOSIO_INTEGRATION_TEST=1) ──

const RUN_INTEGRATION = process.env.COMPOSIO_INTEGRATION_TEST === '1';
const describeIntegration = RUN_INTEGRATION ? describe : describe.skip;

describeIntegration('Composio integration smoke tests', () => {
  // These tests require:
  //   COMPOSIO_API_KEY=<key>  COMPOSIO_TEST_USER_ID=<tiker_uuid>
  // Run with: COMPOSIO_INTEGRATION_TEST=1 npx jest --testPathPattern composio-slugs

  let composio: any;
  let userId: string;

  beforeAll(async () => {
    const { getComposio } = await import('@/lib/composio');
    composio = getComposio();
    userId = process.env.COMPOSIO_TEST_USER_ID || 'tiker_smoke_test';
  });

  it('Gmail listMessages slug resolves', async () => {
    // Just verify that executeWithSlugFallback can call Composio without throwing
    // a "slug not found" error. A "not connected" error is acceptable here.
    try {
      await executeWithSlugFallback(
        composio,
        userId,
        GMAIL_SLUGS.listMessages,
        { maxResults: 1, q: 'in:inbox' }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // "not connected" means slug resolved; user just isn't connected
      expect(msg).toMatch(/auth|not connected|Composio auth/i);
    }
  });

  it('Google Calendar listEvents slug resolves', async () => {
    const now = new Date().toISOString();
    try {
      await executeWithSlugFallback(
        composio,
        userId,
        GCAL_SLUGS.listEvents,
        { timeMin: now, timeMax: now, singleEvents: true, maxResults: 1 }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      expect(msg).toMatch(/auth|not connected|Composio auth/i);
    }
  });
});
