import { NextRequest, NextResponse } from 'next/server';
import { createRealSupabaseClient } from '@/lib/supabase-server';
import { generateAIDraft } from '@/lib/action-executor';
import { getActionById } from '@/lib/action-registry';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRealSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { action_id, user_input } = body;

    if (!action_id || !user_input) {
      return NextResponse.json(
        { error: 'action_id and user_input are required' },
        { status: 400 }
      );
    }

    const action = getActionById(action_id);
    if (!action) {
      return NextResponse.json(
        { error: `Unknown action: ${action_id}` },
        { status: 400 }
      );
    }

    if (!action.aiDraft) {
      return NextResponse.json(
        { error: `Action ${action_id} does not support AI drafting` },
        { status: 400 }
      );
    }

    const result = await generateAIDraft(action_id, user_input);

    return NextResponse.json({
      draft: result.draft,
      suggestions: result.suggestions,
      action_id,
      action_name: action.name,
    });
  } catch (error: unknown) {
    console.error('Error generating draft:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate draft';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
