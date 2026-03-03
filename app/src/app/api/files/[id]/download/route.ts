import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const fileId = params.id
    const { searchParams } = new URL(request.url)
    const forceDownload = searchParams.get('attachment') === 'true'

    // Get file metadata
    const adminClient = createAdminClient()
    const { data: file, error: fileError } = await adminClient
      .from('mc_files')
      .select('*')
      .eq('id', fileId)
      .single()

    if (fileError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Verify user owns this file
    const { data: account } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account || account.id !== file.account_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Download from Supabase Storage
    const { data: fileData, error: downloadError } = await adminClient.storage
      .from('mc-files')
      .download(file.path)

    if (downloadError || !fileData) {
      console.error('[Files] Download error:', downloadError)
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
    }

    // Convert blob to buffer
    const buffer = await fileData.arrayBuffer()

    // Return file with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': file.mime_type || 'application/octet-stream',
        'Content-Disposition': forceDownload
          ? `attachment; filename="${file.name}"`
          : `inline; filename="${file.name}"`,
        'Content-Length': file.size_bytes.toString(),
      },
    })
  } catch (error) {
    console.error('[Files] Download error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
