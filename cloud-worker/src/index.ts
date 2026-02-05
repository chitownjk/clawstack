import { createClient } from '@supabase/supabase-js';
import { executeTask } from './executor';

// Only load .env in development (Fly.io injects secrets directly)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

const BACKUP_POLL_INTERVAL_MS = 60000; // Backup poll every 60s (not 5s)
const MAX_CONCURRENT = parseInt(process.env.WORKER_CONCURRENCY || '5');

let activeTasks = 0;
const recentlyCheckedAccounts = new Set<string>();

// Clear recently-checked cache every 10 seconds
setInterval(() => {
  recentlyCheckedAccounts.clear();
}, 10000);

async function checkAccountTasks(accountId: string) {
  // Skip if we just checked this account
  if (recentlyCheckedAccounts.has(accountId)) {
    return;
  }
  recentlyCheckedAccounts.add(accountId);

  // Don't check if at max capacity
  if (activeTasks >= MAX_CONCURRENT) {
    return;
  }

  try {
    // Get ALL executable tasks for this account (inbox, assigned)
    const { data: tasks, error } = await supabase
      .from('mc_tasks')
      .select(`
        id, 
        account_id,
        assigned_agent_ids,
        status,
        accounts!inner(execution_mode)
      `)
      .eq('account_id', accountId)
      .in('status', ['inbox', 'assigned', 'review'])
      .not('assigned_agent_ids', 'is', null)
      .limit(10);

    if (error) {
      console.error(`[Worker] Error fetching tasks for account ${accountId}:`, error);
      return;
    }

    if (!tasks || tasks.length === 0) {
      return;
    }

    // Filter for cloud execution modes AND tasks with agents assigned
    const cloudTasks = tasks.filter((task: any) => {
      const mode = task.accounts?.execution_mode;
      const isCloud = mode === 'cloud-user-keys' || mode === 'cloud-our-keys';
      const hasAgent = Array.isArray(task.assigned_agent_ids) && task.assigned_agent_ids.length > 0;
      return isCloud && hasAgent;
    }).slice(0, MAX_CONCURRENT - activeTasks);

    if (cloudTasks.length === 0) {
      return;
    }

    console.log(`[Worker] Account ${accountId}: Found ${cloudTasks.length} tasks to process`);

    // Process each task
    for (const task of cloudTasks) {
      // Claim the task by updating status to 'executing'
      const { data: claimed, error: updateError } = await supabase
        .from('mc_tasks')
        .update({ 
          status: 'executing',
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id)
        .in('status', ['inbox', 'assigned', 'review'])
        .select();

      if (updateError || !claimed || claimed.length === 0) {
        continue;
      }

      // Execute task in background
      activeTasks++;
      executeTaskWithTracking(task.id);
    }
  } catch (error) {
    console.error(`[Worker] Error checking account ${accountId}:`, error);
  }
}

async function pollAllAccounts() {
  // Backup poll for all cloud accounts (failsafe)
  if (activeTasks >= MAX_CONCURRENT) {
    return;
  }

  try {
    const { data: tasks, error } = await supabase
      .from('mc_tasks')
      .select(`
        id, 
        account_id,
        assigned_agent_ids,
        accounts!inner(execution_mode)
      `)
      .in('status', ['inbox', 'assigned', 'review'])
      .not('assigned_agent_ids', 'is', null)
      .limit(20);

    if (error || !tasks || tasks.length === 0) {
      return;
    }

    // Get unique account IDs
    const accountIds = [...new Set(tasks.map((t: any) => t.account_id))];
    
    for (const accountId of accountIds) {
      await checkAccountTasks(accountId);
    }
  } catch (error) {
    console.error('[Worker] Backup poll error:', error);
  }
}

async function executeTaskWithTracking(taskId: string) {
  try {
    console.log(`[Worker] Processing task ${taskId}`);
    await executeTask(taskId, supabase);
    console.log(`[Worker] ✓ Task ${taskId} completed`);
  } catch (error) {
    console.error(`[Worker] ✗ Task ${taskId} failed:`, error);

    // Update task status to error
    try {
      await supabase
        .from('mc_tasks')
        .update({ 
          status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      // Post error as comment
      await supabase.from('mc_comments').insert({
        task_id: taskId,
        content: `❌ Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        created_at: new Date().toISOString(),
      });
    } catch (updateError) {
      console.error(`[Worker] Failed to update error status:`, updateError);
    }
  } finally {
    activeTasks--;
  }
}

// Subscribe to realtime events
console.log('[Worker] Cloud worker started (event-driven mode)');
console.log(`[Worker] Concurrency: ${MAX_CONCURRENT}`);
console.log(`[Worker] Backup poll interval: ${BACKUP_POLL_INTERVAL_MS}ms`);

// Subscribe to task changes (new tasks, agent assignments)
supabase
  .channel('task_changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'mc_tasks' },
    (payload: any) => {
      const task = payload.new || payload.old;
      if (task?.account_id) {
        console.log(`[Worker] Task event: ${payload.eventType} for account ${task.account_id}`);
        checkAccountTasks(task.account_id);
      }
    }
  )
  .subscribe();

// Subscribe to comment changes (agents posting updates triggers checking for more work)
supabase
  .channel('comment_changes')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'mc_comments' },
    async (payload: any) => {
      const comment = payload.new;
      if (comment?.task_id) {
        // Get task's account_id
        const { data: task } = await supabase
          .from('mc_tasks')
          .select('account_id')
          .eq('id', comment.task_id)
          .single();
        
        if (task?.account_id) {
          console.log(`[Worker] Comment added to task, checking account ${task.account_id}`);
          checkAccountTasks(task.account_id);
        }
      }
    }
  )
  .subscribe();

// Backup polling (every 60s instead of 5s)
setInterval(pollAllAccounts, BACKUP_POLL_INTERVAL_MS);

// Initial poll
pollAllAccounts();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM received, waiting for active tasks to complete...');
  
  const startTime = Date.now();
  while (activeTasks > 0 && Date.now() - startTime < 30000) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`[Worker] Shutdown complete (${activeTasks} tasks still running)`);
  process.exit(0);
});
