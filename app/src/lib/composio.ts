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
  name: string;
  description: string;
  icon: string;
  scopes: string[];
}> = {
  slack: {
    toolkit: 'SLACK',
    name: 'Slack',
    description: 'Send messages, read channels, manage workspace',
    icon: '\uD83D\uDCAC',
    scopes: ['chat:write', 'channels:read', 'users:read'],
  },
  'google-drive': {
    toolkit: 'GOOGLEDRIVE',
    name: 'Google Drive',
    description: 'Upload files, manage folders, share documents',
    icon: '\uD83D\uDCC1',
    scopes: ['drive.file', 'drive.readonly'],
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
};

// Check which Composio integrations are connected for a given user
export async function getComposioConnectionStatuses(
  userId: string
): Promise<Record<string, { connected: boolean; connectionId?: string }>> {
  const composio = getComposio();
  const statuses: Record<string, { connected: boolean; connectionId?: string }> = {};

  for (const [key, config] of Object.entries(COMPOSIO_TOOLKITS)) {
    try {
      const connections = await composio.connectedAccounts.list({
        userIds: [userId],
        toolkitSlugs: [config.toolkit],
        statuses: ['ACTIVE'],
      });

      const activeConnection = connections?.items?.[0];
      statuses[key] = {
        connected: !!activeConnection,
        connectionId: activeConnection?.id,
      };
    } catch (error) {
      console.error(`Error checking ${key} connection:`, error);
      statuses[key] = { connected: false };
    }
  }

  return statuses;
}

// Initiate a Composio connection for a specific toolkit
// Uses toolkits.authorize() which auto-creates auth config and returns OAuth redirect
export async function initiateComposioConnection(
  userId: string,
  toolkitKey: string,
  _callbackUrl: string,
  authConfigId?: string
): Promise<{ redirectUrl: string; connectionRequestId: string }> {
  const composio = getComposio();
  const config = COMPOSIO_TOOLKITS[toolkitKey];

  if (!config) {
    throw new Error(`Unknown toolkit: ${toolkitKey}`);
  }

  // toolkits.authorize() creates an auth config if needed and initiates the connection
  const connectionRequest = await composio.toolkits.authorize(
    userId,
    config.toolkit,
    authConfigId
  );

  return {
    redirectUrl: connectionRequest.redirectUrl || '',
    connectionRequestId: connectionRequest.toJSON().id || '',
  };
}

// Disconnect a Composio connection
export async function disconnectComposioConnection(
  connectionId: string
): Promise<void> {
  const composio = getComposio();
  await composio.connectedAccounts.delete(connectionId);
}
