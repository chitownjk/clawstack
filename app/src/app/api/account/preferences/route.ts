import { NextResponse } from 'next/server'
import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'

// PATCH /api/account/preferences
// Update account preferences (is_advanced_mode, first_name, use_case, default_view)
// Uses service_role admin client to bypass RLS triggers that reference auth.users
export async function PATCH(request: Request) {
  try {
    // Authenticate via the user's session cookies
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()

    // Whitelist allowed fields
    const allowed = ['is_advanced_mode', 'first_name', 'use_case', 'default_view']
    const updates: Record<string, any> = {}
    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates[key] = body[key]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Use admin client (service_role) to bypass RLS/trigger permission issues
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('accounts')
      .update(updates)
      .eq('auth_uid', session.user.id)
      .select('id, is_advanced_mode, first_name, use_case, default_view')
      .single()

    if (error) {
      console.error('Failed to update account preferences:', error.message)
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
    }

    return NextResponse.json({ account: data })
  } catch (err: unknown) {
    console.error('Preferences update error:', err)
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
  }
}
