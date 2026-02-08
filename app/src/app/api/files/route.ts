import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/files - List files with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    
    // Get account
    const { data: account } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const taskId = searchParams.get('task_id')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query
    let query = adminClient
      .from('mc_files')
      .select('*')
      .eq('account_id', account.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (taskId) {
      query = query.eq('task_id', taskId)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data: files, error } = await query

    if (error) {
      console.error('[Files/List] Error:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch files',
        details: error.message 
      }, { status: 500 })
    }

    // Get storage usage
    const { data: usage } = await adminClient.rpc('get_storage_usage', {
      account_uuid: account.id
    })

    return NextResponse.json({
      files: files || [],
      usage_bytes: usage || 0,
    })
  } catch (error) {
    console.error('[Files/List] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
