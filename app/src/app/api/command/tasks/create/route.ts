import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { encrypt } from '@/lib/crypto'
import { cookies } from 'next/headers'
import crypto from 'crypto'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function getHmacSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET environment variable is required')
  }
  return secret
}

/**
 * Check if user has valid write access (2FA verified)
 */
async function checkWriteAccess(request: Request): Promise<{ hasAccess: boolean; requires2FA: boolean; needsSetup?: boolean }> {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    console.log('[Tasks/Create] checkWriteAccess session check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      sessionError: sessionError?.message
    })
    
    if (!session?.user) {
      console.log('[Tasks/Create] No session/user found - returning unauthorized')
      return { hasAccess: false, requires2FA: false }
    }

    const adminClient = createAdminClient()
    const { data: account, error: accountError } = await adminClient
      .from('accounts')
      .select('two_factor_enabled')
      .eq('auth_uid', session.user.id)
      .single()

    console.log('[Tasks/Create] Account lookup:', {
      hasAccount: !!account,
      two_factor_enabled: account?.two_factor_enabled,
      accountError: accountError?.message
    })

    if (!account?.two_factor_enabled) {
      return { hasAccess: false, requires2FA: true, needsSetup: true }
    }

    // Check for valid write token
    const cookieStore = await cookies()
    const writeAccessCookie = cookieStore.get('tiker_write_access')
    
    if (!writeAccessCookie?.value) {
      return { hasAccess: false, requires2FA: true }
    }

    const [token, expiresAtStr] = writeAccessCookie.value.split(':')
    const expiresAt = parseInt(expiresAtStr)

    if (Date.now() > expiresAt) {
      return { hasAccess: false, requires2FA: true }
    }

    const expectedToken = crypto
      .createHmac('sha256', getHmacSecret())
      .update(`${session.user.id}:${expiresAt}`)
      .digest('hex')

    if (token !== expectedToken) {
      return { hasAccess: false, requires2FA: true }
    }

    return { hasAccess: true, requires2FA: true }
  } catch (error) {
    console.error('Write access check error:', error)
    return { hasAccess: false, requires2FA: false }
  }
}

// POST /api/command/tasks/create - Create a new task (encrypts sensitive fields)
// REQUIRES 2FA - This is a write operation
export async function POST(request: Request) {
  console.log('[Tasks/Create] POST called')
  try {
    // Check 2FA for write access
    const writeAccess = await checkWriteAccess(request)
    console.log('[Tasks/Create] writeAccess result:', writeAccess)
    if (!writeAccess.hasAccess) {
      if (writeAccess.needsSetup) {
        return NextResponse.json({ 
          error: '2FA setup required', 
          code: '2FA_SETUP_REQUIRED',
          message: 'Please enable 2FA in Settings to create tasks'
        }, { status: 403 })
      }
      if (writeAccess.requires2FA) {
        return NextResponse.json({ 
          error: '2FA verification required', 
          code: '2FA_REQUIRED',
          message: 'Please verify 2FA to create tasks'
        }, { status: 403 })
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, description, assigned_agent_ids, tags, priority } = await request.json()

    if (!title) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Get account ID
    const { data: account } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Create task with encrypted fields
    const { data: task, error } = await adminClient
      .from('mc_tasks')
      .insert({
        title: encrypt(title),
        description: description ? encrypt(description) : null,
        assigned_agent_ids: assigned_agent_ids || [],
        tags: tags || [],
        priority: priority || 'normal',
        status: assigned_agent_ids?.length > 0 ? 'assigned' : 'inbox',
        account_id: account.id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    // Check execution mode and enqueue if cloud
    const { data: accountWithMode } = await adminClient
      .from('accounts')
      .select('execution_mode')
      .eq('id', account.id)
      .single()

    const executionMode = accountWithMode?.execution_mode || 'openclaw'

    // If cloud execution, enqueue the task
    if (executionMode === 'cloud-user-keys' || executionMode === 'cloud-our-keys') {
      try {
        // Enqueue task to cloud worker
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/tasks/enqueue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: task.id })
        })

        // Update status to executing
        await adminClient
          .from('mc_tasks')
          .update({ status: 'executing' })
          .eq('id', task.id)
      } catch (enqueueError) {
        console.error('Error enqueueing task:', enqueueError)
        // Don't fail the task creation, just log it
      }
    }

    // Return with decrypted fields for immediate use
    return NextResponse.json({
      ...task,
      title: title,
      description: description || null,
      status: executionMode.startsWith('cloud') ? 'executing' : task.status,
    })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
