// Action Executor: handles AI drafting and Composio execution
import Anthropic from '@anthropic-ai/sdk';
import { getComposio, COMPOSIO_TOOLKITS } from './composio';
import { getActionById, ActionDefinition } from './action-registry';

const anthropic = new Anthropic();

// ─── AI Draft Generation ───────────────────────────────────

export async function generateAIDraft(
  actionId: string,
  userInput: Record<string, string | number>
): Promise<{ draft: string; suggestions?: string[] }> {
  const action = getActionById(actionId);
  if (!action || !action.aiDraft || !action.aiPromptTemplate) {
    throw new Error(`Action ${actionId} does not support AI drafting`);
  }

  // Fill template with user input using simple mustache-style replacement
  let prompt = action.aiPromptTemplate;
  for (const [key, value] of Object.entries(userInput)) {
    prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
  }
  // Handle conditional sections: {{#field}}...{{/field}}
  prompt = prompt.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, field, content) => {
    return userInput[field] ? content.replace(new RegExp(`\\{\\{${field}\\}\\}`, 'g'), String(userInput[field])) : '';
  });

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [
      { role: 'user', content: prompt },
    ],
  });

  const draft = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim();

  return { draft };
}

// ─── Composio Write Execution ──────────────────────────────

interface ExecuteResult {
  success: boolean;
  response?: Record<string, unknown>;
  error?: string;
  slugUsed?: string;
}

export async function executeComposioAction(
  userId: string,
  action: ActionDefinition,
  params: Record<string, unknown>
): Promise<ExecuteResult> {
  const composio = getComposio();
  const toolkitConfig = COMPOSIO_TOOLKITS[action.service];
  if (!toolkitConfig) {
    return { success: false, error: `Unknown service: ${action.service}` };
  }

  // Try each action slug until one works
  const slugErrors: string[] = [];
  for (const slug of action.composioActionSlugs) {
    try {
      console.log(`[ActionExecutor] Trying slug: ${slug} with params:`, JSON.stringify(params));
      const result = await composio.tools.execute(slug, {
        userId,
        dangerouslySkipVersionCheck: true,
        arguments: params,
      });

      return {
        success: true,
        response: result as Record<string, unknown>,
        slugUsed: slug,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      slugErrors.push(`${slug}: ${message}`);
      console.log(`[ActionExecutor] Slug ${slug} failed:`, message);
      // If it's an auth/connection error, don't try other slugs
      if (message.includes('not connected') || message.includes('unauthorized')) {
        return { success: false, error: `Not connected to ${toolkitConfig.name}. Please connect in Settings.` };
      }
      // Otherwise try next slug
      continue;
    }
  }

  console.error(`[ActionExecutor] All slugs failed for ${action.id}:`, slugErrors);

  return {
    success: false,
    error: `Could not execute action on ${toolkitConfig.name}. Tried slugs: ${action.composioActionSlugs.join(', ')}. Check Vercel logs for details.`,
  };
}

// Get the active connection ID for a service
async function getConnectionId(userId: string, service: string): Promise<string> {
  const composio = getComposio();
  const config = COMPOSIO_TOOLKITS[service];
  if (!config) throw new Error(`Unknown service: ${service}`);

  const slugsToTry = [config.toolkit, ...(config.toolkitFallbacks || [])];

  for (const slug of slugsToTry) {
    try {
      const connections = await composio.connectedAccounts.list({
        userIds: [userId],
        toolkitSlugs: [slug],
        statuses: ['ACTIVE'],
      });

      const conn = connections?.items?.[0];
      if (conn) return conn.id;
    } catch {
      continue;
    }
  }

  throw new Error(`No active connection for ${config.name}`);
}

// ─── Action Parameter Mapping ──────────────────────────────
// Maps our form fields to Composio action parameters

export function mapFormToComposioParams(
  actionId: string,
  formData: Record<string, string | number | boolean>
): Record<string, unknown> {
  switch (actionId) {
    case 'linkedin-post':
      return {
        text: formData.content || formData.draft,
        content: formData.content || formData.draft,
        commentary: formData.content || formData.draft,
      };

    case 'tweet':
      return { text: formData.content || formData.draft, status: formData.content || formData.draft };

    case 'slack-message':
      return {
        channel: formData.channel,
        text: formData.message,
      };

    case 'email-draft': {
      // Parse subject from AI draft if present
      const draft = String(formData.content || formData.draft || '');
      let subject = String(formData.subject || '');
      let body = draft;
      if (draft.startsWith('Subject: ')) {
        const lines = draft.split('\n');
        subject = lines[0].replace('Subject: ', '');
        body = lines.slice(2).join('\n'); // skip blank line after subject
      }
      return {
        to: formData.to,
        subject,
        body,
        message_body: body,
      };
    }

    case 'calendar-event':
      return {
        summary: formData.title,
        title: formData.title,
        start_datetime: `${formData.date}T${formData.startTime}:00`,
        end_datetime: `${formData.date}T${formData.endTime}:00`,
        attendees: formData.attendees
          ? String(formData.attendees).split(',').map((e: string) => e.trim())
          : [],
      };

    case 'notion-page':
      return {
        title: formData.title,
        content: formData.content || formData.draft,
      };

    case 'linear-issue':
      return {
        title: formData.title,
        description: formData.description,
        priority: formData.priority ? Number(formData.priority) : 3,
      };

    case 'github-issue': {
      const [owner, repo] = String(formData.repo || '').split('/');
      return {
        owner,
        repo,
        title: formData.title,
        body: formData.body,
      };
    }

    case 'jira-ticket':
      return {
        project_key: formData.project,
        summary: formData.summary,
        description: formData.description,
        issue_type: 'Task',
      };

    default:
      // Pass through as-is for unknown actions
      return formData as Record<string, unknown>;
  }
}
