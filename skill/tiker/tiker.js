#!/usr/bin/env node
/**
 * Tiker Integration Module
 * 
 * Provides orchestrators with Mission Control and Agent Marketplace access.
 * 
 * Usage:
 *   const tiker = require('./tiker');
 *   await tiker.init();
 *   const tasks = await tiker.getAssignedTasks();
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const POSTGRES_URL = process.env.TIKER_POSTGRES_URL || process.env.SUPABASE_URL;
const ANON_KEY = process.env.TIKER_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const ACCOUNT_ID = process.env.TIKER_ACCOUNT_ID;
const GATEWAY_ID = process.env.OPENCLAW_GATEWAY_ID || `gateway-${process.pid}`;

let supabase = null;

/**
 * Initialize Tiker connection
 */
async function init() {
  if (!POSTGRES_URL || !ANON_KEY) {
    throw new Error('Missing TIKER_POSTGRES_URL or TIKER_ANON_KEY');
  }
  
  supabase = createClient(POSTGRES_URL, ANON_KEY);
  
  // Verify connection
  const { error } = await supabase.from('accounts').select('id').limit(1);
  if (error) {
    throw new Error(`Tiker connection failed: ${error.message}`);
  }
  
  return true;
}

/**
 * Record orchestrator heartbeat
 */
async function heartbeat() {
  const { error } = await supabase
    .from('bots')
    .update({ 
      last_heartbeat_at: new Date().toISOString(),
      status: 'idle'
    })
    .eq('account_id', ACCOUNT_ID);
  
  if (error) {
    console.error('Heartbeat failed:', error.message);
    return false;
  }
  return true;
}

/**
 * Get tasks assigned to our agents
 */
async function getAssignedTasks(options = {}) {
  const {
    status = 'assigned',
    agents = null,  // null = all installed agents
    unclaimed = true
  } = options;
  
  // Get installed agent slugs if not specified
  let agentSlugs = agents;
  if (!agentSlugs) {
    const installed = await getInstalledAgents();
    agentSlugs = installed.map(a => a.slug);
  }
  
  let query = supabase
    .from('mc_tasks')
    .select('*')
    .eq('status', status)
    .contains('tags', agentSlugs.map(s => `@${s}`));  // Tags like @writer
  
  if (unclaimed) {
    query = query.is('claimed_by_gateway', null);
  }
  
  const { data, error } = await query.order('created_at', { ascending: true });
  
  if (error) {
    console.error('Failed to fetch tasks:', error.message);
    return [];
  }
  
  // Parse assigned agent from tags
  return data.map(task => {
    const agentTag = task.tags?.find(t => t.startsWith('@'));
    return {
      ...task,
      assigned_to: agentTag ? agentTag.slice(1) : null
    };
  });
}

/**
 * Atomically claim a task
 */
async function claimTask(taskId) {
  const { data, error } = await supabase
    .from('mc_tasks')
    .update({
      claimed_by_gateway: GATEWAY_ID,
      claimed_at: new Date().toISOString(),
      status: 'in_progress'
    })
    .eq('id', taskId)
    .is('claimed_by_gateway', null)
    .select('id')
    .single();
  
  if (error || !data) {
    return false;  // Already claimed or error
  }
  return true;
}

/**
 * Get resolved agent configuration
 */
async function getAgentConfig(slug) {
  const { data, error } = await supabase
    .rpc('get_agent_config', {
      p_account_id: ACCOUNT_ID,
      p_template_slug: slug
    });
  
  if (error) {
    console.error('Failed to get agent config:', error.message);
    return null;
  }
  
  return data;
}

/**
 * Mark task complete and post result
 */
async function completeTask(taskId, result) {
  const { success, output, summary } = result;
  
  // Update task status
  await supabase
    .from('mc_tasks')
    .update({
      status: success ? 'review' : 'blocked',
      completed_at: success ? new Date().toISOString() : null
    })
    .eq('id', taskId);
  
  // Post result as comment
  const commentContent = success
    ? `✅ **Task Complete**\n\n${summary || ''}\n\n---\n\n${output}`
    : `❌ **Task Failed**\n\n${output}`;
  
  await supabase
    .from('mc_comments')
    .insert({
      task_id: taskId,
      content: commentContent
    });
  
  // Log activity
  await supabase
    .from('mc_activities')
    .insert({
      type: success ? 'task_completed' : 'task_failed',
      message: summary || (success ? 'Task completed' : 'Task failed'),
      task_id: taskId,
      metadata: { gateway: GATEWAY_ID }
    });
  
  return true;
}

/**
 * Update agent memory
 */
async function updateAgentMemory(slug, updates) {
  // Get current memory
  const { data: current } = await supabase
    .from('account_agent_templates')
    .select('memory, agent_template_id')
    .eq('account_id', ACCOUNT_ID)
    .eq('agent_template_id', (
      await supabase
        .from('agent_templates')
        .select('id')
        .eq('slug', slug)
        .single()
    ).data?.id)
    .single();
  
  if (!current) {
    console.error('Agent not found:', slug);
    return false;
  }
  
  // Merge memory
  const newMemory = {
    ...current.memory,
    ...updates,
    lastUpdated: new Date().toISOString()
  };
  
  // Update
  const { error } = await supabase
    .from('account_agent_templates')
    .update({ 
      memory: newMemory,
      last_used_at: new Date().toISOString()
    })
    .eq('account_id', ACCOUNT_ID)
    .eq('agent_template_id', current.agent_template_id);
  
  if (error) {
    console.error('Failed to update memory:', error.message);
    return false;
  }
  
  return true;
}

