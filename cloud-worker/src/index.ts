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

const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds
const MAX_CONCURRENT = parseInt(process.env.WORKER_CONCURRENCY || '5');

let activeTasks = 0;

async function pollForTasks() {
  // Don't poll if at max capacity
  if (activeTasks >= MAX_CONCURRENT) {
    return;
  }

  try {
    // Get inbox tasks and check their account's execution mode
    const { data: tasks, error } = await supabase
      .from('mc_tasks')
      .select(`
        id, 
        account_id,
        assigned_agent_ids,
        accounts!inner(execution_mode)
      `)
      .eq('status', 'inbox')
      .limit(20); // Get more than needed, filter client-side

    if (error) {
      console.error('[Worker] Error fetching tasks:', error);
      return;
    }

    if (!tasks || tasks.length === 0) {
      return;
    }

    // Filter for cloud execution modes AND tasks with agents assigned
    const cloudTasks = tasks.filter((task: any) => {
      const mode = task.accounts?.execution_mode;
      const isCloud = mode === 'cloud-user-keys' || mode === 'cloud-our-keys';
      const hasAgent = task.assigned_agent_ids && task.assigned_agent_ids.length > 0;
      return isCloud && hasAgent;
    }).slice(0, MAX_CONCURRENT - activeTasks);

    if (cloudTasks.length === 0) {
      return;
    }

    console.log(`[Worker] Found ${cloudTasks.length} cloud tasks to process`);

    // Process each task
    for (const task of cloudTasks) {
      // Claim the task by updating status to 'executing'
      const { error: updateError } = await supabase
        .from('mc_tasks')
        .update({ 
          status: 'executing',
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id)
        .eq('status', 'inbox'); // Only update if still inbox (prevents race conditions)

      if (updateError) {
        console.error(`[Worker] Failed to claim task ${task.id}:`, updateError);
        continue;
      }

      // Execute task in background (don't await)
      activeTasks++;
      executeTaskWithTracking(task.id);
    }
  } catch (error) {
    console.error('[Worker] Poll error:', error);
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

// Start polling
console.log('[Worker] Cloud worker started');
console.log(`[Worker] Concurrency: ${MAX_CONCURRENT}`);
console.log(`[Worker] Poll interval: ${POLL_INTERVAL_MS}ms`);

setInterval(pollForTasks, POLL_INTERVAL_MS);

// Initial poll
pollForTasks();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM received, waiting for active tasks to complete...');
  
  // Wait for active tasks to finish (max 30 seconds)
  const startTime = Date.now();
  while (activeTasks > 0 && Date.now() - startTime < 30000) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`[Worker] Shutdown complete (${activeTasks} tasks still running)`);
  process.exit(0);
});
