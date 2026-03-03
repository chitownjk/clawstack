const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  console.error('ENCRYPTION_KEY required');
  process.exit(1);
}

// Match the app's crypto.ts exactly
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey() {
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
}

function encrypt(plaintext) {
  if (!plaintext) return plaintext;
  
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  // Combine: IV (16) + AuthTag (16) + Ciphertext - matching crypto.ts
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'base64')
  ]);
  
  return combined.toString('base64');
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://vyrgglxcesvvzeyhftdm.supabase.co',
  process.env.SUPABASE_SECRET_KEY
);

async function createOnboardingTask() {
  const accountId = '128ee266-fdcf-4710-8cab-1bd412bb60c0';
  
  // Get the bot
  const { data: bot } = await supabase
    .from('bots')
    .select('id, name, api_key_hash, api_key_prefix')
    .eq('account_id', accountId)
    .single();
  
  if (!bot) {
    console.error('No bot found');
    return;
  }
  
  // Generate new API key
  const apiKey = 'sk_' + crypto.randomBytes(32).toString('hex');
  const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const apiKeyPrefix = apiKey.slice(0, 7);
  
  // Update bot with new API key
  await supabase
    .from('bots')
    .update({ api_key_hash: apiKeyHash, api_key_prefix: apiKeyPrefix })
    .eq('id', bot.id);
  
  // Delete old onboarding tasks
  await supabase
    .from('mc_tasks')
    .delete()
    .eq('account_id', accountId)
    .ilike('title', '%Set up your first agent%');
  
  const title = encrypt(`Set up your first agent: ${bot.name}`);
  const description = encrypt(`Welcome to Tiker! Your first agent "${bot.name}" has been created.

## Next Steps:

1. **Customize your agent** (optional)
   - Go to Settings to rename or adjust personality
   
2. **Set up 2FA for write access**
   - Go to Settings → Security
   - Enable two-factor authentication
   - This is required to create tasks and edit your board
   
3. **Connect your OpenClaw gateway** (optional)
   - Install the Tiker skill in your OpenClaw workspace
   - Your API key: ${apiKey}
   - This lets your agents work autonomously

4. **Create your first task**
   - Click "+ Create Task" in Command
   - Assign it to your agent
   - Watch it work!

## Your API Key (save this!)
\`\`\`
${apiKey}
\`\`\`

Keep this key safe. You'll need it to connect your OpenClaw gateway.

## Quick Commands
- \`hub search "query"\` - Find patterns
- \`hub contribute --title "..."\` - Share patterns back
- \`mc heartbeat --agent YourName\` - Check for tasks`);

  const { data: task, error } = await supabase
    .from('mc_tasks')
    .insert({
      account_id: accountId,
      title: title,
      description: description,
      status: 'inbox',
      priority: 'high',
      tags: ['onboarding', 'setup'],
      assigned_agent_ids: [],
    })
    .select()
    .single();
  
  if (error) {
    console.error('Failed to create task:', error);
  } else {
    console.log('✓ Created onboarding task:', task.id);
    console.log('');
    console.log('API KEY:', apiKey);
  }
}

createOnboardingTask().catch(console.error);
