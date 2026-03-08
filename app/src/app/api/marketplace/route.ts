import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// GET /api/marketplace
// Agent Marketplace -- lists available agents and integrations.
// Built-in agents are always available. Community/third-party agents
// can be installed from the marketplace.
//
// Query params:
//   category?: string (productivity, finance, health, travel, social, developer)
//   search?: string
//   installed?: boolean (filter to only installed agents)
export async function GET(request: Request) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: account } = await adminClient
      .from('accounts')
      .select('id, plan_tier')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const url = new URL(request.url)
    const category = url.searchParams.get('category')
    const search = url.searchParams.get('search')?.toLowerCase()
    const installedOnly = url.searchParams.get('installed') === 'true'

    // Get user's installed agents
    const installedAgents = await getInstalledAgents(adminClient, account.id)
    const installedIds = new Set(installedAgents.map((a: any) => a.agent_id))

    // Get all available agents
    let agents = getBuiltInAgents()

    // Add community agents (from DB in the future)
    agents.push(...getCommunityAgents())

    // Mark installed status
    agents = agents.map(agent => ({
      ...agent,
      installed: agent.built_in || installedIds.has(agent.id),
    }))

    // Filter
    if (category) {
      agents = agents.filter(a => a.category === category)
    }
    if (search) {
      agents = agents.filter(a =>
        a.name.toLowerCase().includes(search) ||
        a.description.toLowerCase().includes(search) ||
        a.tags.some((t: string) => t.toLowerCase().includes(search))
      )
    }
    if (installedOnly) {
      agents = agents.filter(a => a.installed)
    }

    const categories = Array.from(new Set(agents.map(a => a.category)))

    return NextResponse.json({
      agents,
      total: agents.length,
      categories,
      plan: account.plan_tier,
    })
  } catch (error) {
    console.error('[Marketplace] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch marketplace' }, { status: 500 })
  }
}

