import { NextRequest, NextResponse } from 'next/server';
import { createRealSupabaseClient } from '@/lib/supabase-server';
import { getComposio, COMPOSIO_TOOLKITS } from '@/lib/composio';

// GET /api/auth/composio/debug?toolkit=linkedin
// Lists available actions for a toolkit so we can discover correct slug names.
// TEMPORARY - remove after confirming slugs.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRealSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const toolkit = new URL(request.url).searchParams.get('toolkit') || 'linkedin';
    const config = COMPOSIO_TOOLKITS[toolkit];
    if (!config) {
      return NextResponse.json({ error: `Unknown toolkit: ${toolkit}` });
    }

    const composio = getComposio();
    const composioUserId = `tiker_${user.id}`;
    const slugsToTry = [config.toolkit, ...((config as any).toolkitFallbacks || [])];

    const results: Record<string, unknown> = { toolkit, slugsToTry };

    // Try to get tools/actions for each slug variant
    for (const slug of slugsToTry) {
      try {
        // The Composio SDK may expose actions through different methods
        // Try getTools which is commonly available
        const tools = await (composio as any).getTools({
          apps: [slug],
        });
        results[`getTools_${slug}`] = tools?.map((t: any) => ({
          name: t.name,
          slug: t.slug,
          description: t.description?.substring(0, 100),
        }));
      } catch (e) {
        results[`getTools_${slug}`] = { error: (e as Error).message };
      }

      try {
        // Also try the actions property if it exists
        const actions = await (composio as any).actions?.list({
          apps: [slug],
        });
        results[`actions_${slug}`] = actions?.items?.map((a: any) => ({
          name: a.name,
          slug: a.slug || a.actionName,
          description: a.description?.substring(0, 100),
        }));
      } catch (e) {
        results[`actions_${slug}`] = { error: (e as Error).message };
      }
    }

    // Also check connections
    for (const slug of slugsToTry) {
      try {
        const conns = await composio.connectedAccounts.list({
          userIds: [composioUserId],
          toolkitSlugs: [slug],
        });
        results[`connections_${slug}`] = conns?.items?.map((c: any) => ({
          id: c.id,
          status: c.status,
          toolkitSlug: c.toolkitSlug,
        }));
      } catch (e) {
        results[`connections_${slug}`] = { error: (e as Error).message };
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
