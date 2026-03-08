import { NextRequest, NextResponse } from 'next/server';
import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server';
import { executeComposioAction, mapFormToComposioParams } from '@/lib/action-executor';
import { getActionById } from '@/lib/action-registry';
import { encrypt } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRealSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: account } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', session.user.id)
      .single();

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action_id, content, form_data, schedule_for, create_task } = body;

    if (!action_id) {
      return NextResponse.json({ error: 'action_id is required' }, { status: 400 });
    }

    const action = getActionById(action_id);
    if (!action) {
      return NextResponse.json({ error: `Unknown action: ${action_id}` }, { status: 400 });
    }

    const composioUserId = `tiker_${session.user.id}`;

    // Build params for Composio from form data + content (AI draft or user-written)
    const mergedData = {
      ...form_data,
      content,
      draft: content,
    };
    const composioParams = mapFormToComposioParams(action_id, mergedData);

    // If scheduling for later, save to executed_actions and return
    if (schedule_for) {
      const { data: scheduled } = await adminClient
        .from('mc_executed_actions')
        .insert({
          account_id: account.id,
          service: action.service,
          action_name: action.name,
          input_data: form_data,
          ai_draft: content ? encrypt(content) : null,
          final_content: content ? encrypt(content) : null,
          status: 'scheduled',
          scheduled_for: schedule_for,
        })
        .select('id')
        .single();

      return NextResponse.json({
        success: true,
        scheduled: true,
        executed_action_id: scheduled?.id,
        message: `Scheduled for ${new Date(schedule_for).toLocaleString()}`,
      });
    }

    // Execute now
    const result = await executeComposioAction(composioUserId, action, composioParams);

    // Log execution
    const { data: executedAction } = await adminClient
      .from('mc_executed_actions')
      .insert({
        account_id: account.id,
        service: action.service,
        action_name: action.name,
        input_data: form_data,
        final_content: content ? encrypt(content) : null,
        status: result.success ? 'completed' : 'failed',
        composio_response: result.response || null,
        error_message: result.error || null,
        executed_at: result.success ? new Date().toISOString() : null,
      })
      .select('id')
      .single();

    // Optionally create a task record for tracking
    let taskId = null;
    if (create_task && result.success) {
      const taskTitle = `${action.name}: ${getTaskTitle(action_id, mergedData)}`;
      const { data: task } = await adminClient
        .from('mc_tasks')
        .insert({
          account_id: account.id,
          title: encrypt(taskTitle),
          description: content ? encrypt(content) : null,
          status: 'done',
          priority: 'normal',
          action_type: action.category,
          action_template_id: null,
          action_meta: {
            action_id,
            service: action.service,
            executed_action_id: executedAction?.id,
          },
          completed_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      taskId = task?.id;

      // Update executed_action with task_id
      if (executedAction?.id && taskId) {
        await adminClient
          .from('mc_executed_actions')
          .update({ task_id: taskId })
          .eq('id', executedAction.id);
      }
    }

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
        executed_action_id: executedAction?.id,
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      executed_action_id: executedAction?.id,
      task_id: taskId,
      slug_used: result.slugUsed,
    });
  } catch (error: unknown) {
    console.error('Error executing action:', error);
    const message = error instanceof Error ? error.message : 'Failed to execute action';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Generate a short title for the task from form data
function getTaskTitle(actionId: string, data: Record<string, unknown>): string {
  const content = String(data.content || data.topic || data.title || data.subject || data.summary || '');
  if (content.length <= 60) return content;
  return content.substring(0, 57) + '...';
}
