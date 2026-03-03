import { redirect } from 'next/navigation'
import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import MissionControlClient from './client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Command - Tiker',
  description: 'Your AI team task board',
}

export default async function MissionControlPage() {
  try {
    // Check authentication
    const supabase = await createRealSupabaseClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('[Command] Session error:', sessionError)
    }
    
    if (!session?.user) {
      redirect('/auth/login')
    }

    // Use admin client to bypass RLS for account lookup
    const adminClient = createAdminClient()
    const { data: account, error } = await adminClient
      .from('accounts')
      .select('id')
      .eq('auth_uid', session.user.id)
      .single()

    if (error) {
      console.error('[Command] Account lookup error:', error)
    }

    if (!account) {
      // Account doesn't exist - send to onboarding to create it
      redirect('/start')
    }

    // Everyone with an account gets MC!
    return <MissionControlClient />
  } catch (err) {
    console.error('[Command] Unexpected error:', err)
    throw err // Re-throw so Next.js shows error page
  }
}
