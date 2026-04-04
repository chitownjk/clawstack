/**
 * Tests for tiker-username utility
 */
import { deriveUsernameCandidate, generateUniqueTikerUsername } from '@/lib/tiker-username';

describe('deriveUsernameCandidate', () => {
  it('uses the local part of the email', () => {
    expect(deriveUsernameCandidate('john.doe@gmail.com')).toBe('john-doe');
  });

  it('lowercases the result', () => {
    expect(deriveUsernameCandidate('JohnDoe@example.com')).toBe('johndoe');
  });

  it('replaces non-alphanumeric chars with hyphens', () => {
    expect(deriveUsernameCandidate('john+tag@example.com')).toBe('john-tag');
  });

  it('collapses multiple hyphens', () => {
    expect(deriveUsernameCandidate('j..doe@example.com')).toBe('j--doe'.replace(/-+/g, '-'));
  });

  it('trims leading/trailing hyphens', () => {
    expect(deriveUsernameCandidate('.leading@example.com')).not.toMatch(/^-/);
  });

  it('truncates to 30 characters', () => {
    const long = 'a'.repeat(40) + '@example.com';
    expect(deriveUsernameCandidate(long).length).toBeLessThanOrEqual(30);
  });

  it('falls back to "user" for an empty local part', () => {
    expect(deriveUsernameCandidate('@example.com')).toBe('user');
  });
});

describe('generateUniqueTikerUsername', () => {
  function makeAdminClient(takenUsernames: string[]) {
    return {
      from: () => ({
        select: () => ({
          eq: (col: string, val: string) => ({
            maybeSingle: () =>
              Promise.resolve({
                data: takenUsernames.includes(val) ? { id: 'taken' } : null,
              }),
          }),
        }),
      }),
    } as any;
  }

  it('returns the base candidate when it is available', async () => {
    const client = makeAdminClient([]);
    const username = await generateUniqueTikerUsername(client, 'alice@example.com');
    expect(username).toBe('alice');
  });

  it('appends a numeric suffix when the base is taken', async () => {
    const client = makeAdminClient(['alice']);
    const username = await generateUniqueTikerUsername(client, 'alice@example.com');
    expect(username).toBe('alice-2');
  });

  it('keeps incrementing until a free slot is found', async () => {
    const client = makeAdminClient(['alice', 'alice-2', 'alice-3']);
    const username = await generateUniqueTikerUsername(client, 'alice@example.com');
    expect(username).toBe('alice-4');
  });
});
