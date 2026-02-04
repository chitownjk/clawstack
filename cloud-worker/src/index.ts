import { Worker } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import { executeTask } from './executor';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

// Worker that processes tasks
const worker = new Worker(
  'tiker-tasks',
  async (job) => {
    const { taskId } = job.data;
    
    console.log(`[Worker] Processing task ${taskId}`);
    
    try {
      await executeTask(taskId, supabase);
      console.log(`[Worker] ✓ Task ${taskId} completed`);
    } catch (error) {
      console.error(`[Worker] ✗ Task ${taskId} failed:`, error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5'),
  }
);

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err);
});

console.log('[Worker] Cloud worker started');
console.log(`[Worker] Concurrency: ${process.env.WORKER_CONCURRENCY || 5}`);
console.log(`[Worker] Redis: ${redisConnection.host}:${redisConnection.port}`);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM received, closing worker...');
  await worker.close();
  process.exit(0);
});