// POST /api/marketplace
// Install or uninstall a marketplace agent.
// Body: { agent_id: string, action: 'install' | 'uninstall' }
export async function POST(request: Request) {
  try {
    const supabase = await createRealSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: account } = await adminClient
      .from('accounts')
      .select('id, plan_tier')
      .eq('auth_uid', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const body = await request.json()
    const { agent_id, action } = body

    if (!agent_id || !action) {
      return NextResponse.json({ error: 'agent_id and action required' }, { status: 400 })
    }

    if (action === 'install') {
      // Check plan limits
      const installed = await getInstalledAgents(adminClient, account.id)
      const maxAgents = account.plan_tier === 'free' ? 3 : account.plan_tier === 'pro' ? 10 : 50

      if (installed.length >= maxAgents) {
        return NextResponse.json({
          error: `Plan limit reached. ${account.plan_tier} allows ${maxAgents} installed agents.`,
          upgrade_required: true,
        }, { status: 403 })
      }

      // Install the agent
      await adminClient
        .from('mc_activities')
        .insert({
          account_id: account.id,
          type: 'agent_install',
          message: `Installed agent: ${agent_id}`,
          metadata: { agent_id, action: 'install' },
        })

      // Store in user preferences
      const { data: prefs } = await adminClient
        .from('mc_user_preferences')
        .select('id, data')
        .eq('account_id', account.id)
        .eq('key', 'installed_agents')
        .single()

      if (prefs) {
        const current = prefs.data?.agents || []
        if (!current.includes(agent_id)) {
          current.push(agent_id)
          await adminClient
            .from('mc_user_preferences')
            .update({ data: { agents: current }, updated_at: new Date().toISOString() })
            .eq('id', prefs.id)
        }
      } else {
        await adminClient
          .from('mc_user_preferences')
          .insert({
            account_id: account.id,
            key: 'installed_agents',
            data: { agents: [agent_id] },
          })
      }

      return NextResponse.json({ success: true, action: 'installed', agent_id })
    }

    if (action === 'uninstall') {
      const { data: prefs } = await adminClient
        .from('mc_user_preferences')
        .select('id, data')
        .eq('account_id', account.id)
        .eq('key', 'installed_agents')
        .single()

      if (prefs) {
        const current = (prefs.data?.agents || []).filter((id: string) => id !== agent_id)
        await adminClient
          .from('mc_user_preferences')
          .update({ data: { agents: current }, updated_at: new Date().toISOString() })
          .eq('id', prefs.id)
      }

      return NextResponse.json({ success: true, action: 'uninstalled', agent_id })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[Marketplace] Error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}

async function getInstalledAgents(adminClient: any, accountId: string) {
  try {
    const { data: prefs } = await adminClient
      .from('mc_user_preferences')
      .select('data')
      .eq('account_id', accountId)
      .eq('key', 'installed_agents')
      .single()

    if (prefs?.data?.agents) {
      return prefs.data.agents.map((id: string) => ({ agent_id: id }))
    }
    return []
  } catch {
    return []
  }
}

interface MarketplaceAgent {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  built_in: boolean
  api_endpoint: string
  icon: string
  author: string
  version: string
  installed?: boolean
  plan_required?: string
}

function getBuiltInAgents(): MarketplaceAgent[] {
  return [
    {
      id: 'briefing',
      name: 'Daily Briefing',
      description: 'Your morning briefing with calendar, tasks, email intel, and AI suggestions.',
      category: 'productivity',
      tags: ['calendar', 'tasks', 'email', 'daily'],
      built_in: true,
      api_endpoint: '/api/briefing/generate',
      icon: 'sun',
      author: 'Tiker',
      version: '1.0.0',
    },
    {
      id: 'email-scanner',
      name: 'Email Intelligence',
      description: 'Scans your inbox for bills, flights, action items, and more.',
      category: 'productivity',
      tags: ['email', 'bills', 'flights', 'extraction'],
      built_in: true,
      api_endpoint: '/api/email/scan',
      icon: 'mail',
      author: 'Tiker',
      version: '1.0.0',
    },
    {
      id: 'meeting-prep',
      name: 'Meeting Prep',
      description: 'Researches attendees and prepares talking points before your meetings.',
      category: 'productivity',
      tags: ['meetings', 'calendar', 'preparation'],
      built_in: true,
      api_endpoint: '/api/meeting-prep',
      icon: 'users',
      author: 'Tiker',
      version: '1.0.0',
    },
    {
      id: 'schedule-optimizer',
      name: 'Schedule Optimizer',
      description: 'Analyzes your calendar and suggests focus blocks, buffer time, and rescheduling.',
      category: 'productivity',
      tags: ['calendar', 'optimization', 'focus'],
      built_in: true,
      api_endpoint: '/api/schedule/optimize',
      icon: 'calendar',
      author: 'Tiker',
      version: '1.0.0',
    },
    {
      id: 'research-agent',
      name: 'Life Admin Research',
      description: 'Researches any life admin topic and generates checklists.',
      category: 'productivity',
      tags: ['research', 'checklists', 'planning'],
      built_in: true,
      api_endpoint: '/api/agents/research',
      icon: 'search',
      author: 'Tiker',
      version: '1.0.0',
    },
    {
      id: 'booking-agent',
      name: 'Booking Assistant',
      description: 'Finds and books restaurants, flights, and appointments.',
      category: 'travel',
      tags: ['booking', 'restaurants', 'flights', 'appointments'],
      built_in: true,
      api_endpoint: '/api/agents/booking',
      icon: 'map-pin',
      author: 'Tiker',
      version: '1.0.0',
    },
    {
      id: 'execute-agent',
      name: 'Task Executor',
      description: 'Autonomously breaks down and completes multi-step tasks.',
      category: 'productivity',
      tags: ['automation', 'tasks', 'execution'],
      built_in: true,
      api_endpoint: '/api/agents/execute',
      icon: 'zap',
      author: 'Tiker',
      version: '1.0.0',
    },
    {
      id: 'finance-tracker',
      name: 'Finance Tracker',
      description: 'Tracks bills, subscriptions, and spending from your email.',
      category: 'finance',
      tags: ['bills', 'subscriptions', 'money'],
      built_in: true,
      api_endpoint: '/api/finance',
      icon: 'dollar-sign',
      author: 'Tiker',
      version: '1.0.0',
    },
    {
      id: 'voice-agent',
      name: 'Voice Calls',
      description: 'Makes phone calls on your behalf using AI voice.',
      category: 'productivity',
      tags: ['phone', 'voice', 'calls'],
      built_in: true,
      api_endpoint: '/api/agents/voice',
      icon: 'phone',
      author: 'Tiker',
      version: '1.0.0',
      plan_required: 'pro',
    },
    {
      id: 'coordinator',
      name: 'Multi-Person Coordinator',
      description: 'Finds mutual availability and schedules group meetings.',
      category: 'productivity',
      tags: ['scheduling', 'groups', 'availability'],
      built_in: true,
      api_endpoint: '/api/coordinate',
      icon: 'users',
      author: 'Tiker',
      version: '1.0.0',
    },
  ]
}

function getCommunityAgents(): MarketplaceAgent[] {
  // Placeholder for future community agents.
  // These would be loaded from a community registry or DB table.
  return [
    {
      id: 'community_fitness',
      name: 'Fitness Planner',
      description: 'Plans workouts and tracks exercise goals based on your schedule.',
      category: 'health',
      tags: ['fitness', 'exercise', 'health', 'workout'],
      built_in: false,
      api_endpoint: '/api/community/fitness',
      icon: 'heart',
      author: 'Community',
      version: '0.1.0',
    },
    {
      id: 'community_meal_prep',
      name: 'Meal Planner',
      description: 'Generates weekly meal plans and shopping lists.',
      category: 'health',
      tags: ['meals', 'cooking', 'shopping', 'nutrition'],
      built_in: false,
      api_endpoint: '/api/community/meal-prep',
      icon: 'utensils',
      author: 'Community',
      version: '0.1.0',
    },
    {
      id: 'community_home_maintenance',
      name: 'Home Maintenance',
      description: 'Seasonal home maintenance reminders and checklists.',
      category: 'productivity',
      tags: ['home', 'maintenance', 'reminders', 'seasonal'],
      built_in: false,
      api_endpoint: '/api/community/home',
      icon: 'home',
      author: 'Community',
      version: '0.1.0',
    },
    {
      id: 'community_travel_planner',
      name: 'Trip Planner',
      description: 'Plans complete trips with itineraries, packing lists, and booking links.',
      category: 'travel',
      tags: ['travel', 'itinerary', 'packing', 'vacation'],
      built_in: false,
      api_endpoint: '/api/community/travel',
      icon: 'globe',
      author: 'Community',
      version: '0.1.0',
    },
  ]
}
