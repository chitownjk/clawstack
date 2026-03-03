import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { verify } from 'otplib'
import crypto from 'crypto'
import { encrypt } from '@/lib/crypto'

export async function POST(request: Request) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { secret, code, backupCodes } = await request.json()
    
    if (!secret || !code || !backupCodes) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify the code
    const verifyResult = await verify({ token: code, secret })
    const isValid = verifyResult.valid
    
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    // Hash backup codes before storing
    const hashedBackupCodes = backupCodes.map((code: string) => 
      crypto.createHash('sha256').update(code).digest('hex')
    )

    // Save to database with encrypted secret
    const adminClient = createAdminClient()
    const { error: updateError } = await adminClient
      .from('accounts')
      .update({
        two_factor_enabled: true,
        two_factor_secret: encrypt(secret), // Encrypted at rest
        two_factor_backup_codes: hashedBackupCodes, // Already hashed
      })
      .eq('auth_uid', session.user.id)

    if (updateError) {
      console.error('Failed to enable 2FA:', updateError)
      return NextResponse.json({ error: 'Failed to enable 2FA' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('2FA enable error:', error)
    return NextResponse.json({ error: 'Failed to enable 2FA' }, { status: 500 })
  }
}
