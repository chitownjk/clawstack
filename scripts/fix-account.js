const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAccount() {
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id, auth_uid, email, name, tier, tier_expires_at')
    .eq('email', 'jay@solisinteractive.com')
    .single();
  
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
    
    const botName = account.name ? account.name.split(' ')[0] + "'s Assistant" : 'My Assistant';
    
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .insert({
        account_id: account.id,
        name: botName,
        emoji: '🤖',
        description: 'Your all-purpose AI assistant. Questions, planning, research, drafts, code help.',
        api_key_hash: apiKeyHash,
        trust_tier: 3,
        is_active: true,
        capabilities: ['general', 'chat', 'research'],
        model_config: {
          model: 'anthropic/claude-sonnet-4-5',
          temperature: 0.7,
          max_tokens: 4000
        },
        system_prompt: `You are ${botName}, a helpful AI assistant.`,
      })
      .select()
      .single();
    
    if (botError) {
      console.error('Failed to create bot:', botError.message);
    } else {
      console.log('✓ Created bot:', bot.name, 'ID:', bot.id);
    }
  }
  
  const trialEndDate = new Date();
  trialEndDate.setMonth(trialEndDate.getMonth() + 3);
  
  const { data: updatedAccount, error: updateError } = await supabase
    .from('accounts')
    .update({
      tier: 'team',
      tier_expires_at: trialEndDate.toISOString()
    })
    .eq('id', account.id)
    .select('tier, tier_expires_at')
    .single();
  
  if (updateError) {
    console.error('Failed to update tier:', updateError.message);
  } else {
    console.log('✓ Updated tier to:', updatedAccount.tier);
    console.log('✓ Trial expires:', new Date(updatedAccount.tier_expires_at).toLocaleDateString());
  }
  
  if (apiKey) {
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('API KEY FOR OPENCLAW CONNECTION:');
    console.log(apiKey);
    console.log('═══════════════════════════════════════════════════');
  }
  
  console.log('');
  console.log('Done! Account is now set up with Team tier trial.');
}

fixAccount().catch(e => console.error(e.message));
