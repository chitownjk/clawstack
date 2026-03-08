import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// GET /api/smart-lists
// Returns all active smart lists for the user.
export async function GET() {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: account } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const { data: lists } = await adminClient
      .from('smart_lists')
      .select('*')
      .eq('account_id', account.id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })

    return NextResponse.json({ lists: lists || [] })
  } catch (error) {
    console.error('[SmartLists] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch lists' }, { status: 500 })
  }
}

// POST /api/smart-lists
// Create a new smart list or auto-generate one.
// Body: { name, type, items?, context?, auto_generate?: boolean }
// If auto_generate is true, AI generates initial items based on context.
export async function POST(request: Request) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: account } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, type, items, context, auto_generate } = body

    if (!name) {
      return NextResponse.json({ error: 'name required' }, { status: 400 })
    }

    let listItems = items || []

    // Auto-generate items using AI based on type and context
    if (auto_generate) {
      listItems = await generateListItems(type || 'custom', name, context || {})
    }

    const { data: list, error } = await adminClient
      .from('smart_lists')
      .insert({
        account_id: account.id,
        name,
        type: type || 'custom',
        items: listItems,
        context: context || {},
        auto_generated: !!auto_generate,
      })
      .select()
      .single()

    if (error) {
      console.error('[SmartLists] Create error:', error)
      return NextResponse.json({ error: 'Failed to create list' }, { status: 500 })
    }

    return NextResponse.json({ list })
  } catch (error) {
    console.error('[SmartLists] Error:', error)
    return NextResponse.json({ error: 'Failed to create list' }, { status: 500 })
  }
}

// PATCH /api/smart-lists
// Update a smart list (add/remove/check items, rename, archive).
// Body: { list_id, action, ... }
export async function PATCH(request: Request) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: account } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const body = await request.json()
    const { list_id, action } = body

    if (!list_id || !action) {
      return NextResponse.json({ error: 'list_id and action required' }, { status: 400 })
    }

    // Fetch the list
    const { data: list } = await adminClient
      .from('smart_lists')
      .select('*')
      .eq('id', list_id)
      .eq('account_id', account.id)
      .single()

    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    const currentItems: any[] = list.items || []

    switch (action) {
      case 'add_item': {
        const newItem = {
          text: body.text,
          checked: false,
          added_at: new Date().toISOString(),
          source: body.source || 'manual',
        }
        currentItems.push(newItem)
        break
      }
      case 'check_item': {
        const idx = body.index
        if (idx >= 0 && idx < currentItems.length) {
          currentItems[idx].checked = !currentItems[idx].checked
        }
        break
      }
      case 'remove_item': {
        const removeIdx = body.index
        if (removeIdx >= 0 && removeIdx < currentItems.length) {
          currentItems.splice(removeIdx, 1)
        }
        break
      }
      case 'rename': {
        await adminClient
          .from('smart_lists')
          .update({ name: body.name, updated_at: new Date().toISOString() })
          .eq('id', list_id)
        return NextResponse.json({ success: true })
      }
      case 'archive': {
        await adminClient
          .from('smart_lists')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', list_id)
        return NextResponse.json({ success: true })
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    await adminClient
      .from('smart_lists')
      .update({ items: currentItems, updated_at: new Date().toISOString() })
      .eq('id', list_id)

    return NextResponse.json({ success: true, items: currentItems })
  } catch (error) {
    console.error('[SmartLists] Error:', error)
    return NextResponse.json({ error: 'Failed to update list' }, { status: 500 })
  }
}

// AI-generate list items based on type and context
async function generateListItems(
  type: string,
  name: string,
  context: any
): Promise<Array<{ text: string; checked: boolean; added_at: string; source: string }>> {
  try {
    const anthropic = new Anthropic()

    const prompts: Record<string, string> = {
      packing: `Generate a packing list for: ${name}. ${context.destination ? `Destination: ${context.destination}.` : ''} ${context.duration ? `Duration: ${context.duration}.` : ''} ${context.weather ? `Weather: ${context.weather}.` : ''} Include essentials, toiletries, clothing, electronics, documents.`,
      shopping: `Generate a shopping list for: ${name}. ${context.meal_plan ? `Meal plan: ${context.meal_plan}.` : ''} ${context.people ? `For ${context.people} people.` : ''} Group by category (produce, dairy, etc).`,
      errands: `Generate an errands list for: ${name}. ${context.location ? `Location: ${context.location}.` : ''} Include typical errands that need to be done.`,
      prep: `Generate a preparation checklist for: ${name}. ${context.event ? `Event: ${context.event}.` : ''} ${context.date ? `Date: ${context.date}.` : ''} Include all preparation steps.`,
      custom: `Generate a checklist for: ${name}. ${JSON.stringify(context)}`,
    }

    const prompt = prompts[type] || prompts.custom

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 800,
      system: 'You are a helpful assistant that generates practical checklists. Return a JSON array of strings, each being a list item. Keep items concise (5-10 words each). Return 10-20 items.',
      messages: [{ role: 'user', content: `${prompt}\n\nReturn ONLY a JSON array of strings.` }],
    })

    const aiText = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('')

    const cleaned = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)

    if (Array.isArray(parsed)) {
      return parsed.map((text: string) => ({
        text: String(text),
        checked: false,
        added_at: new Date().toISOString(),
        source: 'ai_generated',
      }))
    }

    return []
  } catch (error) {
    console.error('[SmartLists] AI generation error:', error)
    return []
  }
}
