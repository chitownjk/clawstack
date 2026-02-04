import { NextRequest, NextResponse } from 'next/server';
import { Queue } from 'bullmq';

// Support both REDIS_URL (Fly.io) and separate HOST/PORT (Upstash)
const redisConnection = process.env.REDIS_URL || {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};

const taskQueue = new Queue('tiker-tasks', {
  connection: redisConnection,
});

export async function POST(request: NextRequest) {
  try {
    const { taskId } = await request.json();

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId required' },
        { status: 400 }
      );
    }

    // Add task to queue
    await taskQueue.add('execute-task', { taskId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error enqueuing task:', error);
    return NextResponse.json(
      { error: 'Failed to enqueue task' },
      { status: 500 }
    );
  }
}
