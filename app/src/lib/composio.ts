import { Composio } from '@composio/core';

// Singleton Composio client (server-side only)
let composioClient: Composio | null = null;

export function getComposio(): Composio {
  if (!composioClient) {
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      throw new Error('COMPOSIO_API_KEY environment variable is required');
    }
    composioClient = new Composio({ apiKey });
  }
  return composioClient;
}

// Toolkit IDs used across Composio integrations
// These map to the toolkit slugs in Composio's registry
export const COMPOSIO_TOOLKITS: Record<string, {
  toolkit: string;
  toolkitFallbacks?: string[];
  name: string;
  description: string;
  icon: string;
  scopes: string[];
}> = {
  gmail: {
    toolkit: 'GMAIL',
    name: 'Gmail',
    description: 'Send and read emails, manage drafts and labels',
    icon: '\u2709\uFE0F',
    scopes: ['gmail.send', 'gmail.readonly', 'gmail.compose', 'gmail.modify'],
  },
  'google-calendar': {
    toolkit: 'GOOGLECALENDAR',
    name: 'Google Calendar',
    description: 'Create events, manage calendars, check availability',
    icon: '\uD83D\uDCC5',
    scopes: ['calendar', 'calendar.events'],
  },
  'google-drive': {
    toolkit: 'GOOGLEDRIVE',
    name: 'Google Drive',
    description: 'Upload files, manage folders, share documents',
    icon: '\uD83D\uDCC1',
    scopes: ['drive.file', 'drive.readonly'],
  },
  slack: {
    toolkit: 'SLACK',
    name: 'Slack',
    description: 'Send messages, read channels, manage workspace',
    icon: '\uD83D\uDCAC',
    scopes: ['chat:write', 'channels:read', 'users:read'],
  },
  notion: {
    toolkit: 'NOTION',
    name: 'Notion',
    description: 'Read and write pages, manage databases',
    icon: '\uD83D\uDCDD',
    scopes: ['read_content', 'update_content', 'insert_content'],
  },
  linear: {
    toolkit: 'LINEAR',
    name: 'Linear',
    description: 'Create issues, update status, manage projects',
    icon: '\uD83D\uDCD0',
    scopes: ['read', 'write', 'issues:create'],
  },
  github: {
    toolkit: 'GITHUB',
    name: 'GitHub',
    description: 'Manage repos, issues, PRs, and code reviews',
    icon: '\uD83D\uDC19',
    scopes: ['repo', 'user', 'read:org'],
  },
  twitter: {
    toolkit: 'TWITTER',
    toolkitFallbacks: ['TWITTER_V2', 'X', 'TWITTERV2'],
    name: 'Twitter / X',
    description: 'Post tweets, read timelines, manage followers and lists',
    icon: '\uD835\uDD4F',
    scopes: ['tweet.read', 'tweet.write', 'users.read'],
  },
  linkedin: {
    toolkit: 'LINKEDIN',
    toolkitFallbacks: ['LINKEDIN_V2', 'LINKEDINV2'],
    name: 'LinkedIn',
    description: 'Share posts, manage connections, send messages',
    icon: '\uD83D\uDCBC',
    scopes: ['w_member_social', 'r_liteprofile', 'r_emailaddress'],
  },
  jira: {
    toolkit: 'JIRA',
    name: 'Jira',
    description: 'Create and manage issues, track sprints, update boards',
    icon: '\uD83D\uDDD2\uFE0F',
    scopes: ['read:jira-work', 'write:jira-work', 'read:jira-user'],
  },
};

