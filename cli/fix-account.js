const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vyrgglxcesvvzeyhftdm.supabase.co';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Error: SUPABASE_SECRET_KEY environment variable is required');
  console.error('Run with: SUPABASE_SECRET_KEY=your_key node fix-account.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAccount() {
  const { data: accounts, error: accountError } = await supabase
    .from('accounts')
    .select('id, auth_uid, email, name, tier')
    .eq('email', 'jay@solisinteractive.com');
  
  if (accountError || !accounts || accounts.length === 0) {
    console.error('Account not found:', accountError?.message || 'No matching account');
    return;
  }
  
  const account = accounts[0];
  
  if (accountError) {
    console.error('Account not found:', accountError.message);
    return;
  }
  
  console.log('Found account:', account.id, account.email);
  
  const { data: existingBots } = await supabase
    .from('bots')
    .select('id, name')
    .eq('account_id', account.id);
  
  let apiKey = null;
  
  if (existingBots && existingBots.length > 0) {
    console.log('Already has bots:', existingBots.map(b => b.name).join(', '));
  } else {
    console.log('Creating default bot...');
    
    const crypto = require('crypto');
    apiKey = 'sk_' + crypto.randomBytes(32).toString('hex');
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const apiKeyPrefix = apiKey.slice(0, 7);
    
    const botName = account.name ? account.name.split(' ')[0] + "'s Assistant" : 'My Assistant';
    
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .insert({
        account_id: account.id,
        name: botName,
        description: 'Your all-purpose AI assistant. Questions, planning, research, drafts, code help.',
        api_key_hash: apiKeyHash,
        api_key_prefix: apiKeyPrefix,
        trust_tier: 3,
        status: 'active',
        whitelisted: true,
        config: {
          model: 'anthropic/claude-sonnet-4-5',
          temperature: 0.7,
          max_tokens: 4000,
          system_prompt: `You are ${botName}, a helpful AI assistant.`
        }
      })
      .select()
      .single();
    
    if (botError) {
      console.error('Failed to create bot:', botError.message);
    } else {
      console.log('✓ Created bot:', bot.name, 'ID:', bot.id);
    }
  }
  
  const { data: updatedAccounts, error: updateError } = await supabase
    .from('accounts')
    .update({
      tier: 'team'
    })
    .eq('id', account.id)
    .select('tier');
  
  if (updateError) {
    console.error('Failed to update tier:', updateError.message);
  } else if (updatedAccounts && updatedAccounts.length > 0) {
    console.log('✓ Updated tier to:', updatedAccounts[0].tier);
  }
  
  if (apiKey) {
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('API KEY FOR OPENCLAW CONNECTION:');
    console.log(apiKey);
    console.log('═══════════════════════════════════════════════════');
  }
  
  console.log('');
  console.log('Done! Account is now set up with Team tier.');
  console.log('Next steps:');
  console.log('1. Go to /command - you should see your agent');
  console.log('2. Enable 2FA in Settings to create tasks');
  console.log('3. Use the API key above to connect your OpenClaw gateway');
}

fixAccount().catch(e => console.error(e.message));
