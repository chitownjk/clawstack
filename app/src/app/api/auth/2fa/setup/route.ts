import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { generateSecret, generateURI } from 'otplib'
import QRCode from 'qrcode'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate TOTP secret
    const secret = generateSecret()
    
    // Generate QR code URL for authenticator apps
    const otpauth = generateURI({
      issuer: 'Tiker',
      label: session.user.email || 'user',
      secret,
    })
    
    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth)
    
    // Generate backup codes
    const backupCodes = Array.from({ length: 8 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    )
    
    // Store secret temporarily (not enabled yet until verified)
    // We'll store the pending secret in a separate field or just return it
    // and only save after verification
    
    return NextResponse.json({
      secret,
      qrCode: qrCodeDataUrl,
      backupCodes,
      manualEntry: secret // For manual entry in authenticator
    })
    
  } catch (error) {
    console.error('2FA setup error:', error)
    return NextResponse.json({ error: 'Failed to setup 2FA' }, { status: 500 })
  }
}
