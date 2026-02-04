import { SupabaseClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { createHash, createDecipheriv } from 'crypto';

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

  // 4. Build prompt
  const prompt = buildPrompt(task, agent);

  // 5. Call model
  const result = await callModel({
    prompt,
    modelTier: agent.model_tier,
    account,
  });

  // 6. Post result as comment
  await supabase.from('mc_comments').insert({
    task_id: taskId,
    agent_id: task.account_agent_id,
    content: result,
    created_at: new Date().toISOString(),
  });

  // 7. Update task status
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
}): Promise<string> {
  const { prompt, modelTier, account } = options;

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

  // Call Anthropic
  const anthropic = new Anthropic({ apiKey: anthropicKey });

  const response = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = response.content[0];
  if (content.type === 'text') {
    // Track usage if using our keys
    if (account.execution_mode === 'cloud-our-keys') {
      await trackUsage({
        accountId: account.id,
        model,
        provider: 'anthropic',
        tokensIn: response.usage.input_tokens,
        tokensOut: response.usage.output_tokens,
      });
    }

    return content.text;
  }

  throw new Error('Unexpected response type from Anthropic');
}

async function trackUsage(data: {
  accountId: string;
  model: string;
  provider: string;
  tokensIn: number;
  tokensOut: number;
}) {
  // TODO: Calculate cost based on model pricing
  const costPer1kIn = 0.003; // Example pricing
  const costPer1kOut = 0.015;

  const cost =
    (data.tokensIn / 1000) * costPer1kIn +
    (data.tokensOut / 1000) * costPer1kOut;

  // TODO: Insert into model_usage table
  console.log('[Usage]', {
    account: data.accountId,
    model: data.model,
    tokens: data.tokensIn + data.tokensOut,
    cost: `$${cost.toFixed(4)}`,
  });
}
