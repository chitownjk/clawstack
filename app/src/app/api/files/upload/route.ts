import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const BUCKET_NAME = 'mc-files'

// Rate limiter: 10 uploads per minute per user
const ratelimit = process.env.UPSTASH_REDIS_REST_URL
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      prefix: 'ratelimit:upload',
    })
  : null

// File size limits by tier (bytes)
const SIZE_LIMITS = {
  free: 5 * 1024 * 1024,      // 5MB
  solo: 25 * 1024 * 1024,     // 25MB
  developer: 100 * 1024 * 1024, // 100MB
  team: 100 * 1024 * 1024,      // 100MB
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit by user ID
    if (ratelimit) {
      const { success } = await ratelimit.limit(session.user.id)
      if (!success) {
        return NextResponse.json(
          { error: 'Upload rate limit exceeded. Try again in a minute.', code: 'RATE_LIMITED' },
          { status: 429 }
        )
      }
    }

    // Get account
    const adminClient = createAdminClient()
    const { data: account } = await adminClient
      .from('accounts')
      .select('id, plan_tier')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const taskId = formData.get('task_id') as string | null
    const agentId = formData.get('agent_id') as string | null
    const description = formData.get('description') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Check file size limit for account tier
    const maxSize = SIZE_LIMITS[account.plan_tier as keyof typeof SIZE_LIMITS] || SIZE_LIMITS.free
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File too large. Maximum size for your plan: ${Math.round(maxSize / 1024 / 1024)}MB`,
        code: 'FILE_TOO_LARGE'
      }, { status: 413 })
    }

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

    // Generate storage path: {account_id}/{year}/{month}/{task_id?}/{filename}
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    
    const pathParts = [
      account.id,
      year.toString(),
      month,
    ]
    
    if (taskId) {
      pathParts.push(taskId)
    }
    
    // Sanitize filename
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    pathParts.push(sanitizedName)
    
    const storagePath = pathParts.join('/')

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer()
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false, // Don't overwrite existing files
      })

    if (uploadError) {
      console.error('[Files/Upload] Storage error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Insert metadata into mc_files
    const { data: fileRecord, error: dbError } = await adminClient
      .from('mc_files')
      .insert({
        account_id: account.id,
        task_id: taskId || null,
        name: file.name,
        path: storagePath,
        size_bytes: file.size,
        mime_type: file.type || 'application/octet-stream',
        uploaded_by_agent_id: agentId || null,
        description: description || null,
      })
      .select()
      .single()

    if (dbError) {
      console.error('[Files/Upload] DB error:', dbError)
      // Clean up uploaded file
      await supabase.storage.from(BUCKET_NAME).remove([storagePath])
      return NextResponse.json({ error: 'Failed to save file metadata' }, { status: 500 })
    }

    // Get signed URL for immediate access
    const { data: urlData } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, 3600) // 1 hour

    return NextResponse.json({
      ...fileRecord,
      url: urlData?.signedUrl,
    })
  } catch (error) {
    console.error('[Files/Upload] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
