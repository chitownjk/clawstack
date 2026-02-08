import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import StartPageClient from './StartPageClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Welcome to Tiker',
  description: 'Get started with your AI team',
}

export default async function StartPage() {
  const supabase = await createRealSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    redirect('/auth/login')
  }

  // Ensure account exists (fallback for users who signed up before fix)
  const adminClient = createAdminClient()
  const { data: account } = await adminClient
    .from('accounts')
    .select('id, name, tier')
    .eq('auth_uid', session.user.id)
    .single()

  if (!account) {
    console.log('[Start] No account found, redirecting to auth callback to create one')
    redirect('/auth/callback?code=setup')
  }

  // Fetch the user's default bot (created in auth callback)
  const { data: bot } = await adminClient
    .from('bots')
    .select('*')
    .eq('account_id', account.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const userName = session.user.user_metadata?.full_name?.split(' ')[0] || 'there'

  return <StartPageClient 
    userName={userName} 
    initialBot={bot}
    accountTier={account.tier}
  />
}
