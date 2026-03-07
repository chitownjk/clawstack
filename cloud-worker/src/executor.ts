import { SupabaseClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { createHash, createDecipheriv } from 'crypto';
import { TOOLS, executeTool } from './tools';

// Crypto functions (matching app/src/lib/crypto.ts)
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (!envKey) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  return createHash('sha256').update(envKey).digest();
}

function decrypt(ciphertext: string): string {
  if (!ciphertext) return ciphertext;
  
  try {
    const key = getKey();
    const combined = Buffer.from(ciphertext, 'base64');
    
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    return ciphertext; // Fallback to raw value
  }
}

type ModelTier = 'fast' | 'standard' | 'reasoning';

interface Task {
  id: string;
  account_id: string;
  title: string;
  description: string;
  status: string;
  assigned_agent_ids: string[];
}

interface Agent {
  id: string;
  name: string;
  emoji: string;
  personality: string | null;
  model_tier: ModelTier;
}

interface Account {
  id: string;
  execution_mode: string;
  api_keys: {
    anthropic?: string;
    openai?: string;
  } | null;
  features?: {
    models?: string[];
    task_limit?: number;
  } | null;
  plan_tier?: string;
}

export async function executeTask(taskId: string, supabase: SupabaseClient) {
  // 1. Load task
  const { data: task, error: taskError } = await supabase
    .from('mc_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  // Decrypt sensitive fields
  if (task.title) {
    task.title = decrypt(task.title);
  }
  if (task.description) {
    task.description = decrypt(task.description);
  }

  // 2. Load account (need to check limits BEFORE executing)
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id, execution_mode, plan_tier, api_keys, features')
    .eq('id', task.account_id)
    .single();

  if (accountError || !account) {
    throw new Error(`Account not found: ${task.account_id}`);
  }

  // 3. Check if account is over limit (for paid tiers)
  if (account.features?.task_limit) {
    const isOver = await supabase.rpc('is_over_limit', { account_uuid: account.id });
    if (isOver.data) {
      // Don't execute, post comment explaining why
      await supabase.from('mc_comments').insert({
        account_id: task.account_id,
        task_id: taskId,
        content: `⚠️ Monthly task limit reached (${account.features.task_limit} tasks). This task will queue until your limit resets. [Upgrade](/pricing) for more capacity.`,
        created_at: new Date().toISOString(),
      });
      
      // Keep task in inbox (don't mark as done or failed)
      return;
    }
  }

  // 4. Update status to executing
  await supabase
    .from('mc_tasks')
    .update({ status: 'executing', updated_at: new Date().toISOString() })
    .eq('id', taskId);

  // 5. Load agent (use first assigned agent)
  if (!Array.isArray(task.assigned_agent_ids) || task.assigned_agent_ids.length === 0) {
    // This shouldn't happen - worker should filter these out
    // Post helpful comment and reset to inbox
    await supabase.from('mc_comments').insert({
      task_id: taskId,
      agent_id: null,
      content: '⚠️ This task has no agents assigned. Please assign an agent from the task menu.',
      account_id: task.account_id
    });
    
    await supabase
      .from('mc_tasks')
      .update({ status: 'inbox', updated_at: new Date().toISOString() })
      .eq('id', taskId);
    
    return; // Don't throw, just skip execution
  }
  
  const agentId = task.assigned_agent_ids[0];
  const { data: agent, error: agentError } = await supabase
    .from('account_agent_templates')
    .select('*')
    .eq('id', agentId)
    .single();

  if (agentError || !agent) {
    throw new Error(`Agent not found: ${agentId}. Please reassign this task to a valid agent.`);
  }

  // 6. Get OAuth tokens and credentials for tools
  let googleAccessToken: string | undefined;
  let agentmailApiKey: string | undefined;
  let githubToken: string | undefined;
  
  try {
    // Check if account has credentials
    const { data: refreshedAccount } = await supabase
      .from('accounts')
      .select('google_tokens, agentmail_credentials, github_tokens')
      .eq('id', task.account_id)
      .single();

    // Get AgentMail API key if available
    if (refreshedAccount?.agentmail_credentials) {
      agentmailApiKey = refreshedAccount.agentmail_credentials.api_key;
      console.log('[Executor] AgentMail credentials found');
    }

    // Get GitHub token if available
    if (refreshedAccount?.github_tokens) {
      githubToken = refreshedAccount.github_tokens.access_token;
      console.log('[Executor] GitHub token found');
    }

    if (refreshedAccount?.google_tokens) {
      const tokens = refreshedAccount.google_tokens as any;
      const now = Math.floor(Date.now() / 1000);
      console.log('[Executor] Google tokens found, expires_at:', tokens.expires_at, 'now:', now);

      // Check if token needs refresh (expires in < 5 min)
      if (tokens.expires_at < now + 300) {
        // Refresh token
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: tokens.refresh_token,
            grant_type: 'refresh_token',
          }),
        });

        if (refreshResponse.ok) {
          const newTokens = await refreshResponse.json() as { access_token: string; expires_in: number };
          const expiresAt = now + newTokens.expires_in;

          // Update tokens
          await supabase
            .from('accounts')
            .update({
              google_tokens: {
                access_token: newTokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_at: expiresAt,
                scope: tokens.scope,
              },
            })
            .eq('id', task.account_id);

          googleAccessToken = newTokens.access_token;
          console.log('[Executor] Token refreshed successfully');
        } else {
          const errorBody = await refreshResponse.text();
          console.error('[Executor] Token refresh failed:', refreshResponse.status, errorBody);
        }
      } else {
        // Token still valid
        googleAccessToken = tokens.access_token;
        console.log('[Executor] Using existing valid token');
      }
    } else {
      console.log('[Executor] No Google tokens found for account');
    }
  } catch (error) {
    console.error('[Executor] Error fetching/refreshing Google token:', error);
    // Continue without tools
  }

  // 5. Build prompt (including comment history)
  const prompt = await buildPrompt(task, agent, supabase);

  // 6. Call model (with tools if Google token available)
  const { result, tokensIn, tokensOut, model, cost } = await callModel({
    prompt,
    modelTier: agent.model_tier,
    account,
    googleAccessToken,
    agentmailApiKey,
    githubToken,
    supabase,
    taskId: task.id,
  });

  // 7. Track usage (for paid tiers)
  if (account.execution_mode === 'cloud-our-keys') {
    // Update task with usage stats
    await supabase
      .from('mc_tasks')
      .update({
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        model_used: model,
        cost_usd: cost,
      })
      .eq('id', taskId);

    // Increment monthly usage
    await supabase.rpc('increment_task_usage', {
      account_uuid: account.id,
      tokens_input: tokensIn,
      tokens_output: tokensOut,
      cost,
    });
  }

  // 8. Post result (as file if long/markdown, otherwise as comment)
  const shouldSaveAsFile = result.length > 500 || 
                           result.includes('```') || 
                           result.includes('\n#') ||
                           result.split('\n').length > 15;

  if (shouldSaveAsFile) {
    // Save response as file
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const filename = `response-${Date.now()}.md`;
    const storagePath = `${task.account_id}/${year}/${month}/${taskId}/${filename}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('mc-files')
      .upload(storagePath, result, {
        contentType: 'text/markdown',
        upsert: false,
      });

    if (!uploadError) {
      // Insert file record
      const { data: fileRecord, error: fileInsertError } = await supabase
        .from('mc_files')
        .insert({
          account_id: task.account_id,
          task_id: taskId,
          name: filename,
          path: storagePath,
          mime_type: 'text/markdown',
          size_bytes: new TextEncoder().encode(result).length,
        })
        .select()
        .single();

      if (fileInsertError) {
        console.error('[Executor] Failed to insert file record:', fileInsertError);
      }

      // Post summary comment with link to viewer
      const fileId = fileRecord?.id;
      const viewLink = fileId ? ` [View response](/files/${fileId})` : '';
      
      await supabase.from('mc_comments').insert({
        account_id: task.account_id,
        task_id: taskId,
        content: `✅ Task complete. Response saved as file: **${filename}**${viewLink}`,
        created_at: new Date().toISOString(),
      });
    } else {
      // Fallback to comment if upload fails
      await supabase.from('mc_comments').insert({
        account_id: task.account_id,
        task_id: taskId,
        content: result,
        created_at: new Date().toISOString(),
      });
    }
  } else {
    // Short response - post as comment
    await supabase.from('mc_comments').insert({
      account_id: task.account_id,
      task_id: taskId,
      content: result,
      created_at: new Date().toISOString(),
    });
  }

  // 9. Update task status to review (so user can see the response)
  await supabase
    .from('mc_tasks')
    .update({
      status: 'review',
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId);
}

async function buildPrompt(task: Task, agent: Agent, supabase: SupabaseClient): Promise<string> {
  let prompt = '';

  // Add current date/time (critical for calendar/scheduling tasks)
  const now = new Date();
  prompt += `Current date and time: ${now.toLocaleString('en-US', { 
    timeZone: 'America/Chicago',
    dateStyle: 'full',
    timeStyle: 'long'
  })}\n\n`;

  // Add execution directive (critical: makes agents DO things, not ask questions)
  prompt += `IMPORTANT: You are an autonomous executor, not a conversational assistant. When assigned a task:\n`;
  prompt += `- Execute it immediately using available tools\n`;
  prompt += `- Make intelligent assumptions for missing details\n`;
  prompt += `- Use reasonable defaults (e.g., 1-hour meetings, tomorrow if no date specified)\n`;
  prompt += `- Report what you did, don't ask permission first\n`;
  prompt += `- Only ask questions if the task is genuinely ambiguous\n\n`;

  // Add agent personality if set
  if (agent.personality) {
    prompt += `${agent.personality}\n\n`;
  } else {
    prompt += `You are ${agent.name} ${agent.emoji}, a helpful AI agent.\n\n`;
  }

  // Add task
  prompt += `Task: ${task.title}\n`;
  if (task.description && task.description !== task.title) {
    prompt += `\nDetails: ${task.description}\n`;
  }

  // Load and add comment history (for context on review/ongoing tasks)
  const { data: comments } = await supabase
    .from('mc_comments')
    .select('content, created_at, agent_name')
    .eq('task_id', task.id)
    .order('created_at', { ascending: true });

  if (comments && comments.length > 0) {
    prompt += `\n\n## Previous Discussion:\n`;
    comments.forEach((comment) => {
      const author = comment.agent_name || 'User';
      const timestamp = new Date(comment.created_at).toLocaleString();
      prompt += `\n[${timestamp}] ${author}:\n${comment.content}\n`;
    });
    prompt += `\n## Your Response:\n`;
  }

  return prompt;
}

