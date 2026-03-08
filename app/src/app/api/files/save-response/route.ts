import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/crypto'

const BUCKET_NAME = 'mc-files'

/**
 * POST /api/files/save-response
 * Saves a task comment (AI response) as a named markdown file in the user's library.
 */
export async function POST(request: NextRequest) {
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
      .select('id, plan_tier')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { commentId, taskId, fileName } = body as {
      commentId: string
      taskId: string
      fileName?: string
    }

    if (!commentId || !taskId) {
      return NextResponse.json({ error: 'commentId and taskId are required' }, { status: 400 })
    }

    // Fetch the comment and verify ownership
    const { data: comment, error: commentError } = await adminClient
      .from('mc_comments')
      .select('id, content, agent_id, account_id, created_at')
      .eq('id', commentId)
      .eq('account_id', account.id)
      .single()

    if (commentError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Fetch the task title for auto-naming
    const { data: task } = await adminClient
      .from('mc_tasks')
      .select('id, title')
      .eq('id', taskId)
      .eq('account_id', account.id)
      .single()

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Decrypt content and task title
    const decryptedContent = decrypt(comment.content)
    const decryptedTitle = decrypt(task.title)

    // Check storage quota
    const { data: isOverLimit } = await adminClient.rpc('is_over_storage_limit', {
      account_uuid: account.id
    })

    if (isOverLimit) {
      return NextResponse.json({
        error: 'Storage quota exceeded. Delete some files or upgrade your plan.',
        code: 'QUOTA_EXCEEDED'
      }, { status: 507 })
    }

    // Generate filename
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0] // YYYY-MM-DD
    const baseName = sanitizeFileName(fileName || decryptedTitle)
    const fullName = `${baseName} - ${dateStr}.md`

    // Generate storage path
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const storagePath = [
      account.id,
      year.toString(),
      month,
      taskId,
      sanitizeForPath(fullName),
    ].join('/')

    // Convert content to a buffer
    const contentBuffer = Buffer.from(decryptedContent, 'utf-8')

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, contentBuffer, {
        contentType: 'text/markdown',
        upsert: false,
      })

    if (uploadError) {
      console.error('[Files/SaveResponse] Storage error:', uploadError)
      // If file already exists, try with a numeric suffix
      if (uploadError.message?.includes('already exists') || uploadError.message?.includes('Duplicate')) {
        const altName = `${baseName} - ${dateStr} (${Date.now() % 1000}).md`
        const altPath = [account.id, year.toString(), month, taskId, sanitizeForPath(altName)].join('/')
        const { error: retryError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(altPath, contentBuffer, { contentType: 'text/markdown', upsert: false })

        if (retryError) {
          return NextResponse.json({ error: 'Failed to upload file', details: retryError.message }, { status: 500 })
        }

        // Use the alt path for the record
        return await insertFileRecord(adminClient, supabase, {
          accountId: account.id,
          taskId,
          name: altName,
          path: altPath,
          sizeBytes: contentBuffer.length,
          agentId: comment.agent_id,
          description: `Saved from task: ${decryptedTitle}`,
          commentId,
        })
      }
      return NextResponse.json({ error: 'Failed to upload file', details: uploadError.message }, { status: 500 })
    }

    // Insert file record
    return await insertFileRecord(adminClient, supabase, {
      accountId: account.id,
      taskId,
      name: fullName,
      path: storagePath,
      sizeBytes: contentBuffer.length,
      agentId: comment.agent_id,
      description: `Saved from task: ${decryptedTitle}`,
      commentId,
    })
  } catch (error) {
    console.error('[Files/SaveResponse] Error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// Insert the mc_files record and return the response
async function insertFileRecord(
  adminClient: ReturnType<typeof createAdminClient>,
  supabase: Awaited<ReturnType<typeof createRealSupabaseClient>>,
  opts: {
    accountId: string
    taskId: string
    name: string
    path: string
    sizeBytes: number
    agentId: string | null
    description: string
    commentId: string
  }
) {
  const { data: fileRecord, error: dbError } = await adminClient
    .from('mc_files')
    .insert({
      account_id: opts.accountId,
      task_id: opts.taskId,
      name: opts.name,
      path: opts.path,
      size_bytes: opts.sizeBytes,
      mime_type: 'text/markdown',
      uploaded_by_agent_id: opts.agentId || null,
      description: opts.description,
      metadata: { source: 'comment', comment_id: opts.commentId },
    })
    .select()
    .single()

  if (dbError) {
    console.error('[Files/SaveResponse] DB error:', dbError)
    // Clean up uploaded file
    await supabase.storage.from(BUCKET_NAME).remove([opts.path])
    return NextResponse.json({ error: 'Failed to save file metadata', details: dbError.message }, { status: 500 })
  }

  // Get signed URL for immediate access
  const { data: urlData } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(opts.path, 3600)

  return NextResponse.json({
    file: fileRecord,
    url: urlData?.signedUrl,
  })
}

// Sanitize for display name (keep spaces, basic punctuation)
function sanitizeFileName(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, '')  // Remove invalid filename chars
    .replace(/\s+/g, ' ')          // Collapse whitespace
    .trim()
    .substring(0, 200)             // Limit length
    || 'Untitled'
}

// Sanitize for storage path (more restrictive)
function sanitizeForPath(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._\- ]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 200)
}
