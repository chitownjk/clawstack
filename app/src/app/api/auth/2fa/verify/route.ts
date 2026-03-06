import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { verify } from 'otplib'
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { decrypt } from '@/lib/crypto'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

// Simple in-memory rate limiting (use Redis in production for multi-instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 5 // 5 attempts
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // per minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(identifier)
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }
  
  entry.count++
  return true
}

function getHmacSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    console.error('[2FA] NEXTAUTH_SECRET not set, using fallback')
    // Fallback for production - not ideal but prevents crash
    return 'tiker-fallback-secret-min-32-chars-long'
  }
  return secret
}

export async function POST(request: Request) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting to prevent brute-force attacks
    if (!checkRateLimit(session.user.id)) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
    }

    const { code } = await request.json()
    
    if (!code) {
      return NextResponse.json({ error: 'Code required' }, { status: 400 })
    }

    // Get user's 2FA secret
    const adminClient = createAdminClient()
    const { data: account, error: accountError } = await adminClient
      .from('accounts')
      .select('two_factor_secret, two_factor_backup_codes')
      .eq('auth_uid', session.user.id)
      .single()

    if (accountError || !account?.two_factor_secret) {
      return NextResponse.json({ error: '2FA not enabled' }, { status: 400 })
    }

    // Decrypt the secret before verification
    const decryptedSecret = decrypt(account.two_factor_secret)

    // Try TOTP verification first
    const verifyResult = await verify({ 
      token: code, 
      secret: decryptedSecret 
    })
    let isValid = verifyResult.valid

    // If not valid, check backup codes
    if (!isValid && account.two_factor_backup_codes) {
      const hashedCode = crypto.createHash('sha256').update(code.toUpperCase()).digest('hex')
      const backupIndex = account.two_factor_backup_codes.indexOf(hashedCode)
      
      if (backupIndex !== -1) {
        isValid = true
        // Remove used backup code
        const updatedCodes = [...account.two_factor_backup_codes]
        updatedCodes.splice(backupIndex, 1)
        
        await adminClient
          .from('accounts')
          .update({ two_factor_backup_codes: updatedCodes })
          .eq('auth_uid', session.user.id)
      }
    }

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    // Set 30-day cookie for write access
    const cookieStore = await cookies()
    const expiresAt = Date.now() + THIRTY_DAYS_MS
    
    // Create a signed token (in production, use proper JWT)
    const writeToken = crypto
      .createHmac('sha256', getHmacSecret())
      .update(`${session.user.id}:${expiresAt}`)
      .digest('hex')
    
    cookieStore.set('tiker_write_access', `${writeToken}:${expiresAt}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      path: '/',
    })

    return NextResponse.json({ 
      success: true,
      expiresAt: new Date(expiresAt).toISOString()
    })
    
  } catch (error) {
    console.error('2FA verify error:', error)
    return NextResponse.json({ error: 'Failed to verify 2FA' }, { status: 500 })
  }
}

// Check if user has valid write access
export async function GET(request: Request) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json({ hasWriteAccess: false, requires2FA: false })
    }

    // Check execution mode and 2FA status
    const adminClient = createAdminClient()
    const { data: account } = await adminClient
      .from('accounts')
      .select('two_factor_enabled, execution_mode')
      .eq('auth_uid', session.user.id)
      .single()

    // 2FA is now optional for all users. Everyone has write access by default.
    // 2FA remains available as an opt-in security feature in Settings.
    return NextResponse.json({
      hasWriteAccess: true,
      requires2FA: false,
      has2FAEnabled: !!account?.two_factor_enabled,
    })
    
  } catch (error) {
    console.error('2FA check error:', error)
    return NextResponse.json({ hasWriteAccess: false, requires2FA: false })
  }
}
