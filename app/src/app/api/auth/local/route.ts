import { NextResponse } from 'next/server'
import { verifyPassword, createLocalSession, clearLocalSession, getAuthMode } from '@/lib/local-auth'

// POST /api/auth/local - Login with password
export async function POST(request: Request) {
  const mode = getAuthMode()
  
  if (mode !== 'password') {
    return NextResponse.json({ error: 'Password auth not enabled' }, { status: 400 })
  }
  
  try {
    const { password } = await request.json()
    
    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 })
    }
    
    if (!verifyPassword(password)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }
    
    // Create session
    await createLocalSession()
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Local auth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}

// DELETE /api/auth/local - Logout
export async function DELETE() {
  await clearLocalSession()
  return NextResponse.json({ success: true })
}
