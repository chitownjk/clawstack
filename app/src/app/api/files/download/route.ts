import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

const BUCKET_NAME = 'mc-files'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')

    if (!path) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 })
    }

    // Get authenticated user
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // Get account
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('auth_uid', user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Verify path belongs to this account (security check)
    if (!path.startsWith(account.id + '/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(BUCKET_NAME)
      .download(path)

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Infer content type from filename
    const filename = path.split('/').pop() || 'file'
    const ext = filename.split('.').pop()?.toLowerCase()
    const contentTypeMap: Record<string, string> = {
      md: 'text/markdown',
      txt: 'text/plain',
      json: 'application/json',
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
    }
    const contentType = contentTypeMap[ext || ''] || 'application/octet-stream'

    // Return file
    return new NextResponse(fileData, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
  }
}