// Check which Composio integrations are connected for a given user
export async function getComposioConnectionStatuses(
  userId: string
): Promise<Record<string, { connected: boolean; connectionId?: string }>> {
  const composio = getComposio();
  const statuses: Record<string, { connected: boolean; connectionId?: string }> = {};

  for (const [key, config] of Object.entries(COMPOSIO_TOOLKITS)) {
    try {
      // Try primary toolkit slug first, then fallbacks
      const slugsToTry = [config.toolkit, ...((config as any).toolkitFallbacks || [])]
      let found = false

      for (const slug of slugsToTry) {
        try {
          const connections = await composio.connectedAccounts.list({
            userIds: [userId],
            toolkitSlugs: [slug],
            statuses: ['ACTIVE'],
          });

          const activeConnection = connections?.items?.[0];
          if (activeConnection) {
            statuses[key] = {
              connected: true,
              connectionId: activeConnection.id,
            };
            found = true
            break
          }
        } catch {
          // Slug not valid, try next
          continue
        }
      }

      if (!found) {
        statuses[key] = { connected: false };
      }
    } catch (error) {
      console.error(`Error checking ${key} connection:`, error);
      statuses[key] = { connected: false };
    }
  }

  return statuses;
}

// Resolve the auth config ID for a toolkit (find existing or create one)
async function getOrCreateAuthConfig(
  composio: Composio,
  toolkitSlug: string
): Promise<string> {
  // Check for an existing auth config for this toolkit
  const existing = await composio.authConfigs.list({
    toolkit: toolkitSlug,
  });

  if (existing?.items?.length > 0) {
    return existing.items[0].id;
  }

  // None found, create a Composio-managed auth config
  const created = await composio.authConfigs.create(toolkitSlug);
  return created.id;
}

// Initiate a Composio connection for a specific toolkit
// Uses connectedAccounts.initiate() with callbackUrl so the user
// is redirected back to Tiker after completing OAuth
export async function initiateComposioConnection(
  userId: string,
  toolkitKey: string,
  callbackUrl: string,
  providedAuthConfigId?: string
): Promise<{ redirectUrl: string; connectionRequestId: string }> {
  const composio = getComposio();
  const config = COMPOSIO_TOOLKITS[toolkitKey];

  if (!config) {
    throw new Error(`Unknown toolkit: ${toolkitKey}`);
  }

  // Get or create an auth config for this toolkit, trying fallback slugs
  let authConfigId = providedAuthConfigId
  if (!authConfigId) {
    const slugsToTry = [config.toolkit, ...((config as any).toolkitFallbacks || [])]
    for (const slug of slugsToTry) {
      try {
        authConfigId = await getOrCreateAuthConfig(composio, slug)
        if (authConfigId) break
      } catch {
        continue
      }
    }
    if (!authConfigId) {
      throw new Error(`Could not find or create auth config for ${toolkitKey}`)
    }
  }

  // Clean up any existing connections for this toolkit so we can reconnect cleanly
  const slugsToCheck = [config.toolkit, ...((config as any).toolkitFallbacks || [])]
  for (const slug of slugsToCheck) {
    try {
      const existing = await composio.connectedAccounts.list({
        userIds: [userId],
        toolkitSlugs: [slug],
      });
      if (existing?.items?.length) {
        for (const conn of existing.items) {
          try {
            await composio.connectedAccounts.delete(conn.id);
          } catch {
            // Ignore deletion errors
          }
        }
      }
    } catch {
      // Ignore listing errors
    }
  }

  // Initiate connection with our callback URL so the user comes back to Tiker
  console.log(`[Composio] Initiating connection for authConfigId=${authConfigId}`);
  const connectionRequest = await composio.connectedAccounts.initiate(
    userId,
    authConfigId,
    { callbackUrl, allowMultiple: true } as any
  );

  const requestJson = connectionRequest.toJSON();
  console.log(`[Composio] Connection request response:`, JSON.stringify(requestJson, null, 2));
  console.log(`[Composio] redirectUrl:`, connectionRequest.redirectUrl);

  return {
    redirectUrl: connectionRequest.redirectUrl || '',
    connectionRequestId: requestJson.id || '',
  };
}

// Disconnect a Composio connection
export async function disconnectComposioConnection(
  connectionId: string
): Promise<void> {
  const composio = getComposio();
  await composio.connectedAccounts.delete(connectionId);
}
