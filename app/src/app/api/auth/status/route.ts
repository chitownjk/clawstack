import { NextResponse } from 'next/server'
import { getAuthMode, hasLocalSession } from '@/lib/local-auth'
import { createRealSupabaseClient } from '@/lib/supabase-server'

// GET /api/auth/status - Check current auth status
export async function GET() {
  const authMode = getAuthMode()
  
  if (authMode === 'local') {
    // Local mode - always authenticated
    return NextResponse.json({
      authMode,
      authenticated: true,
    })
  }
  
  if (authMode === 'password') {
    // Password mode - check for session
    const hasSession = await hasLocalSession()
    return NextResponse.json({
      authMode,
      authenticated: hasSession,
    })
  }
  
  // Supabase mode - check Supabase session
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    return NextResponse.json({
      authMode,
      authenticated: !!session,
    })
  } catch {
    return NextResponse.json({
      authMode,
      authenticated: false,
    })
  }
}
