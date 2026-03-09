import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

const BUCKET_NAME = 'mc-files'

// GET /api/files/[id] - Get file metadata and signed download URL
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get file metadata
    const { data: file, error } = await adminClient
      .from('mc_files')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Verify ownership
    const { data: account } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account || account.id !== file.account_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Generate signed URL (valid for 1 hour)
    const { data: urlData, error: urlError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(file.path, 3600)

    if (urlError) {
      console.error('[Files/Get] URL error:', urlError)
      return NextResponse.json({ 
        error: 'Failed to generate download URL',
        details: urlError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      ...file,
      url: urlData.signedUrl,
    })
  } catch (error) {
    console.error('[Files/Get] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// PATCH /api/files/[id] - Rename a file
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name } = await request.json()
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Get file metadata
    const { data: file, error } = await adminClient
      .from('mc_files')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Verify ownership
    const { data: account } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account || account.id !== file.account_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Sanitize the new name - preserve extension
    const oldExt = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : ''
    let newName = name.trim()
    // Add back the extension if user didn't include it
    if (oldExt && !newName.endsWith(oldExt)) {
      newName = newName + oldExt
    }

    // Update the name in the database (storage path stays the same)
    const { data: updated, error: updateError } = await adminClient
      .from('mc_files')
      .update({ name: newName })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[Files/Rename] DB error:', updateError)
      return NextResponse.json({ error: 'Failed to rename file' }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[Files/Rename] Error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// DELETE /api/files/[id] - Delete file and metadata
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get file metadata
    const { data: file, error } = await adminClient
      .from('mc_files')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Verify ownership
    const { data: account } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account || account.id !== file.account_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([file.path])

    if (storageError) {
      console.error('[Files/Delete] Storage error:', storageError)
      // Continue anyway - metadata cleanup is more important
    }

    // Delete metadata
    const { error: dbError } = await adminClient
      .from('mc_files')
      .delete()
      .eq('id', id)

    if (dbError) {
      console.error('[Files/Delete] DB error:', dbError)
      return NextResponse.json({ 
        error: 'Failed to delete file metadata',
        details: dbError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Files/Delete] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
