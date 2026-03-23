import { timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  const apiKeyHeader = request.headers.get('x-api-key')
  if (apiKeyHeader) {
    return apiKeyHeader
  }

  return null
}

function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)

  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

export async function requireBonnieInternalAuth(request: Request) {
  const configuredKey = process.env.BONNIE_INTERNAL_API_KEY
  if (!configuredKey) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'BONNIE_INTERNAL_API_KEY is not configured' },
        { status: 503 }
      )
    }
  }

  const providedKey = extractBearerToken(request)
  if (!providedKey) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'Authorization required. Use Authorization: Bearer <BONNIE_INTERNAL_API_KEY>.' },
        { status: 401 }
      )
    }
  }

  if (!safeCompare(providedKey, configuredKey)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const adminClient = createAdminClient()

  const accountEmail = process.env.BONNIE_INTERNAL_ACCOUNT_EMAIL || 'jklauminzer@gmail.com'

  const { data: account, error } = await adminClient
    .from('accounts')
    .select('id, email, tier, execution_mode')
    .eq('email', accountEmail)
    .single()

  if (error || !account) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'Configured Bonnie account not found' },
        { status: 500 }
      )
    }
  }

  return {
    ok: true as const,
    adminClient,
    account,
  }
}