async function callModel(options: {
  prompt: string;
  modelTier: ModelTier;
  account: Account;
  googleAccessToken?: string;
  agentmailApiKey?: string;
  githubToken?: string;
  supabase: SupabaseClient;
  taskId: string;
}): Promise<{
  result: string;
  tokensIn: number;
  tokensOut: number;
  model: string;
  cost: number;
}> {
  const { prompt, modelTier, account, googleAccessToken, agentmailApiKey, githubToken, supabase, taskId } = options;

  // Determine which model to use based on tier and account features
  let model: string;
  
  // For paid tiers, respect tier and use cheapest appropriate model
  if (account.execution_mode === 'cloud-our-keys') {
    const availableModels = account.features?.models || [];
    
    // Cost containment: prefer cheaper models
    if (modelTier === 'fast') {
      model = 'claude-3-5-haiku-20241022'; // Cheapest
    } else if (modelTier === 'reasoning') {
      // Only if account has access to Opus
      if (availableModels.includes('opus')) {
        model = 'claude-3-7-sonnet-20250219';
      } else {
        // Fallback to Sonnet 4.5 if no Opus access
        model = 'claude-sonnet-4-20250514';
      }
    } else {
      // Standard tier - use Kimi if available (much cheaper)
      // Otherwise use Sonnet 4.5
      if (availableModels.includes('kimi')) {
        model = 'kimi-k2.5'; // 10x cheaper than Sonnet
      } else {
        model = 'claude-sonnet-4-20250514';
      }
    }
  } else {
    // BYOK mode - use what agent specifies
    const modelMap = {
      fast: 'claude-3-5-haiku-20241022',
      standard: 'claude-sonnet-4-20250514',
      reasoning: 'claude-3-7-sonnet-20250219',
    };
    model = modelMap[modelTier] || modelMap.standard;
  }

  // Get and decrypt API keys
  let anthropicKey: string | undefined;
  
  if (account.execution_mode === 'cloud-user-keys') {
    // Decrypt user's stored API key
    const encryptedKey = account.api_keys?.anthropic;
    if (encryptedKey) {
      anthropicKey = decrypt(encryptedKey);
    }
  } else {
    // Use our API key
    anthropicKey = process.env.ANTHROPIC_API_KEY;
  }

  // Check if using Kimi model
  if (model.startsWith('kimi-')) {
    return await callKimiModel({
      model,
      prompt,
      account,
      googleAccessToken,
      supabase,
      taskId,
    });
  }

  if (!anthropicKey) {
    throw new Error('No Anthropic API key configured');
  }

  // Call Anthropic (with tools if any credential is available)
  const hasTools = !!(googleAccessToken || agentmailApiKey || githubToken);
  const anthropic = new Anthropic({ apiKey: anthropicKey });

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: prompt,
    },
  ];

  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let finalResponse = '';

  // Agentic loop: up to 5 turns for tool use
  for (let turn = 0; turn < 5; turn++) {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      messages,
      ...(hasTools ? { tools: TOOLS as any } : {}),
    });

    totalTokensIn += response.usage.input_tokens;
    totalTokensOut += response.usage.output_tokens;

    // Check for tool use (may be multiple tool calls in one response)
    const toolUseBlocks = response.content.filter((block) => block.type === 'tool_use');
    const textBlock = response.content.find((block) => block.type === 'text');

    if (toolUseBlocks.length > 0) {
      // Agent wants to use one or more tools
      console.log(`[Executor] Agent using ${toolUseBlocks.length} tool(s)`);

      // Add assistant's tool use to messages
      messages.push({
        role: 'assistant',
        content: response.content,
      });

      // Execute all tools and collect results
      const toolResults = [];
      for (const toolUseBlock of toolUseBlocks) {
        if (toolUseBlock.type !== 'tool_use') continue;
        
        console.log(`[Executor] Executing tool: ${toolUseBlock.name}`, JSON.stringify(toolUseBlock.input));
        let toolResult: string;
        try {
          toolResult = await executeTool(
            toolUseBlock.name,
            toolUseBlock.input,
            googleAccessToken || '',
            supabase,
            taskId,
            account.id,
            agentmailApiKey,
            githubToken
          );
          console.log(`[Executor] Tool result: ${toolResult.substring(0, 200)}`);
        } catch (error) {
          console.error(`[Executor] Tool error:`, error);
          toolResult = `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }

        toolResults.push({
          type: 'tool_result' as const,
          tool_use_id: toolUseBlock.id,
          content: toolResult,
        });
      }

      // Add all tool results to messages
      messages.push({
        role: 'user',
        content: toolResults,
      });

      // Continue loop to get agent's next response
      continue;
    }

    // No tool use - this is the final response
    if (textBlock && textBlock.type === 'text') {
      finalResponse = textBlock.text;
      break;
    }

    // Shouldn't reach here
    throw new Error('Unexpected response format from Anthropic');
  }

  // Calculate cost based on model
  const cost = calculateCost(model, totalTokensIn, totalTokensOut);

  return {
    result: finalResponse || 'Task completed (no text response from agent)',
    tokensIn: totalTokensIn,
    tokensOut: totalTokensOut,
    model,
    cost,
  };
}

async function callKimiModel(options: {
  model: string;
  prompt: string;
  account: Account;
  googleAccessToken?: string;
  supabase: SupabaseClient;
  taskId: string;
}): Promise<{
  result: string;
  tokensIn: number;
  tokensOut: number;
  model: string;
  cost: number;
}> {
  const { model, prompt, account } = options;

  // Get Kimi API key
  let kimiKey: string | undefined;
  
  if (account.execution_mode === 'cloud-user-keys') {
    const encryptedKey = (account.api_keys as any)?.kimi;
    if (encryptedKey) {
      kimiKey = decrypt(encryptedKey);
    }
  } else {
    kimiKey = process.env.KIMI_API_KEY;
  }

  if (!kimiKey) {
    throw new Error('No Kimi API key configured');
  }

  // Kimi uses OpenAI-compatible API
  const kimi = new OpenAI({
    apiKey: kimiKey,
    baseURL: 'https://api.moonshot.cn/v1',
  });

  const response = await kimi.chat.completions.create({
    model: 'moonshot-v1-8k',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  });

  const tokensIn = response.usage?.prompt_tokens || 0;
  const tokensOut = response.usage?.completion_tokens || 0;
  const cost = calculateCost('kimi-k2.5', tokensIn, tokensOut);

  return {
    result: response.choices[0]?.message?.content || '',
    tokensIn,
    tokensOut,
    model: 'kimi-k2.5',
    cost,
  };
}

function calculateCost(model: string, tokensIn: number, tokensOut: number): number {
  // Pricing per 1M tokens
  const pricing: Record<string, { in: number; out: number }> = {
    'claude-3-5-sonnet-20241022': { in: 3, out: 15 },
    'claude-sonnet-4-20250514': { in: 3, out: 15 },
    'claude-3-5-haiku-20241022': { in: 0.25, out: 1.25 },
    'claude-opus-4.5': { in: 15, out: 75 },
    'claude-3-7-sonnet-20250219': { in: 15, out: 75 },
    'kimi-k2.5': { in: 0.3, out: 0.3 },
    'gpt-4-turbo': { in: 10, out: 30 },
  };

  const rates = pricing[model] || pricing['claude-sonnet-4-20250514'];
  
  const costIn = (tokensIn / 1_000_000) * rates.in;
  const costOut = (tokensOut / 1_000_000) * rates.out;
  
  return costIn + costOut;
}
