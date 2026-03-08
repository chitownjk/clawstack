import { NextRequest, NextResponse } from 'next/server';
import { createRealSupabaseClient } from '@/lib/supabase-server';
import { COMPOSIO_TOOLKITS } from '@/lib/composio';

// GET /api/auth/composio/debug?toolkit=linkedin
// Uses the Composio REST API directly to list available actions.
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

    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'COMPOSIO_API_KEY not set' });
    }

    const results: Record<string, unknown> = { toolkit };

    // Use the Composio REST API to list actions for this app
    // Docs: https://docs.composio.dev/api-reference/actions/list-actions
    const slugsToTry = [config.toolkit, ...((config as any).toolkitFallbacks || [])];

    for (const appSlug of slugsToTry) {
      try {
        const res = await fetch(
          `https://backend.composio.dev/api/v2/actions?apps=${appSlug}&limit=50`,
          {
            headers: {
              'x-api-key': apiKey,
              'Content-Type': 'application/json',
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          const actions = (data.items || data.actions || data || []);
          results[`actions_${appSlug}`] = Array.isArray(actions)
            ? actions.map((a: any) => ({
                name: a.name,
                slug: a.slug || a.enum || a.actionName || a.action,
                displayName: a.displayName || a.display_name,
                description: (a.description || '').substring(0, 120),
              }))
            : data;
        } else {
          const text = await res.text();
          results[`actions_${appSlug}`] = { status: res.status, body: text.substring(0, 500) };
        }
      } catch (e) {
        results[`actions_${appSlug}`] = { error: (e as Error).message };
      }
    }

    // Also try v1 endpoint
    try {
      const res = await fetch(
        `https://backend.composio.dev/api/v1/actions?appNames=${config.toolkit}&limit=50`,
        {
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        const actions = (data.items || data.actions || data || []);
        results[`v1_actions`] = Array.isArray(actions)
          ? actions.map((a: any) => ({
              name: a.name,
              slug: a.slug || a.enum || a.actionName || a.action,
              displayName: a.displayName || a.display_name,
              appName: a.appName || a.app_name,
            }))
          : data;
      } else {
        results[`v1_actions`] = { status: res.status, body: (await res.text()).substring(0, 500) };
      }
    } catch (e) {
      results[`v1_actions`] = { error: (e as Error).message };
    }

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
