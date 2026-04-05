import { createServerSupabaseClient, createAdminClient, createRealSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { encrypt } from '@/lib/crypto'
import crypto from 'crypto'
import { generateUniqueTikerUsername } from '@/lib/tiker-username'

/**
 * Generate a secure API key for a bot
 */
function generateApiKey(): { key: string; hash: string } {
  const key = 'sk_' + crypto.randomBytes(32).toString('hex')
  const hash = crypto.createHash('sha256').update(key).digest('hex')
  return { key, hash }
}

/**
 * Create a default assistant bot for a new account
 */
async function createDefaultBot(adminClient: any, accountId: string, accountName: string | null) {
  const { key: apiKey, hash: apiKeyHash } = generateApiKey()
  
  const botName = accountName ? `${accountName.split(' ')[0]}'s Assistant` : 'My Assistant'
  
  const { data: bot, error } = await adminClient
    .from('bots')
    .insert({
      account_id: accountId,
      name: botName,
      emoji: '🤖',
      description: 'Your all-purpose AI assistant. Questions, planning, research, drafts, code help.',
      api_key_hash: apiKeyHash,
      trust_tier: 3, // New accounts start at tier 3 (untrusted)
      is_active: true,
      capabilities: ['general', 'chat', 'research'],
      model_config: {
        model: 'anthropic/claude-sonnet-4-5',
        temperature: 0.7,
        max_tokens: 4000
      },
      system_prompt: `You are ${botName}, a helpful AI assistant.`,
    })
    .select()
    .single()
  
  if (error) {
    console.error('[Auth Callback] Failed to create default bot:', error)
    return null
  }
  
  // Create a task in Command to set up the agent
  const { error: taskError } = await adminClient
    .from('mc_tasks')
    .insert({
      account_id: accountId,
      title: encrypt(`Set up your first agent: ${botName}`),
      description: encrypt(`Welcome to Tiker! Your first agent "${botName}" has been created.

## Next Steps:

1. **Customize your agent** (optional)
   - Current name: ${botName}
   - You can rename it, change the emoji, or adjust the personality

2. **Set up 2FA for write access**
   - Go to Settings -> Security
   - Enable two-factor authentication
   - This is required to create tasks and edit your board

3. **Connect your OpenClaw gateway** (optional)
   - Install the Tiker skill in your OpenClaw workspace
   - Generate an API key in Settings -> API Keys
   - This lets your agents work autonomously

4. **Create your first task**
   - Click "+ Create Task" in Command
   - Assign it to your agent
   - Watch it work!`),
      status: 'inbox',
      priority: 'high',
      tags: ['onboarding', 'setup'],
      assigned_agent_ids: [],
    })
  
  if (taskError) {
    console.error('[Auth Callback] Failed to create onboarding task:', taskError)
  }
  
  return { bot, apiKey }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/command'

  if (code) {
    try {
      // Always use real Supabase client for OAuth (not mock)
      const supabase = await createRealSupabaseClient()
      
      // First check if already logged in (handles PKCE race conditions)
      const { data: existingSession } = await supabase.auth.getSession()
      if (existingSession?.session?.user) {
        console.log('[Auth Callback] Already have session, skipping exchange')
        return NextResponse.redirect(`${origin}${next}`)
      }
      
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      console.log('[Auth Callback] exchangeCodeForSession result:', { 
        hasData: !!data, 
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        error: error?.message 
      })
    
      if (error) {
        // PKCE error but user might still be logged in - check session
        const { data: sessionCheck } = await supabase.auth.getSession()
        if (sessionCheck?.session?.user) {
          console.log('[Auth Callback] Exchange failed but session exists, continuing')
          return NextResponse.redirect(`${origin}${next}`)
        }
        console.error('[Auth Callback] Exchange error:', error)
        return NextResponse.redirect(`${origin}/auth/login?error=exchange_failed`)
      }
      
      if (!data?.user) {
        console.error('[Auth Callback] No user in response')
        return NextResponse.redirect(`${origin}/auth/login?error=no_user`)
      }

      const user = data.user
      // Check if this human exists, create if not
      const adminClient = createAdminClient()
      
      const { data: existingAccount } = await adminClient
        .from('accounts')
        .select('id, tier')
        .eq('auth_uid', data.user.id)
        .single()

      if (!existingAccount) {
        // Generate a unique tiker username for the personal email address
        const tikerUsername = await generateUniqueTikerUsername(
          adminClient,
          data.user.email!,
          data.user.user_metadata?.full_name || null
        )

        // Create new account with team tier
        const { data: newAccount, error: createError } = await adminClient
          .from('accounts')
          .insert({
            auth_uid: data.user.id,
            email: data.user.email!,
            name: data.user.user_metadata?.full_name || null,
            avatar_url: data.user.user_metadata?.avatar_url || null,
            verification_tier: 'silver',
            verified_at: new Date().toISOString(),
            google_id: data.user.user_metadata?.provider_id || null,
            tier: 'solo', // Free trial tier (100 tasks/month)
            tiker_username: tikerUsername,
          })
          .select('id, name')
          .single()

        if (createError) {
          console.error('[Auth Callback] Error creating account:', createError)
        } else {
          console.log('[Auth Callback] Account created for:', data.user.id, 'with Team tier')
          
          // Create default bot for the new account
          const botResult = await createDefaultBot(adminClient, newAccount.id, newAccount.name)
          if (botResult) {
            console.log('[Auth Callback] Default bot created:', botResult.bot.id)
          }
        }

        // New user - redirect to onboarding (pricing selection)
        // The new_signup param triggers the sign_up GA4 event on the client
        return NextResponse.redirect(`${origin}/onboarding?new_signup=1`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    } catch (err) {
      console.error('[Auth Callback] Unexpected error:', err)
      return NextResponse.redirect(`${origin}/auth/login?error=callback_error`)
    }
  }

  // No code provided
  return NextResponse.redirect(`${origin}/auth/login?error=no_code`)
}
