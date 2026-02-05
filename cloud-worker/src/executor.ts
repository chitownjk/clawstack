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
  account_agent_id: string;
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

  // 2. Update status to executing
  await supabase
    .from('mc_tasks')
    .update({ status: 'executing', updated_at: new Date().toISOString() })
    .eq('id', taskId);

  // 2. Load agent
  const { data: agent, error: agentError } = await supabase
    .from('account_agent_templates')
    .select('*')
    .eq('id', task.account_agent_id)
    .single();

  if (agentError || !agent) {
    throw new Error(`Agent not found: ${task.account_agent_id}`);
  }

  // 3. Load account (for API keys)
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id, execution_mode, api_keys')
    .eq('id', task.account_id)
    .single();

  if (accountError || !account) {
    throw new Error(`Account not found: ${task.account_id}`);
  }

  // 4. Get Google OAuth token for tools (if available)
  let googleAccessToken: string | undefined;
  try {
    const { data: authData } = await supabase.auth.admin.getUserById(account.id);
    if (authData?.user) {
      // Check if user has Google provider linked
      const googleIdentity = authData.user.identities?.find(
        (id: any) => id.provider === 'google'
      );
      if (googleIdentity) {
        // Fetch session to get provider token
        // Note: This requires the user to have logged in recently
        // In production, we'd need token refresh logic
        googleAccessToken = (googleIdentity as any).access_token;
      }
    }
  } catch (error) {
    console.log('[Executor] Could not fetch Google token:', error);
    // Continue without tools
  }

  // 5. Build prompt
  const prompt = buildPrompt(task, agent);

  // 6. Call model (with tools if Google token available)
  const { result, tokensIn, tokensOut, model, cost } = await callModel({
    prompt,
    modelTier: agent.model_tier,
    account,
    googleAccessToken,
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

  // 8. Post result as comment
  await supabase.from('mc_comments').insert({
    task_id: taskId,
    agent_id: task.account_agent_id,
    content: result,
    created_at: new Date().toISOString(),
  });

  // 9. Update task status
  await supabase
    .from('mc_tasks')
    .update({
      status: 'done',
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId);
}

function buildPrompt(task: Task, agent: Agent): string {
  let prompt = '';

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

  return prompt;
}

async function callModel(options: {
  prompt: string;
  modelTier: ModelTier;
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
  const { prompt, modelTier, account, googleAccessToken, supabase, taskId } = options;

  // Determine which model to use based on tier
  const modelMap = {
    fast: 'claude-3-5-haiku-20241022',
    standard: 'claude-3-5-sonnet-20241022',
    reasoning: 'claude-3-7-sonnet-20250219',
  };

  const model = modelMap[modelTier] || modelMap.standard;

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

  if (!anthropicKey) {
    throw new Error('No Anthropic API key configured');
  }

  // Call Anthropic (with tools if Google token available)
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
      ...(googleAccessToken ? { tools: TOOLS as any } : {}),
    });

    totalTokensIn += response.usage.input_tokens;
    totalTokensOut += response.usage.output_tokens;

    // Check for tool use
    const toolUseBlock = response.content.find((block) => block.type === 'tool_use');
    const textBlock = response.content.find((block) => block.type === 'text');

    if (toolUseBlock && toolUseBlock.type === 'tool_use') {
      // Agent wants to use a tool
      console.log(`[Executor] Agent using tool: ${toolUseBlock.name}`);

      // Execute the tool
      let toolResult: string;
      try {
        toolResult = await executeTool(
          toolUseBlock.name,
          toolUseBlock.input,
          googleAccessToken!
        );
      } catch (error) {
        toolResult = `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      // Add assistant's tool use to messages
      messages.push({
        role: 'assistant',
        content: response.content,
      });

      // Add tool result to messages
      messages.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: toolUseBlock.id,
            content: toolResult,
          },
        ],
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

function calculateCost(model: string, tokensIn: number, tokensOut: number): number {
  // Pricing per 1M tokens
  const pricing: Record<string, { in: number; out: number }> = {
    'claude-3-5-sonnet-20241022': { in: 3, out: 15 },
    'claude-3-5-haiku-20241022': { in: 0.25, out: 1.25 },
    'claude-opus-4.5': { in: 15, out: 75 },
    'claude-3-7-sonnet-20250219': { in: 15, out: 75 },
    'kimi-k2.5': { in: 0.3, out: 0.3 },
    'gpt-4-turbo': { in: 10, out: 30 },
  };

  const rates = pricing[model] || pricing['claude-3-5-sonnet-20241022'];
  
  const costIn = (tokensIn / 1_000_000) * rates.in;
  const costOut = (tokensOut / 1_000_000) * rates.out;
  
  return costIn + costOut;
}