/**
 * Get installed agents for this account
 */
async function getInstalledAgents() {
  const { data, error } = await supabase
    .from('account_agent_templates')
    .select(`
      is_enabled,
      agent_templates (
        slug,
        name,
        emoji,
        description,
        category
      )
    `)
    .eq('account_id', ACCOUNT_ID)
    .eq('is_enabled', true);
  
  if (error) {
    console.error('Failed to get installed agents:', error.message);
    return [];
  }
  
  return data.map(d => ({
    slug: d.agent_templates.slug,
    name: d.agent_templates.name,
    emoji: d.agent_templates.emoji,
    description: d.agent_templates.description,
    category: d.agent_templates.category
  }));
}

/**
 * Browse marketplace
 */
async function browseMarketplace(options = {}) {
  const { category, tier = 'free' } = options;
  
  // Map tier to allowed tiers
  const allowedTiers = {
    'free': ['free'],
    'basic': ['free', 'basic'],
    'pro': ['free', 'basic', 'pro'],
    'team': ['free', 'basic', 'pro', 'team']
  };
  
  let query = supabase
    .from('agent_templates')
    .select('slug, name, emoji, description, category, tier_required, is_default, install_count, rating_avg')
    .eq('is_published', true)
    .in('tier_required', allowedTiers[tier] || ['free']);
  
  if (category) {
    query = query.eq('category', category);
  }
  
  const { data, error } = await query.order('install_count', { ascending: false });
  
  if (error) {
    console.error('Failed to browse marketplace:', error.message);
    return [];
  }
  
  return data;
}

/**
 * Install an agent from marketplace
 */
async function installAgent(slug) {
  // Get template
  const { data: template, error: templateError } = await supabase
    .from('agent_templates')
    .select('id')
    .eq('slug', slug)
    .single();
  
  if (templateError || !template) {
    console.error('Template not found:', slug);
    return false;
  }
  
  // Install (insert or enable)
  const { error } = await supabase
    .from('account_agent_templates')
    .upsert({
      account_id: ACCOUNT_ID,
      agent_template_id: template.id,
      is_enabled: true
    }, {
      onConflict: 'account_id,agent_template_id'
    });
  
  if (error) {
    console.error('Failed to install agent:', error.message);
    return false;
  }
  
  return true;
}

/**
 * Uninstall (disable) an agent
 */
async function uninstallAgent(slug) {
  const { data: template } = await supabase
    .from('agent_templates')
    .select('id')
    .eq('slug', slug)
    .single();
  
  if (!template) return false;
  
  const { error } = await supabase
    .from('account_agent_templates')
    .update({ is_enabled: false })
    .eq('account_id', ACCOUNT_ID)
    .eq('agent_template_id', template.id);
  
  return !error;
}

/**
 * Get user's model configuration
 */
async function getModelConfig() {
  const { data, error } = await supabase
    .from('account_model_config')
    .select('*')
    .eq('account_id', ACCOUNT_ID)
    .single();
  
  if (error || !data) {
    return {
      model_default: 'anthropic/claude-sonnet-4-5',
      model_fast: null,
      model_reasoning: null
    };
  }
  
  return data;
}

/**
 * CLI commands
 */
async function cli() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    await init();
  } catch (e) {
    console.error('❌', e.message);
    process.exit(1);
  }
  
  switch (command) {
    case 'status':
      console.log('✅ Connected to Tiker');
      console.log(`   Account: ${ACCOUNT_ID}`);
      console.log(`   Gateway: ${GATEWAY_ID}`);
      const agents = await getInstalledAgents();
      console.log(`   Agents: ${agents.map(a => a.emoji + a.name).join(', ')}`);
      break;
      
    case 'agents':
      const list = await getInstalledAgents();
      console.log('Installed Agents:');
      list.forEach(a => console.log(`  ${a.emoji} ${a.name} (${a.slug})`));
      break;
      
    case 'tasks':
      const tasks = await getAssignedTasks({ unclaimed: false });
      console.log('Assigned Tasks:');
      tasks.forEach(t => console.log(`  [${t.status}] ${t.title} → @${t.assigned_to}`));
      break;
      
    case 'marketplace':
      const mp = await browseMarketplace({ tier: args[1] || 'free' });
      console.log('Marketplace:');
      mp.forEach(a => console.log(`  ${a.emoji} ${a.name} - ${a.description?.slice(0, 50)}...`));
      break;
      
    case 'install':
      if (!args[1]) {
        console.error('Usage: tiker install <slug>');
        process.exit(1);
      }
      const installed = await installAgent(args[1]);
      console.log(installed ? `✅ Installed ${args[1]}` : `❌ Failed to install ${args[1]}`);
      break;
      
    case 'heartbeat':
      const hb = await heartbeat();
      console.log(hb ? '✅ Heartbeat recorded' : '❌ Heartbeat failed');
      break;
      
    default:
      console.log(`
Tiker CLI

Commands:
  status      Check connection and show account info
  agents      List installed agents
  tasks       List assigned tasks
  marketplace [tier]  Browse agent marketplace
  install <slug>      Install an agent
  heartbeat   Record heartbeat
`);
  }
}

// Export for module use
module.exports = {
  init,
  heartbeat,
  getAssignedTasks,
  claimTask,
  getAgentConfig,
  completeTask,
  updateAgentMemory,
  getInstalledAgents,
  browseMarketplace,
  installAgent,
  uninstallAgent,
  getModelConfig
};

// Run CLI if executed directly
if (require.main === module) {
  cli().catch(console.error);
}
